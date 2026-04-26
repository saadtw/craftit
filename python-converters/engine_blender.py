# import subprocess
# import os
# import sys

# # This engine handles FBX and BLEND model formats.
# # It calls Blender headlessly via the command-line interface.

# # The underlying Blender CLI command structure:
# # blender --background --python blender_export.py -- input_path output_path

# def convert_blender(input_path, output_path):
#     """
#     Triggers a headless Blender process to import FBX or BLEND files
#     and export them to the target GLB format using a helper Python script.
#     """
#     # Get the absolute path to the blender_export.py script in the same directory
#     script_dir = os.path.dirname(os.path.abspath(__file__))
#     export_script = os.path.join(script_dir, "blender_export.py")

#     # Command construction
#     command = [
#         "blender",
#         "--background",
#         "--python", export_script,
#         "--", input_path, output_path
#     ]

#     try:
#         # 3. Use Python's subprocess module to execute the command
#         print(f"Executing Blender conversion: {' '.join(command)}")
#         result = subprocess.run(command, capture_output=True, text=True, check=True)
        
#         # 4. Print success message if it completes
#         print(f"Success: Blender conversion completed for {input_path}")
#         print(result.stdout)
        
#     except subprocess.CalledProcessError as e:
#         # 5. Raise a clear error if conversion fails
#         error_msg = f"Blender conversion failed for {input_path}.\nStdout: {e.stdout}\nStderr: {e.stderr}"
#         print(error_msg)
#         raise RuntimeError(error_msg)
#     except FileNotFoundError:
#         # 5. Raise a clear error if Blender is not found
#         error_msg = "Blender executable not found on the system. Please ensure Blender is installed and added to the 시스템 PATH."
#         print(error_msg)
#         raise FileNotFoundError(error_msg)

# if __name__ == "__main__":
#     # Test block
#     if len(sys.argv) == 3:
#         convert_blender(sys.argv[1], sys.argv[2])
