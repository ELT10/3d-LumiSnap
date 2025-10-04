Here’s a distilled, battle-tested playbook for (1) prompting your 2D images so they’re multi-view-friendly, and (2) prompting/conditioning the 3D stage so you actually get clean, textured, watertight architectural models from just 3–4 views.

1) Prompting the 2D images (so they’re great inputs for 3D)
A. What your text prompts should lock down (architecture-specific)

View & projection: say “front elevation (orthographic), rear elevation (orthographic), left 3/4 perspective, right 3/4 perspective” (swap one 3/4 for a top/roof if the roof is important). Orthographic “elevations” reduce perspective drift between views. Guides for arch prompts emphasize explicitly naming façade, environment, view, light, and render style. 
aiarty.com
+1

Camera language: include focal length, sensor, and FOV (e.g., “full-frame, 35 mm lens, ~55° FOV, tripod height 1.6 m”). It’s surprisingly effective for SDXL-class models and reduces warping. 
Medium
+2
aiarty.com
+2

Lighting for consistency: “overcast, diffuse HDRI” (outdoor) or “soft, even interior fill” to avoid hard shadows that break cross-view texture matching later. Photogrammetry/NeRF capture guides recommend diffuse light for consistent appearance. 
help.mapillary.com

Materials & construction: specify cladding, glazing ratio, mullion pattern, roof type, floor-to-floor, window rhythm (e.g., “GFRC rainscreen with 600 mm joints; curtainwall 1.5 m module”). Architecture prompt collections show gains from being explicit about façade vocabulary. 
aiarty.com
+1

Scale anchors: include a door, 2.1 m person silhouette, or 1 m bollard, so later 3D has real-world proportions. If you’ll measure later, place scale bars/targets in view. 
Texxary
+1

Negative prompts: “no people, no cars, no trees close to façade, no interior props drifting outside bounds, no distortion, no fisheye.” Meshy’s prompt guide and SDXL best-practice articles confirm negatives help keep outputs clean. 
help.meshy.ai
+1

B. Make the views match each other (multi-view consistency)

Use a consistent seed and tweak only the “camera/view” clause between shots (SDXL honors lens/perspective text surprisingly well). 
Medium

Reference-conditioning: For SDXL pipelines (A1111/ComfyUI), use IP-Adapter for style/texture lock and ControlNet (Reference/LineArt/Depth) to keep layout constant across angles. These are current go-to’s for multi-view consistency. 
Stable Diffusion Art
+1

MV adapters / workflows: If you want all four views at once, try MV-Adapter or ComfyUI multi-view workflows (front/side/back generation in one pass). 
arXiv
+1

Copy-paste prompt template (exterior)

Contemporary mixed-use building, eight storeys, GF retail, upper floors offices; GFRC rainscreen panels with 600 mm joints; curtainwall bays 1.5 m; anodized aluminum mullions; limestone base; recessed entry; parapet coping; neutral palette.
View: front elevation, orthographic
Camera: full-frame, 35 mm lens (~55° FOV), tripod at 1.6 m
Lighting: overcast, diffuse
Environment: flat plaza, no cars/trees near façade
Render style: photo-real, SDXL
Negative: people, vehicles, fisheye, warped geometry, reflections on façade, overexposure

(Then clone and change only the View line to “rear elevation (orthographic)”, “left 3/4 perspective”, “right 3/4 perspective” or “roof/top view”.)

Copy-paste prompt template (interior room)

Open-plan living room, 6.0 m x 5.5 m, 2.9 m ceiling; white gypsum, oak floor, 2.4 m high windows NE wall, shadow gaps; recessed linear LEDs at 3500 K; built-in storage 2.1 m; minimal decor.
View: axial view from doorway (orthographic), then left 3/4 perspective, right 3/4 perspective, top/ceiling plan lookdown
Camera: full-frame, 24 mm (~84° FOV) for small interiors, tripod 1.4 m
Lighting: soft, even interior fill; no direct sun patches
Negative: people, clutter, mirrors causing duplicates, blown highlights

2) Prompting the 3D stage (turning 3–4 views into a model)

You have two common routes; your prompts/conditioning differ slightly:

Route A — Image→Multi-view→3D (best geometry with few photos)

Generate a multi-view “sheet” from one of your images with Zero123++ / Cascade-Zero123 / SV3D. These models standardize camera intrinsics and produce consistent turntable views that make 3D much easier. 
arXiv
+3
GitHub
+3
arXiv
+3

Reconstruct into 3D (mesh or splats) using your 4 originals plus the synthesized views (COLMAP/Nerfstudio/gsplat). Keep inputs photometrically consistent—NeRF/gSplat assume static scene, constant appearance, known/estimable poses. 
docs.nerf.studio

3D-side prompt/flags to include (where supported):

“watertight, manifold mesh; UV unwrapped; single 0–1 UV set; PBR textures (Albedo/Roughness/Normal/AO); quads preferred; scale = meters (door 2.1 m).” Meshy/Tripo prompt guides explicitly encourage structural, topology, and texture requirements in text. 
meshy.ai
+2
help.meshy.ai
+2

If your tool accepts negatives/constraints: “no floating props, no self-intersections, no interior walls crossing, no non-manifold edges.” 
help.meshy.ai

