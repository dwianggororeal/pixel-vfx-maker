---
name: pixel-vfx-maker
description: >-
  Procedural pixel-art VFX flipbook creation, 10-stage animation & combat timing,
  universal grayscale tinting (WebGL/Three.js & Roblox Studio), modular rarity/combine
  tier scaling, 3D plane geometry mapping with 1:1 anti-stretch ribbon tiling,
  FacingCamera 1:1 projectile symmetry, and automated causal verification. Use whenever
  designing, building, revising, uploading, or auditing pixel VFX flipbooks, 3D plane
  VFX showcases, or attack animation-to-VFX timing.
---

# Pixel VFX Maker — Procedural Flipbook & 3D Plane Standard

A production-tested workflow for designing, rasterizing, previewing on 3D planes (offline WebGL / Three.js), and deploying universal grayscale pixel-art VFX flipbooks directly into **Roblox Studio** (`ParticleEmitter` + `SurfaceGui` `Pixelated` 3D planes) with zero laggy neon parts and strict combat causality.

---

## 1. Mandatory 10-Stage Animation & VFX Lifecycle

Every combat ability and VFX showcase MUST enforce strict **causal order** and **spatial ownership**:

| # | Stage | Meaning | Spatial Owner | Enemy Impact VFX Allowed? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Anticipation** | Persiapan sebelum aksi dilakukan | Ally / Caster | **NO (`0 px`)** |
| 2 | **Wind-up** | Gerakan ancang-ancang mulai dibangun | Ally / Caster | **NO (`0 px`)** |
| 3 | **Charging** | Energi/kekuatan dikumpulkan | Ally / Weapon / Muzzle | **NO (`0 px`)** |
| 4 | **Casting** | Pose/gerakan aktivasi skill | Ally / Caster | **NO (`0 px`)** |
| 5 | **Release** | Energi, proyektil, atau ayunan dilepaskan | Ally Launch Point | **NO (`0 px`)** |
| 6 | **Travel** | Proyektil, beam, wave, atau lunge bergerak ke target | Mid-Air / Arena Path | **NO (`0 px`)** |
| 7 | **Impact** | Efek menyentuh target/objek | Enemy Hitbox | **YES — Starts here (`F0`/`F1`)** |
| 8 | **Follow-through** | Gerakan lanjutan + aftershock/pecahan | Ally + Impact Zone | Active decay / shards |
| 9 | **Recovery** | Karakter kembali ke stance normal | Ally & Enemy | Optional trailing |
| 10 | **Dissipation** | Efek visual memudar & menghilang bersih | Impact / World | Fades to **`0 px`** (OneShot) |

### Hard Causal Invariants
- **Zero Pre-Contact Impact:** Target impact/splash flipbooks MUST NOT draw even 1 pixel (nor trigger hit-flash, screen shake, recoil, or damage text) on the enemy during Stages 1–6 (`Anticipation` through `Travel`).
- **Spatial Separation:** Never bake Ally `Charging` / lock-on reticles or `Release` muzzle flashes into an Enemy `Impact` flipbook sheet.
- **Instant-Contact Impact Sheets:** Enemy hit/impact sheets MUST peak immediately at **Frame 0** (ranged impact/burst, punch, stomp, swipe, thrust) or **Frame 1** (1-frame melee cut-in whip → peak hit for slash, claw, bite) — never after 5–6 idle anticipation frames.
- **Causal Damage Text Sync:** For Ranged deliveries (`projectile`, `beam`, `chain`, `wave`), delay floating damage numbers and Crit flashes by `TravelDur` so numbers pop at the **exact millisecond of visual contact**, not at release time.
- **Universal Reusable Impact:** Dominant delivery VFX trigger a compact universal `hit_impact` (or `splash` / `pulse`) on contact rather than baking duplicate detonation frames into every delivery sheet.

---

## 2. Universal Grayscale Raster & Export Rules

- **Canvas & Grid:** Integer `64×64` per cell (`4×4` = 16 frames standard; `4×2` = 8 frames for lightweight status VFX), zero anti-aliasing, nearest-neighbor upscale `4×` to transparent PNG (`1024×1024` for 4×4; `1024×512` for 4×2).
- **UV Safe Bleed Margin:** Strict `2px` empty border (`x, y ∈ [2..61]`) on every cell (`0` edge-bleed pixels) so bilinear texture samplers never bleed pixels across adjacent flipbook cells.
- **2 Calibrated Grayscale Presets (All Elements Safe — including Black & White):**
  - **`Alpha Crisp`** (`OUTLINE [24,24,28]` → `SHADOW [68,68,74]` → `DARK [112,112,118]` → `MID [168,168,174]` → `BRIGHT [216,216,222]` → `HOT [242,242,246]` → `CORE [255,255,255]`): Used for contact hits, rubble, pillars, chains, waves, buffs/debuffs.
  - **`Soft Transparent`** (no heavy dark box outline; layered alpha `[76..246]` + subtle `RIM [96,96,104,155]` + Bayer dithering): Used for `aura`, `floor_effect`, `barrier`, `rise_particles`, `charge`, `projectile`, `beam_shoot`, `pulse`, `smoke_puff`.
  - **Element Black Protection:** NEVER use Additive blending (`LightEmission > 0` / `gl.ONE`) on dark/Black elements (additive dark RGB becomes invisible!). Force `LightEmission = 0`, `Brightness = 1.0`, and normal alpha blending with legible deep-violet/obsidian rim contrast.
