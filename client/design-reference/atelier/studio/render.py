"""Original Nordic Atelier geometry. Run with Blender 4.5 in background mode.

blender -b --python render.py -- [fold meridian fitness university career travel]
Saves an editable studio with all six collections; renders selected objects in
both themes. No downloaded meshes, fonts, textures or private inputs are used.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parents[2] / 'artifacts' / 'atelier' / 'renders'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = .07
scene.render.resolution_x = 768
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Neutral studio environment')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.72, .78, .82, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35

def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, hex_color, rough=.4, metal=0, texture=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = tuple(linear(int(hex_color[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)
    m.use_nodes = True
    n = m.node_tree.nodes
    bs = n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = m.diffuse_color
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    if texture:
        noise = n.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 140
        bump = n.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = texture
        bump.inputs['Distance'].default_value = .018
        m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m

silver = material('Satin aluminium', 'BEC9CF', .3, .8)
blue = material('Ultramarine enamel', '355ACB', .28, .25)
ruby = material('Mulberry enamel', '963D55', .29, .18)
paper = material('Uncoated ivory paper', 'EFECE2', .76, texture=.11)
ceramic = material('Chalk ceramic', 'E1E6DE', .46, texture=.12)
sage = material('Sage woven textile', '8CADA1', .87, texture=.4)
ink = material('Ink cloth binding', '263842', .7, texture=.2)
floor_mat = material('Studio floor', 'F6F5F1', .85)
current = None

def collect(obj, name, mat):
    obj.name = name
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    current.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj

def bevel(obj, amount=.04):
    mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    mod.width = amount
    mod.segments = 4
    obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return obj

def cube(name, loc, scale, mat, edge=.035, rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = collect(bpy.context.object, name, mat)
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.z = rotation
    return bevel(obj, edge)

def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = 5
    sp = curve.splines.new('POLY')
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(name, curve)
    current.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def polygon(name, points, depth, mat, y=0):
    # Points are x/z. Front is -Y, so the same outline is visible in SVG and 3D.
    v = [(x, y - depth / 2, z) for x, z in points] + [(x, y + depth / 2, z) for x, z in points]
    count = len(points)
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    faces += [(i, (i+1) % count, (i+1) % count + count, i + count) for i in range(count)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(v, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    current.objects.link(obj)
    obj.data.materials.append(mat)
    return bevel(obj, .025)

def svg_points(points):
    return [((x - 16) / 12, (28-y) / 12 + .05) for x, y in points]

collections = {}
for name in ['fold', 'meridian', 'fitness', 'university', 'career', 'travel']:
    current = bpy.data.collections.new(name)
    scene.collection.children.link(current)
    collections[name] = current
    if name == 'fold':
        polygon('Fold continuous silhouette', svg_points([(6,4),(14,4),(14,19),(27,6),(27,17),(16,28),(6,28)]), .28, silver)
        polygon('Fold enamel return face', svg_points([(14,19),(27,6),(27,17),(16,28),(6,28)]), .008, ruby, -.149)
    elif name == 'meridian':
        # Open quarter-ring with a disconnected, directional corner.
        outer = [(math.cos(a)*1.05, 1.1 + math.sin(a)*1.05) for a in [math.pi/2+i*math.pi*1.5/96 for i in range(97)]]
        inner = [(math.cos(a)*.65, 1.1 + math.sin(a)*.65) for a in [math.pi*2-i*math.pi*1.5/96 for i in range(97)]]
        polygon('Meridian open ring', outer + inner, .27, silver)
        polygon('Meridian directional corner', [(.32,2.15),(1.05,2.15),(1.05,1.42),(.65,1.42),(.65,1.75),(.32,1.75)], .27, ruby)
    elif name == 'fitness':
        bpy.ops.mesh.primitive_torus_add(major_radius=.77, minor_radius=.125, major_segments=96, minor_segments=24, location=(0,.1,.91), rotation=(math.pi/2,0,.12))
        obj = collect(bpy.context.object, 'Sculptural movement ring', ceramic)
        for f in obj.data.polygons: f.use_smooth = True
        # Tailored folded towel, with its wave geometry retained in the source.
        verts=[]; faces=[]
        for j in range(35):
            y=-.95+j*.05
            for i in range(35):
                x=-.75+i*.043
                z=.12 + .09*math.sin(i*.24) + .07*math.sin(j*.17+i*.06)
                verts.append((x,y,z))
        for j in range(34):
            for i in range(34):
                k=j*35+i;faces.append((k,k+1,k+36,k+35))
        mesh=bpy.data.meshes.new('Woven folds');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Folded sage towel',mesh);current.objects.link(obj);obj.data.materials.append(sage)
        solid=obj.modifiers.new('Textile thickness','SOLIDIFY');solid.thickness=.035
        sub=obj.modifiers.new('Soft cloth','SUBSURF');sub.levels=2
        for f in mesh.polygons: f.use_smooth=True
    elif name == 'university':
        cube('Cloth book binding',(0,0,.17),(2.15,1.5,.14),ink,.035)
        # Two gently curved leaf blocks and visible, restrained page edges.
        for side in [-1,1]:
            for layer in range(14):
                verts=[];faces=[]
                for j in range(2):
                    for i in range(25):
                        t=i/24;x=side*(.025+t*1.01)
                        verts.append((x,-.7+j*1.4,.28+layer*.012+.13*math.sin(t*math.pi*.8)))
                for i in range(24):faces.append((i,i+1,26+i,25+i))
                mesh=bpy.data.meshes.new('Curved pages');mesh.from_pydata(verts,[],faces);mesh.update()
                obj=bpy.data.objects.new('Paper leaves',mesh);current.objects.link(obj);obj.data.materials.append(paper)
                solid=obj.modifiers.new('Paper edge','SOLIDIFY');solid.thickness=.008
        tube('Blue ribbon bookmark',[(.44,-.91,.19),(.46,-.7,.52),(.47,-.35,.55),(.46,.2,.55),(.44,.68,.54)],.042,blue)
        cube('Bookmark tab',(.45,-.92,.12),(.17,.33,.025),blue,.015)
    elif name == 'career':
        polygon('Aluminium architectural joint',[(-1.05,.08),(-1.05,1.85),(-.48,1.85),(-.48,.68),(.55,.68),(.55,.08)],.65,silver)
        polygon('Blue interlocking return',[(-.25,.08),(-.25,.55),(.44,.55),(.44,1.45),(1,1.45),(1,.08)],.7,blue,.4)
        cube('Joint inset',(-.8,-.334,1.56),(.11,.014,.17),ink,.018)
    elif name == 'travel':
        # Folded paper map with physical contour inlays, no private geography.
        def height(x,y):
            fold=.16*abs(math.sin((x+1.15)*math.pi/1.15))
            hill=.23*math.exp(-((x-.38)**2+(y-.18)**2)*3)
            return .13+fold+hill
        verts=[];faces=[];steps=54
        for j in range(steps+1):
            y=-.8+j*1.6/steps
            for i in range(steps+1):
                x=-1.15+i*2.3/steps;verts.append((x,y,height(x,y)))
        for j in range(steps):
            for i in range(steps):
                k=j*(steps+1)+i;faces.append((k,k+1,k+steps+2,k+steps+1))
        mesh=bpy.data.meshes.new('Folded map relief');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Map paper',mesh);current.objects.link(obj);obj.data.materials.append(paper)
        solid=obj.modifiers.new('Map edge','SOLIDIFY');solid.thickness=.065
        bevel(obj,.015)
        for r in [.16,.29,.42,.55,.68]:
            pts=[]
            for k in range(97):
                a=k*math.tau/96;x=.38+math.cos(a)*r;y=.12+math.sin(a)*r*.7
                pts.append((x,y,height(x,y)+.015))
            tube('Contour inlay',pts,.008,sage)
        pts=[]
        for k in range(65):
            x=-.9+k*1.75/64;y=.25*math.sin(k/13)-.13
            pts.append((x,y,height(x,y)+.045))
        tube('Single ultramarine route',pts,.024,blue)
        for co in [pts[0],pts[-1]]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.055,location=co)
            collect(bpy.context.object,'Route marker',blue)

current=bpy.data.collections.new('Shared studio');scene.collection.children.link(current)
bpy.ops.mesh.primitive_plane_add(size=200)
floor=collect(bpy.context.object,'Contact shadow ground',floor_mat)
floor.is_shadow_catcher=True

def light(name, loc, power, size, color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);current.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,0,.6))-obj.location).to_track_quat('-Z','Y').to_euler()

light('Large upper-left softbox',(-3,-4,6),650,4.5,(1,.95,.89))
light('Cool studio fill',(4,-1,3),400,3,(.79,.89,1))
light('Soft edge light',(1,4,5),650,3,(1,1,1))
data=bpy.data.cameras.new('Shared orthographic camera');camera=bpy.data.objects.new('Shared orthographic camera',data);current.objects.link(camera)
camera.location=(4,-7,6.3)
target=Vector((0,0,.75))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
data.type='ORTHO';data.ortho_scale=3.65
scene.camera=camera
scene['design_scope']='Nordic Atelier study. Editable geometry and offline renders only; no P3 runtime.'
scene['camera_rule']='Same camera, scale, target and three studio lights for all six objects.'
for col in collections.values(): col.hide_render=True;col.hide_viewport=True
collections['fold'].hide_render=False;collections['fold'].hide_viewport=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'studio'/'atelier-studio.blend'), compress=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(collections)
for name in args:
    if name not in collections: raise ValueError(name)
    for key,col in collections.items():col.hide_render=key!=name;col.hide_viewport=key!=name
    # Transparent masters retain the same lighting in both themes; a theme-specific
    # ground adjusts the contact shadow response, without changing object colours.
    for theme,color in [('light','F6F5F1'),('dark','181E22')]:
        floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))+(1,)
        scene.render.filepath=str(OUT/f'{name}-{theme}.png')
        bpy.ops.render.render(write_still=True)
        print(f'ATELIER_RENDER {name} {theme}',flush=True)
