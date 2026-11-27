---
name: pixel-vfx-maker
description: >-
  Engine-agnostic procedural pixel-art VFX flipbook creation, 10-stage causal
  animation & combat timing, universal grayscale tinting (Unity, Godot, Unreal,
  Three.js/WebGL, 2D engines, and Roblox Studio), modular rarity/combine tier
  scaling, 3D plane geometry mapping with 1:1 anti-stretch ribbon tiling,
  camera-facing 1:1 projectile symmetry, and automated causal verification. Use
  whenever designing, building, revising, exporting, or auditing pixel VFX
  flipbooks, 3D plane VFX showcases, or attack animation-to-VFX timing in any
  2D or 3D game engine.
---

# Pixel VFX Maker — Engine-Agnostic Flipbook & 3D Plane Standard

A production-tested workflow for designing, rasterizing, previewing on real 3D planes (offline WebGL), and shipping universal grayscale pixel-art VFX flipbooks to **any 2D or 3D game engine** — **Unity, Godot, Unreal Engine, Three.js / WebGL, Raylib / Phaser / Love2D, or Roblox Studio** — with crisp nearest-neighbor pixels, zero distortion, and strict combat causality.

---

## 1. Mandatory 10-Stage Animation & VFX Lifecycle

Every combat ability and VFX showcase MUST enforce strict **causal order** and **spatial ownership**:

| # | Stage | Meaning | Spatial Owner | Target Impact VFX Allowed? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Anticipation** | Preparation cue before action begins | Caster / Attacker | **NO (`0 px`)** |
| 2 | **Wind-up** | Momentum & posture build-up | Caster / Attacker | **NO (`0 px`)** |
| 3 | **Charging** | Energy or force gathering | Caster / Weapon / Muzzle | **NO (`0 px`)** |
| 4 | **Casting** | Skill activation pose | Caster / Attacker | **NO (`0 px`)** |
| 5 | **Release** | Projectile, beam, wave, or swing launches | Caster Launch Point | **NO (`0 px`)** |
| 6 | **Travel** | Delivery crosses the arena toward target | Mid-Air / Ground Path | **NO (`0 px`)** |
| 7 | **Impact** | Delivery physically contacts target hitbox | Target Hitbox | **YES — Starts here (`F0`/`F1`)** |
| 8 | **Follow-through** | Aftershock, debris, smoke, recoil | Caster + Impact Zone | Active decay / shards |
| 9 | **Recovery** | Actors return to idle stance | Caster & Target | Optional trailing |
| 10 | **Dissipation** | Visual effects cleanly fade out | Impact / World | Fades to **`0 px`** (OneShot) |

### Hard Causal Invariants
- **Zero Pre-Contact Impact:** Target impact/splash flipbooks MUST NOT draw even 1 pixel (nor trigger hit-flash, screen shake, recoil, or floating damage numbers) on the target during Stages 1–6 (`Anticipation` through `Travel`).
- **Spatial Separation:** Never bake Caster `Charging` / lock-on reticles or `Release` muzzle flashes into a Target `Impact` flipbook sheet.
- **Instant-Contact Impact Sheets:** Target hit/impact sheets MUST peak immediately at **Frame 0** (ranged impact/burst, punch, stomp, swipe, thrust) or **Frame 1** (1-frame melee cut-in whip → peak hit for slash, claw, bite) — never after 5–6 idle anticipation frames.
- **Causal Damage Text Sync:** For Ranged deliveries (`projectile`, `beam`, `chain`, `wave`), delay floating damage numbers and Crit flashes by `TravelDuration` so numbers pop at the **exact millisecond of visual contact**, not at release time.
- **Universal Reusable Impact:** Dominant delivery VFX trigger a compact universal `hit_impact` (or `splash` / `pulse`) on contact rather than baking duplicate detonation frames into every delivery sheet.

---

## 2. Universal Grayscale Raster & Export Rules