- **OneShot vs Seamless Loop:**
  - **OneShot (`F_last === 0px`):** `hit_*`, `nova_explode`, `pulse`, `splash`, `rubble`, `pilar`, `chain`, `wave`, `ground_fissure`, `smoke_puff`, `buff_up`, `debuff_down`, `status_cancel`, `status_dot_tick`, `status_cleanse`.
  - **Seamless Loop (`F_N === F_0`, `wrapDiff === 0`):** `aura`, `floor_effect`, `barrier`, `rise_particles`, `orbit`, `charge`, `projectile`, `beam_shoot`, `rain`, `status_lock`.

---

## 3. 3D Plane Geometry & Anti-Distortion Rules (WebGL / Three.js ↔ Roblox Studio)

Never force every VFX onto a single flat camera billboard. Map each archetype to its real 3D plane geometry:

| 3D Plane Type | Use Cases | WebGL / Three.js | Roblox Studio (Zero Visible Parts) |
| :--- | :--- | :--- | :--- |
| **Camera Billboard** | `hit_*`, `projectile`, `charge`, `nova_explode`, `smoke_puff`, `rubble` | Camera-aligned quad (`NEAREST`, `depthWrite: false`) | `ParticleEmitter` (`FacingCamera`, `Grid4x4`, `ZOffset`) |
| **Horizontal Ground XZ** | `floor_effect`, `pulse`, `hit_stomp`, `wave`, `ground_fissure` | Horizontal XZ quad (`y + 0.04`) | Invisible thin `Part` (`Transparency = 1`) + `SurfaceGui` (`Top`, `ResampleMode.Pixelated`) |
| **Crossed Vertical X-Plane** | `pilar`, `aura`, `barrier`, `rise_particles`, `rain`, `splash`, `buff_up`, `debuff_down`, `status_lock`, `status_cleanse` | 2–3 intersecting vertical quads (`0°`, `90°`, `45°`) | 2 perpendicular invisible `Part`s (`±45°`) + double-sided `SurfaceGui` (`Front`/`Back`, `ResampleMode.Pixelated`) |
| **Stretched 1:1 Tiled Ribbon** | `beam_shoot`, `chain` | 2 crossed axis-aligned quads (`Ally → Enemy`) with tiled UVs | 2 intersecting invisible `Part`s (vertical + horizontal) + **1:1 tiled `SurfaceGui` `ImageLabel`s** |
| **3D Orbit Ring** | `orbit` | `N` camera billboards revolving around Y axis | `N` invisible carriers orbiting unit root on `RenderStepped` |

### Critical 3D Distortion Guardrails (Production-Tested!)
1. **`FacingCamera` Projectiles MUST Be 1:1 Symmetric (Zero Baked Trails):**
   - Never bake a horizontal tail (`-->`) into a `FacingCamera` billboard projectile — when the 3D camera orbits to front/back/opposite sides, the baked tail points the wrong direction!
   - Use a compact, non-rotating **1:1 symmetric sprite** (e.g., translucent glowing `Energy Square` or `Energy Orb`) that reads cleanly from all 360° angles. If a motion trail is desired in Roblox, attach a separate world-space `Trail` instance to the moving carrier.
2. **Stretched 3D Ribbons MUST Tile 1:1 (Never Stretch 1 Square Cell Over 30–50 Studs!):**
   - Stretching a single `64×64` frame horizontally across a 3-tile (`~44 stud`) ranged beam stretches every pixel into wide 5:1 horizontal pancakes and turns any mid-beam bulge into giant stepped blocks!
   - **Solution:**
     - Keep `beam_shoot` texture **uniform & straight** across `x ∈ [2..61]` (zero wide outward bulges).
     - In Roblox `SurfaceGui`, tile `tileCount = max(1, round(fullLen / thickness))` side-by-side `ImageLabel`s (`CanvasSize = (tileCount * 240, 256)`), cropping the `2px` (`8px` at 4×) left/right UV margin via `ImageRectSize = (240, 256)` and `ImageRectOffset = (col * 256 + 8, row * 256)` so adjacent tiles stitch with **zero gap** and **1:1 square pixels** at any range!
     - Use `ClipsDescendants = true` on the expanding ribbon frame as it shoots from Ally → Enemy.

---

## 4. Anti-Mewah Modular Tier Scaling (5-Tier Progression)

Keep base grayscale flipbooks clean, restrained, and readable. Scale visual richness **by code** through 3D plane layering, scale, and Dual-Color tinting (avoid generating 5 separate sprite sheets per VFX):

