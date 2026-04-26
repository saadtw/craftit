# import sys
# import os

# # Blender's python environment uses 'bpy' to interact with the scene
# try:
#     import bpy
# except ImportError:
#     print("This script must be run inside Blender's Python environment.")
#     sys.exit(1)

# def main():
#     """
#     Blender internal script to import a 3D model (FBX or BLEND)
#     and export it as a single GLB file.
#     """
    
#     # 1. Read input_path and output_path from sys.argv (after the '--' separator)
#     try:
#         # sys.argv contains all arguments to Blender, but arguments after '--'
#         # are intended for the script itself.
#         argv = sys.argv
#         if "--" not in argv:
#             print("Missing '--' separator for script arguments.")
#             sys.exit(1)
            
#         # Get start index of script arguments
#         start_idx = argv.index("--") + 1
#         script_args = argv[start_idx:]
        
#         if len(script_args) < 2:
#             print("Usage: blender --background --python blender_export.py -- <input_path> <output_path>")
#             sys.exit(1)
            
#         input_path = str(script_args[0])
#         output_path = str(script_args[1])
        
#     except Exception as e:
#         print(f"Error parsing script arguments: {str(e)}")
#         sys.exit(1)

#     print(f"Importing model from: {input_path}")
#     print(f"Exporting model to: {output_path}")

#     # 2. Import the file using Blender's bpy importer based on file extension
#     file_ext = os.path.splitext(input_path)[1].lower()
    
#     # Clear the default scene objects
#     bpy.ops.wm.read_factory_settings(use_empty=True)

#     try:
#         if file_ext == '.fbx':
#             # Import FBX file
#             bpy.ops.import_scene.fbx(filepath=input_path, use_manual_orientation=False, global_scale=1.0)
#         elif file_ext == '.blend':
#             # Open BLEND file directly (be aware this replaces the current context)
#             bpy.ops.wm.open_mainfile(filepath=input_path)
#         else:
#             print(f"Error: Unsupported format {file_ext} in Blender engine.")
#             sys.exit(1)

#         # 3. Export the results as GLB using bpy.ops.export_scene.gltf
#         # Make sure the directory for output_path exists
#         output_dir = str(os.path.dirname(output_path))
#         if not os.path.exists(output_dir):
#             os.makedirs(output_dir)

#         # Export scene to GLB format
#         bpy.ops.export_scene.gltf(
#             filepath=output_path,
#             export_format='GLB',
#             export_image_format='AUTO',
#             export_apply=True
#         )
        
#         print(f"Blender export successful: {output_path}")

#     except Exception as e:
#         print(f"Error during Blender import/export: {str(e)}")
#         sys.exit(1)

#     # 4. Quit Blender after export
#     bpy.ops.wm.quit_blender()

# if __name__ == "__main__":
#     main()