- **Canvas & Grid:** Integer `64×64` per cell (`4×4` = 16 frames standard; `4×2` = 8 frames for lightweight status VFX), zero anti-aliasing, nearest-neighbor upscale (`1×` native `256×256` or `4×` crisp `1024×1024` / `1024×512`) to transparent PNG.
- **UV Safe Bleed Margin:** Strict `2px` empty border (`x, y ∈ [2..61]`) on every cell (`0` edge-bleed pixels) so GPU texture samplers, mip-edges, or atlas UV math never bleed pixels across adjacent flipbook cells.
- **2 Calibrated Grayscale Presets (All Tint Colors Safe — Including Dark/Black & White):**
  - **`Alpha Crisp`** (`OUTLINE [24,24,28]` → `SHADOW [68,68,74]` → `DARK [112,112,118]` → `MID [168,168,174]` → `BRIGHT [216,216,222]` → `HOT [242,242,246]` → `CORE [255,255,255]`): Used for contact hits, rubble, pillars, chains, waves, buffs/debuffs.
  - **`Soft Transparent`** (no heavy dark box outline; layered alpha `[76..246]` + subtle `RIM [96,96,104,155]` + Bayer dithering): Used for `aura`, `floor_effect`, `barrier`, `rise_particles`, `charge`, `projectile`, `beam_shoot`, `pulse`, `smoke_puff`.
  - **Dark / Black Element Protection:** NEVER use Additive blending (`SrcAlpha, One` / `Add` / `LightEmission > 0`) on dark/Black elements (additive dark RGB adds near-zero light and vanishes on bright backgrounds!). Force **standard alpha blending** (`SrcAlpha, OneMinusSrcAlpha`, `Unlit/Transparent`, `LightEmission = 0`) with legible deep-violet/obsidian rim contrast.
- **OneShot vs Seamless Loop:**
  - **OneShot (`F_last === 0px`):** `hit_*`, `nova_explode`, `pulse`, `splash`, `rubble`, `pilar`, `chain`, `wave`, `ground_fissure`, `smoke_puff`, `buff_up`, `debuff_down`, `status_cancel`, `status_dot_tick`, `status_cleanse`.
  - **Seamless Loop (`F_N === F_0`, `wrapDiff === 0`):** `aura`, `floor_effect`, `barrier`, `rise_particles`, `orbit`, `charge`, `projectile`, `beam_shoot`, `rain`, `status_lock`.

---

## 3. 3D Plane Geometry & Anti-Distortion Rules (Engine-Agnostic)

Never force every VFX onto a single flat camera billboard. Map each archetype to its real 3D plane geometry across engines:

| 3D Plane Type | Use Cases | WebGL / Three.js | Unity / Godot / Unreal | Roblox Studio |
| :--- | :--- | :--- | :--- | :--- |
| **Camera Billboard** | `hit_*`, `projectile`, `charge`, `nova_explode`, `smoke_puff`, `rubble` | Camera-aligned quad (`NearestFilter`, `depthWrite: false`) | Unity `Billboard` Particle / Godot `Billboard` `AnimatedSprite3D` / UE `Sprite Renderer` | `ParticleEmitter` (`FacingCamera`, `Grid4x4`, `ZOffset`) |
| **Horizontal Ground XZ** | `floor_effect`, `pulse`, `hit_stomp`, `wave`, `ground_fissure` | Horizontal XZ quad (`y + 0.04`) | Unity `Horizontal Billboard` / Godot XZ `QuadMesh` / UE `Facing Custom (0,0,1)` | Invisible thin `Part` (`Transparency = 1`) + `SurfaceGui` (`Top`, `Pixelated`) |
| **Crossed Vertical X-Plane** | `pilar`, `aura`, `barrier`, `rise_particles`, `rain`, `splash`, `buff_up`, `debuff_down`, `status_lock`, `status_cleanse` | 2–3 intersecting vertical quads (`0°`, `90°`, `45°`) | Crossed double-sided `QuadMesh` / UE Mesh Renderer (`TwoSided`) | 2 perpendicular invisible `Part`s (`±45°`) + double-sided `SurfaceGui` (`Front`/`Back`) |
| **Stretched 1:1 Tiled Ribbon** | `beam_shoot`, `chain` | 2 crossed axis-aligned quads (`Caster → Target`) with tiled UVs | Unity `LineRenderer` (`Tile`) / Godot tiled UV shader / UE `Niagara Ribbon` (`UV0 Tiling Distance`) | 2 crossed invisible `Part`s + **1:1 tiled `SurfaceGui` `ImageLabel`s** |
| **3D Orbit Ring** | `orbit` | `N` camera billboards revolving around Y axis | `N` billboard children on rotating pivot | `N` invisible carriers orbiting root on `RenderStepped` |

### Critical 3D Distortion Guardrails (Universal Across All 3D Engines)
1. **Camera-Facing Projectiles MUST Be 1:1 Symmetric (Zero Baked Trails):**
   - Never bake a horizontal tail (`-->`) into a camera-facing billboard projectile — when the 3D camera orbits to front/back/opposite angles, the baked tail points the wrong direction!
   - Use a compact, non-rotating **1:1 symmetric sprite** (e.g., translucent glowing `Energy Square` or `Energy Orb`) that reads cleanly from all 360° camera angles. If a motion ribbon is desired, attach a separate world-space engine trail (`TrailRenderer` / `Ribbon` / `Trail`) to the moving carrier.
