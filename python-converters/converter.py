"""
Orchestrator script for 3D model conversion.
This script acts as the entry point for the Next.js API route. It takes an input 3D model path,
detects its file format, routes it to the appropriate conversion engine (e.g., Trimesh, Blender, CAD),
and writes the resulting .glb file to the specified output path.
"""
import sys
import os
import subprocess

# Ensure the current directory is in the Python module search path (sys.path)
# This allows us to import our internal engine modules (like engine_trimesh.py) even if 
# this script is executed from a different working directory.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

def detect_format(filename):
    """
    Analyzes the file extension of the input filename and maps it to the corresponding 
    conversion engine ('trimesh', 'blender', or 'cad').
    """
    ext = os.path.splitext(filename)[1].lower()
    mapping = {
        '.stl': 'trimesh', '.obj': 'trimesh', '.ply': 'trimesh', '.glb': 'trimesh', '.gltf': 'trimesh',
        '.fbx': 'blender', '.blend': 'blender',
        '.step': 'cad', '.stp': 'cad', '.iges': 'cad', '.igs': 'cad', '.x_t': 'cad', '.x_b': 'cad'
    }
    
    if ext in mapping:
        return mapping[ext]
    else:
        raise ValueError(f"Unsupported file format: {ext}. Only STL, OBJ, PLY, GLB, GLTF, FBX, BLEND, STEP, IGES, and Parasolid are supported.")

def convert(input_path, output_path):
    """
    The main routing function. Determines the file type using `detect_format` and then 
    calls the specific engine's conversion function via a subprocess.
    """
    engine_type = detect_format(input_path)
    print(f"Detected format requires engine: {engine_type.upper()}")
    
    if engine_type == 'trimesh':
        script_path = os.path.join(current_dir, 'engine_trimesh.py')
        
        # Subprocess Management: Run conversion in an isolated subprocess with a timeout
        # to ensure the OS reclaims memory and prevents the main process from hanging.
        try:
            result = subprocess.run(
                [sys.executable, script_path, input_path, output_path],
                timeout=120,
                check=True,
                capture_output=True,
                text=True
            )
            print(result.stdout)
        except subprocess.TimeoutExpired:
            print(f"FATAL: Conversion process timed out after 120 seconds for {input_path}")
            sys.exit(1)
        except subprocess.CalledProcessError as e:
            print(f"FATAL: Conversion process failed with exit code {e.returncode}")
            print(e.stdout)
            print(e.stderr)
            sys.exit(1)
    else:
        print(f"Engine {engine_type} is currently disabled or unrecognized.")
        raise ValueError(f"Unrecognized or disabled engine type: {engine_type}")

# This block executes when the script is run directly from the command line
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python converter.py <input_path> [output_path]")
        sys.exit(1)
    
    input_model_path = sys.argv[1]
    base_name = os.path.splitext(os.path.basename(input_model_path))[0]
    
    if len(sys.argv) >= 3:
        output_model_path = sys.argv[2]
    else:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(project_root, 'public', 'models', 'converted')
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_model_path = os.path.join(output_dir, f"{base_name}.glb")
    
    print(f"Starting conversion: {input_model_path} -> {output_model_path}")
    
    try:
        convert(input_model_path, output_model_path)
    except Exception as e:
        print(f"FATAL: Conversion process failed: {str(e)}")
        sys.exit(1)
