"""
Orchestrator script for 3D model conversion.
This script acts as the entry point for the Next.js API route. It takes an input 3D model path,
detects its file format, routes it to the appropriate conversion engine (e.g., Trimesh, Blender, CAD),
and writes the resulting .glb file to the specified output path.
"""
import sys
import os

# Ensure the current directory is in the Python module search path (sys.path)
# This allows us to import our internal engine modules (like engine_trimesh.py) even if 
# this script is executed from a different working directory.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the specialized conversion engines
try:
    from engine_trimesh import convert_trimesh
    # In the future, other engines like Blender or PythonOCC (CAD) would be imported here.
    # from engine_blender import convert_blender
    # from engine_cad import convert_cad
except ImportError as e:
    # If the direct import fails, log a warning and fallback to a slightly different import structure.
    # This handles edge cases where the script is executed as a package module.
    print(f"Warning: Could not import some engines directly. Error: {e}")
    try:
        import engine_trimesh
        from engine_trimesh import convert_trimesh
    except ImportError:
        pass

def detect_format(filename):
    """
    Analyzes the file extension of the input filename and maps it to the corresponding 
    conversion engine ('trimesh', 'blender', or 'cad').
    
    Args:
        filename (str): The name or path of the input file.
        
    Returns:
        str: The internal key of the appropriate engine (e.g., 'trimesh').
        
    Raises:
        ValueError: If the file extension is not recognized or supported.
    """
    # Extract the file extension and convert to lowercase for robust matching
    ext = os.path.splitext(filename)[1].lower()
    
    # Dictionary mapping file extensions to their ideal conversion engine
    mapping = {
        # Standard mesh formats are best handled by Trimesh
        '.stl': 'trimesh', '.obj': 'trimesh', '.ply': 'trimesh', '.glb': 'trimesh', '.gltf': 'trimesh',
        # Complex proprietary formats require Blender
        '.fbx': 'blender', '.blend': 'blender',
        # Solid/CAD mathematical formats require specialized CAD parsers (PythonOCC)
        '.step': 'cad', '.stp': 'cad', '.iges': 'cad', '.igs': 'cad', '.x_t': 'cad', '.x_b': 'cad'
    }
    
    if ext in mapping:
        return mapping[ext]
    else:
        # Throw a strict error if we receive a rogue file type
        raise ValueError(f"Unsupported file format: {ext}. Only STL, OBJ, PLY, GLB, GLTF, FBX, BLEND, STEP, IGES, and Parasolid are supported.")

def convert(input_path, output_path):
    """
    The main routing function. Determines the file type using `detect_format` and then 
    calls the specific engine's conversion function.
    
    Args:
        input_path (str): The absolute path to the uploaded temporary source 3D file.
        output_path (str): The absolute path where the final .glb file should be saved.
    """
    # 1. Figure out which engine is needed based on the file extension
    engine_type = detect_format(input_path)
    print(f"Detected format requires engine: {engine_type.upper()}")
    
    # 2. Dispatch to the active engine
    if engine_type == 'trimesh':
        convert_trimesh(input_path, output_path)
    # The following are commented out until those engines are fully implemented in the pipeline
    # elif engine_type == 'blender':
    #     convert_blender(input_path, output_path)
    # elif engine_type == 'cad':
    #     convert_cad(input_path, output_path)
    else:
        print(f"Engine {engine_type} is currently disabled or unrecognized.")
        raise ValueError(f"Unrecognized or disabled engine type: {engine_type}")

# This block executes when the script is run directly from the command line
if __name__ == "__main__":
    # Ensure that at least the input file path was passed as an argument
    if len(sys.argv) < 2:
        print("Usage: python converter.py <input_path> [output_path]")
        sys.exit(1)
    
    # The first argument after the script name is the temporary input file
    input_model_path = sys.argv[1]
    
    # Extract just the name of the file without the extension (e.g. "model" from "model.stl")
    base_name = os.path.splitext(os.path.basename(input_model_path))[0]
    
    # Check if a specific output path was provided by the Node.js API route
    if len(sys.argv) >= 3:
        # If yes, use the exact path provided by the server
        output_model_path = sys.argv[2]
    else:
        # Backward compatibility / local testing mode:
        # If no output path is given, auto-generate one pointing to the project's public folder.
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(project_root, 'public', 'models', 'converted')
        
        # Ensure the destination folder exists before writing to it
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_model_path = os.path.join(output_dir, f"{base_name}.glb")
    
    # Print a log line so the Node.js server can capture standard output over IPC
    print(f"Starting conversion: {input_model_path} -> {output_model_path}")
    
    try:
        # Launch the actual conversion process
        convert(input_model_path, output_model_path)
    except Exception as e:
        # If anything crashes, catch the error, log a FATAL message to stderr, and exit with status code 1.
        # This allows the Node.js server to know that the process failed and to capture the exact reason.
        print(f"FATAL: Conversion process failed: {str(e)}")
        sys.exit(1)
