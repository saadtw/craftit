import trimesh
import os

# This engine handles the following mesh formats:
# .stl, .obj, .ply, .gltf, .glb

def convert_trimesh(input_path, output_path):
    """
    Uses the Trimesh library to load the input model and export it as a GLB file.
    Trimesh is used for mesh-based model formats.
    """
    try:
        # 1. Use trimesh to load the file
        loaded = trimesh.load(input_path)
        
        # 2. Handle the case where trimesh returns a Scene (multiple meshes)
        if isinstance(loaded, trimesh.Scene):
            # Merge all meshes in the scene into a single mesh
            if len(loaded.geometry) == 0:
                raise ValueError("The loaded scene is empty and contains no geometry.")
            
            # Extract all geometries and concatenate them
            meshes = [g for g in loaded.geometry.values()]
            mesh = trimesh.util.concatenate(meshes)
        elif isinstance(loaded, trimesh.Trimesh):
            mesh = loaded
        else:
            raise ValueError(f"Loaded object of type {type(loaded)} is not a recognized Trimesh or Scene.")

        # 3. Export the result as a GLB file to output_path
        # Force the output to be GLB format
        mesh.export(output_path, file_type='glb')
        
        # 4. Print success message
        print(f"Success: Model converted and saved to {output_path}")
        
    except Exception as e:
        # 5. Raise a clear error if loading or exporting fails
        print(f"Error converting {input_path} with trimesh: {str(e)}")
        raise e

if __name__ == "__main__":
    # Simple test block
    import sys
    if len(sys.argv) == 3:
        convert_trimesh(sys.argv[1], sys.argv[2])
