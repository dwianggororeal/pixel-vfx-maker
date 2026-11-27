# Pixel VFX Maker (`pixel-vfx-maker`)

> **Engine-Agnostic Procedural Pixel-Art VFX Flipbook Creation, 10-Stage Causal Combat Timing, Universal Grayscale Tinting, & Offline 3D Plane Preview Studio.**

An installable AI Agent Skill (`SKILL.md`) paired with a **zero-dependency offline WebGL 3D Plane Studio** featuring **32 universal grayscale pixel-art VFX flipbooks** calibrated for runtime color tinting (**Red, Green, Blue, Black, White, and Dual-Color fusions**). Export crisp nearest-neighbor transparent PNG flipbooks (`1024×1024` `4×4` / `1024×512` `4×2`) ready for **Unity, Godot, Unreal Engine, Three.js / WebGL, Raylib / Phaser / Love2D, and Roblox Studio**.

---

## Live Animated Showcases

### 1. 32 Universal Grayscale Pixel VFX Catalog (20 Live Samples)
![Pixel VFX Maker Catalog Grid](assets/showcase_catalog_grid.gif)

### 2. One Grayscale Sheet → Any Element / Tint (Including Dark-Safe Black & White)
![Universal Grayscale to 5 Elements Tinting](assets/showcase_elements_tint.gif)

### 3. 10-Stage Causal Combat Timing (Zero Pre-Contact VFX on Target)
![10-Stage Causal Melee vs Ranged Timing](assets/showcase_10stage_causal.gif)

---

## Multi-Engine Compatibility

Every flipbook exports as a **standard transparent PNG sprite sheet** (`2px` UV safe border per `64×64` cell → `0` edge bleed) that works out-of-the-box in any 2D or 3D engine:

| Engine / Framework | Texture Filter Setting | Flipbook / Particle Playback | 1:1 Tiled Beam / Ribbon |
| :--- | :--- | :--- | :--- |
| **Unity (URP / Built-in)** | `FilterMode.Point`, `MipMaps = Off` | `ParticleSystem` → `Texture Sheet Animation` (`4×4` / `4×2`) | `LineRenderer` (`TextureMode.Tile`) + cropped UV |
| **Godot 4** | `texture_filter = Nearest`, `Unshaded` | `AnimatedSprite3D` / `GPUParticles3D` (`hframes=4`, `vframes=4/2`) | Axis-aligned `QuadMesh` + tiled UV shader |
| **Unreal Engine 5** | `2D Pixels (unfiltered)`, `NoMipmaps` | `Niagara` `SubUV` (`4×4` / `4×2`) + `ParticleColor` tint | `Niagara Ribbon` (`UV0 Tiling Distance`) |
| **Three.js / WebGL** | `NearestFilter`, `generateMipmaps = false` | Shader UV offset `(col / cols, row / rows)` on 3D planes | Tiled UV quad with clip reveal |
| **2D Engines (Phaser, Raylib, Love2D, GameMaker)** | Point / Nearest draw | Integer cell rect `(col * cellPx, row * cellPx)` + vertex tint | Repeated segment strip along target vector |
| **Roblox Studio** | `ResampleMode.Pixelated` | `ParticleEmitter` (`Grid4x4`) + `SurfaceGui` (`4×2` & 3D planes) | `SurfaceGui` 1:1 tiled `ImageLabel`s (`ClipsDescendants`) |

---

## Core Design Principles (Encoded in `SKILL.md`)

### 1. Mandatory 10-Stage Animation & VFX Lifecycle
Every combat ability enforces strict **causal order** and **spatial ownership** so impact effects never spawn early or on the wrong actor:

| # | Stage | Spatial Owner | Target Impact VFX Allowed? |
| :--- | :--- | :--- | :--- |
| 1 | **Anticipation** | Caster / Attacker | **No (`0 px`)** |
| 2 | **Wind-up** | Caster / Attacker | **No (`0 px`)** |
| 3 | **Charging** | Caster / Muzzle / Weapon | **No (`0 px`)** |
| 4 | **Casting** | Caster / Attacker | **No (`0 px`)** |
| 5 | **Release** | Caster Launch Point | **No (`0 px`)** |
| 6 | **Travel** | Mid-Air / Arena Path | **No (`0 px`)** |
| 7 | **Impact** | Target Hitbox | **Yes — Instant Contact (`F0`/`F1`)** |
| 8 | **Follow-through** | Caster + Impact Zone | Active aftershock & shards |
| 9 | **Recovery** | Caster & Target | Stance reset |
| 10 | **Dissipation** | Impact / World | Clean fade to **`0 px`** (OneShot) |

