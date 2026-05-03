import trimesh
import os
import gc
from PIL import Image

# This engine handles the following mesh formats:
# .stl, .obj, .ply, .gltf, .glb

def process_material(mat):
    """Helper function to downscale textures within a material"""
    attrs = ['image', 'baseColorTexture', 'metallicRoughnessTexture', 
             'normalTexture', 'emissiveTexture', 'occlusionTexture']
    
    for attr in attrs:
        if hasattr(mat, attr):
            img = getattr(mat, attr)
            if isinstance(img, Image.Image):
                if img.width > 1024 or img.height > 1024:
                    print(f"[Optimization] Downscaling texture from {img.width}x{img.height}px -> 1024x1024px using LANCZOS")
                    # Texture Downscaling: LANCZOS algorithm
                    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

def convert_trimesh(input_path, output_path):
    """
    Uses the Trimesh library to load the input model and export it as a GLB file.
    Trimesh is used for mesh-based model formats.
    """
    try:
        # 1. Conditional Loading
        ext = os.path.splitext(input_path)[1].lower()
        if ext in ['.glb', '.gltf']:
            print(f"[Trimesh] Input is already {ext}. Loading directly for optimization pass...")
            loaded = trimesh.load(input_path)
        else:
            print(f"[Trimesh] Input is {ext}. Loading for conversion and optimization...")
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

        # Texture Downscaling
        if hasattr(mesh.visual, 'material'):
            process_material(mesh.visual.material)
        elif hasattr(mesh.visual, 'materials'):
            for mat in mesh.visual.materials:
                process_material(mat)

        # Mesh Decimation
        original_faces = len(mesh.faces)
        if original_faces > 300000:
            print(f"[Optimization] Decimating mesh from {original_faces} -> 300000 faces")
            if hasattr(mesh, 'simplify_quadratic_decimation'):
                mesh = mesh.simplify_quadratic_decimation(300000)
            elif hasattr(trimesh, 'simplify_quadratic_decimation'):
                mesh = trimesh.simplify_quadratic_decimation(mesh, 300000)
            else:
                try:
                    mesh = mesh.simplify_quadric_decimation(300000)
                except AttributeError:
                    # Fallback to the requested signature if missing
                    mesh = trimesh.simplify_quadratic_decimation(mesh, 300000)

        # 3. Export the result as a GLB file to output_path
        # Force the output to be GLB format
        mesh.export(output_path, file_type='glb')
        
        # 4. Print success message
        print(f"Success: Model converted and saved to {output_path}")
        
    except Exception as e:
        # 5. Raise a clear error if loading or exporting fails
        print(f"Error converting {input_path} with trimesh: {str(e)}")
        raise e
    finally:
        # Memory Clean-up
        if 'loaded' in locals():
            del loaded
        if 'mesh' in locals():
            # Clear internal dicts/arrays if possible
            if hasattr(mesh, 'clear'):
                mesh.clear()
            del mesh
        gc.collect()

if __name__ == "__main__":
    # Simple test block
    import sys
    if len(sys.argv) == 3:
        convert_trimesh(sys.argv[1], sys.argv[2])