2. **Stretched 3D Ribbons MUST Tile 1:1 (Never Stretch 1 Square Cell Over Long Distances!):**
   - Stretching a single `64×64` frame horizontally across a long beam turns every pixel into wide 5:1 horizontal bars and turns any mid-beam surge into giant stepped blocks.
   - **Universal Solution:**
     - Keep `beam_shoot` texture **uniform & straight** across `x ∈ [2..61]` (zero wide outward mid-beam bulges).
     - Tile `N = max(1, round(beamLength / beamThickness))` square segments along the beam axis, cropping the `2px` (`8px` at 4×) left/right safe UV border (`innerU = [2/64 .. 62/64]`, i.e., `240/256 px` at 4×) so adjacent segments stitch with **zero gap** and **1:1 square pixels** at any range!
     - Reveal the beam from Caster → Target using a world-space clip mask or UV-range reveal rather than scaling the texture horizontally.

---

## 4. Anti-Mewah Modular Tier Scaling (5-Tier Progression)

Keep base grayscale flipbooks clean, restrained, and readable. Scale visual richness **by code** through 3D plane layering, scale, and Dual-Color tinting (avoid generating 5 duplicate sprite sheets per VFX):

1. **Common / Uncommon (`0.80×`, 1 layer):** Single compact base VFX, clean fast dissipation, `0` shake, no extra shockwave.
2. **Combine `Tier 2` (`0.95×`, 1–2 layers):** Base VFX + subtle Caster `charge` or light `hit_impact`.
3. **Rare (`1.08×`, 2 layers):** Base VFX + secondary ground `pulse` / `smoke_puff` / `rubble` + crisp hit punch.
4. **Combine `Tier 4` (`1.18×`, 2–3 layers + Dual-Color Fusion):** Primary tint on core layer + Secondary tint on shockwave/aura/accent layers.
5. **Epic (`1.32×`, 3–4 layers):** Full 10-stage multi-plane composition (`aura` + `charge` + delivery + crossed impact + floor/debris follow-through).

---

## 5. Abstract Status VFX & Symbol Restraint

Avoid overly literal icons (dizzy stars, medical `+` crosses, medieval kite shields):
- **`barrier`**: Abstract geometric/hex energy field dome (not a kite shield).
- **`rise_particles`**: Neutral rising luminous pixel motes (no `+` medical symbols).
- **`buff_up` / `debuff_down`**: Clean directional upward/downward chevrons.
- **Compact 8-Frame (`4×2`) Status VFX:**
  - `status_lock` *(Loop)* — Segmented constraint bands (action locks, stun/freeze).
  - `status_cancel` *(OneShot)* — Crisp geometric X-snap fracture (cast interrupt, buff strip).
  - `status_dot_tick` *(OneShot)* — Compact torso tick burst (DOT, periodic debuff tick).
  - `status_cleanse` *(OneShot)* — Upward purifying sweep ring (remove negatives, cleanse).

---

## 6. Multi-Engine Integration Cheat Sheet

### Universal Import Rules (All Engines)
- **Texture Filtering:** Always use **Point / Nearest-Neighbor** (`FilterMode.Point`, `TEXTURE_FILTER_NEAREST`, `2D Pixels (unfiltered)`, `THREE.NearestFilter`, `ResampleMode.Pixelated`).
- **Mipmaps & Compression:** Disable mipmaps and lossy block compression (BC/DXT introduces color fringe around hard pixel edges).
- **Runtime Speed Sync:** Scale playback framerate and lifetime with combat/game time scale (`duration = baseDur / timeScale`, `fps = baseFps * timeScale`).

### Engine-Specific Quick Reference
- **Unity (Built-in / URP):**
  - Import PNG with `Filter Mode = Point (no filter)`, `Compression = None`, `Generate Mip Maps = Off`.
  - Use `ParticleSystem` → `Texture Sheet Animation` (`Mode = Grid`, `Tiles = 4×4` or `4×2`, `Time Mode = Lifetime`), tint via `Start Color` / `Color over Lifetime`.
  - Use `LineRenderer` (`Texture Mode = Tile`) with cropped UV shader for 1:1 `beam_shoot` / `chain`.
