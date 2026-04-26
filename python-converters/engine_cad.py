# import os
# import sys
# import trimesh
# import numpy as np

# # PythonOCC imports
# try:
#     from OCC.Core.STEPControl import STEPControl_Reader
#     from OCC.Core.IGESControl import IGESControl_Reader
#     from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
#     from OCC.Core.TopExp import TopExp_Explorer
#     from OCC.Core.TopAbs import TopAbs_FACE
#     from OCC.Core.BRep import BRep_Tool
#     from OCC.Core.TopLoc import TopLoc_Location
#     from OCC.Core.IFSelect import IFSelect_RetDone
# except ImportError:
#     print("Error: pythonocc-core is not installed. Please install it using 'conda install -c conda-forge pythonocc-core' or via pip.")

# def convert_cad(input_path, output_path):
#     """
#     Imports CAD geometry from the specified input path using pythonocc,
#     tessellates the surfaces into a triangular mesh with a deflection of 0.1,
#     and exports it as a GLB file using trimesh.
#     """
#     file_ext = os.path.splitext(input_path)[1].lower()
    
#     # 1. Detect whether the file is STEP/STP or IGES/IGS or Parasolid
#     try:
#         shape = None
#         if file_ext in ['.step', '.stp']:
#             reader = STEPControl_Reader()
#             status = reader.ReadFile(input_path)
#             if status == IFSelect_RetDone:
#                 reader.TransferRoots()
#                 shape = reader.OneShape()
#             else:
#                 raise ValueError("Failed to read STEP file.")
                
#         elif file_ext in ['.iges', '.igs']:
#             reader = IGESControl_Reader()
#             status = reader.ReadFile(input_path)
#             if status == IFSelect_RetDone:
#                 reader.TransferRoots()
#                 shape = reader.OneShape()
#             else:
#                 raise ValueError("Failed to read IGES file.")
                
#         elif file_ext in ['.x_t', '.x_b']:
#             # Parasolid support in pythonocc can be complex depending on the version/installation.
#             # Providing a clear error message as requested.
#             raise NotImplementedError(f"Parasolid format ({file_ext}) support is not yet implemented for the CAD engine.")
#         else:
#             raise ValueError(f"Unsupported CAD format: {file_ext}")

#         if shape is None:
#             raise ValueError(f"No valid geometry could be extracted from {input_path}")

#         # 3. Tessellate the geometry into a mesh using BRepMesh_IncrementalMesh
#         # Deflection value of 0.1 (medium quality)
#         deflection = 0.1
#         mesher = BRepMesh_IncrementalMesh(shape, deflection)
#         mesher.Perform()

#         # 4. Extract the vertices and faces from the tessellated mesh
#         vertices = []
#         faces = []
#         offset = 0

#         explorer = TopExp_Explorer(shape, TopAbs_FACE)
#         while explorer.More():
#             face = explorer.Current()
#             location = TopLoc_Location()
#             # BRep_Tool.Triangulation returns the triangulation of the face
#             triangulation = BRep_Tool.Triangulation(face, location)
            
#             if triangulation:
#                 # Get transformation if face is displaced
#                 transform = location.Transformation()
                
#                 # Extract nodes (vertices)
#                 for i in range(1, triangulation.NbNodes() + 1):
#                     node = triangulation.Node(i)
#                     # Apply transformation and store vertex
#                     p = node.Transformed(transform)
#                     vertices.append([p.X(), p.Y(), p.Z()])
                
#                 # Extract triangles (faces)
#                 for i in range(1, triangulation.NbTriangles() + 1):
#                     triangle = triangulation.Triangle(i)
#                     idx1, idx2, idx3 = triangle.Get()
#                     # OCC uses 1-based indexing, trimesh uses 0-based
#                     faces.append([idx1 - 1 + offset, idx2 - 1 + offset, idx3 - 1 + offset])
                
#                 # Update offset for next face triangulation
#                 offset += triangulation.NbNodes()
                
#             explorer.Next()

#         if not vertices or not faces:
#             raise ValueError("Tessellation yielded no vertices or faces. The geometry might be empty or invalid.")

#         # 5. Build a trimesh object from those vertices and faces
#         mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))

#         # 6. Export the trimesh object as GLB to output_path
#         mesh.export(output_path, file_type='glb')
        
#         # 7. Print success message
#         print(f"Success: CAD model converted from {input_path} to {output_path}")

#     except Exception as e:
#         # 8. Raise a clear error if the file cannot be read or tessellated
#         error_msg = f"CAD conversion failed for {input_path}: {str(e)}"
#         print(error_msg)
#         raise RuntimeError(error_msg)

# if __name__ == "__main__":
#     if len(sys.argv) == 3:
#         convert_cad(sys.argv[1], sys.argv[2])