1. **Common / Uncommon (`0.80×`, 1 layer):** Single compact base VFX, clean fast dissipation, `0` shake, no extra shockwave.
2. **Combine (`C+C`, `U+C`) (`0.95×`, 1–2 layers):** Base VFX + subtle Ally `charge` or light `hit_impact`.
3. **Rare (`1.08×`, 2 layers):** Base VFX + secondary ground `pulse` / `smoke_puff` / `rubble` + crisp hit punch.
4. **Combine (`U+U`, `C+R`) (`1.18×`, 2–3 layers + Dual-Color Fusion):** Primary Element tint on core layer + Secondary Element tint on shockwave/aura/accent layers.
5. **Epic (`1.32×`, 3–4 layers):** Full 10-stage multi-plane composition (`aura` + `charge` + delivery + crossed impact + floor/debris follow-through).

---

## 5. Abstract Status VFX & Symbol Restraint

Avoid overly literal icons (dizzy stars, medical `+` crosses, medieval kite shields):
- **`barrier`**: Abstract geometric/hex energy field dome (not a kite shield).
- **`rise_particles`**: Neutral rising luminous pixel motes (no `+` medical symbols).
- **`buff_up` / `debuff_down`**: Clean directional upward/downward chevrons.
- **Compact 8-Frame (`4×2`) Status VFX:**
  - `status_lock` *(Loop)* — Segmented constraint bands (action locks, pause/freeze).
  - `status_cancel` *(OneShot)* — Crisp geometric X-snap fracture (cast cancel, buff strip).
  - `status_dot_tick` *(OneShot)* — Compact torso tick burst (DOT, anti-heal trigger).
  - `status_cleanse` *(OneShot)* — Upward purifying sweep ring (remove negatives, cleanse).

---

## 6. Roblox Studio Implementation & Upload Reference

### Exact Luau Enum & Property Gotchas
- **Exact Flipbook Enums:** Use **`Enum.ParticleFlipbookLayout.Grid4x4`** and **`Enum.ParticleFlipbookMode.OneShot` / `Enum.ParticleFlipbookMode.Loop`** (NOT `Enum.FlipbookLayout` or `Enum.FlipbookMode`!).
- **Radius vs Diameter:** `ParticleEmitter.Size` is **radius (half-width)** — divide desired full stud diameter by `2` (`NumberSequence.new(desiredStuds * 0.5)`).
- **Arena Scale & Anti-Clip Calibration:** Always inspect actual workspace tile pitch & monster bounding boxes before setting base sizes! Set billboard `ZOffset >= 0.45 * monsterDepth` (e.g., `4.4–5.6 studs` for `8–12 stud` monsters) so hit slashes never clip inside monster torsos.
- **Speed Sync (`Attack Motion Base` & Battle Speed):** Scale `Lifetime = baseDur / timeScale`, `FlipbookFramerate = baseFps * timeScale`, and shared `RenderStepped` delta `scaledDt = dt * timeScale`.
- **Non-Square Grids (`4×2`):** Roblox `ParticleEmitter` supports `Grid2x2`, `Grid4x4`, `Grid8x8` only; render `4×2` 8-frame sheets via `SurfaceGui` + `ImageLabel` (`ImageRectOffset` + `ResampleMode.Pixelated`) or duplicate each frame 2× into `Grid4x4`.

### Fast Batch Export & Upload Workflow
1. Batch-export `1024×1024` transparent grayscale PNGs (`4×` nearest-neighbor) locally with `0` edge bleed.
2. Serve the export folder briefly on `http://127.0.0.1:<port>/` and batch-upload via `Roblox_Studio` MCP `upload_image` (or Studio Asset Manager Bulk Import) to collect all `rbxassetid://` IDs cleanly.
3. Store all IDs, element tint tables, and per-species recipes in a single data-driven `PixelVfxRegistry.luau` module; preload all IDs via `ContentProvider:PreloadAsync` on client `Init()`.

---

## 7. Mandatory Automated Verification Gate

Never stop at syntax checks alone. Before declaring any VFX or 3D showcase done, run automated checks verifying:
1. **Syntax & Bindings:** Every script parses cleanly; all DOM IDs (web) or `require()` / `loadstring()` checks (Roblox) pass.
2. **Pixel Integrity:** `0` edge-bleed pixels outside `[2..61]`; `0` chromatic color leaks in grayscale sheets; every `OneShot` final cell is strictly `0 px`; every `Loop` wraps cleanly (`wrapDiff === 0`).
3. **10-Stage Causal Audit:** `0` enemy impact VFX planes, `0` enemy hit-flashes, `0` damage/shake during Stages 1–6 (`Anticipation` through `Travel`); `Charging` / `Wind-up` / `Release` anchored strictly to Ally; Element Black never uses additive blend.
4. **Roblox Live Playtest Audit (when editing Studio):** Run live combat, check `Workspace.BattleVFX` for `0` legacy neon parts & `0` visible carrier parts, and **always inspect `get_console_output`** to confirm **`0` runtime errors**.