### 2. Five 3D Plane Geometries & Anti-Distortion Guardrails
- **Camera Billboard:** Instant-contact hits (`hit_*`), `charge`, `nova_explode`, `smoke_puff`, `rubble`, and **1:1 symmetric `projectile`** (`Energy Square` — zero baked horizontal trails so 360° camera orbits never point the tail backward).
- **Horizontal Ground XZ:** `floor_effect`, `pulse`, `hit_stomp`, `wave`, `ground_fissure`.
- **Crossed Vertical X-Plane:** `pilar`, `aura`, `barrier`, `rise_particles`, `rain`, `splash`, `buff_up`, `debuff_down`, `status_lock`, `status_cleanse`.
- **1:1 Tiled Stretched Ribbon:** `beam_shoot` & `chain` — tiles `N = round(length / thickness)` square cells cropping the `2px` (`8px` @ 4×) safe UV border so laser pixels stay crisp **1:1 squares** across any distance (never stretched into wide horizontal bars).
- **3D Orbit Ring:** `orbit` (multi-billboard 3D ring revolving around the Y axis).

### 3. Anti-Mewah Modular Tier Scaling (5 Tiers by Code)
Base flipbooks stay restrained and readable; visual richness scales dynamically by code across tiers without duplicating sprite sheets:
- **Tier 1 — Common / Uncommon (`0.80×`):** 1 layer, compact, fast clean fade, zero camera shake.
- **Tier 2 — Combine (`0.95×`):** 1–2 layers (base + subtle charge/impact accent).
- **Tier 3 — Rare (`1.08×`):** 2 layers (base + ground pulse / smoke / splash accent).
- **Tier 4 — Fusion Combine (`1.18×`):** 2–3 layers + **Dual-Color Fusion Tint** (Primary core + Secondary ring/aura).
- **Tier 5 — Epic (`1.32×`):** 3–4 layers across the full 10-stage lifecycle.

---

## Included 32 Universal Grayscale VFX (`studio/`)

- **Support & Sustain (7 — `4×4`, 16f):** `charge`, `aura` *(transparent center window)*, `floor_effect`, `barrier` *(abstract hex field, non-shield)*, `rise_particles` *(neutral rising motes)*, `buff_up`, `debuff_down`
- **Travel & Delivery (7 — `4×4`, 16f):** `projectile` *(1:1 glowing `Energy Square`)*, `beam_shoot` *(uniform straight tileable laser)*, `chain`, `orbit`, `rain`, `wave`, `ground_fissure`
- **Contact Hits (8 — `4×4`, 16f, Instant-Contact `F0`/`F1`):** `hit_impact`, `hit_punch`, `hit_slash`, `hit_claw`, `hit_bite`, `hit_swipe`, `hit_stomp`, `hit_thrust`
- **Area & World (6 — `4×4`, 16f):** `pulse`, `nova_explode`, `pilar`, `rubble`, `splash`, `smoke_puff`
- **Abstract Status VFX (4 — `4×2`, 8f lightweight):** `status_lock`, `status_cancel`, `status_dot_tick`, `status_cleanse`

---

## Quick Start

### Install as an AI Agent Skill
Copy `SKILL.md` into your global or workspace skills folder:
- **Global (Antigravity / Gemini):** `~/.gemini/config/skills/pixel-vfx-maker/SKILL.md`
- **Project-Specific:** `.agents/skills/pixel-vfx-maker/SKILL.md`

### Run the Offline 3D Plane Studio (Zero Dependencies)
Double-click [`studio/index.html`](studio/index.html) directly in any modern browser — no npm install, no build step, no local server required:
- **Drag** to orbit 360° around the 3D planes • **Scroll** to zoom • **Double-click** to reset camera
- Toggle **Plane Wireframes** to inspect exact 3D quad orientations
- Switch **5 Elements + Dual-Color Fusion** & **5 Rarity Tiers** live on GPU
- Export **`1024×1024` (4×4) / `1024×512` (4×2)** nearest-neighbor transparent PNGs (`0` edge bleed) + copy universal JSON/engine config metadata

---

## Repository Layout

```text
pixel-vfx-maker/
├── SKILL.md                            # Engine-agnostic Agent Skill definition
├── README.md                           # Documentation, multi-engine guide & GIF showcases
├── assets/
│   ├── showcase_catalog_grid.gif       # 20 live animated pixel VFX grid
│   ├── showcase_elements_tint.gif      # 1 grayscale -> 5 elements tint demo
│   └── showcase_10stage_causal.gif     # 10-stage causal Melee vs Ranged demo
└── studio/                             # Offline WebGL 3D Plane Studio (file:/// ready)
    ├── index.html
    ├── styles.css
    ├── core/
    │   ├── pixel_engine.js             # Integer 64x64 grayscale rasterizer (2px safe margin)
    │   ├── webgl_3d_engine.js          # Zero-dependency WebGL 3D Plane renderer
    │   └── app.js                      # 10-Stage Causal Timeline + Tier Compositor + PNG Exporter
    └── vfx/
        ├── pack_support.js             # 7 Support & Sustain VFX
        ├── pack_delivery.js            # 7 Travel & Delivery VFX
        ├── pack_hits.js                # 8 Instant-Contact Hit VFX
        ├── pack_world.js               # 6 Area & World VFX
        └── pack_status.js              # 4 Lightweight 8-Frame Status VFX
```
