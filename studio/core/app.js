// Kybermon Pixel VFX 3D Studio — Workstation UI Controller & 10-Stage Causal Choreographer
// 100% file:/// offline double-click compatible (classic <script>, consumes window.PixelEngine,
// window.KYBERMON_PIXEL_VFX, and window.WebGL3DEngine).

(function () {
	"use strict";

	const PE = window.PixelEngine;
	if (!PE) {
		console.error("[KybermonStudio] window.PixelEngine not loaded.");
		return;
	}

	const CELL_SIZE = 64;
	const STAGE_CONTACT_SF = 12;
	const STAGE_TOTAL_SF = 34; // 12 pre-contact + 16 impact/active + 6 recovery/dissipation
	const STATUS_ENEMY_ACTIVATE_SF = 8;
	const ALLY_ONESHOT_START_SF = 4;

	const ALLY_BASE_X = -2.4;
	const ALLY_ROT_Y = 0;
	const ENEMY_BASE_X = 2.4;
	const ENEMY_ROT_Y = Math.PI;

	const ATTACK_ROLES = new Set([
		"melee_hit",
		"ranged_hit",
		"ranged_projectile",
		"ranged_beam",
		"ranged_chain",
		"sky_rain",
		"ground_wave",
		"ground_fissure",
		"world_burst",
		"world_pillar",
	]);

	const ALLY_ROLES = new Set([
		"ally_support",
		"ally_aura",
		"floor_zone",
		"ally_orbit",
		"status_ally",
	]);

	const TEN_STAGES = [
		{ num: 1,  key: "ANTICIPATION",   label: "1. ANTICIPATION",   start: 0,  end: 2,  cls: "stage-prep" },
		{ num: 2,  key: "WIND-UP",        label: "2. WIND-UP",        start: 2,  end: 4,  cls: "stage-prep" },
		{ num: 3,  key: "CHARGING",       label: "3. CHARGING",       start: 4,  end: 6,  cls: "stage-prep" },
		{ num: 4,  key: "CASTING",        label: "4. CASTING",        start: 6,  end: 8,  cls: "stage-prep" },
		{ num: 5,  key: "RELEASE",        label: "5. RELEASE",        start: 8,  end: 9,  cls: "stage-travel" },
		{ num: 6,  key: "TRAVEL",         label: "6. TRAVEL",         start: 9,  end: 12, cls: "stage-travel" },
		{ num: 7,  key: "IMPACT",         label: "7. IMPACT",         start: 12, end: 16, cls: "stage-impact" },
		{ num: 8,  key: "FOLLOW-THROUGH", label: "8. FOLLOW-THROUGH", start: 16, end: 24, cls: "stage-after" },
		{ num: 9,  key: "RECOVERY",       label: "9. RECOVERY",       start: 24, end: 28, cls: "stage-after" },
		{ num: 10, key: "DISSIPATION",    label: "10. DISSIPATION",   start: 28, end: 34, cls: "stage-after" },
	];

	// =========================================================================
	// CATALOG NORMALIZATION & METADATA HELPERS
	// =========================================================================
	function inferRole(raw) {
		if (raw.role) return raw.role;
		const id = String(raw.id || "").toLowerCase();
		if (id.includes("beam")) return "ranged_beam";
		if (id.includes("chain")) return "ranged_chain";
		if (id.includes("projectile")) return "ranged_projectile";
		if (id.includes("rain")) return "sky_rain";
		if (id.includes("wave")) return "ground_wave";
		if (id.includes("fissure")) return "ground_fissure";
		if (id.includes("pilar") || id.includes("pillar")) return "world_pillar";
		if (id.includes("nova") || id.includes("splash") || id.includes("rubble") || id.includes("smoke") || id.includes("pulse")) return "world_burst";
		if (id.includes("orbit")) return "ally_orbit";
		if (id.includes("floor")) return "floor_zone";
		if (id.includes("aura") || id.includes("barrier")) return "ally_aura";
		if (id.includes("cleanse")) return "status_ally";
		if (id.includes("status_") || id.includes("debuff")) return "status_enemy";
		if (id.includes("buff") || id.includes("charge") || id.includes("rise")) return "ally_support";
		if (id.includes("slash") || id.includes("claw") || id.includes("bite") || id.includes("punch") || id.includes("stomp") || id.includes("melee")) return "melee_hit";
		return "ranged_hit";
	}

	function canonicalPlaneCategory(planeType) {
		const p = String(planeType || "billboard").toLowerCase();
		if (p.includes("floor") || p.includes("ground") || p === "xz") return "floor";
		if (p.includes("xplane") || p.includes("x_plane") || p.includes("cross")) return "xplane";
		if (p.includes("ribbon") || p.includes("beam") || p.includes("streak")) return "ribbon";
		if (p.includes("orbit")) return "orbit";
		return "billboard";
	}

	function planeBadgeLabel(planeType) {
		const kind = canonicalPlaneCategory(planeType);
		if (kind === "xplane") return "3D X-PLANE";
		if (kind === "floor") return "XZ FLOOR";
		if (kind === "ribbon") return "RIBBON";
		if (kind === "orbit") return "ORBIT";
		return "BILLBOARD";
	}

	function normalizeVfx(raw) {
		const frameCount = Number(raw.frameCount || raw.frames || ((raw.gridCols || raw.cols || 4) * (raw.gridRows || raw.rows || 4))) || 16;
		const gridCols = Number(raw.gridCols || raw.cols) || 4;
		const gridRows = Number(raw.gridRows || raw.rows) || (frameCount <= 8 ? 2 : 4);
		const isLoop = Boolean(
			String(raw.playbackMode || raw.mode || raw.flipbookMode || "").toLowerCase() === "loop" ||
			raw.loop === true ||
			raw.isLoop === true
		);
		const role = raw.combatRole || raw.role || inferRole(raw);
		const rawHit = Number.isFinite(raw.hitFrame)
			? raw.hitFrame
			: Number.isFinite(raw.hit)
				? raw.hit
				: Number.isFinite(raw.peakFrame)
					? raw.peakFrame
					: (isLoop ? -1 : (role === "melee_hit" ? 1 : 0));
		const hit = isLoop ? -1 : PE.clamp(Math.round(rawHit >= 0 ? rawHit : 0), 0, Math.max(0, frameCount - 1));
		const planeType = raw.planeType || raw.plane || "billboard";
		const materialPreset = raw.materialPreset || raw.material || "alpha_crisp";
		const renderFn = raw.renderFrame || raw.drawFrame || raw.render;

		let baseSize = [2.2, 2.2];
		if (Array.isArray(raw.planeScale) && raw.planeScale.length >= 2) {
			baseSize = [Number(raw.planeScale[0]) || 2.2, Number(raw.planeScale[1]) || 2.2];
		} else if (Array.isArray(raw.size) && raw.size.length >= 2) {
			baseSize = [Number(raw.size[0]) || 2.2, Number(raw.size[1]) || 2.2];
		} else if (Array.isArray(raw.planeSize) && raw.planeSize.length >= 2) {
			baseSize = [Number(raw.planeSize[0]) || 2.2, Number(raw.planeSize[1]) || 2.2];
		} else if (typeof raw.scale === "number") {
			baseSize = [raw.scale, raw.scale];
		} else {
			const pk = canonicalPlaneCategory(planeType);
			if (pk === "floor") baseSize = [2.8, 2.8];
			else if (pk === "xplane") baseSize = [2.3, 2.6];
			else if (pk === "ribbon") baseSize = [4.0, 1.35];
			else if (pk === "orbit") baseSize = [0.95, 0.95];
			else baseSize = [2.2, 2.2];
		}

		const niceName = raw.name || String(raw.id || "vfx")
			.replace(/[_-]+/g, " ")
			.replace(/\b\w/g, (m) => m.toUpperCase());

		const yOffset = typeof raw.planeOffsetY === "number"
			? raw.planeOffsetY
			: (typeof raw.yOffset === "number" ? raw.yOffset : null);

		return {
			raw,
			id: String(raw.id),
			name: niceName,
			category: String(raw.category || "hits"),
			role,
			planeType,
			planeKind: canonicalPlaneCategory(planeType),
			frameCount,
			gridCols,
			gridRows,
			loop: isLoop,
			hit,
			fps: Number(raw.defaultFps || raw.fps) || (frameCount <= 8 ? 12 : 16),
			materialPreset,
			additive: raw.additive !== undefined ? Boolean(raw.additive) : (materialPreset === "soft_transparent"),
			size: baseSize,
			yOffset,
			secondaryVfxId: raw.secondaryVfxId || null,
			exportFileName: raw.exportFileName || null,
			robloxOrientation: raw.robloxOrientation || null,
			robloxPreset: raw.robloxPreset || null,
			orbitCount: Number(raw.orbitCount) || 4,
			orbitRadius: Number(raw.orbitRadius) || 1.28,
			desc: raw.description || raw.desc || "",
			covers: Array.isArray(raw.covers) ? raw.covers : [],
			renderFn,
		};
	}

	// =========================================================================
	// UNIVERSAL GRAYSCALE TINTING (2D Canvas & Tinted PNG Export)
	// =========================================================================
	function tintGrayscaleRgba(srcData, element) {
		const out = new Uint8ClampedArray(srcData.length);
		if (!element || element.id === "GRAY") {
			out.set(srcData);
			return out;
		}

		const rgb = element.rgb;
		const hot = element.hot;
		const rim = element.rim;
		const isDark = Boolean(element.isDark);
		const isWhite = element.id === "WHITE";

		for (let i = 0; i < srcData.length; i += 4) {
			const a = srcData[i + 3];
			if (a === 0) continue;

			const lum = srcData[i] / 255;
			let r, g, b;

			if (isDark) {
				// Element Black: crisp obsidian core with bright ultraviolet/silver rim & hot highlights
				if (lum < 0.16) {
					const t = lum / 0.16;
					r = PE.lerp(0.05, 0.10, t);
					g = PE.lerp(0.04, 0.08, t);
					b = PE.lerp(0.08, 0.15, t);
				} else if (lum < 0.68) {
					const t = (lum - 0.16) / 0.52;
					r = PE.lerp(rgb[0] * 0.65, rim[0] * 0.82, t);
					g = PE.lerp(rgb[1] * 0.65, rim[1] * 0.82, t);
					b = PE.lerp(rgb[2] * 0.72, rim[2] * 0.90, t);
				} else {
					const t = (lum - 0.68) / 0.32;
					r = PE.lerp(rim[0] * 0.88, hot[0], t);
					g = PE.lerp(rim[1] * 0.88, hot[1], t);
					b = PE.lerp(rim[2] * 0.95, hot[2], t);
				}
			} else if (isWhite) {
				// Element White: cool slate-blue rim shadows transitioning to luminous pure white core
				if (lum < 0.18) {
					const t = lum / 0.18;
					r = PE.lerp(0.11, rim[0] * 0.42, t);
					g = PE.lerp(0.14, rim[1] * 0.46, t);
					b = PE.lerp(0.20, rim[2] * 0.54, t);
				} else if (lum < 0.72) {
					const t = (lum - 0.18) / 0.54;
					r = PE.lerp(rim[0] * 0.52, rgb[0], t);
					g = PE.lerp(rim[1] * 0.56, rgb[1], t);
					b = PE.lerp(rim[2] * 0.64, rgb[2], t);
				} else {
					const t = (lum - 0.72) / 0.28;
					r = PE.lerp(rgb[0], hot[0], t);
					g = PE.lerp(rgb[1], hot[1], t);
					b = PE.lerp(rgb[2], hot[2], t);
				}
			} else {
				// Vivid chromatic elements (Red, Green, Blue)
				if (lum < 0.15) {
					const t = lum / 0.15;
					r = rgb[0] * (0.12 + 0.18 * t);
					g = rgb[1] * (0.12 + 0.18 * t);
					b = rgb[2] * (0.12 + 0.18 * t);
				} else if (lum < 0.74) {
					const t = (lum - 0.15) / 0.59;
					const shade = 0.28 + 0.72 * t;
					r = rgb[0] * shade;
					g = rgb[1] * shade;
					b = rgb[2] * shade;
				} else {
					const t = (lum - 0.74) / 0.26;
					r = PE.lerp(rgb[0], hot[0], t);
					g = PE.lerp(rgb[1], hot[1], t);
					b = PE.lerp(rgb[2], hot[2], t);
				}
			}

			out[i]     = PE.clamp(Math.round(r * 255), 0, 255);
			out[i + 1] = PE.clamp(Math.round(g * 255), 0, 255);
			out[i + 2] = PE.clamp(Math.round(b * 255), 0, 255);
			out[i + 3] = a;
		}
		return out;
	}

	// =========================================================================
	// SHEET RASTERIZER & CACHE
	// =========================================================================
	const sheetCache = new Map();

	function buildVfxSheetRecord(vfx) {
		if (sheetCache.has(vfx.id)) return sheetCache.get(vfx.id);

		const width = vfx.gridCols * CELL_SIZE;
		const height = vfx.gridRows * CELL_SIZE;
		const sheetCanvas = document.createElement("canvas");
		sheetCanvas.width = width;
		sheetCanvas.height = height;
		const ctx = sheetCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		const frames = [];
		let bleedPixelCount = 0;

		for (let f = 0; f < vfx.frameCount; f++) {
			const buf = new PE.PixelBuffer(CELL_SIZE, 2);
			if (typeof vfx.renderFn === "function") {
				try {
					vfx.renderFn(buf, f, vfx.frameCount, PE);
				} catch (err) {
					console.error(`[KybermonStudio] Error rendering ${vfx.id} frame ${f}:`, err);
				}
			}

			// Verify 2px UV margin bleed
			for (let y = 0; y < CELL_SIZE; y++) {
				for (let x = 0; x < CELL_SIZE; x++) {
					if (x < 2 || x > 61 || y < 2 || y > 61) {
						if (buf.data[(y * CELL_SIZE + x) * 4 + 3] > 0) {
							bleedPixelCount++;
						}
					}
				}
			}

			const copy = new Uint8ClampedArray(buf.data);
			frames.push(copy);

			const col = f % vfx.gridCols;
			const row = Math.floor(f / vfx.gridCols);
			buf.blitToContext(ctx, col * CELL_SIZE, row * CELL_SIZE, 1);
		}

		const rec = {
			vfxId: vfx.id,
			gridCols: vfx.gridCols,
			gridRows: vfx.gridRows,
			width,
			height,
			sheetCanvas,
			frames,
			bleedPixelCount,
			uploaded: false,
		};

		sheetCache.set(vfx.id, rec);
		return rec;
	}

	// =========================================================================
	// 10-STAGE CAUSAL COMBAT SCENE CHOREOGRAPHER
	// =========================================================================
	function getStageInfoForAttack(sf) {
		const s = PE.clamp(sf, 0, STAGE_TOTAL_SF - 0.001);
		for (let i = 0; i < TEN_STAGES.length; i++) {
			if (s >= TEN_STAGES[i].start && s < TEN_STAGES[i].end) {
				return TEN_STAGES[i];
			}
		}
		return TEN_STAGES[TEN_STAGES.length - 1];
	}

	function makePlaneDescriptor(vfx, opts) {
		const el = opts.element || PE.ELEMENTS.GRAY;
		const isDark = Boolean(el.isDark);
		const mat = opts.materialPreset || vfx.materialPreset || "alpha_crisp";
		const defaultAdditive = mat === "soft_transparent" && !isDark;
		const scaleMult = opts.scaleMult || 1.0;
		const baseW = opts.size ? opts.size[0] : vfx.size[0];
		const baseH = opts.size ? opts.size[1] : vfx.size[1];

		return {
			vfxId: vfx.id,
			frameIndex: PE.clamp(Math.floor(opts.frameIndex || 0), 0, Math.max(0, vfx.frameCount - 1)),
			gridCols: vfx.gridCols,
			gridRows: vfx.gridRows,
			planeType: opts.planeType || vfx.planeType,
			pos: opts.pos || [0, 1.1, 0],
			endPos: opts.endPos || opts.pos || [0, 1.1, 0],
			size: [baseW * scaleMult, baseH * scaleMult],
			rotY: opts.rotY || 0,
			rotZ: opts.rotZ || 0,
			tiltX: opts.tiltX || 0,
			orbitCount: opts.orbitCount || vfx.orbitCount || 4,
			orbitRadius: (opts.orbitRadius || vfx.orbitRadius || 1.28) * Math.max(0.85, scaleMult * 0.92),
			orbitPhase: opts.orbitPhase || 0,
			tintRgb: el.rgb,
			hotRgb: el.hot,
			rimRgb: el.rim,
			isDarkElement: isDark,
			materialPreset: mat,
			opacity: opts.opacity === undefined ? 1.0 : PE.clamp01(opts.opacity),
			additive: opts.additive !== undefined ? (Boolean(opts.additive) && !isDark) : defaultAdditive,
		};
	}

	function computePlaneCenterY(vfx, scaleMult) {
		const pk = vfx.planeKind;
		if (pk === "floor") {
			return vfx.yOffset !== null && vfx.yOffset !== undefined ? vfx.yOffset : 0.04;
		}
		if (pk === "xplane") {
			// Ground-planted crossed vertical planes scale center height cleanly with scaleMult
			const baseH = vfx.size[1] * (scaleMult || 1.0);
			if (vfx.role === "world_pillar" || vfx.id === "pilar") {
				return Math.max(0.85, baseH * 0.5);
			}
			const baseY = vfx.yOffset !== null && vfx.yOffset !== undefined ? vfx.yOffset : 1.15;
			return baseY * Math.max(0.85, 0.5 + 0.5 * (scaleMult || 1.0));
		}
		if (vfx.yOffset !== null && vfx.yOffset !== undefined) return vfx.yOffset;
		if (pk === "orbit") return 1.15;
		return 1.12;
	}

	function createCatalogLookup(catalog) {
		const map = Object.create(null);
		for (let i = 0; i < catalog.length; i++) {
			map[catalog[i].id] = catalog[i];
		}
		return map;
	}

	function findAuxVfx(vfxMap, candidateIds) {
		for (let i = 0; i < candidateIds.length; i++) {
			if (vfxMap[candidateIds[i]]) return vfxMap[candidateIds[i]];
		}
		return null;
	}

	/**
	 * Builds the deterministic 3D sceneState for WebGL3DEngine adhering strictly to
	 * the 10-Stage Causal Lifecycle and Anti-Mewah Modular Tier Scaling.
	 */
	function buildCombatSceneState(vfx, stageFrame, tier, primaryEl, secondaryEl, opts) {
		const catalogMap = (opts && opts.vfxMap) || state.vfxById;
		const timeSec = (opts && opts.timeSec) || 0;
		const isLoopPlayback = opts && opts.playbackMode === "loop";
		const sf = Math.max(0, Number(stageFrame) || 0);

		const pEl = primaryEl || PE.ELEMENTS.GRAY;
		const sEl = (tier && tier.dualColor && secondaryEl) ? secondaryEl : pEl;
		const sc = (tier && tier.scaleMult) || 1.0;

		const ally = {
			x: ALLY_BASE_X,
			y: 0,
			z: 0,
			rotY: ALLY_ROT_Y,
			armRaise: 0,
			scaleY: 1,
			flashWhite: 0,
			hpRatio: 1,
		};

		const enemy = {
			x: ENEMY_BASE_X,
			y: 0,
			z: 0,
			rotY: ENEMY_ROT_Y,
			armRaise: 0,
			scaleY: 1,
			flashWhite: 0,
			hpRatio: 1,
		};

		const shake = [0, 0, 0];
		const planes = [];

		// Lookup modular auxiliary sheets
		const auxCharge    = findAuxVfx(catalogMap, ["charge"]);
		const auxAura      = findAuxVfx(catalogMap, ["aura"]);
		const auxFloor     = findAuxVfx(catalogMap, ["floor_effect"]);
		const auxRise      = findAuxVfx(catalogMap, ["rise_particles"]);
		const auxProj      = findAuxVfx(catalogMap, ["projectile"]);
		const auxHitImpact = findAuxVfx(catalogMap, ["hit_impact"]);
		const auxPulse     = findAuxVfx(catalogMap, ["pulse"]);
		const auxSmoke     = findAuxVfx(catalogMap, ["smoke_puff"]);
		const auxRubble    = findAuxVfx(catalogMap, ["rubble"]);

		let activeVfxFrame = -1;
		let stageMeta = getStageInfoForAttack(sf);

		// =====================================================================
		// BRANCH 1: ATTACK ROLES (STRICT 10-STAGE CAUSAL CHOREOGRAPHY)
		// =====================================================================
		if (ATTACK_ROLES.has(vfx.role)) {
			const role = vfx.role;
			const isMelee = role === "melee_hit";
			const isRangedHit = role === "ranged_hit";
			const isRangedProj = role === "ranged_projectile";
			const isBeamOrChain = role === "ranged_beam" || role === "ranged_chain";
			const isSkyRain = role === "sky_rain";
			const isGroundAttack = role === "ground_wave" || role === "ground_fissure";
			const isWorldPillar = role === "world_pillar";
			const isWorldBurst = role === "world_burst";
			const isDeliveryRole = isRangedProj || isBeamOrChain || isSkyRain;

			// --- STAGES 1–6: PRE-CONTACT (sf < 12) ---
			// HARD CAUSAL INVARIANT: ZERO Enemy impact planes, ZERO enemy hit-flash/recoil/HP drop!
			if (sf < STAGE_CONTACT_SF) {
				if (sf < 2) {
					// Stage 1: Anticipation
					const t = PE.easeOutQuad(sf / 2);
					ally.x = PE.lerp(ALLY_BASE_X, ALLY_BASE_X - 0.14, t);
					ally.scaleY = PE.lerp(1.0, 0.94, t);
					ally.armRaise = PE.lerp(0, 0.18, t);
				} else if (sf < 4) {
					// Stage 2: Wind-up
					const t = PE.easeInOutQuad((sf - 2) / 2);
					ally.x = PE.lerp(ALLY_BASE_X - 0.14, ALLY_BASE_X - 0.28, t);
					ally.scaleY = PE.lerp(0.94, 0.90, t);
					ally.armRaise = PE.lerp(0.18, 0.62, t);
				} else if (sf < 6) {
					// Stage 3: Charging (strictly on Ally!)
					const t = (sf - 4) / 2;
					ally.x = ALLY_BASE_X - 0.28 + Math.sin(t * Math.PI * 4) * 0.03;
					ally.scaleY = 0.91 + Math.sin(t * Math.PI * 2) * 0.03;
					ally.armRaise = PE.lerp(0.62, 0.95, t);
				} else if (sf < 8) {
					// Stage 4: Casting
					const t = PE.easeOutCubic((sf - 6) / 2);
					ally.x = PE.lerp(ALLY_BASE_X - 0.28, ALLY_BASE_X + 0.18, t);
					ally.scaleY = PE.lerp(0.92, 1.06, t);
					ally.armRaise = PE.lerp(0.95, 1.0, t);
				} else if (sf < 9) {
					// Stage 5: Release
					const t = sf - 8;
					if (isMelee) {
						ally.x = PE.lerp(ALLY_BASE_X + 0.18, ALLY_BASE_X + 0.95, PE.easeInQuad(t));
						ally.scaleY = PE.lerp(1.06, 0.96, t);
						ally.armRaise = 1.0;
					} else {
						ally.x = PE.lerp(ALLY_BASE_X + 0.18, ALLY_BASE_X + 0.36, PE.easeOutQuad(t));
						ally.scaleY = PE.lerp(1.06, 1.02, t);
						ally.armRaise = PE.lerp(1.0, 0.84, t);
					}
				} else {
					// Stage 6: Travel (sf ∈ [9, 12))
					const t = (sf - 9) / 3;
					if (isMelee) {
						// Ally physically lunges forward right to Enemy's front edge (+1.35 at sf = 12.0)
						ally.x = PE.lerp(ALLY_BASE_X + 0.95, 1.35, PE.easeOutQuad(t));
						ally.y = Math.sin(t * Math.PI) * 0.28;
						ally.scaleY = 0.95 + Math.sin(t * Math.PI) * 0.08;
						ally.armRaise = PE.lerp(1.0, 0.55, t);
					} else {
						ally.x = PE.lerp(ALLY_BASE_X + 0.36, ALLY_BASE_X + 0.12, PE.easeOutQuad(t));
						ally.armRaise = PE.lerp(0.84, 0.55, t);
						ally.scaleY = 1.0;
					}
				}

				// Ally Charge & Epic/Combine Aura Accent (strictly anchored on Ally!)
				if (sf >= 4 && sf < 8) {
					const wantsCharge = (tier && tier.showCharge) || (!isMelee && tier && tier.id !== "common_uncommon");
					if (wantsCharge && auxCharge) {
						const cFrame = Math.floor(((sf - 4) / 4) * auxCharge.frameCount) % auxCharge.frameCount;
						planes.push(makePlaneDescriptor(auxCharge, {
							frameIndex: cFrame,
							pos: [ally.x + 0.55, 1.18, 0],
							scaleMult: Math.min(1.05, sc * 0.85),
							element: tier.dualColor ? sEl : pEl,
							opacity: 0.92,
						}));
					}
				}

				if (sf >= 2.5 && sf < (isMelee ? 8.4 : 11.2) && tier && tier.showAuraAccent && auxAura) {
					const aFrame = Math.floor(sf * 1.1) % auxAura.frameCount;
					const endSf = isMelee ? 8.4 : 11.2;
					const fadeOut = sf > (endSf - 1.6) ? PE.clamp01((endSf - sf) / 1.6) : PE.clamp01((sf - 2.5) / 1.5);
					// Anchor strictly on Ally launch side before lunge so zero planes enter enemy zone pre-contact
					const auraX = isMelee ? Math.min(ally.x, ALLY_BASE_X + 0.35) : ally.x;
					planes.push(makePlaneDescriptor(auxAura, {
						frameIndex: aFrame,
						pos: [auraX, 1.15, 0],
						scaleMult: sc * 0.88,
						element: sEl,
						opacity: 0.72 * fadeOut,
					}));
				}

				// Stage 6 Travel Delivery Planes (Strictly pre-contact motion, ZERO Enemy impact bursts!)
				if (sf >= 8.5 && sf < STAGE_CONTACT_SF) {
					const travelT = PE.clamp01((sf - 8.5) / (STAGE_CONTACT_SF - 8.5));

					if (isRangedProj || isRangedHit) {
						const projSheet = isRangedProj ? vfx : auxProj;
						if (projSheet) {
							const px = PE.lerp(-1.6, 1.95, travelT);
							const pFrame = Math.floor((sf - 8.5) * 2.2) % projSheet.frameCount;
							if (isRangedProj) activeVfxFrame = pFrame;
							planes.push(makePlaneDescriptor(projSheet, {
								frameIndex: pFrame,
								pos: [px, 1.18, 0],
								endPos: [px - 0.9, 1.18, 0],
								size: isRangedProj ? vfx.size : [1.45, 1.45],
								scaleMult: isRangedProj ? sc : Math.min(1.0, sc * 0.85),
								element: pEl,
							}));
						}
					} else if (isBeamOrChain && sf >= 9.0) {
						const extT = PE.easeOutQuad((sf - 9.0) / 3.0);
						const endX = PE.lerp(-1.5, 2.2, extT);
						const bFrame = Math.floor((sf - 9.0) * 1.5) % vfx.frameCount;
						activeVfxFrame = bFrame;
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: bFrame,
							pos: [-1.7, 1.18, 0],
							endPos: [endX, 1.18, 0],
							scaleMult: sc,
							element: pEl,
						}));
					} else if (isGroundAttack) {
						// Starts at Ally's feet and sweeps forward; stops short of Enemy center until sf = 12!
						const sweepX = PE.lerp(-1.65, 0.38, travelT);
						const gFrame = Math.min(2, Math.floor(travelT * 3));
						if (auxPulse && tier && tier.id !== "common_uncommon") {
							planes.push(makePlaneDescriptor(auxPulse, {
								frameIndex: gFrame,
								pos: [sweepX, 0.04, 0],
								scaleMult: sc * 0.65,
								element: tier.dualColor ? sEl : pEl,
								opacity: 0.78,
							}));
						} else if (vfx.planeKind === "floor") {
							planes.push(makePlaneDescriptor(vfx, {
								frameIndex: gFrame,
								pos: [sweepX, 0.04, 0],
								scaleMult: sc * 0.62,
								element: pEl,
								opacity: 0.75,
							}));
						}
					} else if (isSkyRain) {
						// Rain drops descend cleanly from sky (y = 4.2 -> 1.4) before ground impact pops at sf = 12
						const rainY = PE.lerp(4.2, 1.4, PE.easeInQuad(travelT));
						const rFrame = Math.floor((sf - 8.5) * 1.8) % vfx.frameCount;
						activeVfxFrame = rFrame;
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: rFrame,
							pos: [0.35, rainY, 0],
							scaleMult: sc * 0.95,
							element: pEl,
							opacity: PE.clamp01(travelT * 1.6),
						}));
					}
				}
			} else {
				// --- STAGES 7–10: IMPACT, FOLLOW-THROUGH, RECOVERY, DISSIPATION (sf >= 12) ---
				const localSf = sf - STAGE_CONTACT_SF; // 0..22
				const rawVfxFrame = Math.floor(localSf);
				const vfxActive = vfx.loop ? (localSf < 16) : (rawVfxFrame < vfx.frameCount);
				const vfxFrame = vfx.loop
					? (rawVfxFrame % vfx.frameCount)
					: PE.clamp(rawVfxFrame, 0, vfx.frameCount - 1);

				activeVfxFrame = vfxActive ? vfxFrame : (vfx.frameCount - 1);

				// Ally Follow-through & Recovery
				if (isMelee) {
					if (localSf < 4) {
						// Strike follow-through right in front of Enemy
						const t = localSf / 4;
						ally.x = PE.lerp(1.35, 1.18, t);
						ally.armRaise = PE.lerp(0.55, 0.15, t);
						ally.scaleY = PE.lerp(0.96, 1.02, t);
					} else if (localSf < 12) {
						// Hold / brace briefly then begin retreat
						const t = (localSf - 4) / 8;
						ally.x = PE.lerp(1.18, ALLY_BASE_X, PE.easeInOutQuad(t));
						ally.y = Math.sin(t * Math.PI) * 0.35;
						ally.armRaise = PE.lerp(0.15, 0, t);
					} else {
						ally.x = ALLY_BASE_X;
						ally.y = 0;
						ally.armRaise = 0;
					}
				} else {
					if (localSf < 6) {
						const t = localSf / 6;
						ally.x = PE.lerp(ALLY_BASE_X + 0.12, ALLY_BASE_X, PE.easeOutQuad(t));
						ally.armRaise = PE.lerp(0.55, 0, t);
					} else {
						ally.x = ALLY_BASE_X;
						ally.armRaise = 0;
					}
				}

				// Enemy Hit Reaction synced to exact vfx.hit frame!
				const hitF = isDeliveryRole ? 0 : Math.max(0, vfx.hit);
				if (localSf >= hitF) {
					const sinceHit = localSf - hitF;
					// HP drops crisply on hit
					enemy.hpRatio = sinceHit < 0.5 ? PE.lerp(1.0, 0.56, sinceHit / 0.5) : 0.56;

					// White hit flash on hitF and hitF + 1
					if (sinceHit < 1.0) {
						enemy.flashWhite = 1.0;
					} else if (sinceHit < 2.2) {
						enemy.flashWhite = PE.lerp(0.65, 0.0, (sinceHit - 1.0) / 1.2);
					}

					// Enemy physical recoil & recovery
					if (sinceHit < 1.5) {
						const rt = PE.easeOutCubic(sinceHit / 1.5);
						enemy.x = ENEMY_BASE_X + 0.45 * rt;
						enemy.scaleY = PE.lerp(1.0, 0.88, rt);
					} else if (sinceHit < 11.0) {
						const rt = PE.easeInOutQuad((sinceHit - 1.5) / 9.5);
						enemy.x = PE.lerp(ENEMY_BASE_X + 0.45, ENEMY_BASE_X, rt);
						enemy.scaleY = PE.lerp(0.88, 1.0, rt);
					}

					// Camera shake scaled strictly by tier.shakePower (0.0 on Common/Uncommon!)
					const sp = (tier && tier.shakePower) || 0;
					if (sp > 0 && sinceHit < 5.5) {
						const decay = Math.pow(1 - sinceHit / 5.5, 2);
						const amp = 0.16 * sp * decay;
						shake[0] = Math.sin(sinceHit * 37.3 + 0.4) * amp;
						shake[1] = Math.cos(sinceHit * 43.1 + 1.1) * amp * 0.85;
						shake[2] = Math.sin(sinceHit * 29.7 + 2.2) * amp * 0.45;
					}
				}

				// Core Impact / Active VFX Plane on Enemy (or Ally->Enemy for Beams/Chains)
				if (vfxActive) {
					const targetX = enemy.x;
					const targetY = computePlaneCenterY(vfx, sc);

					if (isBeamOrChain) {
						const fade = vfx.loop && localSf > 12 ? PE.clamp01((16 - localSf) / 4) : 1.0;
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [-1.7, 1.1, 0],
							endPos: [targetX - 0.1, 1.1, 0],
							scaleMult: sc,
							element: pEl,
							opacity: fade,
						}));
					} else if (isRangedProj) {
						// Projectile disappeared on contact at sf = 12; trigger clean impact burst!
						const burstVfx = (vfx.secondaryVfxId && catalogMap[vfx.secondaryVfxId]) || auxHitImpact || vfx;
						if (rawVfxFrame < burstVfx.frameCount) {
							planes.push(makePlaneDescriptor(burstVfx, {
								frameIndex: rawVfxFrame,
								pos: [targetX - 0.15, computePlaneCenterY(burstVfx, sc), 0],
								scaleMult: sc,
								element: pEl,
							}));
						}
					} else if (isSkyRain) {
						const fade = localSf > 12 ? PE.clamp01((16 - localSf) / 4) : 1.0;
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [targetX, computePlaneCenterY(vfx, sc), 0],
							scaleMult: sc,
							element: pEl,
							opacity: fade,
						}));
					} else if (isWorldPillar) {
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [targetX, computePlaneCenterY(vfx, sc), 0],
							scaleMult: sc,
							element: pEl,
						}));
					} else if (isGroundAttack) {
						const sweepOffset = role === "ground_wave"
							? PE.lerp(-0.45, 0.25, PE.clamp01(localSf / 8))
							: -0.55; // ground_fissure stretches cleanly from mid-arena through Enemy feet
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [targetX + sweepOffset, targetY, 0],
							scaleMult: sc,
							element: pEl,
						}));
					} else {
						// melee_hit, ranged_hit, world_burst
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [targetX - (isMelee ? 0.12 : 0.05), targetY, 0],
							scaleMult: sc,
							element: pEl,
						}));
					}
				}

				// --- ANTI-MEWAH MODULAR TIER SECONDARY LAYERS (strictly sf >= 12!) ---
				// Common / Uncommon: ZERO extra layers!
				if (tier && tier.id !== "common_uncommon") {
					const curatedSec = (vfx.secondaryVfxId && catalogMap[vfx.secondaryVfxId]) || null;

					// Layer 2: Secondary Impact Accent (curated secondaryVfxId or hit_impact)
					const secHitVfx = (isDeliveryRole && !isRangedProj)
						? (curatedSec || auxHitImpact)
						: (tier.id === "epic" || tier.id === "combine_uu_cr" ? (auxHitImpact || curatedSec) : null);

					if (tier.showSecondaryImpact && secHitVfx && secHitVfx.id !== vfx.id) {
						if (rawVfxFrame < secHitVfx.frameCount) {
							planes.push(makePlaneDescriptor(secHitVfx, {
								frameIndex: rawVfxFrame,
								pos: [enemy.x - 0.12, computePlaneCenterY(secHitVfx, sc), 0.08],
								scaleMult: sc * (tier.id === "combine_cc_uc" ? 0.78 : 0.92),
								rotZ: tier.id === "epic" ? 0.42 : 0.18,
								element: tier.dualColor ? sEl : pEl,
								opacity: tier.id === "combine_cc_uc" ? 0.82 : 0.95,
							}));
						}
					}

					// Layer 3: Ground Pulse / Floor Ring (Rare, Combine U+U/C+R, Epic)
					if (tier.showFloorRing && auxPulse && auxPulse.id !== vfx.id) {
						if (rawVfxFrame < auxPulse.frameCount) {
							planes.push(makePlaneDescriptor(auxPulse, {
								frameIndex: rawVfxFrame,
								pos: [enemy.x, 0.035, 0],
								scaleMult: sc * 1.05,
								element: tier.dualColor ? sEl : pEl,
								opacity: 0.88,
							}));
						}
					}

					// Layer 4: Follow-through Smoke / Rubble (curated secondary or debris accent on Rare/Epic)
					if (tier.id === "epic" || (tier.id === "rare" && (isWorldBurst || isWorldPillar || isGroundAttack || curatedSec))) {
						const debrisVfx = (curatedSec && curatedSec.id !== "hit_impact" && curatedSec.id !== "pulse")
							? curatedSec
							: ((isGroundAttack || isWorldPillar) ? (auxRubble || auxSmoke) : (auxSmoke || auxRubble));
						const debrisDelay = 1;
						const dFrame = rawVfxFrame - debrisDelay;
						if (debrisVfx && debrisVfx.id !== vfx.id && dFrame >= 0 && dFrame < debrisVfx.frameCount) {
							planes.push(makePlaneDescriptor(debrisVfx, {
								frameIndex: dFrame,
								pos: [enemy.x + 0.12, computePlaneCenterY(debrisVfx, sc * 0.86), -0.14],
								scaleMult: sc * 0.86,
								element: tier.dualColor ? sEl : pEl,
								opacity: 0.84,
							}));
						}
					}
				}
			}
		}

		// =====================================================================
		// BRANCH 2: STATUS ON ENEMY (Quick Ally Cast SF 0..8 -> Enemy Status SF >= 8)
		// =====================================================================
		else if (vfx.role === "status_enemy") {
			if (sf < STATUS_ENEMY_ACTIVATE_SF) {
				// Stages 1–5: Ally quick cast gesture; ZERO planes on Enemy!
				stageMeta = getStageInfoForAttack(sf);
				if (sf < 2) {
					ally.scaleY = PE.lerp(1.0, 0.95, sf / 2);
				} else if (sf < 5) {
					const t = (sf - 2) / 3;
					ally.armRaise = PE.lerp(0, 0.95, PE.easeOutQuad(t));
					ally.x = PE.lerp(ALLY_BASE_X, ALLY_BASE_X + 0.16, t);
				} else {
					const t = (sf - 5) / 3;
					ally.armRaise = PE.lerp(0.95, 0.45, t);
					ally.x = PE.lerp(ALLY_BASE_X + 0.16, ALLY_BASE_X + 0.05, t);
				}

				if (sf >= 2.5 && sf < 6.5 && tier && tier.showCharge && auxCharge) {
					const cFrame = Math.floor((sf - 2.5) * 2) % auxCharge.frameCount;
					planes.push(makePlaneDescriptor(auxCharge, {
						frameIndex: cFrame,
						pos: [ally.x + 0.5, 1.18, 0],
						scaleMult: sc * 0.72,
						element: tier.dualColor ? sEl : pEl,
						opacity: 0.85,
					}));
				}
			} else {
				const localSf = sf - STATUS_ENEMY_ACTIVATE_SF;
				const rawF = Math.floor(localSf);
				const active = vfx.loop ? (localSf < 20 || isLoopPlayback) : (rawF < vfx.frameCount);
				const vfxFrame = vfx.loop
					? (rawF % vfx.frameCount)
					: PE.clamp(rawF, 0, vfx.frameCount - 1);
				activeVfxFrame = active ? vfxFrame : (vfx.frameCount - 1);

				ally.armRaise = localSf < 3 ? PE.lerp(0.45, 0, localSf / 3) : 0;

				if (vfx.loop) {
					stageMeta = { num: 7, key: "STATUS LOCK", label: "7. STATUS ACTIVE (LOOP)", cls: "stage-loop" };
					enemy.scaleY = 0.96 + Math.sin(localSf * 1.5) * 0.015;
				} else if (localSf < vfx.frameCount * 0.45) {
					stageMeta = TEN_STAGES[6]; // 7. IMPACT
				} else if (localSf < vfx.frameCount) {
					stageMeta = TEN_STAGES[7]; // 8. FOLLOW-THROUGH
				} else if (localSf < vfx.frameCount + 4) {
					stageMeta = TEN_STAGES[8]; // 9. RECOVERY
				} else {
					stageMeta = TEN_STAGES[9]; // 10. DISSIPATION
				}

				// Subtle feedback for tick/cancel status
				if (!vfx.loop && localSf >= vfx.hit) {
					const since = localSf - vfx.hit;
					if (vfx.id.includes("dot") || vfx.id.includes("cancel")) {
						enemy.flashWhite = since < 1.2 ? PE.lerp(0.55, 0, since / 1.2) : 0;
						if (vfx.id.includes("dot")) {
							enemy.hpRatio = since < 0.6 ? PE.lerp(1.0, 0.84, since / 0.6) : 0.84;
						}
					}
					if (since < 2.0) {
						enemy.x = ENEMY_BASE_X + Math.sin((since / 2.0) * Math.PI) * 0.16;
					}
				}

				if (active) {
					planes.push(makePlaneDescriptor(vfx, {
						frameIndex: vfxFrame,
						pos: [enemy.x, computePlaneCenterY(vfx, sc), 0],
						scaleMult: sc,
						element: pEl,
					}));

					// Secondary ring accent for Rare / Combine / Epic
					if (tier && tier.showFloorRing && auxFloor && auxFloor.id !== vfx.id) {
						planes.push(makePlaneDescriptor(auxFloor, {
							frameIndex: rawF % auxFloor.frameCount,
							pos: [enemy.x, 0.035, 0],
							scaleMult: sc * 0.82,
							element: tier.dualColor ? sEl : pEl,
							opacity: 0.65,
						}));
					}
				}
			}
		}

		// =====================================================================
		// BRANCH 3: ALLY SUPPORT, AURA, FLOOR ZONE, ORBIT, STATUS ALLY
		// =====================================================================
		else {
			const isOrbit = vfx.role === "ally_orbit" || vfx.planeKind === "orbit";
			const isFloor = vfx.role === "floor_zone" || vfx.planeKind === "floor";

			if (vfx.loop) {
				const vfxFrame = Math.floor(sf) % vfx.frameCount;
				activeVfxFrame = vfxFrame;
				stageMeta = { num: 7, key: "ACTIVE LOOP", label: "ACTIVE LOOP (ALLY)", cls: "stage-loop" };

				ally.armRaise = 0.28 + Math.sin(sf * 0.35) * 0.12;
				ally.scaleY = 1.0 + Math.sin(sf * 0.35) * 0.025;

				const tierOrbitCount = tier && tier.id === "common_uncommon" ? 3
					: tier && tier.id === "epic" ? 6
					: tier && tier.dualColor ? 5 : 4;

				planes.push(makePlaneDescriptor(vfx, {
					frameIndex: vfxFrame,
					pos: [ally.x, isFloor ? (vfx.yOffset || 0.04) : computePlaneCenterY(vfx, sc), 0],
					scaleMult: sc,
					orbitCount: tierOrbitCount,
					orbitPhase: sf * 0.34,
					tiltX: isOrbit ? 0.16 : 0,
					element: pEl,
				}));

				// Dual-color counter-orbit ring for U+U / Epic Orbit showcase
				if (isOrbit && tier && tier.dualColor) {
					planes.push(makePlaneDescriptor(vfx, {
						frameIndex: (vfxFrame + 4) % vfx.frameCount,
						pos: [ally.x, 1.38, 0],
						scaleMult: sc * 0.78,
						orbitCount: 3,
						orbitRadius: 1.55,
						orbitPhase: -sf * 0.26,
						tiltX: -0.34,
						element: sEl,
						opacity: 0.88,
					}));
				}

				// Modular Tier Layering for Ally Loop VFX
				if (tier && tier.showFloorRing && !isFloor && auxFloor && auxFloor.id !== vfx.id) {
					planes.push(makePlaneDescriptor(auxFloor, {
						frameIndex: Math.floor(sf) % auxFloor.frameCount,
						pos: [ally.x, 0.035, 0],
						scaleMult: sc * 0.92,
						element: tier.dualColor ? sEl : pEl,
						opacity: 0.72,
					}));
				}
				if (tier && tier.showAuraAccent && auxRise && auxRise.id !== vfx.id && !isOrbit) {
					planes.push(makePlaneDescriptor(auxRise, {
						frameIndex: Math.floor(sf * 1.1) % auxRise.frameCount,
						pos: [ally.x, 1.15, 0],
						scaleMult: sc * 0.95,
						element: tier.dualColor ? sEl : pEl,
						opacity: 0.76,
					}));
				}
			} else {
				// Ally OneShot Support (e.g. buff_up, status_cleanse)
				if (sf < ALLY_ONESHOT_START_SF) {
					stageMeta = sf < 2 ? TEN_STAGES[0] : TEN_STAGES[3];
					ally.scaleY = PE.lerp(1.0, 0.94, PE.clamp01(sf / 2));
					ally.armRaise = PE.lerp(0, 0.85, PE.clamp01(sf / ALLY_ONESHOT_START_SF));
				} else {
					const localSf = sf - ALLY_ONESHOT_START_SF;
					const rawF = Math.floor(localSf);
					const active = rawF < vfx.frameCount;
					const vfxFrame = PE.clamp(rawF, 0, vfx.frameCount - 1);
					activeVfxFrame = active ? vfxFrame : (vfx.frameCount - 1);

					if (localSf < 4) stageMeta = TEN_STAGES[6];
					else if (localSf < vfx.frameCount) stageMeta = TEN_STAGES[7];
					else if (localSf < vfx.frameCount + 4) stageMeta = TEN_STAGES[8];
					else stageMeta = TEN_STAGES[9];

					ally.armRaise = localSf < 6 ? PE.lerp(0.85, 0.25, localSf / 6) : 0;
					ally.scaleY = localSf < 3 ? 1.05 : 1.0;

					if (active) {
						planes.push(makePlaneDescriptor(vfx, {
							frameIndex: vfxFrame,
							pos: [ally.x, computePlaneCenterY(vfx, sc), 0],
							scaleMult: sc,
							element: pEl,
						}));
						if (tier && tier.showFloorRing && auxPulse && auxPulse.id !== vfx.id && rawF < auxPulse.frameCount) {
							planes.push(makePlaneDescriptor(auxPulse, {
								frameIndex: rawF,
								pos: [ally.x, 0.035, 0],
								scaleMult: sc * 0.9,
								element: tier.dualColor ? sEl : pEl,
								opacity: 0.75,
							}));
						}
					}
				}
			}
		}

		return {
			timeSec,
			shake,
			ally,
			enemy,
			planes,
			_meta: {
				stageFrame: sf,
				stage: stageMeta,
				activeVfxFrame,
			},
		};
	}

	// =========================================================================
	// APPLICATION STATE
	// =========================================================================
	const state = {
		catalog: [],
		vfxById: Object.create(null),
		filtered: [],
		activeVfx: null,
		category: "all",
		search: "",
		primaryElId: "RED",
		secondaryElId: "BLUE",
		tierId: "rare",
		playing: true,
		loopPlayback: true,
		fps: 14,
		stageFrame: 0,
		inspectFrame: 0,
		previewTinted: true,
		previewBleed: false,
		cameraPreset: "iso",
		autoOrbit: false,
		showWireframes: false,
		showArena: true,
		arenaBg: "dark",
		engine: null,
		lastTimestamp: 0,
		elapsedSec: 0,
		toastTimer: null,
	};

	// DOM References
	const dom = {};

	function bindDom() {
		const ids = [
			"studioStatusBadge",
			"activeSummaryBadge",
			"vfxSearch",
			"btnClearSearch",
			"vfxCountLabel",
			"categoryTabs",
			"vfxList",
			"primaryElementBar",
			"secondaryElementWrap",
			"secondaryElementStatus",
			"secondaryElementBar",
			"tierBar",
			"tierDesc",
			"viewportWrap",
			"viewport3d",
			"hudVfxName",
			"hudPlaneBadge",
			"hudRoleBadge",
			"hudStagePill",
			"hudStageFrame",
			"stageRail",
			"camPresetBar",
			"btnAutoOrbit",
			"btnResetCam",
			"btnWireframe",
			"btnShowArena",
			"arenaBgBar",
			"btnPlayPause",
			"btnStepPrev",
			"btnStepNext",
			"btnReplayClash",
			"btnLoopToggle",
			"fpsSlider",
			"fpsValue",
			"scrubberMeta",
			"frameScrubber",
			"preview2d",
			"btnPreviewTint",
			"btnPreviewBleed",
			"previewFrameMeta",
			"sheetWrap",
			"sheetCanvas",
			"sheetGridOverlay",
			"sheetMetaLabel",
			"robloxMetaGrid",
			"btnExportGray",
			"exportGraySub",
			"btnExportTinted",
			"btnCopyLuau",
			"luauCodePreview",
			"toastNotice",
		];
		for (let i = 0; i < ids.length; i++) {
			dom[ids[i]] = document.getElementById(ids[i]);
		}
	}

	function showToast(msg) {
		if (!dom.toastNotice) return;
		dom.toastNotice.textContent = msg;
		dom.toastNotice.classList.add("visible");
		clearTimeout(state.toastTimer);
		state.toastTimer = setTimeout(() => {
			dom.toastNotice.classList.remove("visible");
		}, 2400);
	}

	function getPrimaryEl() {
		return PE.ELEMENTS[state.primaryElId] || PE.ELEMENTS.GRAY;
	}

	function getSecondaryEl() {
		return PE.ELEMENTS[state.secondaryElId] || PE.ELEMENTS.BLUE;
	}

	function getTier() {
		return PE.TIERS[state.tierId] || PE.TIERS.common_uncommon;
	}

	function getTotalStageFramesForVfx(vfx) {
		if (!vfx) return STAGE_TOTAL_SF;
		if (ATTACK_ROLES.has(vfx.role)) return STAGE_TOTAL_SF;
		if (vfx.role === "status_enemy") {
			return vfx.loop ? (STATUS_ENEMY_ACTIVATE_SF + 20) : (STATUS_ENEMY_ACTIVATE_SF + vfx.frameCount + 8);
		}
		if (vfx.loop) return vfx.frameCount;
		return ALLY_ONESHOT_START_SF + vfx.frameCount + 6;
	}

	function snapStageFrameToVfxFrame(vfx, frameIdx) {
		const f = PE.clamp(Math.floor(frameIdx), 0, Math.max(0, vfx.frameCount - 1));
		if (ATTACK_ROLES.has(vfx.role)) {
			return STAGE_CONTACT_SF + f;
		}
		if (vfx.role === "status_enemy") {
			return STATUS_ENEMY_ACTIVATE_SF + f;
		}
		if (vfx.loop) {
			return f;
		}
		return ALLY_ONESHOT_START_SF + f;
	}

	function ensureUploadedToWebGL(vfx) {
		if (!vfx) return null;
		const rec = buildVfxSheetRecord(vfx);
		if (state.engine && !rec.uploaded) {
			state.engine.uploadVfxSheet(vfx.id, rec.sheetCanvas, rec.gridCols, rec.gridRows);
			rec.uploaded = true;
		}
		return rec;
	}

	// =========================================================================
	// UI BUILDERS: ELEMENTS, TIERS, CATEGORIES, CATALOG LIST, SCRUBBER, RAIL
	// =========================================================================
	function buildElementBars() {
		const elOrder = ["GRAY", "RED", "GREEN", "BLUE", "BLACK", "WHITE"];
		const shortNames = {
			GRAY: "Grayscale",
			RED: "Red",
			GREEN: "Green",
			BLUE: "Blue",
			BLACK: "Black",
			WHITE: "White",
		};

		function populateBar(container, selectedId, onPick) {
			container.innerHTML = "";
			for (let i = 0; i < elOrder.length; i++) {
				const id = elOrder[i];
				const el = PE.ELEMENTS[id];
				if (!el) continue;
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "el-pill" + (id === selectedId ? " active" : "");
				btn.dataset.elId = id;
				btn.style.setProperty("--pill-color", el.hex);
				btn.innerHTML = `<span class="el-dot" style="background:${el.hex}"></span><span>${shortNames[id] || el.name}</span>`;
				btn.addEventListener("click", () => onPick(id));
				container.appendChild(btn);
			}
		}

		populateBar(dom.primaryElementBar, state.primaryElId, (id) => {
			state.primaryElId = id;
			syncElementAndTierUI();
			renderInspector2D();
			renderCatalogThumbnails();
			updateRobloxPanel();
		});

		populateBar(dom.secondaryElementBar, state.secondaryElId, (id) => {
			state.secondaryElId = id;
			const tier = getTier();
			if (!tier.dualColor) {
				showToast(`Secondary set to ${PE.ELEMENTS[id].name} — switch to U+U/C+R or Epic to activate dual-color fusion.`);
			}
			syncElementAndTierUI();
			updateRobloxPanel();
		});
	}

	function buildTierBar() {
		const tierOrder = ["common_uncommon", "combine_cc_uc", "rare", "combine_uu_cr", "epic"];
		dom.tierBar.innerHTML = "";
		for (let i = 0; i < tierOrder.length; i++) {
			const tid = tierOrder[i];
			const tier = PE.TIERS[tid];
			if (!tier) continue;
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "tier-pill" + (tid === "epic" ? " tier-epic" : tier.dualColor ? " tier-dual" : "");
			btn.dataset.tierId = tid;
			btn.textContent = tier.short;
			btn.title = `${tier.label}: ${tier.desc}`;
			btn.addEventListener("click", () => {
				state.tierId = tid;
				syncElementAndTierUI();
				updateRobloxPanel();
			});
			dom.tierBar.appendChild(btn);
		}
	}

	function syncElementAndTierUI() {
		const pEl = getPrimaryEl();
		const sEl = getSecondaryEl();
		const tier = getTier();

		document.documentElement.style.setProperty("--el-accent", pEl.hex);

		dom.primaryElementBar.querySelectorAll(".el-pill").forEach((b) => {
			b.classList.toggle("active", b.dataset.elId === state.primaryElId);
		});

		dom.secondaryElementBar.querySelectorAll(".el-pill").forEach((b) => {
			b.classList.toggle("active", b.dataset.elId === state.secondaryElId);
		});

		dom.tierBar.querySelectorAll(".tier-pill").forEach((b) => {
			b.classList.toggle("active", b.dataset.tierId === state.tierId);
		});

		dom.tierDesc.textContent = `${tier.label} (${tier.scaleMult.toFixed(2)}×) — ${tier.desc}`;

		const dualActive = Boolean(tier.dualColor);
		dom.secondaryElementWrap.classList.toggle("fusion-active", dualActive);
		dom.secondaryElementStatus.textContent = dualActive
			? `Fusion Active: ${pEl.id} + ${sEl.id}`
			: "Dual-Color on U+U / Epic";

		const elText = dualActive ? `${pEl.id} + ${sEl.id}` : pEl.name;
		dom.activeSummaryBadge.textContent = `${tier.short} • ${elText}`;
	}

	function buildStageRail() {
		dom.stageRail.innerHTML = "";
		for (let i = 0; i < TEN_STAGES.length; i++) {
			const seg = document.createElement("div");
			seg.className = "stage-seg" + (TEN_STAGES[i].num === 7 ? " seg-impact" : "");
			seg.dataset.stageNum = String(TEN_STAGES[i].num);
			seg.title = TEN_STAGES[i].label;
			dom.stageRail.appendChild(seg);
		}
	}

	function buildCategoryTabs() {
		dom.categoryTabs.innerHTML = "";
		const counts = { all: state.catalog.length };
		for (let i = 0; i < state.catalog.length; i++) {
			const c = state.catalog[i].category;
			counts[c] = (counts[c] || 0) + 1;
		}

		for (let i = 0; i < PE.CATEGORIES.length; i++) {
			const cat = PE.CATEGORIES[i];
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "cat-tab" + (cat.id === state.category ? " active" : "");
			btn.dataset.catId = cat.id;
			const cleanLabel = cat.label.replace(/\s*\(\d+\)\s*$/, "");
			const n = counts[cat.id] || 0;
			btn.textContent = `${cleanLabel} (${n})`;
			btn.addEventListener("click", () => {
				state.category = cat.id;
				dom.categoryTabs.querySelectorAll(".cat-tab").forEach((el) => {
					el.classList.toggle("active", el.dataset.catId === cat.id);
				});
				renderCatalogList();
			});
			dom.categoryTabs.appendChild(btn);
		}
	}

	function drawSingleFrameToCanvas(canvas, rgbaData, targetSize, element, showBleed) {
		canvas.width = targetSize;
		canvas.height = targetSize;
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, targetSize, targetSize);
		ctx.imageSmoothingEnabled = false;

		if (!rgbaData) return;

		const tmp = drawSingleFrameToCanvas._tmp || (drawSingleFrameToCanvas._tmp = document.createElement("canvas"));
		tmp.width = CELL_SIZE;
		tmp.height = CELL_SIZE;
		const tCtx = tmp.getContext("2d");
		const tinted = element ? tintGrayscaleRgba(rgbaData, element) : rgbaData;
		const imgData = tCtx.createImageData(CELL_SIZE, CELL_SIZE);
		imgData.data.set(tinted);
		tCtx.putImageData(imgData, 0, 0);

		ctx.drawImage(tmp, 0, 0, targetSize, targetSize);

		if (showBleed) {
			const scale = targetSize / CELL_SIZE;
			const m = 2 * scale;
			ctx.save();
			ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 3]);
			ctx.strokeRect(m + 0.5, m + 0.5, targetSize - m * 2 - 1, targetSize - m * 2 - 1);
			ctx.restore();
		}
	}

	function renderCatalogList() {
		const q = state.search.trim().toLowerCase();
		dom.btnClearSearch.classList.toggle("visible", q.length > 0);

		state.filtered = state.catalog.filter((v) => {
			if (state.category !== "all" && v.category !== state.category) return false;
			if (!q) return true;
			return (
				v.name.toLowerCase().includes(q) ||
				v.id.toLowerCase().includes(q) ||
				v.role.toLowerCase().includes(q) ||
				planeBadgeLabel(v.planeType).toLowerCase().includes(q) ||
				v.desc.toLowerCase().includes(q) ||
				v.covers.some((c) => c.toLowerCase().includes(q))
			);
		});

		dom.vfxCountLabel.textContent = `${state.filtered.length} / ${state.catalog.length}`;
		dom.vfxList.innerHTML = "";

		if (state.filtered.length === 0) {
			const empty = document.createElement("div");
			empty.className = "vfx-empty-state";
			empty.textContent = "No VFX matches your current filter.";
			dom.vfxList.appendChild(empty);
			return;
		}

		const pEl = getPrimaryEl();
		const frag = document.createDocumentFragment();

		for (let i = 0; i < state.filtered.length; i++) {
			const vfx = state.filtered[i];
			const card = document.createElement("button");
			card.type = "button";
			card.className = "vfx-card" + (state.activeVfx && state.activeVfx.id === vfx.id ? " active" : "");
			card.dataset.vfxId = vfx.id;
			card.title = vfx.covers.length > 0
				? `${vfx.desc}\nCovers: ${vfx.covers.join(", ")}`
				: vfx.desc;

			const thumbBox = document.createElement("div");
			thumbBox.className = "vfx-thumb-box";
			const thumbCanvas = document.createElement("canvas");
			thumbCanvas.width = 44;
			thumbCanvas.height = 44;
			const rec = buildVfxSheetRecord(vfx);
			const thumbIdx = vfx.loop ? Math.min(2, vfx.frameCount - 1) : Math.min(vfx.hit + 1, vfx.frameCount - 1);
			drawSingleFrameToCanvas(thumbCanvas, rec.frames[thumbIdx] || rec.frames[0], 44, pEl, false);
			thumbBox.appendChild(thumbCanvas);

			const info = document.createElement("div");
			info.className = "vfx-card-info";

			const nameEl = document.createElement("div");
			nameEl.className = "vfx-card-name";
			nameEl.textContent = vfx.name;

			const badges = document.createElement("div");
			badges.className = "vfx-card-badges";

			const planeBadge = document.createElement("span");
			planeBadge.className = `badge badge-plane ${vfx.planeKind}`;
			planeBadge.textContent = planeBadgeLabel(vfx.planeType);

			const frameBadge = document.createElement("span");
			frameBadge.className = "badge badge-frames";
			frameBadge.textContent = `${vfx.frameCount}F`;

			const modeBadge = document.createElement("span");
			modeBadge.className = "badge badge-mode" + (vfx.loop ? " loop" : "");
			modeBadge.textContent = vfx.loop ? "LOOP" : "ONESHOT";

			badges.appendChild(planeBadge);
			badges.appendChild(frameBadge);
			badges.appendChild(modeBadge);

			info.appendChild(nameEl);
			info.appendChild(badges);

			card.appendChild(thumbBox);
			card.appendChild(info);

			card.addEventListener("click", () => selectVfx(vfx.id, true));
			frag.appendChild(card);
		}

		dom.vfxList.appendChild(frag);
	}

	function renderCatalogThumbnails() {
		const pEl = getPrimaryEl();
		dom.vfxList.querySelectorAll(".vfx-card").forEach((card) => {
			const vfx = state.vfxById[card.dataset.vfxId];
			const canvas = card.querySelector("canvas");
			if (!vfx || !canvas) return;
			const rec = buildVfxSheetRecord(vfx);
			const thumbIdx = vfx.loop ? Math.min(2, vfx.frameCount - 1) : Math.min(vfx.hit + 1, vfx.frameCount - 1);
			drawSingleFrameToCanvas(canvas, rec.frames[thumbIdx] || rec.frames[0], 44, pEl, false);
		});
	}

	function buildFrameScrubber() {
		const vfx = state.activeVfx;
		if (!vfx) return;

		dom.frameScrubber.innerHTML = "";
		dom.frameScrubber.classList.toggle("frames-8", vfx.frameCount <= 8);

		for (let f = 0; f < vfx.frameCount; f++) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "scrub-cell" + (!vfx.loop && f === vfx.hit ? " is-hit" : "");
			btn.dataset.frame = String(f);
			btn.innerHTML = (!vfx.loop && f === vfx.hit ? '<span class="hit-tag">HIT</span>' : "") + `<span>${f}</span>`;
			btn.addEventListener("click", () => jumpToInspectFrame(f));
			dom.frameScrubber.appendChild(btn);
		}
	}

	function buildSheetGridOverlay() {
		const vfx = state.activeVfx;
		if (!vfx) return;

		dom.sheetGridOverlay.innerHTML = "";
		dom.sheetGridOverlay.style.gridTemplateColumns = `repeat(${vfx.gridCols}, 1fr)`;
		dom.sheetGridOverlay.style.gridTemplateRows = `repeat(${vfx.gridRows}, 1fr)`;

		for (let f = 0; f < vfx.frameCount; f++) {
			const cell = document.createElement("div");
			cell.className = "sheet-cell-box" + (!vfx.loop && f === vfx.hit ? " is-hit" : "");
			cell.dataset.frame = String(f);
			dom.sheetGridOverlay.appendChild(cell);
		}
	}

	function selectVfx(vfxId, restartPlayback) {
		const vfx = state.vfxById[vfxId];
		if (!vfx) return;

		state.activeVfx = vfx;
		ensureUploadedToWebGL(vfx);

		state.fps = vfx.fps;
		dom.fpsSlider.value = String(vfx.fps);
		dom.fpsValue.textContent = String(vfx.fps);

		if (restartPlayback) {
			state.stageFrame = 0;
			state.inspectFrame = vfx.loop ? 0 : vfx.hit;
			state.playing = true;
			syncTransportUI();
		}

		// Update catalog highlight
		dom.vfxList.querySelectorAll(".vfx-card").forEach((c) => {
			c.classList.toggle("active", c.dataset.vfxId === vfx.id);
		});

		// Update viewport top HUD labels
		dom.hudVfxName.textContent = vfx.name;
		dom.hudPlaneBadge.textContent = planeBadgeLabel(vfx.planeType);
		dom.hudRoleBadge.textContent = `${vfx.role} • ${vfx.loop ? "LOOP" : "ONESHOT"}`;

		buildFrameScrubber();
		buildSheetGridOverlay();
		renderInspector2D();
		updateRobloxPanel();
	}

	function jumpToInspectFrame(frameIdx) {
		const vfx = state.activeVfx;
		if (!vfx) return;

		const f = PE.clamp(Math.floor(frameIdx), 0, vfx.frameCount - 1);
		state.playing = false;
		state.inspectFrame = f;
		state.stageFrame = snapStageFrameToVfxFrame(vfx, f);
		syncTransportUI();
		renderInspector2D();
	}

	function stepFrame(delta) {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const next = (state.inspectFrame + delta + vfx.frameCount) % vfx.frameCount;
		jumpToInspectFrame(next);
	}

	function replayClash() {
		state.stageFrame = 0;
		state.playing = true;
		syncTransportUI();
	}

	function syncTransportUI() {
		dom.btnPlayPause.innerHTML = state.playing
			? '<span class="btn-glyph">&#9646;&#9646;</span> Pause'
			: '<span class="btn-glyph">&#9654;</span> Play';
		dom.btnLoopToggle.classList.toggle("active", state.loopPlayback);
		dom.btnLoopToggle.setAttribute("aria-pressed", String(state.loopPlayback));
		dom.btnLoopToggle.textContent = state.loopPlayback ? "Loop: ON" : "Loop: ONCE";
	}

	// =========================================================================
	// 2D INSPECTOR RENDERING (192x192 LIVE FRAME + 4x4/4x2 SHEET)
	// =========================================================================
	function renderInspector2D() {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const rec = buildVfxSheetRecord(vfx);
		const el = state.previewTinted ? getPrimaryEl() : null;
		const frameIdx = PE.clamp(state.inspectFrame, 0, vfx.frameCount - 1);

		// 192x192 (3x integer scale) preview
		drawSingleFrameToCanvas(dom.preview2d, rec.frames[frameIdx], 192, el, state.previewBleed);
		const fPad = String(frameIdx).padStart(2, "0");
		dom.previewFrameMeta.textContent = `F${fPad} / ${vfx.frameCount} • 64×64 (3×) • Bleed: ${rec.bleedPixelCount} px`;

		// Sheet canvas (256x256 or 256x128)
		dom.sheetCanvas.width = rec.width;
		dom.sheetCanvas.height = rec.height;
		const sCtx = dom.sheetCanvas.getContext("2d");
		sCtx.clearRect(0, 0, rec.width, rec.height);
		sCtx.imageSmoothingEnabled = false;

		if (el && el.id !== "GRAY") {
			const tmp = document.createElement("canvas");
			tmp.width = CELL_SIZE;
			tmp.height = CELL_SIZE;
			const tCtx = tmp.getContext("2d");
			for (let f = 0; f < vfx.frameCount; f++) {
				const tinted = tintGrayscaleRgba(rec.frames[f], el);
				const imgData = tCtx.createImageData(CELL_SIZE, CELL_SIZE);
				imgData.data.set(tinted);
				tCtx.putImageData(imgData, 0, 0);
				const col = f % vfx.gridCols;
				const row = Math.floor(f / vfx.gridCols);
				sCtx.drawImage(tmp, col * CELL_SIZE, row * CELL_SIZE);
			}
		} else {
			sCtx.drawImage(rec.sheetCanvas, 0, 0);
		}

		dom.sheetMetaLabel.textContent = `${vfx.gridCols}×${vfx.gridRows} • ${rec.width}×${rec.height}`;
		highlightActiveFrameIndicators(frameIdx);
	}

	function highlightActiveFrameIndicators(frameIdx) {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const fStr = String(frameIdx);

		dom.scrubberMeta.textContent = `F${String(frameIdx).padStart(2, "0")} / ${vfx.frameCount}`;

		dom.frameScrubber.querySelectorAll(".scrub-cell").forEach((cell) => {
			cell.classList.toggle("active", cell.dataset.frame === fStr);
		});

		dom.sheetGridOverlay.querySelectorAll(".sheet-cell-box").forEach((cell) => {
			cell.classList.toggle("active", cell.dataset.frame === fStr);
		});
	}

	// =========================================================================
	// ROBLOX STUDIO PRESET, PNG EXPORTERS & LUAU GENERATOR
	// =========================================================================
	function getRobloxConfig(vfx) {
		const pEl = getPrimaryEl();
		const sEl = getSecondaryEl();
		const tier = getTier();
		const preset = vfx.robloxPreset || {};
		const layout = preset.FlipbookLayout || (vfx.gridRows <= 2 ? "Grid4x2" : "Grid4x4");
		const mode = preset.FlipbookMode || (vfx.loop ? "Loop" : "OneShot");
		const lifetime = Number((vfx.frameCount / Math.max(6, state.fps)).toFixed(2));
		const isSoft = vfx.materialPreset === "soft_transparent";
		const presetEmit = typeof preset.LightEmission === "number" ? preset.LightEmission : (isSoft ? 0.55 : 0.35);
		const lightEmission = pEl.isDark ? Math.min(0.15, presetEmit) : presetEmit;

		let orientation = preset.Orientation || vfx.robloxOrientation || "FacingCamera";
		let instanceClass = (vfx.planeKind === "ribbon" || orientation === "Beam") ? "Beam" : "ParticleEmitter";
		if (orientation === "Beam") {
			orientation = "Beam (Ally -> Enemy)";
		} else if (orientation === "FloorPart" || vfx.planeKind === "floor") {
			orientation = "FloorPart (XZ Plane)";
		} else if (orientation === "CrossedMesh" || vfx.planeKind === "xplane") {
			orientation = "CrossedMesh (X-Plane)";
		}

		return {
			layout,
			mode,
			orientation,
			instanceClass,
			lightEmission,
			lifetime,
			materialLabel: isSoft ? "Soft Transparent" : "Alpha Crisp",
			exportW: vfx.gridCols * 256,
			exportH: vfx.gridRows * 256,
			pEl,
			sEl,
			tier,
		};
	}

	function rgbFloatToColor3Str(rgb) {
		const r = Math.round(PE.clamp01(rgb[0]) * 255);
		const g = Math.round(PE.clamp01(rgb[1]) * 255);
		const b = Math.round(PE.clamp01(rgb[2]) * 255);
		return `Color3.fromRGB(${r}, ${g}, ${b})`;
	}

	function generateRobloxLuau(vfx) {
		const cfg = getRobloxConfig(vfx);
		const cMid = rgbFloatToColor3Str(cfg.pEl.rgb);
		const cHot = rgbFloatToColor3Str(cfg.pEl.hot);
		const cSec = rgbFloatToColor3Str(cfg.sEl.rgb);
		const studs = Number((vfx.size[0] * cfg.tier.scaleMult * 1.8).toFixed(2));

		if (cfg.instanceClass === "Beam") {
			return [
				`-- Kybermon Pixel VFX (${vfx.name}) | Tier: ${cfg.tier.label} | Element: ${cfg.pEl.name}`,
				`-- Upload exported grayscale PNG (${cfg.exportW}x${cfg.exportH}) and paste Asset ID below.`,
				`local beam = Instance.new("Beam")`,
				`beam.Name = "VFX_${vfx.id}"`,
				`beam.Texture = "rbxassetid://YOUR_GRAYSCALE_ASSET_ID"`,
				`beam.TextureMode = Enum.TextureMode.Stretch`,
				`beam.FaceCamera = true`,
				`beam.Width0 = ${Number((vfx.size[1] * cfg.tier.scaleMult * 1.4).toFixed(2))}`,
				`beam.Width1 = ${Number((vfx.size[1] * cfg.tier.scaleMult * 1.4).toFixed(2))}`,
				`beam.LightEmission = ${cfg.lightEmission}`,
				`beam.LightInfluence = 0`,
				`beam.Color = ColorSequence.new({`,
				`\tColorSequenceKeypoint.new(0, ${cHot}),`,
				`\tColorSequenceKeypoint.new(0.5, ${cMid}),`,
				`\tColorSequenceKeypoint.new(1, ${cfg.tier.dualColor ? cSec : cMid}),`,
				`})`,
				`beam.Attachment0 = allyMuzzleAttachment -- Ally Release Point (Stage 5)`,
				`beam.Attachment1 = enemyHitAttachment   -- Target Contact Point (Stage 7)`,
				`beam.Parent = allyRootPart`,
			].join("\n");
		}

		const orientEnum = vfx.planeKind === "floor"
			? "Enum.ParticleOrientation.VelocityPerpendicular"
			: vfx.planeKind === "xplane"
				? "Enum.ParticleOrientation.FacingCameraWorldUp"
				: "Enum.ParticleOrientation.FacingCamera";

		const lines = [
			`-- Kybermon Pixel VFX (${vfx.name}) | Tier: ${cfg.tier.label} | Element: ${cfg.pEl.name}`,
			`-- Universal Grayscale Sheet: ${cfg.layout} (${cfg.exportW}x${cfg.exportH} 4x Nearest PNG)`,
			`local emitter = Instance.new("ParticleEmitter")`,
			`emitter.Name = "VFX_${vfx.id}"`,
			`emitter.Texture = "rbxassetid://YOUR_GRAYSCALE_ASSET_ID"`,
			`emitter.FlipbookLayout = Enum.ParticleFlipbookLayout.${cfg.layout}`,
			`emitter.FlipbookMode = Enum.ParticleFlipbookMode.${cfg.mode}`,
			`emitter.FlipbookFramerate = NumberRange.new(${state.fps})`,
			`emitter.Orientation = ${orientEnum}`,
			`emitter.LightEmission = ${cfg.lightEmission}`,
			`emitter.LightInfluence = 0`,
			`emitter.Lifetime = NumberRange.new(${cfg.lifetime})`,
			`emitter.Size = NumberSequence.new(${studs})`,
			`emitter.Speed = NumberRange.new(0)`,
			`emitter.Rate = ${vfx.loop ? 2 : 0}`,
			`emitter.LockedToPart = true`,
			`emitter.Color = ColorSequence.new({`,
			`\tColorSequenceKeypoint.new(0, ${cHot}),`,
			`\tColorSequenceKeypoint.new(0.35, ${cMid}),`,
			`\tColorSequenceKeypoint.new(1, ${cMid}),`,
			`})`,
		];

		if (cfg.tier.dualColor) {
			lines.push(`-- Dual-Color Fusion Secondary Layer Tint (${cfg.sEl.name}): ${cSec}`);
		}
		if (!vfx.loop) {
			lines.push(`-- Trigger strictly at Stage 7 (Impact): emitter:Emit(1)`);
		}
		lines.push(`emitter.Parent = targetAttachment`);
		return lines.join("\n");
	}

	function updateRobloxPanel() {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const cfg = getRobloxConfig(vfx);

		const items = [
			["FlipbookLayout", cfg.layout],
			["FlipbookMode", cfg.mode],
			["Orientation", cfg.orientation],
			["LightEmission", String(cfg.lightEmission)],
			["Lifetime", `${cfg.lifetime}s (${state.fps} FPS)`],
			["MaterialPreset", cfg.materialLabel],
		];

		dom.robloxMetaGrid.innerHTML = items.map(([k, v]) => (
			`<div class="meta-tile"><span class="meta-key">${k}</span><span class="meta-val" title="${v}">${v}</span></div>`
		)).join("");

		dom.exportGraySub.textContent = `${cfg.exportW}×${cfg.exportH} • Universal Tint Ready`;
		dom.luauCodePreview.textContent = generateRobloxLuau(vfx);
	}

	function exportSheetPng(useTint) {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const rec = buildVfxSheetRecord(vfx);
		const scale = 4;
		const outW = rec.width * scale;
		const outH = rec.height * scale;

		const outCanvas = document.createElement("canvas");
		outCanvas.width = outW;
		outCanvas.height = outH;
		const ctx = outCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		if (!useTint || state.primaryElId === "GRAY") {
			ctx.drawImage(rec.sheetCanvas, 0, 0, outW, outH);
		} else {
			const el = getPrimaryEl();
			const tmp = document.createElement("canvas");
			tmp.width = CELL_SIZE;
			tmp.height = CELL_SIZE;
			const tCtx = tmp.getContext("2d");
			for (let f = 0; f < vfx.frameCount; f++) {
				const tinted = tintGrayscaleRgba(rec.frames[f], el);
				const imgData = tCtx.createImageData(CELL_SIZE, CELL_SIZE);
				imgData.data.set(tinted);
				tCtx.putImageData(imgData, 0, 0);
				const col = f % vfx.gridCols;
				const row = Math.floor(f / vfx.gridCols);
				ctx.drawImage(tmp, col * CELL_SIZE * scale, row * CELL_SIZE * scale, CELL_SIZE * scale, CELL_SIZE * scale);
			}
		}

		const suffix = useTint ? state.primaryElId.toLowerCase() : "grayscale";
		let filename;
		if (!useTint && vfx.exportFileName) {
			filename = vfx.exportFileName;
		} else if (useTint && vfx.exportFileName) {
			filename = vfx.exportFileName.replace(/\.png$/i, `_${state.primaryElId}.png`);
		} else {
			filename = `kybermon_vfx_${vfx.id}_${suffix}_${outW}x${outH}.png`;
		}

		const link = document.createElement("a");
		link.download = filename;
		link.href = outCanvas.toDataURL("image/png");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast(`Exported ${filename}`);
	}

	function copyLuauSnippet() {
		const vfx = state.activeVfx;
		if (!vfx) return;
		const code = generateRobloxLuau(vfx);

		const fallbackCopy = () => {
			const ta = document.createElement("textarea");
			ta.value = code;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			try {
				document.execCommand("copy");
				showToast(`Copied Roblox Luau snippet for ${vfx.name}`);
			} catch (err) {
				showToast("Clipboard copy failed — copy from Preview box.");
			}
			document.body.removeChild(ta);
		};

		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(code).then(
				() => showToast(`Copied Roblox Luau snippet for ${vfx.name}`),
				fallbackCopy
			);
		} else {
			fallbackCopy();
		}
	}

	// =========================================================================
	// HUD UPDATE & MAIN ANIMATION LOOP
	// =========================================================================
	function updateStageHud(sceneState) {
		const vfx = state.activeVfx;
		if (!vfx || !sceneState || !sceneState._meta) return;

		const meta = sceneState._meta;
		const st = meta.stage;

		dom.hudStagePill.textContent = st.label;
		dom.hudStagePill.className = `stage-pill ${st.cls}`;

		const totalSf = getTotalStageFramesForVfx(vfx);
		const sfText = String(Math.floor(meta.stageFrame)).padStart(2, "0");
		const vfText = meta.activeVfxFrame >= 0 ? `F${String(meta.activeVfxFrame).padStart(2, "0")}` : "--";
		dom.hudStageFrame.textContent = `SF ${sfText} / ${totalSf} • VFX ${vfText}`;

		// Update 10-stage rail
		const isAttack = ATTACK_ROLES.has(vfx.role);
		dom.stageRail.querySelectorAll(".stage-seg").forEach((seg) => {
			const n = Number(seg.dataset.stageNum);
			if (!isAttack && st.cls === "stage-loop") {
				seg.classList.toggle("active", n === 7);
				seg.classList.toggle("passed", n < 7);
			} else {
				seg.classList.toggle("active", n === st.num);
				seg.classList.toggle("passed", n < st.num);
			}
		});

		// Sync 2D preview & active frame scrubber live during playback
		if (meta.activeVfxFrame >= 0 && meta.activeVfxFrame !== state.inspectFrame) {
			state.inspectFrame = meta.activeVfxFrame;
			const rec = buildVfxSheetRecord(vfx);
			const el = state.previewTinted ? getPrimaryEl() : null;
			drawSingleFrameToCanvas(dom.preview2d, rec.frames[state.inspectFrame], 192, el, state.previewBleed);
			const fPad = String(state.inspectFrame).padStart(2, "0");
			dom.previewFrameMeta.textContent = `F${fPad} / ${vfx.frameCount} • 64×64 (3×) • Bleed: ${rec.bleedPixelCount} px`;
			highlightActiveFrameIndicators(state.inspectFrame);
		}
	}

	function tick(ts) {
		requestAnimationFrame(tick);
		if (!state.lastTimestamp) state.lastTimestamp = ts;
		const dt = Math.min(0.1, (ts - state.lastTimestamp) / 1000);
		state.lastTimestamp = ts;
		state.elapsedSec += dt;

		const vfx = state.activeVfx;
		if (!vfx) return;

		if (state.playing) {
			const totalSf = getTotalStageFramesForVfx(vfx);
			state.stageFrame += dt * state.fps;
			if (state.stageFrame >= totalSf) {
				if (state.loopPlayback) {
					state.stageFrame = state.stageFrame % totalSf;
				} else {
					state.stageFrame = totalSf - 0.01;
					state.playing = false;
					syncTransportUI();
				}
			}
		}

		const sceneState = buildCombatSceneState(
			vfx,
			state.stageFrame,
			getTier(),
			getPrimaryEl(),
			getSecondaryEl(),
			{
				vfxMap: state.vfxById,
				timeSec: state.elapsedSec,
				playbackMode: state.loopPlayback ? "loop" : "once",
			}
		);

		// Ensure any auxiliary VFX plane sheets referenced this frame are uploaded
		if (state.engine) {
			for (let i = 0; i < sceneState.planes.length; i++) {
				const pv = state.vfxById[sceneState.planes[i].vfxId];
				if (pv) ensureUploadedToWebGL(pv);
			}
			state.engine.renderScene(sceneState);
		}

		updateStageHud(sceneState);
	}

	// =========================================================================
	// WIRE EVENTS & INITIALIZATION
	// =========================================================================
	function wireEvents() {
		// Search
		dom.vfxSearch.addEventListener("input", () => {
			state.search = dom.vfxSearch.value;
			renderCatalogList();
		});

		dom.btnClearSearch.addEventListener("click", () => {
			state.search = "";
			dom.vfxSearch.value = "";
			renderCatalogList();
			dom.vfxSearch.focus();
		});

		// Camera presets
		dom.camPresetBar.querySelectorAll(".hud-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const preset = btn.dataset.preset;
				state.cameraPreset = preset;
				dom.camPresetBar.querySelectorAll(".hud-btn").forEach((b) => {
					b.classList.toggle("active", b.dataset.preset === preset);
				});
				if (state.engine) state.engine.setCameraPreset(preset);
			});
		});

		dom.btnAutoOrbit.addEventListener("click", () => {
			state.autoOrbit = !state.autoOrbit;
			dom.btnAutoOrbit.classList.toggle("active", state.autoOrbit);
			dom.btnAutoOrbit.setAttribute("aria-pressed", String(state.autoOrbit));
			if (state.engine) state.engine.setAutoOrbit(state.autoOrbit);
		});

		dom.btnResetCam.addEventListener("click", () => {
			if (state.engine) state.engine.resetCamera();
		});

		dom.viewport3d.addEventListener("dblclick", () => {
			if (state.engine) state.engine.resetCamera();
		});

		// Viewport toggles
		dom.btnWireframe.addEventListener("click", () => {
			state.showWireframes = !state.showWireframes;
			dom.btnWireframe.classList.toggle("active", state.showWireframes);
			dom.btnWireframe.setAttribute("aria-pressed", String(state.showWireframes));
			if (state.engine) state.engine.setShowPlanesWireframe(state.showWireframes);
		});

		dom.btnShowArena.addEventListener("click", () => {
			state.showArena = !state.showArena;
			dom.btnShowArena.classList.toggle("active", state.showArena);
			dom.btnShowArena.setAttribute("aria-pressed", String(state.showArena));
			if (state.engine) state.engine.setShowArena(state.showArena);
		});

		dom.arenaBgBar.querySelectorAll(".hud-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const bg = btn.dataset.bg;
				state.arenaBg = bg;
				dom.arenaBgBar.querySelectorAll(".hud-btn").forEach((b) => {
					b.classList.toggle("active", b.dataset.bg === bg);
				});
				if (state.engine) state.engine.setArenaBg(bg);
			});
		});

		// Transport controls
		dom.btnPlayPause.addEventListener("click", () => {
			if (!state.playing && state.activeVfx && state.stageFrame >= getTotalStageFramesForVfx(state.activeVfx) - 0.1) {
				state.stageFrame = 0;
			}
			state.playing = !state.playing;
			syncTransportUI();
		});

		dom.btnStepPrev.addEventListener("click", () => stepFrame(-1));
		dom.btnStepNext.addEventListener("click", () => stepFrame(1));
		dom.btnReplayClash.addEventListener("click", replayClash);

		dom.btnLoopToggle.addEventListener("click", () => {
			state.loopPlayback = !state.loopPlayback;
			syncTransportUI();
		});

		dom.fpsSlider.addEventListener("input", () => {
			state.fps = Number(dom.fpsSlider.value) || 14;
			dom.fpsValue.textContent = String(state.fps);
			updateRobloxPanel();
		});

		// 2D Preview toggles
		dom.btnPreviewTint.addEventListener("click", () => {
			state.previewTinted = !state.previewTinted;
			dom.btnPreviewTint.classList.toggle("active", state.previewTinted);
			dom.btnPreviewTint.setAttribute("aria-pressed", String(state.previewTinted));
			dom.btnPreviewTint.textContent = state.previewTinted ? "Tinted" : "Raw Gray";
			renderInspector2D();
		});

		dom.btnPreviewBleed.addEventListener("click", () => {
			state.previewBleed = !state.previewBleed;
			dom.btnPreviewBleed.classList.toggle("active", state.previewBleed);
			dom.btnPreviewBleed.setAttribute("aria-pressed", String(state.previewBleed));
			renderInspector2D();
		});

		// Interactive Sprite Sheet Click -> Jump & Pause
		dom.sheetWrap.addEventListener("click", (evt) => {
			const vfx = state.activeVfx;
			if (!vfx) return;
			const rect = dom.sheetCanvas.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const u = PE.clamp01((evt.clientX - rect.left) / rect.width);
			const v = PE.clamp01((evt.clientY - rect.top) / rect.height);
			const col = Math.min(vfx.gridCols - 1, Math.floor(u * vfx.gridCols));
			const row = Math.min(vfx.gridRows - 1, Math.floor(v * vfx.gridRows));
			const idx = row * vfx.gridCols + col;
			if (idx >= 0 && idx < vfx.frameCount) {
				jumpToInspectFrame(idx);
			}
		});

		// Export buttons
		dom.btnExportGray.addEventListener("click", () => exportSheetPng(false));
		dom.btnExportTinted.addEventListener("click", () => exportSheetPng(true));
		dom.btnCopyLuau.addEventListener("click", copyLuauSnippet);

		// Keyboard shortcuts
		window.addEventListener("keydown", (evt) => {
			const tag = document.activeElement && document.activeElement.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			if (evt.code === "Space") {
				evt.preventDefault();
				dom.btnPlayPause.click();
			} else if (evt.code === "ArrowLeft") {
				evt.preventDefault();
				stepFrame(-1);
			} else if (evt.code === "ArrowRight") {
				evt.preventDefault();
				stepFrame(1);
			} else if (evt.key === "r" || evt.key === "R") {
				evt.preventDefault();
				replayClash();
			}
		});

		// Resize handling
		const onResize = () => {
			if (state.engine) state.engine.resize();
		};
		window.addEventListener("resize", onResize);
		if (typeof ResizeObserver !== "undefined" && dom.viewportWrap) {
			const ro = new ResizeObserver(onResize);
			ro.observe(dom.viewportWrap);
		}
	}

	function initStudio() {
		bindDom();

		const rawList = Array.isArray(window.KYBERMON_PIXEL_VFX) ? window.KYBERMON_PIXEL_VFX : [];
		state.catalog = rawList.map(normalizeVfx);
		state.vfxById = createCatalogLookup(state.catalog);

		dom.studioStatusBadge.textContent = `${state.catalog.length} VFX Ready`;

		// Initialize WebGL 3D Engine
		if (typeof window.WebGL3DEngine === "function" && dom.viewport3d) {
			try {
				state.engine = new window.WebGL3DEngine(dom.viewport3d);
				state.engine.resize();
				state.engine.setCameraPreset(state.cameraPreset);
				state.engine.setAutoOrbit(state.autoOrbit);
				state.engine.setShowPlanesWireframe(state.showWireframes);
				state.engine.setShowArena(state.showArena);
				state.engine.setArenaBg(state.arenaBg);
			} catch (err) {
				console.error("[KybermonStudio] Failed to initialize WebGL3DEngine:", err);
				showToast("WebGL initialization error — check browser console.");
			}
		}

		// Pre-rasterize and upload catalog sheets cleanly
		for (let i = 0; i < state.catalog.length; i++) {
			ensureUploadedToWebGL(state.catalog[i]);
		}

		buildElementBars();
		buildTierBar();
		buildStageRail();
		buildCategoryTabs();
		syncElementAndTierUI();
		syncTransportUI();
		renderCatalogList();
		wireEvents();

		if (state.catalog.length > 0) {
			// Default to an iconic contact hit VFX if present, otherwise first entry
			const preferred = state.vfxById["hit_slash"] || state.vfxById["hit_impact"] || state.catalog[0];
			selectVfx(preferred.id, true);
		} else {
			dom.hudVfxName.textContent = "No VFX Packs Loaded";
		}

		requestAnimationFrame(tick);
	}

	// Expose clean public API for inspection and automated causal verification
	window.KybermonStudio = {
		STAGE_CONTACT_SF,
		STAGE_TOTAL_SF,
		STATUS_ENEMY_ACTIVATE_SF,
		buildCombatSceneState,
		normalizeVfx,
		tintGrayscaleRgba,
		getState: () => state,
		getCatalog: () => state.catalog,
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initStudio);
	} else {
		initStudio();
	}
})();
