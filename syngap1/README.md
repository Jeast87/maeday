# SYNGAP1: From Brain to Atom

An interactive explainer that lets you click down through 8 levels — Brain → Brain Regions → Neural Circuits → Neurons → Synapses → SYNGAP1 Protein → Amino Acids → Chemical Elements. A toggle at the top switches the whole app between two audiences:

- **👪 For Families** (the default view) — simple animated 2D illustrations, all built in a consistent LEGO-brick style and following one continuous story — a global shipping network, made of major cities, connected by highways, traveled by delivery trucks, meeting at loading docks, staffed by a dock worker, built from LEGO-like bricks, molded from raw atoms — paired with plain-language explanations, no science background assumed.
- **🔬 For Researchers** — the original rotatable 3D models (including a real, high-fidelity NIH brain scan) paired with the detailed research write-ups and citations.

Both views share the same navigation (level map, breadcrumb, ← / → arrow keys, and the "Zoom into…" button), so you can switch depth of detail at any point without losing your place.

## Files

- `index.html` — the app (HTML/CSS/JS)
- `data.json` — the content backend: every level's facts, research summaries, citations, and 3D-model settings (domain boundaries, element data, etc.) live here
- `vendor/` — a local copy of the Three.js 3D library the viewer uses (`three.module.min.js`, `OrbitControls.js`, `GLTFLoader.js`, `BufferGeometryUtils.js`) — no internet connection needed once you have these files
- `models/brain-whole.glb` — the high-fidelity brain mesh used at the Brain and Brain Regions levels (see "About the 3D models" below)

## How to use it — run a local server (required for the 3D viewer)

Unlike a typical static HTML page, this app's 3D viewer is built with JavaScript modules, and **browsers (Chrome/Edge in particular) block JavaScript modules from loading when a file is opened directly from disk** (a `file://` address) — that's a browser security rule, not something this app can work around. If you just double-click `index.html`, you'll see clear on-screen instructions rather than a blank page, pointing you back here.

To run it, serve the folder with any simple local web server. From a terminal, in this folder:

```
python3 -m http.server 8000
```

then open `http://localhost:8000` in your browser. (Any other static server works too — e.g. `npx serve`, VS Code's "Live Server" extension, or uploading the folder to Netlify/GitHub Pages/etc.)

Firefox is more permissive about local modules and can sometimes run the app directly from disk without a server, but a local server is the reliable option across all browsers.

## Editing content

Each entry in `data.json`'s `levels` array has:

- `name`, `shortName`, `tagline`, `icon`, `color` — display basics (used in both views)
- `summary` — the researcher-mode intro paragraph
- `facts` — an array of short bullet points ("Quick facts", researcher mode)
- `sections` — an array of `{heading, text}` objects for the longer research write-up (researcher mode only)
- `citations` — an array of `{title, url}` objects, rendered as a clickable source list (shown in both views)
- `laymanTagline`, `laymanSummary` — the plain-language tagline and intro paragraph shown in For Families mode
- `laymanFacts` — an array of short, plain-language bullet points for For Families mode
- `laymanCaption` — the one-line caption shown under the 2D illustration, tying it to the metaphor (e.g. "Like a brake pedal that keeps things from speeding up too fast")
- `childId` — the `id` of the level one click deeper (the last level, Chemical Elements, has `childId: null`)
- `model3d` — settings for that level's scene (used to pick BOTH the 3D research model and the matching 2D family illustration, via `type`):
  - `type` picks which built-in scene to render (`brain`, `regions`, `circuits`, `neuron`, `synapse`, `protein`, `amino-acid`, `elements`)
  - `regions` (Brain Regions level) — id/name/color per highlighted region
  - `toggle` (Circuits/Neurons/Synapses levels) — labels for the "typical vs. SYNGAP1-affected" switch (researcher mode)
  - `domains` (Protein level) — domain name, residue start/end, color, and description; segment lengths in the 3D ribbon are proportional to these ranges
  - `examples` (Amino Acids level) — the amino acid variants offered in the tab buttons (researcher mode)
  - `items` (Elements level) — atomic number, protons, neutrons, electron shell configuration, and color per element (researcher mode)

If a level is missing a `laymanTagline`/`laymanSummary`/`laymanFacts`, the app automatically falls back to the researcher-mode text for that field, so partial edits never break the page.

`index.html` fetches `data.json` fresh on every load when served over http(s), so editing `data.json` and refreshing the page is enough — no need to touch `index.html`. (There's also a snapshot of `data.json` embedded inside `index.html` as a fallback for the rare case `data.json` can't be fetched; it won't reflect edits unless regenerated, which only matters if you're troubleshooting — normal editing via a local server doesn't need it.)

## The 2D family illustrations

The For Families view swaps the 3D viewer for a small, self-contained, animated SVG illustration per level (built directly in `index.html`/`template.html` via a shared `brickPiece()` helper — no extra image files needed). Every illustration is drawn from the same LEGO-style bricks, and together they tell one continuous shipping-network story as you drill down:

| Level | Metaphor |
|---|---|
| The Brain | The complete global shipping network |
| Brain Regions | Major cities in the network (like New York or Tokyo), each with a specialty |
| Neural Circuits | The highway systems connecting the cities |
| Neurons | The individual delivery trucks driving the highways |
| Synapses | The loading docks where trucks hand off packages |
| The SYNGAP1 Protein | The dock worker who builds structures and moves packages |
| Amino Acids | The LEGO-like bricks that snap together to build the worker |
| Chemical Elements | The raw atoms (carbon, hydrogen, nitrogen, oxygen, sulfur) the bricks are molded from |

Tapping the illustration itself advances to the next level, same as clicking the 3D model in researcher mode. To restyle or swap a metaphor, edit the matching function in the `ILLUS` object in `template.html` (keyed by `model3d.type`) — each one is a self-contained function that takes the level's color and returns an SVG string.

## About the 3D models

Most of the models (circuits, neurons, synapses, protein, amino acids, elements) are stylized, schematic visualizations built to teach concepts and relative proportions — not photorealistic anatomy, true atomic-scale structures, or the literal solved 3D fold of SYNGAP1 (no verified atomic-coordinate structure was used). The SYNGAP1 protein level, for example, is a domain map: segment lengths reflect real published residue ranges for the PH, C2, and RasGAP domains, but the coiled-coil segment's exact boundaries weren't confirmed in our sources and are shown in an approximate, representative position. This is noted in-app under that level too.

The Brain and Brain Regions levels use a real, high-fidelity brain mesh (`models/brain-whole.glb`), sourced from [3D.NIH.gov](https://3d.nih.gov/discover) (NIH 3D Print Exchange) and processed (mesh-welded and decimated) for fast web loading. It loads asynchronously — you'll briefly see a simplified placeholder swap for the detailed model. Note that this particular scan shows an "atrophic" brain (some tissue loss visible on MRI); it's used here for its anatomical detail and fidelity, not as a representation of typical SYNGAP1-RD imaging findings — as noted elsewhere in the app, brain MRI in SYNGAP1-RD is usually normal. If attribution details for the exact source entry are needed (author, entry ID, license), let us know and we'll confirm and add them here.

## Notes on the content

All facts and citations were compiled from published, peer-reviewed literature and reputable clinical/genetic resources (GeneReviews, NORD, Orphanet, PubMed/PMC, UniProt, and others — see the "Published sources" list on every level). This is an educational summary, not medical advice, and SYNGAP1 research is moving quickly — always check the original sources for the latest findings.