- **Godot 4:**
  - Import texture with `Mipmaps = Off`, material `texture_filter = Nearest`, `shading_mode = Unshaded`, `transparency = Alpha` (never Additive for Dark/Black tint).
  - Use `AnimatedSprite3D` (`hframes = 4`, `vframes = 4` or `2`, `billboard` per plane type) or `GPUParticles3D` (`particles_anim_h_frames`, `particles_anim_v_frames`), tint via `modulate` / `albedo_color`.
- **Unreal Engine 5 (Niagara):**
  - Set Texture Group to **`2D Pixels (unfiltered)`** and `Mip Gen Settings = NoMipmaps`.
  - Use Niagara `SubUV Animation` (`Sub Image Size = (4, 4)` or `(4, 2)`), `Unlit` + `Translucent` material multiplied by `ParticleColor`, and `Ribbon Renderer` with `UV0 Tiling Distance` matched to ribbon width for 1:1 beams.
- **Three.js / WebGL & 2D Engines (Phaser, Raylib, Love2D, GameMaker):**
  - Set `magFilter = minFilter = NearestFilter`, `generateMipmaps = false`.
  - Slice each frame via integer source rect `(col * cellPx, row * cellPx, cellPx, cellPx)` and multiply RGB by tint color in shader / sprite draw call.
- **Roblox Studio (Tested Production Gotchas):**
  - **Exact Enums:** Use **`Enum.ParticleFlipbookLayout.Grid4x4`** and **`Enum.ParticleFlipbookMode.OneShot` / `.Loop`** (NOT `Enum.FlipbookLayout`).
  - **Radius vs Diameter:** `ParticleEmitter.Size` is **radius (half-width)** → pass `desiredStuds * 0.5`.
  - **Anti-Clip `ZOffset`:** Calibrate billboard `ZOffset >= 0.45 * unitDepth` (e.g., `4.4–5.6 studs` for `8–12 stud` units) so hit slashes never clip inside character torsos.
  - **Non-Square (`4×2`) & 1:1 Tiled Ribbons:** `ParticleEmitter` supports square grids (`2×2`, `4×4`, `8×8`) only; render `4×2` sheets and 1:1 tiled ribbons via invisible `Part` (`Transparency = 1`) + `SurfaceGui` + `ImageLabel` (`ResampleMode.Pixelated`, `ImageRectSize = (240, 256)`, `ImageRectOffset = (col * 256 + 8, row * 256)`, `ClipsDescendants = true`).
  - **CRITICAL `SurfaceGui` `Top`/`Bottom` UV Swap Gotcha:** In Roblox, `Enum.NormalId.Top` and `.Bottom` swap the horizontal/vertical UV axes by 90° compared to `Front`/`Back` (mapping `CanvasSize.X` to `Size.Z` and `CanvasSize.Y` to `Size.X`). Never attach a `Top`/`Bottom` `SurfaceGui` to the horizontal plane of a crossed 3D beam/ribbon — it renders a rotated 90° box across the middle of the beam! Instead, give the horizontal ribbon carrier the **same** `Size = Vector3.new(fullLen, thick, 0.06)`, rotate it `CFrame.Angles(math.rad(90), 0, 0)` around its local `X` axis, and attach **`Front` & `Back`** `SurfaceGui`s identically to the vertical plane.
  - **Batch Upload:** Serve local PNG exports over `127.0.0.1` or use Asset Manager Bulk Import, store IDs in a central registry module, and call `ContentProvider:PreloadAsync`.

---

## 7. Mandatory Automated Verification Gate

Never stop at syntax checks alone. Before declaring any VFX or 3D showcase done, run automated checks verifying:
1. **Syntax & Bindings:** Every script parses cleanly; all UI bindings (web) or engine compile checks pass with `0` errors.
2. **Pixel Integrity:** `0` edge-bleed pixels outside `[2..61]`; `0` chromatic color leaks in grayscale sheets; every `OneShot` final cell is strictly `0 px`; every `Loop` wraps cleanly (`wrapDiff === 0`).
3. **10-Stage Causal Audit:** `0` target impact VFX planes, `0` target hit-flashes, `0` damage/shake during Stages 1–6 (`Anticipation` through `Travel`); `Charging` / `Wind-up` / `Release` anchored strictly to Caster; Dark/Black tint never uses additive blend.
4. **Target Engine Runtime Audit:** Run a live test scene in the target engine, confirm `0` console/runtime errors, `0` visible carrier/placeholder meshes, crisp point-filtered pixels, and `1:1` non-stretched beam segments.
