// Kybermon Pixel VFX 3D Studio — Pack: Delivery & Travel (7 Universal Grayscale 64x64 4x4 Flipbooks)
// 100% file:/// compatible (classic IIFE <script>, pushes to window.KYBERMON_PIXEL_VFX).
// Strict rules:
// - Universal grayscale ONLY (PE.GRAY.ALPHA_CRISP, PE.GRAY.SOFT_TRANSPARENT, PE.gray(lum, alpha))
// - Strict 2px Roblox UV safe margin: x, y in [2..61] (0 edge-bleed pixels)
// - Every oneshot VFX has 0 pixels on Frame 15 (frameIndex === 15)
// - Every loop VFX wraps seamlessly (F15 -> F0) and is non-empty on all 16 frames
// - Anti-mewah: clean, restrained, readable pixel art

(function () {
	"use strict";

	const TAU = Math.PI * 2;
	const CX = 32;
	const CY = 32;

	function wrap01(v) {
		const r = v % 1;
		return r < 0 ? r + 1 : r;
	}

	// Draw a jagged polyline helper with optional thickness & dither
	function drawPolyline(pb, pts, col, thickness, ditherMode) {
		if (!pts || pts.length < 2) return;
		for (let i = 0; i < pts.length - 1; i++) {
			pb.drawLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, thickness || 1, ditherMode);
		}
	}

	// Draw a crisp pixel diamond (4-sided rotated square) for compact sparks & core glints
	function fillDiamond(pb, cx, cy, rx, ry, col, ditherMode) {
		if (rx <= 0.4 || ry <= 0.4) return;
		pb.fillPolygon([
			[cx, cy - ry],
			[cx + rx, cy],
			[cx, cy + ry],
			[cx - rx, cy],
		], col, ditherMode);
	}

	// Draw a 4-point crisp pixel star glint (never blurry)
	function drawCrossGlint(pb, cx, cy, armX, armY, col, ditherMode) {
		const ix = Math.round(cx);
		const iy = Math.round(cy);
		const ax = Math.max(0, Math.round(armX));
		const ay = Math.max(0, Math.round(armY));
		pb.setPixel(ix, iy, col, ditherMode);
		for (let dx = 1; dx <= ax; dx++) {
			pb.setPixel(ix + dx, iy, col, ditherMode);
			pb.setPixel(ix - dx, iy, col, ditherMode);
		}
		for (let dy = 1; dy <= ay; dy++) {
			pb.setPixel(ix, iy + dy, col, ditherMode);
			pb.setPixel(ix, iy - dy, col, ditherMode);
		}
	}

	// =========================================================================
	// 1. projectile — Energy Square (Loop, Billboard 1:1, Soft Transparent Glow)
	// =========================================================================
	const SQUARE_MOTES = [
		{ offset: 0.00, dx: -1, dy: -1, base: 7, drift: 5 },
		{ offset: 0.17, dx:  1, dy: -1, base: 7, drift: 5 },
		{ offset: 0.33, dx:  1, dy:  1, base: 7, drift: 5 },
		{ offset: 0.50, dx: -1, dy:  1, base: 7, drift: 5 },
		{ offset: 0.67, dx:  0, dy: -1, base: 8, drift: 5 },
		{ offset: 0.83, dx:  0, dy:  1, base: 8, drift: 5 },
		{ offset: 0.25, dx: -1, dy:  0, base: 8, drift: 5 },
		{ offset: 0.75, dx:  1, dy:  0, base: 8, drift: 5 },
	];

	function fillChamferSquare(pb, cx, cy, half, col, ditherMode, chamfer) {
		const h = Math.round(half);
		const ch = chamfer || 0;
		for (let dy = -h; dy <= h; dy++) {
			for (let dx = -h; dx <= h; dx++) {
				if (ch > 0 && Math.abs(dx) + Math.abs(dy) > h * 2 - ch) continue;
				pb.setPixel(cx + dx, cy + dy, col, ditherMode);
			}
		}
	}

	const VFX_PROJECTILE = {
		id: "projectile",
		name: "Energy Square",
		category: "delivery",
		planeType: "billboard",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ranged_projectile",
		secondaryVfxId: "hit_impact",
		hitFrame: -1,
		planeScale: [1.05, 1.05],
		planeOffsetY: 1.05,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_ProjectileSquare_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 20,
			LightEmission: 0.75,
			Orientation: "FacingCamera",
		},
		description: "Seamless 16-frame small translucent glowy 1:1 pixel square (non-rotating, soft alpha glow + crisp pulsing core + subtle floating pixel motes; 360° FacingCamera safe).",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const S = PE.GRAY.SOFT_TRANSPARENT;
			pb.clear();

			const phase = (frameIndex % total) / total;
			const breath = Math.sin(phase * TAU * 2); // 2 smooth pulses per loop
			const breathInt = breath > 0.35 ? 1 : 0;

			// 1. Soft translucent outer square glow halo (dithered stepped pixel light, no harsh box)
			const outerH = 10 + breathInt;
			fillChamferSquare(pb, CX, CY, outerH, PE.gray(172, 54), "bayer50", 2);

			// 2. Mid translucent square aura (gentle alpha glow, axis-aligned pixel feel)
			const midH = 7 + breathInt;
			fillChamferSquare(pb, CX, CY, midH, PE.gray(196, 102), "bayer75", 1);

			// 3. Translucent main square body (crisp 1:1 pixel square, non-physical & glowy)
			const bodyH = 5;
			pb.fillRect(CX - bodyH, CY - bodyH, bodyH * 2 + 1, bodyH * 2 + 1, PE.gray(218, 168));

			// Subtle translucent rim pixels along outer square edge so White & Black elements stay legible
			pb.strokeRect(CX - bodyH, CY - bodyH, bodyH * 2 + 1, bodyH * 2 + 1, PE.gray(140, 140), 1, "bayer75");

			// Bright crisp inner pixel border (pulsing softly)
			const innerH = 3 + (breath > 0.55 ? 1 : 0);
			pb.fillRect(CX - innerH, CY - innerH, innerH * 2 + 1, innerH * 2 + 1, PE.gray(238, 214));

			// 4. Luminous pulsing center pixel core (4x4 / 5x5)
			const coreH = breath > 0 ? 2 : 1;
			pb.fillRect(CX - coreH, CY - coreH, coreH * 2 + 1, coreH * 2 + 1, S.CORE);

			// Tiny bright corner pixel glints on the square body (alternating crisp shimmer)
			const glintA = breath > 0 ? 220 : 150;
			const gCol = PE.gray(250, glintA);
			pb.setPixel(CX - bodyH, CY - bodyH, gCol);
			pb.setPixel(CX + bodyH, CY - bodyH, gCol);
			pb.setPixel(CX - bodyH, CY + bodyH, gCol);
			pb.setPixel(CX + bodyH, CY + bodyH, gCol);

			// 5. Delicate symmetric 1px-2px square pixel motes drifting gently outward & fading
			for (let i = 0; i < SQUARE_MOTES.length; i++) {
				const m = SQUARE_MOTES[i];
				const u = wrap01(m.offset + phase);
				const dist = m.base + PE.easeOutQuad(u) * m.drift;
				const mx = Math.round(CX + m.dx * dist);
				const my = Math.round(CY + m.dy * dist);
				const alpha = Math.round(Math.sin(u * Math.PI) * 195);
				if (alpha < 24) continue;
				const lum = u < 0.4 ? 248 : (u < 0.72 ? 214 : 176);
				const mCol = PE.gray(lum, alpha);
				pb.setPixel(mx, my, mCol);
				// Subtle 2x2 pixel spark only during peak mid-life on diagonal motes
				if (i < 4 && u > 0.22 && u < 0.58) {
					pb.setPixel(mx + m.dx, my, PE.gray(lum - 20, Math.round(alpha * 0.65)));
					pb.setPixel(mx, my + m.dy, PE.gray(lum - 20, Math.round(alpha * 0.65)));
				}
			}
		},
	};

	// =========================================================================
	// 2. beam_shoot — Beam Ray (Loop, Ribbon, Soft Transparent, Uniform Straight)
	// =========================================================================
	const BEAM_FLANK_SPARKS = [
		{ offset: 0.05, ySign: -1, yDist: 8.6, len: 3 },
		{ offset: 0.24, ySign:  1, yDist: 8.4, len: 2 },
		{ offset: 0.44, ySign: -1, yDist: 9.2, len: 2 },
		{ offset: 0.65, ySign:  1, yDist: 8.8, len: 3 },
		{ offset: 0.84, ySign: -1, yDist: 8.5, len: 2 },
	];

	const VFX_BEAM_SHOOT = {
		id: "beam_shoot",
		name: "Beam Ray",
		category: "delivery",
		planeType: "ribbon",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ranged_beam",
		secondaryVfxId: "hit_impact",
		hitFrame: -1,
		planeScale: [4.6, 1.25],
		planeOffsetY: 1.05,
		robloxOrientation: "Beam",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_BeamRay_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 20,
			LightEmission: 0.65,
			Orientation: "Beam",
		},
		description: "Seamless 16-frame uniform straight horizontal laser beam (tileable x: 2..61, centered y=32, zero mid-bulges) with pulsing core spine, scrolling internal energy streaks, and tight dithered sheath.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const S = PE.GRAY.SOFT_TRANSPARENT;
			const sheathSoft = PE.gray(168, 96);
			const streakHot = PE.gray(250, 238);
			pb.clear();

			const phase = (frameIndex % total) / total;
			const span = 60; // x in [2..61] -> exact 60px horizontally tileable segment
			const globalBreath = Math.sin(phase * TAU * 2) * 0.35;

			// 1. Uniform straight layered laser body across x = 2..61 (zero wide bulges!)
			for (let x = 2; x <= 61; x++) {
				const ux = (x - 2) / span; // [0..1)
				const ripple = Math.sin(ux * TAU * 2 - phase * TAU * 2) * 0.42;

				const outerHalf = 7.4 + globalBreath + ripple * 0.6;
				const rimHalf   = 5.6 + globalBreath * 0.6;
				const midHalf   = 4.2 + ripple * 0.4;
				const brightH   = 2.6 + globalBreath * 0.4;
				const coreH     = 1.4 + 0.25 * Math.sin(phase * TAU * 2 + ux * TAU * 2);

				const y0 = Math.max(2, Math.floor(CY - outerHalf - 1));
				const y1 = Math.min(61, Math.ceil(CY + outerHalf + 1));

				for (let y = y0; y <= y1; y++) {
					const dy = Math.abs(y - CY);
					if (dy > outerHalf) continue;

					if (dy <= coreH) {
						pb.setPixel(x, y, S.CORE);
					} else if (dy <= brightH) {
						pb.setPixel(x, y, S.BRIGHT);
					} else if (dy <= midHalf) {
						pb.setPixel(x, y, S.MID);
					} else if (dy <= rimHalf) {
						pb.setPixel(x, y, S.RIM, "bayer75");
					} else {
						const edgeU = (dy - rimHalf) / Math.max(1, outerHalf - rimHalf);
						const dither = edgeU > 0.52 ? "bayer25" : "bayer50";
						pb.setPixel(x, y, edgeU > 0.52 ? S.FAINT : sheathSoft, dither);
					}
				}
			}

			// 2. Fast scrolling internal energy pulses strictly INSIDE the beam width (zero outward bulge)
			for (let i = 0; i < 4; i++) {
				const u = wrap01(i * 0.25 + phase * 2);
				const sx = 2 + u * span;
				const clones = [sx, sx - span, sx + span];
				for (let c = 0; c < clones.length; c++) {
					const cx = clones[c];
					if (cx < -6 || cx > 68) continue;
					// Sleek internal highlight dash along core & sub-lanes
					pb.drawLine(cx - 4, CY, cx + 3, CY, S.CORE, 1);
					const laneY = CY + (i % 2 === 0 ? -2 : 2);
					pb.drawLine(cx - 3, laneY, cx + 2, laneY, streakHot, 1);
					pb.setPixel(cx + 3, CY - 1, S.CORE);
					pb.setPixel(cx + 3, CY + 1, S.CORE);
				}
			}

			// 3. Tight parallel micro-sparks hugging outer laser edge (wrapped cleanly across [2..61])
			for (let i = 0; i < BEAM_FLANK_SPARKS.length; i++) {
				const sp = BEAM_FLANK_SPARKS[i];
				const u = wrap01(sp.offset + phase * 1);
				const baseX = 2 + u * span;
				const sy = Math.round(CY + sp.ySign * sp.yDist);
				const clones = [baseX, baseX - span, baseX + span];
				for (let c = 0; c < clones.length; c++) {
					const fx = Math.round(clones[c]);
					if (fx < 2 || fx > 61) continue;
					for (let k = 0; k < sp.len; k++) {
						const px = fx - k;
						if (px < 2 || px > 61) continue;
						pb.setPixel(px, sy, k === 0 ? S.BRIGHT : S.MID, k === sp.len - 1 ? "bayer50" : "none");
					}
				}
			}
		},
	};

	// =========================================================================
	// 3. chain — Chain Arc (OneShot, Ribbon, Alpha Crisp, hitFrame: 1, x: 3..60)
	// =========================================================================
	function buildArcSpine(seed, amp, hash01) {
		const pts = [[5, CY]];
		const xs = [12, 19, 26, 32, 38, 45, 52];
		for (let i = 0; i < xs.length; i++) {
			const x = xs[i] + (hash01(seed * 17.3 + i * 5.1) - 0.5) * 2.8;
			const sign = (i % 2 === 0 ? 1 : -1) * (hash01(seed * 3.7 + i * 11.9) > 0.25 ? 1 : -1);
			const env = Math.sin(((i + 1) / (xs.length + 1)) * Math.PI);
			const dy = sign * (0.35 + hash01(seed * 9.1 + i * 7.3) * 0.65) * amp * (0.55 + 0.45 * env);
			pts.push([x, CY + dy]);
		}
		pts.push([58, CY]);
		return pts;
	}

	const VFX_CHAIN = {
		id: "chain",
		name: "Chain Arc",
		category: "delivery",
		planeType: "ribbon",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "ranged_chain",
		secondaryVfxId: "hit_impact",
		hitFrame: 1,
		planeScale: [4.6, 1.45],
		planeOffsetY: 1.1,
		robloxOrientation: "Beam",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_ChainArc_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			LightEmission: 0.45,
			Orientation: "Beam",
		},
		description: "16-frame crisp horizontal jagged energy arc (x: 3..60, y=32) snapping bright F0-F2 with forked spark filaments, fracturing F3-F12, clean 0px on F15.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const A = PE.GRAY.ALPHA_CRISP;
			pb.clear();

			// Guaranteed 0px clean empty final frame for OneShot
			if (frameIndex >= total - 1) return;

			// Snappy lightning topology cadence (re-seeds every 2 frames after peak)
			const topoSeed = frameIndex <= 2 ? (10 + frameIndex) : (20 + Math.floor((frameIndex - 1) / 2));
			const amp = frameIndex === 0 ? 5.5 : (frameIndex <= 2 ? 9.2 : (frameIndex <= 5 ? 7.8 : 6.4));
			const spine = buildArcSpine(topoSeed, amp, PE.hash01);

			// F0: Initial tight snap-in bolt spanning x = 3..60
			if (frameIndex === 0) {
				drawPolyline(pb, spine, A.MID, 3);
				drawPolyline(pb, spine, A.HOT, 2);
				drawPolyline(pb, spine, A.CORE, 1);
				fillDiamond(pb, 5.2, CY, 1.8, 3.2, A.CORE);
				fillDiamond(pb, 57.8, CY, 1.8, 3.2, A.CORE);
				pb.addOutline(A.OUTLINE, 200);
				return;
			}

			// F1-F2: PEAK ARC + SECONDARY FORKED SPARK FILAMENTS (hitFrame: 1)
			if (frameIndex <= 2) {
				const isPeak = frameIndex === 1;
				const outerT = isPeak ? 4 : 3;

				// 3 crisp forked branches off interior vertices
				const forkSpecs = isPeak
					? [
						{ idx: 2, dx1: 5, dy1: -7, dx2: 10, dy2: -10 },
						{ idx: 4, dx1: 6, dy1:  8, dx2: 11, dy2:  11 },
						{ idx: 6, dx1: 4, dy1: -7, dx2:  8, dy2:  -9 },
					]
					: [
						{ idx: 2, dx1: 5, dy1:  7, dx2:  9, dy2:  10 },
						{ idx: 5, dx1: 5, dy1: -8, dx2: 10, dy2: -11 },
						{ idx: 6, dx1: 4, dy1:  6, dx2:  7, dy2:   8 },
					];

				for (let f = 0; f < forkSpecs.length; f++) {
					const fs = forkSpecs[f];
					const base = spine[fs.idx];
					const p1 = [PE.clamp(base[0] + fs.dx1, 6, 57), PE.clamp(base[1] + fs.dy1, 14, 50)];
					const p2 = [PE.clamp(base[0] + fs.dx2, 6, 57), PE.clamp(base[1] + fs.dy2, 12, 52)];
					pb.drawLine(base[0], base[1], p1[0], p1[1], A.MID, 2);
					pb.drawLine(base[0], base[1], p1[0], p1[1], A.BRIGHT, 1);
					pb.drawLine(p1[0], p1[1], p2[0], p2[1], A.BRIGHT, 1);
					pb.setPixel(p2[0], p2[1], A.CORE);
				}

				// Main bolt body: MID outer -> BRIGHT -> HOT -> CORE spine
				drawPolyline(pb, spine, A.MID, outerT);
				drawPolyline(pb, spine, A.BRIGHT, isPeak ? 3 : 2);
				drawPolyline(pb, spine, A.HOT, 2);
				drawPolyline(pb, spine, A.CORE, 1);

				// Crisp anchor discharge nodes spanning x = 3..60 (outline sits cleanly at x = 2..61)
				fillDiamond(pb, 5.5, CY, 2.3, isPeak ? 5.0 : 4.0, A.BRIGHT);
				fillDiamond(pb, 5.5, CY, 1.4, isPeak ? 3.0 : 2.4, A.CORE);
				fillDiamond(pb, 57.5, CY, 2.3, isPeak ? 5.0 : 4.0, A.BRIGHT);
				fillDiamond(pb, 57.5, CY, 1.4, isPeak ? 3.0 : 2.4, A.CORE);

				// Compact mid-arc kink burst
				const midPt = spine[4];
				drawCrossGlint(pb, midPt[0], midPt[1], 3, 4, A.CORE);

				pb.addOutline(A.OUTLINE, 200);

				// Detached sharp micro-sparks near forks
				for (let k = 0; k < 5; k++) {
					const pt = spine[1 + ((k * 2) % 7)];
					const ox = (PE.hash01(frameIndex * 19 + k * 7) - 0.5) * 8;
					const oy = (k % 2 === 0 ? -1 : 1) * (6 + PE.hash01(frameIndex * 13 + k * 5) * 6);
					pb.setPixel(PE.clamp(pt[0] + ox, 5, 58), PE.clamp(pt[1] + oy, 12, 52), A.HOT);
				}
				return;
			}

			// F3-F7: Flickering live arc, thinning cleanly with 1-2 short forks
			if (frameIndex <= 7) {
				const u = (frameIndex - 3) / 4; // 0..1
				const outerCol = u < 0.5 ? A.MID : A.DARK;
				const innerCol = u < 0.4 ? A.CORE : (u < 0.75 ? A.HOT : A.BRIGHT);

				// Short alternating fork filaments
				const forkCount = frameIndex <= 5 ? 2 : 1;
				for (let f = 0; f < forkCount; f++) {
					const idx = 2 + ((frameIndex + f * 3) % 5);
					const base = spine[idx];
					const sign = ((frameIndex + f) % 2 === 0) ? -1 : 1;
					const p1 = [PE.clamp(base[0] + 4, 6, 57), PE.clamp(base[1] + sign * 5.0, 14, 50)];
					const p2 = [PE.clamp(base[0] + 7, 6, 57), PE.clamp(base[1] + sign * 7.2, 13, 51)];
					pb.drawLine(base[0], base[1], p1[0], p1[1], A.MID, 1);
					pb.drawLine(p1[0], p1[1], p2[0], p2[1], A.DARK, 1, "bayer75");
				}

				// Main jagged arc stepping down smoothly in thickness (F3-F4: 3, F5-F6: 2, F7: 1)
				if (frameIndex <= 6) {
					drawPolyline(pb, spine, outerCol, frameIndex <= 4 ? 3 : 2);
				}
				drawPolyline(pb, spine, innerCol, 1);

				// Shrinking contact pips at left & right anchors
				const endR = PE.lerp(3.0, 1.4, u);
				fillDiamond(pb, 5.2, CY, 1.3, endR, A.BRIGHT);
				fillDiamond(pb, 57.8, CY, 1.3, endR, A.BRIGHT);

				pb.addOutline(A.OUTLINE, 200);

				// Small crisp spark flecks drifting outward
				for (let k = 0; k < 4; k++) {
					const base = spine[1 + k * 2];
					const sign = k % 2 === 0 ? -1 : 1;
					const sx = PE.clamp(base[0] + (k - 1.5) * 1.4, 5, 58);
					const sy = PE.clamp(base[1] + sign * (4 + u * 6), 12, 52);
					pb.setPixel(sx, sy, u < 0.6 ? A.BRIGHT : A.MID);
				}
				return;
			}

			// F8-F12: Fracturing arc segments dropping out deterministically with smooth taper
			if (frameIndex <= 12) {
				const u = (frameIndex - 8) / 4; // 0..1
				const segCount = spine.length - 1;
				for (let i = 0; i < segCount; i++) {
					const keepScore = PE.hash01(i * 13.7 + 4.2);
					if (keepScore < u * 0.56) continue;

					const p0 = spine[i];
					const p1 = spine[i + 1];
					const trim = u * 0.30;
					const ax = PE.lerp(p0[0], p1[0], trim);
					const ay = PE.lerp(p0[1], p1[1], trim);
					const bx = PE.lerp(p0[0], p1[0], 1 - trim);
					const by = PE.lerp(p0[1], p1[1], 1 - trim);
					const col = u < 0.35 ? A.BRIGHT : (u < 0.70 ? A.MID : A.DARK);
					const dither = u > 0.75 ? "bayer50" : "none";
					pb.drawLine(ax, ay, bx, by, col, 1, dither);
					if (u < 0.45 && i % 2 === 0) {
						pb.setPixel((ax + bx) * 0.5, (ay + by) * 0.5, A.HOT);
					}
				}

				if (frameIndex <= 9) {
					pb.addOutline(A.OUTLINE, 200);
				}

				// Residual micro-sparks drifting away cleanly
				for (let k = 0; k < 5; k++) {
					if (u > 0.75 && k % 2 === 1) continue;
					const base = spine[1 + ((k * 2) % 7)];
					const sign = k % 2 === 0 ? -1 : 1;
					const sx = PE.clamp(base[0] + (PE.hash01(k * 7.1) - 0.5) * 6, 5, 58);
					const sy = PE.clamp(base[1] + sign * (5 + u * 7), 10, 54);
					pb.setPixel(sx, sy, u < 0.5 ? A.MID : A.DARK);
				}
				return;
			}

			// F13-F14: Delicate fading spark remnants before clean 0px F15
			const remCount = frameIndex === 13 ? 7 : 4;
			const remCol = frameIndex === 13 ? A.DARK : A.SHADOW;
			for (let k = 0; k < remCount; k++) {
				const base = spine[1 + (k % 7)];
				const sign = k % 2 === 0 ? -1 : 1;
				const sx = PE.clamp(base[0] + (PE.hash01(k * 11.3 + frameIndex) - 0.5) * 5, 5, 58);
				const sy = PE.clamp(base[1] + sign * (4 + (frameIndex - 12) * 3.5), 11, 53);
				pb.setPixel(sx, sy, remCol);
				if (frameIndex === 13 && k < 3) {
					pb.setPixel(sx + 1, sy, A.MID, "bayer50");
				}
			}
		},
	};

	// =========================================================================
	// 4. orbit — Orbiting Node (Loop, Orbit, Alpha Crisp, Compact Shard + Ring)
	// =========================================================================
	const ORBIT_SPARK_ANGLES = [0.25, 1.85, 3.45, 5.05];

	const VFX_ORBIT = {
		id: "orbit",
		name: "Orbiting Node",
		category: "delivery",
		planeType: "orbit",
		materialPreset: "alpha_crisp",
		playbackMode: "loop",
		combatRole: "ally_orbit",
		secondaryVfxId: "hit_impact",
		hitFrame: -1,
		planeScale: [0.85, 0.85],
		planeOffsetY: 1.15,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_OrbitNode_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 20,
			LightEmission: 0.35,
			Orientation: "FacingCamera",
		},
		description: "Seamless 16-frame compact spinning geometric energy orb/shard with rotating ring aura and trailing micro-sparks for 3D multi-node orbits.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const A = PE.GRAY.ALPHA_CRISP;
			pb.clear();

			const phase = (frameIndex % total) / total;
			const pulse = Math.sin(phase * TAU * 2);
			const tilt = 0.46; // ~26 deg clean isometric ring tilt
			const cosT = Math.cos(tilt);
			const sinT = Math.sin(tilt);
			const ringRx = 19.2 + pulse * 0.5;
			const ringRy = 9.4 + pulse * 0.3;

			// Helper: point on tilted orbital ring at parameter theta
			function ringPoint(theta, rx, ry, tCos, tSin) {
				const lx = Math.cos(theta) * rx;
				const ly = Math.sin(theta) * ry;
				return [CX + lx * tCos - ly * tSin, CY + lx * tSin + ly * tCos];
			}

			// 1. Back half of rotating orbital ring aura (sin(theta) < 0 -> behind core shard)
			for (let s = 0; s < 24; s++) {
				const a0 = Math.PI + (s / 24) * Math.PI;
				const a1 = Math.PI + ((s + 1) / 24) * Math.PI;
				const p0 = ringPoint(a0, ringRx, ringRy, cosT, sinT);
				const p1 = ringPoint(a1, ringRx, ringRy, cosT, sinT);
				pb.drawLine(p0[0], p0[1], p1[0], p1[1], A.SHADOW, 1, "bayer75");
			}

			// Subtle counter-tilted secondary faint ring bracket
			for (let s = 0; s < 20; s++) {
				if ((s + Math.floor(phase * 16)) % 5 === 0) continue; // crisp orbital break gaps
				const a0 = (s / 20) * TAU + phase * TAU;
				const a1 = ((s + 0.6) / 20) * TAU + phase * TAU;
				const p0 = ringPoint(a0, 15.8, 7.6, cosT, -sinT);
				const p1 = ringPoint(a1, 15.8, 7.6, cosT, -sinT);
				pb.drawLine(p0[0], p0[1], p1[0], p1[1], A.DARK, 1, "bayer50");
			}

			// 2. Spinning faceted 4-fold geometric core shard
			// 90-degree (PI/2) rotation across 16 frames wraps seamlessly with world-space directional lighting!
			const rotOuter = phase * (Math.PI / 2);
			const rotInner = -phase * (Math.PI / 2) + Math.PI / 4;
			const rOuter = 10.6 + pulse * 0.5;
			const rInner = 6.2 + pulse * 0.3;
			const lightDirX = -0.707;
			const lightDirY = -0.707;

			const verts = [];
			for (let k = 0; k < 4; k++) {
				const a = rotOuter + (k * Math.PI) / 2;
				verts.push([CX + Math.cos(a) * rOuter, CY + Math.sin(a) * rOuter]);
			}

			// Draw 4 triangular crystal facets shaded by screen-space normal (seamless across 90-deg wrap!)
			for (let k = 0; k < 4; k++) {
				const v0 = verts[k];
				const v1 = verts[(k + 1) % 4];
				const mx = (v0[0] + v1[0]) * 0.5 - CX;
				const my = (v0[1] + v1[1]) * 0.5 - CY;
				const mag = Math.hypot(mx, my) || 1;
				const ndotl = (mx / mag) * lightDirX + (my / mag) * lightDirY;
				const facetCol = ndotl > 0.30 ? A.BRIGHT : (ndotl > -0.25 ? A.MID : A.DARK);
				pb.fillTriangle(CX, CY, v0[0], v0[1], v1[0], v1[1], facetCol);
			}

			// Inner counter-rotating bright core diamond + crisp center jewel
			pb.fillRegularPoly(CX, CY, rInner, 4, rotInner, A.HOT);
			pb.fillRegularPoly(CX, CY, 3.5 + pulse * 0.2, 4, rotOuter, A.CORE);

			// 3. Front half of tilted orbital ring aura (sin(theta) >= 0 -> passes in front of shard)
			for (let s = 0; s < 24; s++) {
				const a0 = (s / 24) * Math.PI;
				const a1 = ((s + 1) / 24) * Math.PI;
				const p0 = ringPoint(a0, ringRx, ringRy, cosT, sinT);
				const p1 = ringPoint(a1, ringRx, ringRy, cosT, sinT);
				pb.drawLine(p0[0], p0[1], p1[0], p1[1], A.MID, 1);
			}

			// Two opposing orbiting energy beads sliding smoothly along the tilted ring
			for (let b = 0; b < 2; b++) {
				const theta = phase * TAU + b * Math.PI;
				const bp = ringPoint(theta, ringRx, ringRy, cosT, sinT);
				const isFront = Math.sin(theta) >= 0;
				const rBead = isFront ? 2.2 : 1.6;
				fillDiamond(pb, bp[0], bp[1], rBead, rBead, isFront ? A.HOT : A.BRIGHT);
				pb.setPixel(bp[0], bp[1], A.CORE);
			}

			// 4. Crisp 1px silhouette outline around solid shard & beads
			pb.addOutline(A.OUTLINE, 210);

			// 5. Crisp 4-point center glint pulsing on top
			const glintArm = pulse > 0.15 ? 4 : 3;
			drawCrossGlint(pb, CX, CY, glintArm, glintArm, A.CORE);

			// 6. Four trailing micro-sparks orbiting cleanly outside the ring (seamless full TAU wrap)
			for (let i = 0; i < ORBIT_SPARK_ANGLES.length; i++) {
				const theta = ORBIT_SPARK_ANGLES[i] + phase * TAU;
				const rSp = 21.8 + Math.sin(phase * TAU * 2 + i * 1.6) * 1.2;
				const sx = CX + Math.cos(theta) * rSp;
				const sy = CY + Math.sin(theta) * (rSp * 0.78);
				const tailTheta = theta - 0.16;
				const tx = CX + Math.cos(tailTheta) * rSp;
				const ty = CY + Math.sin(tailTheta) * (rSp * 0.78);

				pb.setPixel(tx, ty, A.DARK);
				pb.setPixel(sx, sy, i % 2 === 0 ? A.BRIGHT : A.MID);
			}
		},
	};

	// =========================================================================
	// 5. rain — Sky Rain (Loop, Crossed-X, Alpha Crisp, Periodic Top->Bottom)
	// =========================================================================
	// 9 staggered bolt lanes (5 foreground crisp bolts + 4 lighter depth needles)
	const RAIN_LANES = [
		{ x: 12, offset: 0.02, len: 15, halfW: 1.7, fg: true  },
		{ x: 21, offset: 0.44, len: 13, halfW: 1.5, fg: true  },
		{ x: 31, offset: 0.19, len: 16, halfW: 1.8, fg: true  },
		{ x: 42, offset: 0.67, len: 14, halfW: 1.6, fg: true  },
		{ x: 52, offset: 0.33, len: 15, halfW: 1.7, fg: true  },
		// Background secondary needles (airy depth, slightly thinner)
		{ x: 16, offset: 0.76, len: 11, halfW: 1.0, fg: false },
		{ x: 26, offset: 0.58, len: 12, halfW: 1.0, fg: false },
		{ x: 37, offset: 0.88, len: 11, halfW: 1.0, fg: false },
		{ x: 48, offset: 0.11, len: 12, halfW: 1.0, fg: false },
	];

	const VFX_RAIN = {
		id: "rain",
		name: "Sky Rain",
		category: "delivery",
		planeType: "crossed_x",
		materialPreset: "alpha_crisp",
		playbackMode: "loop",
		combatRole: "sky_rain",
		secondaryVfxId: "hit_impact",
		hitFrame: -1,
		planeScale: [2.6, 3.0],
		planeOffsetY: 1.5,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_SkyRain_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 20,
			LightEmission: 0.35,
			Orientation: "CrossedMesh",
		},
		description: "Seamless 16-frame diagonal/vertical barrage of tapered pixel needles streaking from y=3 to y=59 with crisp ground-contact spark pips.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const A = PE.GRAY.ALPHA_CRISP;
			pb.clear();

			const phase = (frameIndex % total) / total;
			// Slight cohesive steep diagonal slant (clean on crossed_x from all camera angles)
			const slantX = -3.0;
			const dropY0 = 4.0;
			const dropY1 = 58.0;
			const travelAngle = Math.atan2(dropY1 - dropY0, slantX);
			const dirX = Math.cos(travelAngle);
			const dirY = Math.sin(travelAngle);

			// Background depth needles use alpha 210 so addOutline(235) cleanly outlines foreground only
			const bgDark   = PE.gray(98, 210);
			const bgMid    = PE.gray(152, 210);
			const bgBright = PE.gray(204, 210);

			// Pass 1: Background thinner needles (depth without clutter)
			for (let i = 0; i < RAIN_LANES.length; i++) {
				const lane = RAIN_LANES[i];
				if (lane.fg) continue;
				const u = wrap01(lane.offset + phase * 1);

				if (u < 0.78) {
					const t = u / 0.78;
					const tipX = lane.x + slantX * t;
					const tipY = PE.lerp(dropY0, dropY1, t);
					const maxVisibleLen = Math.min(lane.len, Math.max(1.5, tipY - 3.0));
					const tailX = tipX - dirX * maxVisibleLen;
					const tailY = tipY - dirY * maxVisibleLen;

					pb.drawLine(tailX, tailY, tipX, tipY, bgDark, 1);
					pb.drawLine(
						PE.lerp(tailX, tipX, 0.45), PE.lerp(tailY, tipY, 0.45),
						tipX, tipY, bgMid, 1
					);
					pb.setPixel(tipX, tipY, bgBright);
					pb.setPixel(tipX - dirX, tipY - dirY, bgBright);
				}
			}

			// Pass 2: Foreground crisp tapered pixel bolts (alpha 255 -> receives crisp 1px outline)
			for (let i = 0; i < RAIN_LANES.length; i++) {
				const lane = RAIN_LANES[i];
				if (!lane.fg) continue;
				const u = wrap01(lane.offset + phase * 1);

				if (u < 0.78) {
					const t = u / 0.78;
					const tipX = lane.x + slantX * t;
					const tipY = PE.lerp(dropY0 + 1.0, dropY1, t);
					const topClampLen = Math.max(1.5, tipY - 4.0);
					const endShrink = t > 0.88 ? PE.lerp(1.0, 0.45, (t - 0.88) / 0.12) : 1.0;
					const visLen = Math.min(lane.len * endShrink, topClampLen);

					// Tapered outer bolt + inner bright spear + hot core tip
					pb.fillNeedle(tipX, tipY, visLen, lane.halfW, travelAngle, A.MID);
					pb.fillNeedle(tipX, tipY, visLen * 0.72, Math.max(0.9, lane.halfW * 0.56), travelAngle, A.BRIGHT);
					pb.drawLine(
						tipX - dirX * (visLen * 0.35), tipY - dirY * (visLen * 0.35),
						tipX, tipY, A.HOT, 1
					);
					pb.setPixel(tipX, tipY, A.CORE);
					pb.setPixel(tipX - dirX, tipY - dirY, A.CORE);
				}
			}

			// Crisp 1px outline strictly on foreground bolts (alpha >= 235)
			pb.addOutline(A.OUTLINE, 235);

			// Pass 3: Delicate dither tail wisps & bottom ground-contact spark pips (y = 54..59)
			for (let i = 0; i < RAIN_LANES.length; i++) {
				const lane = RAIN_LANES[i];
				const u = wrap01(lane.offset + phase * 1);

				// Subtle tail wisp right behind foreground bolt
				if (lane.fg && u > 0.14 && u < 0.74) {
					const t = u / 0.78;
					const tipX = lane.x + slantX * t;
					const tipY = PE.lerp(dropY0, dropY1, t);
					const w0x = tipX - dirX * (lane.len + 1);
					const w0y = tipY - dirY * (lane.len + 1);
					const w1x = tipX - dirX * (lane.len + 4);
					const w1y = tipY - dirY * (lane.len + 4);
					if (w1y >= 3.5) {
						pb.drawLine(w0x, w0y, w1x, w1y, A.DARK, 1, "bayer50");
					}
				}

				// Ground-contact spark pip burst right at bottom (y = 58..59)
				if (u >= 0.75 && u <= 0.96) {
					const p = (u - 0.75) / 0.21; // 0..1
					const gx = lane.x + slantX;
					const gy = 58;

					if (p < 0.38) {
						// Crisp contact flash pip on ground line
						const w = lane.fg ? 2 : 1;
						pb.drawLine(gx - w, gy, gx + w, gy, lane.fg ? A.BRIGHT : A.MID, 1);
						pb.setPixel(gx, gy, lane.fg ? A.CORE : A.BRIGHT);
						pb.setPixel(gx, gy - 1, lane.fg ? A.HOT : A.MID);
						if (lane.fg) {
							pb.setPixel(gx, gy + 1, A.MID); // y = 59 strictly inside [2..61]
						}
					} else {
						// Two tiny rebounding diagonal spark pips kicking upward cleanly
						const spread = PE.lerp(1.5, lane.fg ? 4.2 : 2.8, (p - 0.38) / 0.62);
						const lift = Math.sin(((p - 0.38) / 0.62) * Math.PI) * (lane.fg ? 4.2 : 2.6);
						const col = p < 0.72 ? (lane.fg ? A.BRIGHT : A.MID) : A.DARK;
						pb.setPixel(gx - spread, gy - lift, col);
						pb.setPixel(gx + spread, gy - lift, col);
						if (p < 0.62 && lane.fg) {
							pb.setPixel(gx, gy, A.MID, "bayer50");
						}
					}
				}
			}
		},
	};

	// =========================================================================
	// 6. wave — Shock Wave (OneShot, Ground XZ, Alpha Crisp, hitFrame: 2)
	// =========================================================================
	const WAVE_SLIPSTREAMS = [
		{ ang: -0.44, rBias: -1.5, len: 11 },
		{ ang: -0.22, rBias:  0.0, len: 13 },
		{ ang:  0.00, rBias:  0.5, len: 14 },
		{ ang:  0.22, rBias:  0.0, len: 13 },
		{ ang:  0.44, rBias: -1.5, len: 11 },
	];

	const VFX_WAVE = {
		id: "wave",
		name: "Shock Wave",
		category: "delivery",
		planeType: "ground_xz",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "ground_wave",
		secondaryVfxId: "hit_impact",
		hitFrame: 2,
		planeScale: [3.2, 2.8],
		planeOffsetY: 0.25,
		robloxOrientation: "FloorPart",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_ShockWave_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			LightEmission: 0.35,
			Orientation: "FloorPart",
		},
		description: "16-frame forward-sweeping ground crescent shockwave pushing cleanly from x=10 to x=58 with trailing slipstream lines and 0px fade on F15.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const A = PE.GRAY.ALPHA_CRISP;
			pb.clear();

			// Guaranteed 0px clean empty final frame for OneShot
			if (frameIndex >= total - 1) return;

			const t = frameIndex / (total - 2); // 0 on F0 .. 1 on F14
			const ease = PE.easeOutCubic(t);

			// Forward crest position sweeps from x=19 (F0) -> x=32 (F2 hitFrame) -> x=57.5 (F13-F14)
			const leadX = PE.lerp(18.5, 57.5, ease);
			const rOut = PE.lerp(9.5, 23.8, PE.easeOutQuad(t));
			const arcCx = leadX - rOut;
			const halfSpan = PE.lerp(0.86, 1.06, PE.easeOutQuad(t)); // ~49 deg -> ~61 deg

			// F14: Final delicate pixel dissipation specks along the front edge
			if (frameIndex === 14) {
				const specks = [-0.72, -0.34, 0.04, 0.38, 0.74];
				for (let i = 0; i < specks.length; i++) {
					const a = specks[i];
					const sx = arcCx + Math.cos(a) * (rOut - 0.5);
					const sy = CY + Math.sin(a) * (rOut - 0.5);
					pb.setPixel(sx, sy, i === 2 ? A.DARK : A.SHADOW);
				}
				return;
			}

			// F0-F10: Solid crisp shockwave crest + secondary echo + trailing slipstream lines
			if (frameIndex <= 10) {
				const fadeU = frameIndex <= 2 ? 0 : (frameIndex - 2) / 8;
				const bandW = frameIndex === 0 ? 5.2
					: (frameIndex <= 3 ? PE.lerp(6.8, 5.8, (frameIndex - 1) / 2)
					: PE.lerp(5.4, 2.2, (frameIndex - 3) / 7));

				// 1. Back wake dither skirt (gives crisp ground-sweep motion read)
				if (frameIndex <= 8) {
					const wakeW = bandW + PE.lerp(3.8, 1.4, fadeU);
					pb.fillArcBand(
						arcCx - 1.0, CY,
						Math.max(2.0, rOut - wakeW), Math.max(3.0, rOut - bandW * 0.65),
						-halfSpan * 0.92, halfSpan * 0.92,
						14, A.SHADOW, "bayer50", true
					);
				}

				// 2. Trailing secondary echo crescent behind the main shockwave (F2..F7)
				if (frameIndex >= 2 && frameIndex <= 7) {
					const echoU = (frameIndex - 2) / 5;
					const echoR = Math.max(4.5, rOut - PE.lerp(6.2, 8.8, echoU));
					const echoW = PE.lerp(2.4, 1.0, echoU);
					const echoCol = echoU < 0.5 ? A.MID : A.DARK;
					const echoDither = echoU > 0.55 ? "bayer50" : "bayer75";
					pb.fillArcBand(
						arcCx - 0.5, CY,
						Math.max(1.5, echoR - echoW), echoR,
						-halfSpan * 0.78, halfSpan * 0.78,
						12, echoCol, echoDither, true
					);
				}

				// 3. Main layered crescent shockwave fan
				const outerCol = fadeU < 0.6 ? A.DARK : A.SHADOW;
				const midCol   = fadeU < 0.55 ? A.MID : A.DARK;
				const edgeCol  = fadeU < 0.45 ? A.BRIGHT : A.MID;
				const crestCol = fadeU < 0.35 ? A.HOT : A.BRIGHT;

				pb.fillArcBand(arcCx, CY, Math.max(2.0, rOut - bandW), rOut, -halfSpan, halfSpan, 16, outerCol, "none", true);
				pb.fillArcBand(arcCx, CY, Math.max(2.0, rOut - bandW * 0.72), rOut, -halfSpan * 0.95, halfSpan * 0.95, 16, midCol, "none", true);
				pb.fillArcBand(arcCx, CY, Math.max(2.0, rOut - bandW * 0.44), rOut, -halfSpan * 0.88, halfSpan * 0.88, 16, edgeCol, "none", true);
				pb.fillArcBand(arcCx, CY, Math.max(2.0, rOut - Math.max(1.2, bandW * 0.24)), rOut, -halfSpan * 0.74, halfSpan * 0.74, 14, crestCol, "none", true);

				// Razor-bright CORE leading pressure lip during peak launch/surge (F0..F4)
				if (frameIndex <= 4) {
					pb.fillArcBand(
						arcCx, CY,
						Math.max(2.0, rOut - (frameIndex <= 2 ? 1.5 : 1.0)), rOut + 0.1,
						-halfSpan * 0.58, halfSpan * 0.58,
						12, A.CORE, "none", true
					);
				}

				// 4. Crisp 1px outline around main crescent (F0..F9)
				if (frameIndex <= 9) {
					pb.addOutline(A.OUTLINE, 220);
				}

				// 5. Trailing crisp slipstream lines streaming backward toward x=10
				for (let i = 0; i < WAVE_SLIPSTREAMS.length; i++) {
					const sl = WAVE_SLIPSTREAMS[i];
					const rHead = rOut - bandW * 0.85 + sl.rBias - fadeU * 2.5;
					const hx = arcCx + Math.cos(sl.ang) * rHead;
					const hy = CY + Math.sin(sl.ang) * rHead;
					const segLen = sl.len * PE.lerp(0.55, 1.0, Math.min(1, frameIndex / 3)) * PE.lerp(1.0, 0.45, fadeU);
					const tx = Math.max(8, hx - Math.cos(sl.ang * 0.55) * segLen);
					const ty = hy - Math.sin(sl.ang * 0.55) * segLen;
					if (hx - tx < 1.5) continue;

					const col = fadeU < 0.45 ? A.BRIGHT : (fadeU < 0.75 ? A.MID : A.DARK);
					const dither = fadeU > 0.65 ? "bayer50" : "none";
					pb.drawLine(tx, ty, hx, hy, col, 1, dither);
				}
				return;
			}

			// F11-F13: Crisp segmented pixel breakup along leading crescent + receding slipstream wisps
			const breakU = (frameIndex - 11) / 2; // 0, 0.5, 1
			const segArcs = [
				[-0.95, -0.62],
				[-0.46, -0.14],
				[ 0.04,  0.34],
				[ 0.52,  0.88],
			];
			const segCol = frameIndex === 11 ? A.MID : A.DARK;
			const segDither = frameIndex === 11 ? "bayer75" : (frameIndex === 12 ? "bayer50" : "bayer25");
			for (let s = 0; s < segArcs.length; s++) {
				if (frameIndex === 13 && s === 1) continue;
				const a0 = segArcs[s][0] + breakU * 0.08;
				const a1 = segArcs[s][1] - breakU * 0.08;
				if (a1 <= a0) continue;
				pb.fillArcBand(arcCx, CY, rOut - PE.lerp(1.8, 1.0, breakU), rOut, a0, a1, 6, segCol, segDither, true);
			}

			// Shrinking slipstream dots
			for (let i = 0; i < WAVE_SLIPSTREAMS.length; i++) {
				if (frameIndex === 13 && i % 2 === 1) continue;
				const sl = WAVE_SLIPSTREAMS[i];
				const rPos = rOut - 4.5 - breakU * 2.0;
				const hx = arcCx + Math.cos(sl.ang) * rPos;
				const hy = CY + Math.sin(sl.ang) * rPos;
				pb.drawLine(hx - PE.lerp(4, 1.5, breakU), hy, hx, hy, A.DARK, 1, "bayer50");
			}
		},
	};

	// =========================================================================
	// 7. ground_fissure — Ground Fissure (OneShot, Ground XZ, hitFrame: 3)
	// =========================================================================
	// Hand-tuned jagged earth fault line spanning x = 4..59 (spine 5..58 + bevel/outline cleanly in [2..61])
	const FISSURE_SPINE = [
		[ 5, 32],
		[10, 30],
		[15, 34],
		[20, 31],
		[26, 35],
		[32, 30],
		[38, 34],
		[44, 31],
		[49, 35],
		[54, 31],
		[58, 32],
	];

	// 6 crisp side-fracture spurs branching cleanly off main fault vertices
	const FISSURE_SPURS = [
		{ idx: 2, pts: [[15, 34], [13, 40], [16, 44]] },
		{ idx: 3, pts: [[20, 31], [18, 24], [22, 20]] },
		{ idx: 4, pts: [[26, 35], [29, 41], [27, 46]] },
		{ idx: 5, pts: [[32, 30], [34, 23], [31, 18]] },
		{ idx: 6, pts: [[38, 34], [41, 40], [39, 45]] },
		{ idx: 7, pts: [[44, 31], [46, 25], [49, 21]] },
	];

	// Deterministic angular earth lip chips flanking the fissure
	const FISSURE_CHIPS = [
		{ idx: 2, ox:  1, oy: -4, w: 3, h: 2 },
		{ idx: 3, ox: -1, oy:  5, w: 3, h: 2 },
		{ idx: 4, ox:  2, oy: -5, w: 4, h: 2 },
		{ idx: 5, ox: -2, oy:  5, w: 3, h: 2 },
		{ idx: 6, ox:  1, oy: -5, w: 3, h: 2 },
		{ idx: 7, ox: -1, oy:  4, w: 3, h: 2 },
		{ idx: 8, ox:  0, oy: -4, w: 2, h: 2 },
	];

	// Interpolate point along FISSURE_SPINE by normalized distance u in [0..1]
	function sampleSpine(u, PE) {
		const maxIdx = FISSURE_SPINE.length - 1;
		const f = PE.clamp01(u) * maxIdx;
		const i0 = Math.min(maxIdx - 1, Math.floor(f));
		const frac = f - i0;
		return [
			PE.lerp(FISSURE_SPINE[i0][0], FISSURE_SPINE[i0 + 1][0], frac),
			PE.lerp(FISSURE_SPINE[i0][1], FISSURE_SPINE[i0 + 1][1], frac),
		];
	}

	// Build sub-polyline of FISSURE_SPINE from start up to normalized fraction u
	function sliceSpine(u, PE) {
		const maxIdx = FISSURE_SPINE.length - 1;
		const f = PE.clamp01(u) * maxIdx;
		const out = [FISSURE_SPINE[0]];
		for (let i = 1; i <= maxIdx; i++) {
			if (i <= f) {
				out.push(FISSURE_SPINE[i]);
			} else {
				const prev = FISSURE_SPINE[i - 1];
				const curr = FISSURE_SPINE[i];
				const frac = f - (i - 1);
				if (frac > 0.01) {
					out.push([PE.lerp(prev[0], curr[0], frac), PE.lerp(prev[1], curr[1], frac)]);
				}
				break;
			}
		}
		return out;
	}

	// Draw a jagged tapered polygon band along a polyline (width swells at center, tapers at ends)
	function fillJaggedSeam(pb, pts, maxHalfW, col, ditherMode) {
		if (!pts || pts.length < 2) return;
		const n = pts.length;
		const topPts = [];
		const botPts = [];
		for (let i = 0; i < n; i++) {
			const u = n > 1 ? i / (n - 1) : 0.5;
			const env = 0.26 + 0.74 * Math.sin(u * Math.PI);
			const hw = Math.max(0.6, maxHalfW * env);
			topPts.push([pts[i][0], pts[i][1] - hw]);
			botPts.push([pts[i][0], pts[i][1] + hw]);
		}
		const poly = topPts.concat(botPts.reverse());
		pb.fillPolygon(poly, col, ditherMode);
	}

	const VFX_GROUND_FISSURE = {
		id: "ground_fissure",
		name: "Ground Fissure",
		category: "delivery",
		planeType: "ground_xz",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "ground_fissure",
		secondaryVfxId: "rubble",
		hitFrame: 3,
		planeScale: [4.2, 1.7],
		planeOffsetY: 0.05,
		robloxOrientation: "FloorPart",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Delivery_GroundFissure_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			LightEmission: 0.35,
			Orientation: "FloorPart",
		},
		description: "16-frame jagged earth/energy crack splitting rapidly from x=4 to x=59, erupting bright seam energy F3-F6, cooling and closing cleanly to 0px on F15.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			PE = PE || window.PixelEngine;
			const total = totalFrames || 16;
			const A = PE.GRAY.ALPHA_CRISP;
			pb.clear();

			// Guaranteed 0px clean empty final frame for OneShot
			if (frameIndex >= total - 1) return;

			// F14: Tiny fading fissure dust traces along the fault before 0px F15
			if (frameIndex === 14) {
				const indices = [2, 4, 5, 7, 8];
				for (let i = 0; i < indices.length; i++) {
					const pt = FISSURE_SPINE[indices[i]];
					pb.setPixel(pt[0], pt[1], A.SHADOW);
				}
				return;
			}

			// F0-F2: Rapid directional ground crack splitting from left (x=4) -> right (x=59)
			if (frameIndex <= 2) {
				const splitFracs = [0.36, 0.72, 1.0];
				const frac = splitFracs[frameIndex];
				const activeSpine = sliceSpine(frac, PE);
				const tip = activeSpine[activeSpine.length - 1];

				// Cracked chasm lip + inner pressure vein
				fillJaggedSeam(pb, activeSpine, PE.lerp(2.0, 3.0, frameIndex / 2), A.SHADOW);
				drawPolyline(pb, activeSpine, A.DARK, 2);
				drawPolyline(pb, activeSpine, frameIndex === 2 ? A.BRIGHT : A.MID, 1);

				// Side spurs begin snapping open behind the advancing crack tip
				const maxSpurIdx = Math.floor(frac * (FISSURE_SPINE.length - 1)) - 1;
				for (let s = 0; s < FISSURE_SPURS.length; s++) {
					const sp = FISSURE_SPURS[s];
					if (sp.idx <= maxSpurIdx) {
						pb.drawLine(sp.pts[0][0], sp.pts[0][1], sp.pts[1][0], sp.pts[1][1], A.DARK, 1);
						if (frameIndex === 2) {
							pb.drawLine(sp.pts[1][0], sp.pts[1][1], sp.pts[2][0], sp.pts[2][1], A.SHADOW, 1);
						}
					}
				}

				// Crisp lifted ground chips near opened seam
				for (let c = 0; c < FISSURE_CHIPS.length; c++) {
					const ch = FISSURE_CHIPS[c];
					if (ch.idx <= maxSpurIdx + 1) {
						const base = FISSURE_SPINE[ch.idx];
						pb.fillRect(base[0] + ch.ox, base[1] + ch.oy, ch.w, ch.h, A.DARK);
						pb.setPixel(base[0] + ch.ox, base[1] + ch.oy, A.MID);
					}
				}

				// Leading tearing chisel flash at crack tip
				fillDiamond(pb, tip[0], tip[1], 2.2, 3.2, A.HOT);
				pb.setPixel(tip[0], tip[1], A.CORE);

				pb.addOutline(A.OUTLINE, 200);
				return;
			}

			// F3-F6: PEAK ENERGY ERUPTION THROUGH THE SEAM (hitFrame: 3)
			if (frameIndex <= 6) {
				const u = (frameIndex - 3) / 3; // 0 on F3 .. 1 on F6
				const isMax = frameIndex === 3 || frameIndex === 4;
				const chasmHalfW = PE.lerp(4.6, 3.6, u);
				const glowHalfW  = PE.lerp(2.9, 1.8, u);

				// 1. Wide cracked earth trench & bevel rim
				fillJaggedSeam(pb, FISSURE_SPINE, chasmHalfW, A.SHADOW);
				fillJaggedSeam(pb, FISSURE_SPINE, chasmHalfW * 0.78, A.DARK);

				// 2. Full side-fracture spurs open with glowing roots
				for (let s = 0; s < FISSURE_SPURS.length; s++) {
					const sp = FISSURE_SPURS[s];
					pb.drawLine(sp.pts[0][0], sp.pts[0][1], sp.pts[1][0], sp.pts[1][1], A.SHADOW, 2);
					pb.drawLine(sp.pts[1][0], sp.pts[1][1], sp.pts[2][0], sp.pts[2][1], A.DARK, 1);
					pb.drawLine(sp.pts[0][0], sp.pts[0][1], sp.pts[1][0], sp.pts[1][1], isMax ? A.BRIGHT : A.MID, 1);
				}

				// 3. Angular lifted crust bevel chips flanking the cracked chasm
				for (let c = 0; c < FISSURE_CHIPS.length; c++) {
					const ch = FISSURE_CHIPS[c];
					const base = FISSURE_SPINE[ch.idx];
					const push = isMax ? 1.4 : 0.8;
					const cy = base[1] + ch.oy + (ch.oy < 0 ? -push : push);
					pb.fillRect(base[0] + ch.ox, cy, ch.w, ch.h, A.DARK);
					pb.drawLine(base[0] + ch.ox, cy, base[0] + ch.ox + ch.w - 1, cy, A.MID, 1);
				}

				// 4. Erupting energy core welling through the entire jagged seam
				fillJaggedSeam(pb, FISSURE_SPINE, glowHalfW, isMax ? A.BRIGHT : A.MID);
				drawPolyline(pb, FISSURE_SPINE, isMax ? A.HOT : A.BRIGHT, isMax ? 2 : 1);
				if (frameIndex <= 5) {
					drawPolyline(pb, FISSURE_SPINE, frameIndex <= 4 ? A.CORE : A.HOT, 1);
				}

				// 5. Three focused seam flare bursts at main fault bends (restrained, anti-mewah)
				const flareIndices = [3, 5, 7];
				for (let fi = 0; fi < flareIndices.length; fi++) {
					const pt = FISSURE_SPINE[flareIndices[fi]];
					const armY = isMax ? 6 : 4;
					const armX = isMax ? 3 : 2;
					drawCrossGlint(pb, pt[0], pt[1], armX, armY, isMax ? A.CORE : A.HOT);
				}

				pb.addOutline(A.OUTLINE, 200);

				// 6. Crisp rising micro-sparks ejecting slightly off the seam
				for (let k = 0; k < 6; k++) {
					const pt = sampleSpine(0.14 + k * 0.14, PE);
					const dir = k % 2 === 0 ? -1 : 1;
					const sx = pt[0] + (PE.hash01(k * 9.3 + frameIndex) - 0.5) * 4;
					const sy = pt[1] + dir * (5.5 + u * 5.0 + PE.hash01(k * 4.1) * 2.5);
					pb.setPixel(sx, sy, isMax ? A.HOT : A.BRIGHT);
				}
				return;
			}

			// F7-F11: Cooling energy seam & closing chasm
			if (frameIndex <= 11) {
				const u = (frameIndex - 7) / 4; // 0 on F7 .. 1 on F11
				const chasmHalfW = PE.lerp(3.2, 1.1, u);

				// Narrowing earth chasm (keep thin seam through F10 for smooth F9 -> F10 -> F11 decay)
				if (frameIndex <= 10) {
					fillJaggedSeam(pb, FISSURE_SPINE, chasmHalfW, A.SHADOW, frameIndex === 10 ? "bayer75" : "none");
				}
				drawPolyline(pb, FISSURE_SPINE, frameIndex <= 9 ? A.DARK : A.SHADOW, frameIndex <= 8 ? 2 : 1);

				// Retracting side-fracture spurs
				const spurKeep = 1.0 - u;
				if (spurKeep > 0.18) {
					for (let s = 0; s < FISSURE_SPURS.length; s++) {
						const sp = FISSURE_SPURS[s];
						const ex = PE.lerp(sp.pts[0][0], sp.pts[1][0], spurKeep);
						const ey = PE.lerp(sp.pts[0][1], sp.pts[1][1], spurKeep);
						pb.drawLine(sp.pts[0][0], sp.pts[0][1], ex, ey, A.DARK, 1, u > 0.5 ? "bayer50" : "none");
					}
				}

				// Cooling inner energy vein (BRIGHT -> MID -> DARK dither -> extinguished by F11)
				if (frameIndex <= 10) {
					const veinCol = frameIndex === 7 ? A.BRIGHT : (frameIndex <= 8 ? A.MID : A.DARK);
					const veinDither = frameIndex >= 9 ? "bayer50" : "none";
					drawPolyline(pb, FISSURE_SPINE, veinCol, 1, veinDither);
				}

				// Settling small crust chips
				if (frameIndex <= 9) {
					for (let c = 0; c < FISSURE_CHIPS.length; c += 2) {
						const ch = FISSURE_CHIPS[c];
						const base = FISSURE_SPINE[ch.idx];
						pb.fillRect(base[0] + ch.ox, base[1] + ch.oy * 0.85, 2, 1, A.DARK, u > 0.45 ? "bayer50" : "none");
					}
				}

				if (frameIndex <= 9) {
					pb.addOutline(A.OUTLINE, 210);
				}
				return;
			}

			// F12-F13: Broken hairline crust cracks closing away cleanly
			const segs = FISSURE_SPINE.length - 1;
			const isF13 = frameIndex === 13;
			for (let i = 0; i < segs; i++) {
				if (isF13 && i % 2 === 0) continue;
				const p0 = FISSURE_SPINE[i];
				const p1 = FISSURE_SPINE[i + 1];
				const trim = isF13 ? 0.30 : 0.15;
				pb.drawLine(
					PE.lerp(p0[0], p1[0], trim), PE.lerp(p0[1], p1[1], trim),
					PE.lerp(p0[0], p1[0], 1 - trim), PE.lerp(p0[1], p1[1], 1 - trim),
					isF13 ? A.SHADOW : A.DARK, 1, isF13 ? "bayer50" : "bayer75"
				);
			}
		},
	};

	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];
	window.KYBERMON_PIXEL_VFX.push(
		VFX_PROJECTILE,
		VFX_BEAM_SHOOT,
		VFX_CHAIN,
		VFX_ORBIT,
		VFX_RAIN,
		VFX_WAVE,
		VFX_GROUND_FISSURE
	);
})();