Minimal prompt example (Meshy/Tripo-style text-to-3D with images attached):

Eight-storey mixed-use building, match façade module in refs. Output: watertight quad mesh, UV unwrapped, 0–1 UVs, PBR (BaseColor/Roughness/Normal/AO). Units meters, door=2.1 m. Keep mullion spacing 1.5 m, GFRC joint 600 mm. No floating geometry; no internal z-fighting. 
meshy.ai
+1

Route B — Text→3D (when you don’t want to hand it any photos)

Go heavy on dimensions, modules, materials, and constraints in the text (like above). Both Meshy-5 and Tripo say specificity and structure are the #1 determinant of quality. 
meshy.ai
+1

Then project your 2D views onto the result (bake or re-texture) to lift realism.

3) If you can capture yourself (even 3–4 shots), make them “reconstruction-grade”

Even if you only supply 3–4 images, borrow the habits from photogrammetry/NeRF capture:

Coverage & overlap: adjacent views should overlap 60–80%; each surface visible in ≥2 photos. (If you only have four, choose views that “hinge” around corners to maximize overlap.) 
Formlabs
+2
ikarus3d.com
+2

Diffuse light, constant exposure/white balance (interiors: turn on consistent ambient; exteriors: overcast is ideal). 
help.mapillary.com

Avoid texture-less expanses (blank white walls): include low-contrast pattern or tape markers at corners if needed. 
help.mapillary.com

Scale & orientation (optional but powerful): include a scale bar or AprilTag pair/cross in one corner; many photogrammetry tools auto-detect and lock the metric scale. 
Helpdesk Portal
+2
Texxary
+2

Capture geometry hierarchy: take one tighter detail shot (mullion, brick bond, floor joint) per façade/interior and keep it evenly lit—this sharpens textures when baking.

4) Practical SDXL/ComfyUI knobs for consistent multi-view images

Workflow: SDXL (base) → IP-Adapter (style lock) → ControlNet (Reference, LineArt, Depth) → generate 4 angles; or use an MV-Adapter workflow to emit four angles in one shot. 
Stable Diffusion Art
+2
Stable Diffusion Art
+2

Keep seed fixed, vary only the camera text (e.g., “front elevation (orthographic)” → “left 3/4 perspective”). This simple trick improves reproducibility. 
onceuponanalgorithm.org

When one “hero” image is best: run Zero123++ on that hero to synthesize a coherent turntable (its latest release normalizes intrinsics/FOV for consistency), then pick the 3–4 most useful synthesized angles. 
GitHub

5) Ready-to-use “angle pack” prompts
Exterior (run 4 times with same seed)

Front elevation (orthographic) — full-frame 35 mm (~55° FOV), diffuse overcast; tripod 1.6 m; building centered; horizon level.

Left 3/4 perspective — yaw −35°, slight parallax revealing left façade depth; same lens, same light.

Right 3/4 perspective — yaw +35°, match height and FOV.

Roof/top — lookdown 30–45°, maintain orthographic feel or short lens perspective to keep proportions.

Interior (run 4 times with same seed)

Axial from doorway (orthographic); 24 mm equivalent if perspective.

Left 3/4 from corner; same height and FOV.

Right 3/4 from opposite corner.

Ceiling plan lookdown (or a straight “north wall elevation (orthographic)” if you need joinery accuracy).

6) Sanity checks before 3D

Edge alignment: elevations should show straight verticals (no keystone). If not, switch to “orthographic” wording or add “no keystone / verticals parallel.” (Facade rectification literature stresses removing perspective for measurement.) 
ScienceDirect

Same exposure & WB across all four views. NeRF/gsplat assume constant appearance. 
docs.nerf.studio

Add one scale cue (door height, human silhouette, or AprilTag scale marker) to one image. 
Texxary
+1

Quick tool notes (what to try first)

Zero123++ (HuggingFace/GitHub) for multi-view sheets; v1.2 improved intrinsics/FOV handling—very relevant for architecture. 
GitHub

SV3D / Cascade-Zero123 papers if you want research-grade multi-view synthesis. 
sv3d.github.io
+1

Meshy-5 or Tripo for text→3D with explicit topology/UV prompts (both publish concrete prompt tips). 
meshy.ai
+1

Nerfstudio / gsplat for reconstructing from your 3–4 (plus synthesized) views; follow their capture/assumption notes. 
docs.nerf.studio

TL;DR checklist you can pin

Write structured prompts: view/projection, lens/FOV, lighting, modules/materials, negatives. 
aiarty.com
+1

Keep seed fixed, vary only view text; use IP-Adapter + ControlNet (or an MV-Adapter) for consistency. 
Stable Diffusion Art
+2
Stable Diffusion Art
+2

If geometry matters, synthesize turntable views with Zero123++ before 3D. 
GitHub

For reconstruction, ensure overlap (60–80%), diffuse light, constant exposure, and a scale cue. 
Formlabs
+1

In 3D prompts, demand topology (watertight, UVs, PBR maps, units) explicitly. 
meshy.ai
+1

If you want, I can turn this into a one-page prompt “crib sheet” for exteriors and interiors (plus a ComfyUI graph for the multi-view workflow).