// Kybermon Pixel VFX 3D Studio — Contact Hits Pack (8 Universal Grayscale Instant-Contact VFX)
// 100% file:/// compatible (classic <script>, pushes into window.KYBERMON_PIXEL_VFX).
// Strict invariants:
// - 64x64 integer pixel art, 4x4 (16 frames), playbackMode: "oneshot"
// - Instant-Contact ONLY (hitFrame: 0 or 1, ZERO multi-frame idle anticipation)
// - Universal Grayscale palettes ONLY (PE.GRAY.ALPHA_CRISP & PE.gray(lum, alpha))
// - Strict 2px Roblox UV safe margin [2..61] (0 edge-bleed pixels)
// - Frame 15 (frameIndex === 15) strictly 0 pixels across all 8 VFX

(function () {
	"use strict";

	const CX = 32;
	const CY = 32;

	// =========================================================================
	// SHARED PIXEL-ART CONTACT HELPERS
	// =========================================================================

	function evalQuadBezier(p0, p1, p2, u) {
		const mt = 1 - u;
		const x = mt * mt * p0[0] + 2 * mt * u * p1[0] + u * u * p2[0];
		const y = mt * mt * p0[1] + 2 * mt * u * p1[1] + u * u * p2[1];
		const dx = 2 * mt * (p1[0] - p0[0]) + 2 * u * (p2[0] - p1[0]);
		const dy = 2 * mt * (p1[1] - p0[1]) + 2 * u * (p2[1] - p1[1]);
		const len = Math.hypot(dx, dy) || 1;
		const tx = dx / len;
		const ty = dy / len;
		return { x, y, tx, ty, nx: -ty, ny: tx };
	}

	function bladeProfile(u) {
		if (u <= 0 || u >= 1) return 0;
		const v = Math.pow(u, 0.70) * Math.pow(1 - u, 0.45) * 2.08;
		return v > 1 ? 1 : v;
	}

	function symTaperProfile(u) {
		if (u <= 0 || u >= 1) return 0;
		return Math.sin(u * Math.PI);
	}

	// Tapered quadratic Bezier slash/claw stroke with optional fracture & normal offset
	function drawTaperedBezier(pb, PE, p0, p1, p2, uStart, uEnd, opts) {
		const span = uEnd - uStart;
		if (span <= 0.02) return;
		const segs = opts.segs || 14;
		const maxW = opts.maxW || 6;
		const col = opts.col;
		const dither = opts.dither || "none";
		const profileFn = opts.profile || bladeProfile;
		const normalShift = opts.normalShift || 0;
		const bias = opts.bias || 0; // -0.5..+0.5 shifts thickness along normal
		const fracture = opts.fracture || 0;
		const seed = opts.seed || 1.7;

		for (let i = 0; i < segs; i++) {
			let l0 = i / segs;
			let l1 = (i + 1) / segs;
			const lMid = (l0 + l1) * 0.5;

			if (fracture > 0) {
				const gapShrink = fracture * 0.44;
				l0 = PE.lerp(l0, lMid, gapShrink);
				l1 = PE.lerp(l1, lMid, gapShrink);
				// Deterministic drop-out of weaker tail fragments as fracture deepens
				if (fracture > 0.55 && PE.hash01(i * 13.7 + seed) < (fracture - 0.52) * 1.15) {
					continue;
				}
			}

			const u0 = uStart + span * l0;
			const u1 = uStart + span * l1;
			const a = evalQuadBezier(p0, p1, p2, u0);
			const b = evalQuadBezier(p0, p1, p2, u1);

			const driftN = fracture > 0 ? (PE.hash01(i * 19.3 + seed) - 0.35) * fracture * 6.5 : 0;
			const driftT = fracture > 0 ? (PE.hash01(i * 7.1 + seed * 2.1) - 0.5) * fracture * 3.2 : 0;

			const w0 = profileFn(l0) * maxW * (1 - fracture * 0.35);
			const w1 = profileFn(l1) * maxW * (1 - fracture * 0.35);
			if (w0 < 0.35 && w1 < 0.35) continue;

			const offA = normalShift + driftN;
			const offB = normalShift + driftN;

			const ax = a.x + a.nx * offA + a.tx * driftT;
			const ay = a.y + a.ny * offA + a.ty * driftT;
			const bx = b.x + b.nx * offB + b.tx * driftT;
			const by = b.y + b.ny * offB + b.ty * driftT;

			const posFactor = 0.5 + bias;
			const negFactor = 0.5 - bias;

			const q0x = ax + a.nx * (w0 * posFactor);
			const q0y = ay + a.ny * (w0 * posFactor);
			const q1x = ax - a.nx * (w0 * negFactor);
			const q1y = ay - a.ny * (w0 * negFactor);
			const q2x = bx - b.nx * (w1 * negFactor);
			const q2y = by - b.ny * (w1 * negFactor);
			const q3x = bx + b.nx * (w1 * posFactor);
			const q3y = by + b.ny * (w1 * posFactor);

			pb.fillTriangle(q0x, q0y, q1x, q1y, q2x, q2y, col, dither);
			pb.fillTriangle(q0x, q0y, q2x, q2y, q3x, q3y, col, dither);

			if (Math.max(w0, w1) <= 2.2) {
				pb.drawLine(ax, ay, bx, by, col, 1, dither);
			}
		}
	}

	// 4-point sharp cross-glint starburst radiating from (cx, cy)
	function drawCrossGlint(pb, cx, cy, lenA, lenB, angle, halfWA, halfWB, col, dither) {
		const mode = dither || "none";
		for (let k = 0; k < 4; k++) {
			const a = angle + (k * Math.PI) * 0.5;
			const len = k % 2 === 0 ? lenA : lenB;
			const hw = k % 2 === 0 ? halfWA : halfWB;
			if (len < 1.2) continue;
			const tx = cx + Math.cos(a) * len;
			const ty = cy + Math.sin(a) * len;
			pb.fillNeedle(tx, ty, len, hw, a, col, mode);
		}
	}

	// Segmented shockwave ring that breaks organically into arc pieces
	function drawBrokenRing(pb, cx, cy, rIn, rOut, count, gapFrac, rotOffset, col, dither, taper) {
		if (rOut <= rIn + 0.3 || rOut < 1) return;
		const step = (Math.PI * 2) / count;
		const arcLen = step * (1 - gapFrac);
		if (arcLen <= 0.05) return;
		for (let i = 0; i < count; i++) {
			const a0 = rotOffset + i * step;
			const a1 = a0 + arcLen;
			pb.fillArcBand(cx, cy, rIn, rOut, a0, a1, 5, col, dither || "none", !!taper);
		}
	}

	// Crisp pixel spark / directional streak / micro-glint
	function drawPixelSpark(pb, x, y, angle, size, col, coreCol, dither) {
		const mode = dither || "none";
		if (size < 0.45) return;
		if (size >= 2.2) {
			const len = size * 1.9;
			const tx = x + Math.cos(angle) * len * 0.55;
			const ty = y + Math.sin(angle) * len * 0.55;
			pb.fillNeedle(tx, ty, len, size * 0.44, angle, col, mode);
			if (coreCol) {
				pb.setPixel(x, y, coreCol, mode);
			}
			return;
		}
		if (size >= 1.35) {
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);
			pb.drawLine(x - dx * 1.1, y - dy * 1.1, x + dx * 1.1, y + dy * 1.1, col, 1, mode);
			if (coreCol) {
				pb.setPixel(x, y, coreCol, mode);
			}
			return;
		}
		if (size >= 0.85) {
			pb.setPixel(x, y, col, mode);
			pb.setPixel(x + Math.round(Math.cos(angle)), y + Math.round(Math.sin(angle)), coreCol || col, mode);
			return;
		}
		pb.setPixel(x, y, col, mode);
	}

	// Tiny crisp 3px pixel "+" twinkle glint
	function drawTwinkle(pb, x, y, col, coreCol, dither) {
		const ix = Math.round(x);
		const iy = Math.round(y);
		const mode = dither || "none";
		pb.setPixel(ix - 1, iy, col, mode);
		pb.setPixel(ix + 1, iy, col, mode);
		pb.setPixel(ix, iy - 1, col, mode);
		pb.setPixel(ix, iy + 1, col, mode);
		pb.setPixel(ix, iy, coreCol || col, mode);
	}

	// Stylized predator jaw & interlocking fang renderer for hit_bite
	function drawBiteJaws(pb, cyUp, cyLo, fangScale, opts) {
		const P = opts.P;
		const dither = opts.dither || "none";
		const drawArch = opts.drawArch !== false;
		const showInner = opts.showInner !== false;
		const bodyCol = opts.bodyCol || P.BRIGHT;
		const rimCol = opts.rimCol || P.MID;
		const edgeCol = opts.edgeCol || P.HOT;
		const coreCol = opts.coreCol || P.CORE;
		const archCol = opts.archCol || P.DARK;
		const archDither = opts.archDither || dither;

		// Curved upper & lower jaw arches
		if (drawArch) {
			for (let s = 0; s < 10; s++) {
				const u0 = s / 10;
				const u1 = (s + 1) / 10;
				const x0 = 13 + u0 * 38;
				const x1 = 13 + u1 * 38;
				const bow0 = Math.sin(u0 * Math.PI);
				const bow1 = Math.sin(u1 * Math.PI);

				const uy0 = cyUp + 1.2 - bow0 * 4.0;
				const uy1 = cyUp + 1.2 - bow1 * 4.0;
				pb.drawLine(x0, uy0 - 1.2, x1, uy1 - 1.2, archCol, 2, archDither);
				pb.drawLine(x0, uy0 + 0.4, x1, uy1 + 0.4, rimCol, 1, archDither);

				const ly0 = cyLo - 1.2 + bow0 * 4.0;
				const ly1 = cyLo - 1.2 + bow1 * 4.0;
				pb.drawLine(x0, ly0 + 1.2, x1, ly1 + 1.2, archCol, 2, archDither);
				pb.drawLine(x0, ly0 - 0.4, x1, ly1 - 0.4, rimCol, 1, archDither);
			}
		}

		// Upper fangs (pointing DOWN): 2 strong outer canines + 2 inner incisors
		const upperFangs = [
			{ xL: 14.5, xR: 21.5, tipX: 18.4, baseY: cyUp + 0.2, len: 11.4, canine: true },
			{ xL: 24.4, xR: 29.4, tipX: 26.8, baseY: cyUp - 1.6, len: 7.4,  canine: false },
			{ xL: 34.6, xR: 39.6, tipX: 37.2, baseY: cyUp - 1.6, len: 7.4,  canine: false },
			{ xL: 42.5, xR: 49.5, tipX: 45.6, baseY: cyUp + 0.2, len: 11.4, canine: true },
		];

		// Lower fangs (pointing UP): cleanly interlocked between upper fangs!
		const lowerFangs = [
			{ xL: 19.2, xR: 25.4, tipX: 22.4, baseY: cyLo - 0.2, len: 10.6, canine: true },
			{ xL: 28.0, xR: 32.0, tipX: 30.0, baseY: cyLo + 1.5, len: 6.8,  canine: false },
			{ xL: 32.0, xR: 36.0, tipX: 34.0, baseY: cyLo + 1.5, len: 6.8,  canine: false },
			{ xL: 38.6, xR: 44.8, tipX: 41.6, baseY: cyLo - 0.2, len: 10.6, canine: true },
		];

		for (let i = 0; i < upperFangs.length; i++) {
			const t = upperFangs[i];
			if (!t.canine && !showInner) continue;
			const len = t.len * fangScale;
			if (len < 1.8) continue;
			const tipY = t.baseY + len;
			const midX = (t.xL + t.xR) * 0.5;
			// Base shade
			pb.fillTriangle(t.xL, t.baseY, t.xR, t.baseY, t.tipX, tipY, rimCol, dither);
			// Inner brighter enamel bevel
			const hiBaseX = t.tipX < CX ? t.xR - 0.8 : t.xL + 0.8;
			pb.fillTriangle(midX, t.baseY + 0.5, hiBaseX, t.baseY + 0.5, t.tipX, tipY, bodyCol, dither);
			if (edgeCol && len >= 4.0) {
				pb.drawLine(hiBaseX, t.baseY + 1, t.tipX, tipY, edgeCol, 1, dither);
			}
			if (coreCol && t.canine && len >= 5.5) {
				pb.drawLine(t.tipX, tipY - 2.2, t.tipX, tipY, coreCol, 1, dither);
			}
		}

		for (let i = 0; i < lowerFangs.length; i++) {
			const t = lowerFangs[i];
			if (!t.canine && !showInner) continue;
			const len = t.len * fangScale;
			if (len < 1.8) continue;
			const tipY = t.baseY - len;
			const midX = (t.xL + t.xR) * 0.5;
			pb.fillTriangle(t.xL, t.baseY, t.xR, t.baseY, t.tipX, tipY, rimCol, dither);
			const hiBaseX = t.tipX < CX ? t.xR - 0.8 : t.xL + 0.8;
			pb.fillTriangle(midX, t.baseY - 0.5, hiBaseX, t.baseY - 0.5, t.tipX, tipY, bodyCol, dither);
			if (edgeCol && len >= 4.0) {
				pb.drawLine(hiBaseX, t.baseY - 1, t.tipX, tipY, edgeCol, 1, dither);
			}
			if (coreCol && t.canine && len >= 5.5) {
				pb.drawLine(t.tipX, tipY + 2.2, t.tipX, tipY, coreCol, 1, dither);
			}
		}
	}

	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];

	// =========================================================================
	// 1. hit_impact — Universal Impact (Compact reusable ranged/projectile/beam/orbit/chain hit)
	// =========================================================================
	const IMPACT_SPARKS = [
		{ a: -0.52, r0: 9.5,  dist: 14.5, s0: 2.3, life: 13 },
		{ a:  0.42, r0: 10.0, dist: 15.0, s0: 2.1, life: 14 },
		{ a:  1.45, r0: 8.8,  dist: 13.8, s0: 2.0, life: 12 },
		{ a:  2.55, r0: 9.6,  dist: 15.2, s0: 2.4, life: 14 },
		{ a: -2.42, r0: 9.2,  dist: 14.0, s0: 2.0, life: 13 },
		{ a: -1.58, r0: 8.6,  dist: 13.2, s0: 1.9, life: 11 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_impact",
		name: "Universal Impact",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "ranged_hit",
		role: "ranged_hit",
		hitFrame: 0,
		planeScale: [1.75, 1.75],
		size: [1.75, 1.75],
		planeOffsetY: 1.05,
		yOffset: 1.05,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitImpact_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.40,
			Orientation: "FacingCamera",
		},
		description: "Compact universal starburst pop + tight shock ring + 6 flying pixel sparks at (32, 32). Reusable impact for projectile, beam, rain, orbit, and chain.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			// Helper for the 6 compact flying pixel sparks
			const drawImpactSparks = (f, solidOnly) => {
				for (let i = 0; i < IMPACT_SPARKS.length; i++) {
					const sp = IMPACT_SPARKS[i];
					if (f > sp.life) continue;
					const p = f / sp.life;
					const dist = sp.r0 + sp.dist * E.easeOutCubic(p);
					const x = CX + Math.cos(sp.a) * dist;
					const y = CY + Math.sin(sp.a) * dist;
					const sz = sp.s0 * (1 - E.easeInQuad(p) * 0.78);
					if (solidOnly && sz < 1.6) continue;
					if (!solidOnly && sz >= 1.6) continue;

					let col = P.HOT;
					if (p > 0.72) col = P.DARK;
					else if (p > 0.45) col = P.MID;
					else if (p > 0.20) col = P.BRIGHT;

					const dither = p > 0.80 ? "bayer50" : "none";
					if (p > 0.55 && p < 0.82 && i % 2 === f % 2) {
						drawTwinkle(pb, x, y, col, P.HOT, "none");
					} else {
						drawPixelSpark(pb, x, y, sp.a, sz, col, p < 0.35 ? P.CORE : null, dither);
					}
				}
			};

			// F0: INSTANT PEAK STARBURST POP + TIGHT SHOCK RING
			if (frameIndex === 0) {
				pb.fillRing(CX, CY, 12.2, 9.2, P.BRIGHT);
				drawCrossGlint(pb, CX, CY, 17.0, 14.5, -0.22, 3.3, 2.8, P.BRIGHT);
				drawCrossGlint(pb, CX, CY, 11.2, 10.0, -0.22 + Math.PI / 4, 2.2, 2.0, P.MID);
				pb.fillCircle(CX, CY, 7.2, P.HOT);
				drawImpactSparks(0, true);
				pb.addOutline(P.OUTLINE);
				// Crisp blazing interior
				pb.fillRing(CX, CY, 11.4, 9.9, P.HOT);
				drawCrossGlint(pb, CX, CY, 14.2, 12.0, -0.22, 2.1, 1.8, P.HOT);
				drawCrossGlint(pb, CX, CY, 10.4, 8.8, -0.22, 1.3, 1.1, P.CORE);
				pb.fillCircle(CX, CY, 5.0, P.CORE);
				drawImpactSparks(0, false);
				return;
			}

			// F1: STARBURST SNAP EXTENSION & TIGHT RING EXPANSION
			if (frameIndex === 1) {
				pb.fillRing(CX, CY, 15.2, 12.2, P.MID);
				pb.fillRing(CX, CY, 14.5, 12.8, P.BRIGHT);
				drawCrossGlint(pb, CX, CY, 17.5, 14.8, -0.22, 2.4, 2.0, P.BRIGHT);
				drawCrossGlint(pb, CX, CY, 11.8, 10.5, -0.22 + Math.PI / 4, 1.6, 1.5, P.MID);
				pb.fillCircle(CX, CY, 4.8, P.HOT);
				drawImpactSparks(1, true);
				pb.addOutline(P.OUTLINE);
				pb.fillRing(CX, CY, 14.2, 13.2, P.HOT);
				drawCrossGlint(pb, CX, CY, 12.6, 10.6, -0.22, 1.3, 1.1, P.CORE);
				pb.fillCircle(CX, CY, 3.0, P.CORE);
				drawImpactSparks(1, false);
				return;
			}

			// F2: HOLLOW PUNCH-OUT CORE & RING STRETCH
			if (frameIndex === 2) {
				pb.fillRing(CX, CY, 18.4, 15.8, P.MID);
				pb.fillRing(CX, CY, 17.8, 16.4, P.BRIGHT);
				drawCrossGlint(pb, CX, CY, 16.8, 13.8, -0.22, 1.9, 1.6, P.BRIGHT);
				pb.eraseCircle(CX, CY, 5.2);
				drawImpactSparks(2, true);
				pb.addOutline(P.OUTLINE);
				drawCrossGlint(pb, CX, CY, 13.5, 11.2, -0.22, 1.0, 0.9, P.HOT);
				pb.eraseCircle(CX, CY, 5.0);
				drawImpactSparks(2, false);
				return;
			}

			// F3-F4: SHOCK RING BREAKS INTO 4 CRISP ARCS & SPIKES DETACH
			if (frameIndex === 3 || frameIndex === 4) {
				const k = frameIndex - 3; // 0..1
				const rOut = 20.6 + k * 2.0;
				const rIn = 18.5 + k * 2.2;
				drawBrokenRing(pb, CX, CY, rIn, rOut, 4, 0.22 + k * 0.14, -0.20 + k * 0.08, k === 0 ? P.MID : P.DARK, k === 0 ? "none" : "bayer75", true);
				if (k === 0) {
					drawBrokenRing(pb, CX, CY, rIn + 0.4, rOut - 0.5, 4, 0.28, -0.20, P.BRIGHT, "none", true);
				}
				// Detached starburst outer tips
				for (let s = 0; s < 4; s++) {
					const a = -0.22 + s * Math.PI * 0.5;
					const baseR = 10.5 + k * 3.0;
					const len = 5.4 - k * 1.6;
					const tx = CX + Math.cos(a) * (baseR + len);
					const ty = CY + Math.sin(a) * (baseR + len);
					pb.fillNeedle(tx, ty, len, 1.3 - k * 0.3, a, k === 0 ? P.BRIGHT : P.MID, k === 0 ? "none" : "bayer75");
				}
				drawImpactSparks(frameIndex, true);
				if (k === 0) pb.addOutline(P.OUTLINE);
				drawImpactSparks(frameIndex, false);
				return;
			}

			// F5-F7: THIN RING DISSOLVE + COASTING SPARKS
			if (frameIndex <= 7) {
				const k = frameIndex - 5; // 0..2
				if (k <= 1) {
					const rOut = 23.6 + k * 1.0;
					drawBrokenRing(pb, CX, CY, rOut - 1.4, rOut, 4, 0.46 + k * 0.12, -0.06, k === 0 ? P.DARK : P.SHADOW, k === 0 ? "bayer50" : "bayer25", true);
				}
				drawImpactSparks(frameIndex, true);
				drawImpactSparks(frameIndex, false);
				return;
			}

			// F8-F14: CLEAN MICRO-SPARK FADE
			drawImpactSparks(frameIndex, true);
			drawImpactSparks(frameIndex, false);
		},
	});

	// =========================================================================
	// 2. hit_punch — Blunt Punch (Heavy blunt concussion + directional compression crescent + thick shock ring)
	// =========================================================================
	const PUNCH_SPIKES = [
		{ a: -0.95, len: 19.5, hw: 2.8 },
		{ a: -0.42, len: 23.5, hw: 3.1 },
		{ a:  0.04, len: 24.5, hw: 3.3 },
		{ a:  0.48, len: 22.8, hw: 3.0 },
		{ a:  1.02, len: 18.8, hw: 2.7 },
		{ a:  2.22, len: 16.2, hw: 2.3 },
		{ a:  3.08, len: 17.5, hw: 2.5 },
		{ a: -2.28, len: 16.0, hw: 2.3 },
	];

	const PUNCH_FLECKS = [
		{ a: -0.78, r0: 11, dist: 14.5, s0: 2.6, life: 13 },
		{ a: -0.24, r0: 12, dist: 15.2, s0: 2.9, life: 14 },
		{ a:  0.30, r0: 12, dist: 15.0, s0: 2.7, life: 13 },
		{ a:  0.86, r0: 11, dist: 14.2, s0: 2.4, life: 12 },
		{ a:  1.88, r0: 10, dist: 12.5, s0: 2.1, life: 11 },
		{ a:  2.78, r0: 10, dist: 13.0, s0: 2.2, life: 12 },
		{ a: -2.55, r0: 10, dist: 12.5, s0: 2.0, life: 11 },
		{ a: -1.62, r0: 10, dist: 12.0, s0: 2.1, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_punch",
		name: "Blunt Punch",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 0,
		planeScale: [2.1, 2.1],
		size: [2.1, 2.1],
		planeOffsetY: 1.05,
		yOffset: 1.05,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitPunch_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.38,
			Orientation: "FacingCamera",
		},
		description: "Heavy blunt concussion flash at (32, 32) with thick expanding shockwave ring, directional compression crescent on the impact face, and crisp outward spikes.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawPunchFlecks = (f, solidPass) => {
				for (let i = 0; i < PUNCH_FLECKS.length; i++) {
					const fl = PUNCH_FLECKS[i];
					if (f > fl.life) continue;
					const p = f / fl.life;
					const dist = fl.r0 + fl.dist * E.easeOutCubic(p);
					const x = CX + Math.cos(fl.a) * dist;
					const y = CY + Math.sin(fl.a) * dist;
					const sz = fl.s0 * (1 - E.easeInQuad(p) * 0.80);
					if (solidPass && sz < 1.65) continue;
					if (!solidPass && sz >= 1.65) continue;

					let col = P.HOT;
					if (p > 0.72) col = P.DARK;
					else if (p > 0.45) col = P.MID;
					else if (p > 0.22) col = P.BRIGHT;
					const dither = p > 0.78 ? "bayer50" : "none";
					drawPixelSpark(pb, x, y, fl.a, sz, col, p < 0.30 ? P.CORE : null, dither);
				}
			};

			// F0: INSTANT HEAVY BLUNT CONCUSSION FLASH + COMPRESSION CRESCENT + THICK RING
			if (frameIndex === 0) {
				// Outward blunt impact spikes
				for (let i = 0; i < PUNCH_SPIKES.length; i++) {
					const sp = PUNCH_SPIKES[i];
					const len = sp.len * 0.84;
					pb.fillNeedle(CX + Math.cos(sp.a) * len, CY + Math.sin(sp.a) * len, len, sp.hw, sp.a, P.MID);
				}
				// Thick circular concussion ring
				pb.fillRing(CX, CY, 14.2, 9.4, P.BRIGHT);
				// Directional compression crescent cupping the forward impact face (+X)
				pb.fillArcBand(CX + 1.5, CY, 9.5, 16.0, -1.28, 1.28, 12, P.HOT, "none", true);
				// Compressed blunt impact flash core (tall squash ellipse)
				pb.fillEllipse(CX, CY, 7.2, 9.2, 0, P.HOT);
				pb.addOutline(P.OUTLINE);

				// Blinding inner concussion details
				pb.fillArcBand(CX + 1.5, CY, 11.2, 14.4, -1.10, 1.10, 10, P.CORE, "none", true);
				pb.fillRing(CX, CY, 13.0, 10.8, P.HOT);
				for (let i = 0; i < 5; i++) {
					const sp = PUNCH_SPIKES[i];
					const len = sp.len * 0.64;
					pb.fillNeedle(CX + Math.cos(sp.a) * len, CY + Math.sin(sp.a) * len, len, sp.hw * 0.55, sp.a, P.HOT);
				}
				pb.fillEllipse(CX, CY, 4.8, 6.6, 0, P.CORE);
				return;
			}

			// F1: THICK SHOCKWAVE SURGE & FORWARD CRESCENT THRUST
			if (frameIndex === 1) {
				// Sharp outward radial spikes peaking
				for (let i = 0; i < PUNCH_SPIKES.length; i++) {
					const sp = PUNCH_SPIKES[i];
					const len = sp.len * 1.04;
					pb.fillNeedle(CX + Math.cos(sp.a) * len, CY + Math.sin(sp.a) * len, len * 0.58, sp.hw * 0.82, sp.a, P.BRIGHT);
				}
				// Heavy expanding concussion ring
				pb.fillRing(CX, CY, 19.0, 14.0, P.MID);
				pb.fillRing(CX, CY, 18.0, 14.8, P.BRIGHT);
				// Forward directional compression crescent pushing out
				pb.fillArcBand(CX + 2.5, CY, 13.8, 19.4, -1.20, 1.20, 12, P.HOT, "none", true);
				// Hollowed inner punch shock
				pb.fillRing(CX, CY, 8.6, 5.8, P.HOT);
				drawPunchFlecks(1, true);
				pb.addOutline(P.OUTLINE);

				pb.fillArcBand(CX + 2.5, CY, 15.2, 17.8, -1.02, 1.02, 10, P.CORE, "none", true);
				pb.fillRing(CX, CY, 17.4, 15.6, P.HOT);
				pb.fillRing(CX, CY, 7.8, 6.4, P.CORE);
				drawPunchFlecks(1, false);
				return;
			}

			// F2: HOLLOW PUNCH-OUT & CONCUSSION RING EXPANSION
			if (frameIndex === 2) {
				// Outer detached blunt spikes
				for (let i = 0; i < PUNCH_SPIKES.length; i++) {
					const sp = PUNCH_SPIKES[i];
					const rTip = Math.min(26.5, sp.len * 1.12);
					pb.fillNeedle(CX + Math.cos(sp.a) * rTip, CY + Math.sin(sp.a) * rTip, 7.2, sp.hw * 0.58, sp.a, P.MID);
				}
				// Thick expanding shock ring
				pb.fillRing(CX, CY, 22.4, 18.0, P.DARK);
				pb.fillRing(CX, CY, 21.6, 18.6, P.MID);
				pb.fillRing(CX, CY, 20.8, 19.2, P.BRIGHT);
				// Directional crescent fracturing into 3 strong impact face plates
				pb.fillArcBand(CX + 3.0, CY, 17.5, 21.8, -1.16, -0.52, 5, P.BRIGHT, "none", true);
				pb.fillArcBand(CX + 3.4, CY, 18.2, 22.8, -0.36,  0.36, 6, P.HOT, "none", true);
				pb.fillArcBand(CX + 3.0, CY, 17.5, 21.8,  0.52,  1.16, 5, P.BRIGHT, "none", true);
				drawPunchFlecks(2, true);
				pb.addOutline(P.OUTLINE);

				pb.fillArcBand(CX + 3.4, CY, 19.2, 21.4, -0.26, 0.26, 5, P.CORE, "none", true);
				drawPunchFlecks(2, false);
				return;
			}

			// F3-F5: SEGMENTED HEAVY RING & PRESSURE CRESCENT DISSIPATION
			if (frameIndex <= 5) {
				const k = frameIndex - 3; // 0..2
				const rOut = 24.4 + k * 1.0;
				const rIn = 21.0 + k * 1.5;
				const dither = k === 0 ? "none" : k === 1 ? "bayer75" : "bayer50";
				const ringCol = k === 0 ? P.MID : k === 1 ? P.DARK : P.SHADOW;
				drawBrokenRing(pb, CX, CY, rIn, rOut, 5, 0.22 + k * 0.14, -0.45 + k * 0.08, ringCol, dither, true);
				if (k === 0) {
					drawBrokenRing(pb, CX, CY, rIn + 0.5, rOut - 0.8, 5, 0.28, -0.45, P.BRIGHT, "none", true);
				}
				// Forward crescent pressure arc fading cleanly
				if (k <= 1) {
					pb.fillArcBand(CX + 3.5 + k * 1.0, CY, 20.5 + k * 1.5, 23.2 + k * 1.2, -0.52, 0.52, 6, k === 0 ? P.HOT : P.MID, k === 0 ? "none" : "bayer75", true);
				}
				drawPunchFlecks(frameIndex, true);
				if (k === 0) pb.addOutline(P.OUTLINE);
				drawPunchFlecks(frameIndex, false);
				return;
			}

			// F6-F8: OUTER RING REMNANTS & DECAYING FLECKS
			if (frameIndex <= 8) {
				const k = frameIndex - 6; // 0..2
				if (k <= 1) {
					drawBrokenRing(pb, CX, CY, 25.0 + k * 0.5, 26.4 + k * 0.4, 5, 0.56 + k * 0.14, -0.22, P.SHADOW, k === 0 ? "bayer50" : "bayer25", true);
				}
				drawPunchFlecks(frameIndex, true);
				drawPunchFlecks(frameIndex, false);
				return;
			}

			// F9-F14: CLEAN FINAL FLECKS
			drawPunchFlecks(frameIndex, true);
			drawPunchFlecks(frameIndex, false);
		},
	});

	// =========================================================================
	// 3. hit_slash — Blade Slash (F0 snap-in whip -> F1 razor crescent + cross-glint starburst)
	// =========================================================================
	// Graceful diagonal sword cleave curving from upper-left (10, 12) over (32, 32) to lower-right (54, 52)
	const SLASH_P0 = [10, 12];
	const SLASH_P1 = [39, 25];
	const SLASH_P2 = [54, 52];

	const SLASH_SPARKS = [
		{ x0: 32, y0: 32, a: -0.78, dist: 18, s0: 2.2, life: 13 },
		{ x0: 32, y0: 32, a:  2.36, dist: 17, s0: 2.1, life: 12 },
		{ x0: 39, y0: 36, a:  0.15, dist: 14, s0: 1.9, life: 14 },
		{ x0: 25, y0: 25, a: -2.05, dist: 13, s0: 1.8, life: 11 },
		{ x0: 45, y0: 44, a:  0.98, dist: 11, s0: 1.9, life: 13 },
		{ x0: 20, y0: 19, a: -1.40, dist: 11, s0: 1.6, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_slash",
		name: "Blade Slash",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 1,
		planeScale: [2.35, 2.35],
		size: [2.35, 2.35],
		planeOffsetY: 1.1,
		yOffset: 1.1,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitSlash_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.42,
			Orientation: "FacingCamera",
		},
		description: "F0 instant snap-in curved diagonal slash whip -> F1 full razor crescent + cross-glint starburst at (32, 32) -> crisp fracture & clean trail dissipation.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawSlashSparks = (f, solidPass) => {
				if (f < 1) return;
				const age = f - 1;
				for (let i = 0; i < SLASH_SPARKS.length; i++) {
					const sp = SLASH_SPARKS[i];
					if (age > sp.life) continue;
					const p = age / sp.life;
					const d = sp.dist * E.easeOutCubic(p);
					const x = sp.x0 + Math.cos(sp.a) * d;
					const y = sp.y0 + Math.sin(sp.a) * d;
					const sz = sp.s0 * (1 - E.easeInQuad(p) * 0.78);
					if (solidPass && sz < 1.55) continue;
					if (!solidPass && sz >= 1.55) continue;
					let col = P.HOT;
					if (p > 0.72) col = P.DARK;
					else if (p > 0.45) col = P.MID;
					else if (p > 0.20) col = P.BRIGHT;
					drawPixelSpark(pb, x, y, sp.a, sz, col, p < 0.30 ? P.CORE : null, p > 0.80 ? "bayer50" : "none");
				}
			};

			// F0: INSTANT SNAP-IN CURVED DIAGONAL SLASH WHIP (Zero idle anticipation!)
			if (frameIndex === 0) {
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.00, 0.72, {
					segs: 12, maxW: 5.2, col: P.MID, bias: 0.1,
				});
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.14, 0.74, {
					segs: 10, maxW: 3.2, col: P.BRIGHT, normalShift: 0.6,
				});
				drawCrossGlint(pb, CX + 3, CY + 1, 7.5, 4.5, 0.78, 1.5, 1.2, P.HOT);
				pb.addOutline(P.OUTLINE);
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.32, 0.74, {
					segs: 8, maxW: 1.8, col: P.CORE, normalShift: 1.0,
				});
				pb.fillCircle(CX + 3, CY + 1, 2.2, P.CORE);
				return;
			}

			// F1 (hitFrame: 1): FULL RAZOR CRESCENT + CROSS-GLINT STARBURST PEAK
			if (frameIndex === 1) {
				// Outer shadow-back & full sweeping crescent body
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.00, 1.00, {
					segs: 16, maxW: 10.4, col: P.DARK, normalShift: -1.0,
				});
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.02, 1.00, {
					segs: 16, maxW: 8.6, col: P.MID, normalShift: -0.2,
				});
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.06, 1.00, {
					segs: 16, maxW: 6.2, col: P.BRIGHT, normalShift: 0.8,
				});
				// Razor cross-glint starburst centered at (32, 32)
				drawCrossGlint(pb, CX, CY, 19.5, 12.8, 0.785, 3.0, 2.2, P.BRIGHT);
				drawSlashSparks(1, true);
				pb.addOutline(P.OUTLINE);

				// Blazing white-hot cutting edge & star core over outline
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.10, 1.00, {
					segs: 14, maxW: 3.4, col: P.HOT, normalShift: 1.8,
				});
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.22, 0.98, {
					segs: 12, maxW: 1.8, col: P.CORE, normalShift: 2.3,
				});
				drawCrossGlint(pb, CX, CY, 16.5, 10.2, 0.785, 1.9, 1.4, P.HOT);
				drawCrossGlint(pb, CX, CY, 11.8, 6.8, 0.785, 1.1, 0.9, P.CORE);
				pb.fillCircle(CX, CY, 3.0, P.CORE);
				// Subtle parallel wind needle outside the cutting belly
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.24, 0.84, {
					segs: 10, maxW: 1.4, col: P.HOT, normalShift: 6.8, profile: symTaperProfile,
				});
				drawSlashSparks(1, false);
				return;
			}

			// F2: WHIP FOLLOW-THROUGH & SLASH RECOIL
			if (frameIndex === 2) {
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.14, 1.00, {
					segs: 14, maxW: 8.2, col: P.MID, normalShift: 0.2, fracture: 0.08, seed: 3.1,
				});
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.20, 1.00, {
					segs: 14, maxW: 5.2, col: P.BRIGHT, normalShift: 1.4, fracture: 0.08, seed: 3.1,
				});
				drawCrossGlint(pb, CX, CY, 17.5, 6.5, 0.785, 1.6, 1.1, P.HOT);
				drawSlashSparks(2, true);
				pb.addOutline(P.OUTLINE);

				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.30, 0.98, {
					segs: 12, maxW: 2.4, col: P.HOT, normalShift: 2.2, fracture: 0.08, seed: 3.1,
				});
				drawCrossGlint(pb, CX, CY, 13.0, 3.8, 0.785, 0.9, 0.8, P.CORE);
				drawSlashSparks(2, false);
				return;
			}

			// F3-F5: CRISP BLADE FRACTURE & TRAIL THINNING
			if (frameIndex <= 5) {
				const k = frameIndex - 3; // 0..2
				const frac = 0.24 + k * 0.20;
				const uS = 0.20 + k * 0.10;
				const dither = k === 0 ? "none" : k === 1 ? "bayer75" : "bayer50";
				drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, uS, 1.00, {
					segs: 11, maxW: 6.2 - k * 1.4, col: k === 0 ? P.MID : P.DARK, normalShift: 0.8 + k * 0.7, fracture: frac, seed: 3.1, dither,
				});
				if (k <= 1) {
					drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, uS + 0.08, 0.98, {
						segs: 10, maxW: 3.4 - k * 1.0, col: k === 0 ? P.BRIGHT : P.MID, normalShift: 1.8 + k * 0.7, fracture: frac, seed: 3.1, dither,
					});
				}
				if (k === 0) {
					// Thin fading cut line flash across impact center
					pb.drawLine(CX - 9, CY - 9, CX + 9, CY + 9, P.HOT, 1);
					drawSlashSparks(3, true);
					pb.addOutline(P.OUTLINE);
				} else {
					drawSlashSparks(frameIndex, true);
				}
				drawSlashSparks(frameIndex, false);
				return;
			}

			// F6-F9: DISSIPATING CURVED TRAIL WISPS
			if (frameIndex <= 9) {
				const k = frameIndex - 6; // 0..3
				if (k <= 2) {
					const dither = k === 0 ? "bayer50" : "bayer25";
					drawTaperedBezier(pb, E, SLASH_P0, SLASH_P1, SLASH_P2, 0.44 + k * 0.10, 0.98, {
						segs: 8, maxW: 2.6 - k * 0.6, col: k === 0 ? P.DARK : P.SHADOW, normalShift: 2.8 + k * 0.8, fracture: 0.65 + k * 0.10, seed: 3.1, dither,
					});
				}
				drawSlashSparks(frameIndex, true);
				drawSlashSparks(frameIndex, false);
				return;
			}

			// F10-F14: CLEAN DYING SPARKS
			drawSlashSparks(frameIndex, true);
			drawSlashSparks(frameIndex, false);
		},
	});

	// =========================================================================
	// 4. hit_claw — Claw Rake (3 DISTINCT parallel curved diagonal claw scratch arcs!)
	// =========================================================================
	// Sweeps opposite diagonal from hit_slash: upper-right (52, 11) -> lower-left (12, 53)
	// with 3 widely separated parallel claw tracks (offsets -10.5, 0, +10.5 px) so they NEVER merge!
	const CLAW_P0 = [53, 13];
	const CLAW_P1 = [29, 28];
	const CLAW_P2 = [15, 53];

	const CLAW_TRACKS = [
		{ offset: -10.5, uMin: 0.08, uMax: 0.92, maxW: 3.8, lag: 0.04, fadeLead: 1, seed: 11.3 },
		{ offset:   0.0, uMin: 0.00, uMax: 1.00, maxW: 4.9, lag: 0.00, fadeLead: 0, seed: 23.7 },
		{ offset:  10.5, uMin: 0.08, uMax: 0.92, maxW: 3.8, lag: 0.06, fadeLead: 1, seed: 37.9 },
	];

	const CLAW_SPARKS = [
		{ x0: 32, y0: 32, a:  2.32, dist: 14, s0: 2.0, life: 13 },
		{ x0: 24, y0: 24, a: -2.40, dist: 12, s0: 1.8, life: 11 },
		{ x0: 40, y0: 40, a:  0.80, dist: 12, s0: 1.8, life: 12 },
		{ x0: 22, y0: 42, a:  2.75, dist: 11, s0: 1.7, life: 13 },
		{ x0: 38, y0: 22, a: -0.70, dist: 11, s0: 1.6, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_claw",
		name: "Claw Rake",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 1,
		planeScale: [2.35, 2.35],
		size: [2.35, 2.35],
		planeOffsetY: 1.1,
		yOffset: 1.1,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitClaw_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.40,
			Orientation: "FacingCamera",
		},
		description: "3 parallel curved diagonal claw scratch arcs tearing across (32, 32): F0 fast top-to-mid entry -> F1 full 3-claw rake peak with white core streaks -> staggered dithered tear fade.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawClawSparks = (f) => {
				if (f < 1) return;
				const age = f - 1;
				for (let i = 0; i < CLAW_SPARKS.length; i++) {
					const sp = CLAW_SPARKS[i];
					if (age > sp.life) continue;
					const p = age / sp.life;
					const d = sp.dist * E.easeOutCubic(p);
					const x = sp.x0 + Math.cos(sp.a) * d;
					const y = sp.y0 + Math.sin(sp.a) * d;
					const sz = sp.s0 * (1 - E.easeInQuad(p) * 0.76);
					let col = P.HOT;
					if (p > 0.72) col = P.DARK;
					else if (p > 0.45) col = P.MID;
					else if (p > 0.22) col = P.BRIGHT;
					drawPixelSpark(pb, x, y, sp.a, sz, col, p < 0.25 ? P.CORE : null, p > 0.80 ? "bayer50" : "none");
				}
			};

			// F0: FAST TOP-TO-MID 3-CLAW ENTRY RIP
			if (frameIndex === 0) {
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					const u0 = tr.uMin;
					const u1 = Math.min(tr.uMax, 0.58 - tr.lag);
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0, u1, {
						segs: 10, maxW: tr.maxW * 0.88, col: P.BRIGHT, normalShift: tr.offset, profile: bladeProfile,
					});
				}
				pb.addOutline(P.OUTLINE);
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					const u0 = tr.uMin + 0.08;
					const u1 = Math.min(tr.uMax, 0.58 - tr.lag);
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0, u1, {
						segs: 8, maxW: tr.maxW * 0.42, col: P.CORE, normalShift: tr.offset, profile: bladeProfile,
					});
				}
				return;
			}

			// F1 (hitFrame: 1): FULL 3-CLAW RAKE PEAK WITH SHARP WHITE CORE STREAKS
			if (frameIndex === 1) {
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, tr.uMin, tr.uMax, {
						segs: 14, maxW: tr.maxW, col: P.MID, normalShift: tr.offset, profile: bladeProfile,
					});
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, tr.uMin + 0.04, tr.uMax - 0.02, {
						segs: 14, maxW: tr.maxW * 0.68, col: P.BRIGHT, normalShift: tr.offset, profile: bladeProfile,
					});
				}
				pb.addOutline(P.OUTLINE);
				// Razor white CORE central gouge streak down each of the 3 claws + staggered nick glints
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, tr.uMin + 0.08, tr.uMax - 0.04, {
						segs: 12, maxW: tr.maxW * 0.34, col: P.CORE, normalShift: tr.offset, profile: symTaperProfile,
					});
					const pt = evalQuadBezier(CLAW_P0, CLAW_P1, CLAW_P2, 0.50 + (i - 1) * 0.07);
					const gx = pt.x + pt.nx * tr.offset;
					const gy = pt.y + pt.ny * tr.offset;
					drawCrossGlint(pb, gx, gy, i === 1 ? 7.0 : 5.0, i === 1 ? 4.2 : 3.2, 2.35, 1.3, 1.0, P.CORE);
				}
				drawClawSparks(1);
				return;
			}

			// F2: FULL RAKE SWEEP-THROUGH & HOOKED GOUGE ENDS
			if (frameIndex === 2) {
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					const u0 = tr.uMin + 0.08;
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0, tr.uMax, {
						segs: 13, maxW: tr.maxW * 0.88, col: P.MID, normalShift: tr.offset, fracture: 0.06, seed: tr.seed,
					});
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0 + 0.04, tr.uMax, {
						segs: 12, maxW: tr.maxW * 0.52, col: P.HOT, normalShift: tr.offset, fracture: 0.06, seed: tr.seed,
					});
				}
				pb.addOutline(P.OUTLINE);
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, tr.uMin + 0.16, tr.uMax - 0.04, {
						segs: 10, maxW: 1.5, col: P.CORE, normalShift: tr.offset, profile: symTaperProfile,
					});
				}
				drawClawSparks(2);
				return;
			}

			// F3-F9: STAGGERED DITHERED TEAR FADE (Outer claws decay slightly earlier than center claw!)
			if (frameIndex <= 9) {
				for (let i = 0; i < CLAW_TRACKS.length; i++) {
					const tr = CLAW_TRACKS[i];
					const effF = frameIndex + tr.fadeLead; // Outer claws advance 1 frame faster into decay
					if (effF > 9) continue;
					const k = effF - 3; // 0..6
					const frac = 0.16 + k * 0.12;
					const u0 = tr.uMin + 0.14 + k * 0.06;
					const u1 = tr.uMax - k * 0.02;
					if (u1 - u0 < 0.10) continue;

					let bodyCol = P.BRIGHT;
					let dither = "none";
					if (k >= 5) { bodyCol = P.SHADOW; dither = "bayer25"; }
					else if (k >= 3) { bodyCol = P.DARK; dither = "bayer50"; }
					else if (k >= 1) { bodyCol = P.MID; dither = "bayer75"; }

					drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0, u1, {
						segs: 11, maxW: tr.maxW * (0.76 - k * 0.09), col: bodyCol, normalShift: tr.offset, fracture: frac, seed: tr.seed, dither,
					});
					if (k <= 2) {
						drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, u0 + 0.05, u1 - 0.03, {
							segs: 9, maxW: tr.maxW * (0.36 - k * 0.07), col: k === 0 ? P.HOT : P.BRIGHT, normalShift: tr.offset, fracture: frac, seed: tr.seed, dither: k === 0 ? "none" : "bayer75",
						});
					}
				}
				if (frameIndex === 3) {
					pb.addOutline(P.OUTLINE);
				}
				drawClawSparks(frameIndex);
				return;
			}

			// F10-F14: FINAL STAGGERED SCRATCH FLECKS & SPARKS
			if (frameIndex <= 11) {
				drawTaperedBezier(pb, E, CLAW_P0, CLAW_P1, CLAW_P2, 0.42, 0.88, {
					segs: 6, maxW: 1.4, col: P.SHADOW, normalShift: 0, fracture: 0.78, seed: 23.7, dither: "bayer25",
				});
			}
			drawClawSparks(frameIndex);
		},
	});

	// =========================================================================
	// 5. hit_bite — Jaw Bite (F0 jaws closing fast -> F1 SNAP CLAMP + horizontal crunch burst -> imprint fade)
	// =========================================================================
	const BITE_SPARKS = [
		{ x0: 15, y0: 32, a:  3.10, dist: 10.5, s0: 2.2, life: 12 },
		{ x0: 17, y0: 30, a: -2.62, dist: 11.5, s0: 1.9, life: 11 },
		{ x0: 17, y0: 34, a:  2.65, dist: 11.0, s0: 1.8, life: 13 },
		{ x0: 49, y0: 32, a:  0.04, dist: 10.5, s0: 2.2, life: 12 },
		{ x0: 47, y0: 30, a: -0.52, dist: 11.5, s0: 1.9, life: 13 },
		{ x0: 47, y0: 34, a:  0.48, dist: 11.0, s0: 1.8, life: 11 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_bite",
		name: "Jaw Bite",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 1,
		planeScale: [2.2, 2.2],
		size: [2.2, 2.2],
		planeOffsetY: 1.1,
		yOffset: 1.1,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitBite_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.36,
			Orientation: "FacingCamera",
		},
		description: "Stylized pixel upper + lower fang arcs snapping shut at (32, 32): F0 jaws closing fast -> F1 SNAP CLAMP + horizontal crunch spark burst -> F2-F14 fang imprint fading.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawBiteSparks = (f) => {
				if (f < 1) return;
				const age = f - 1;
				for (let i = 0; i < BITE_SPARKS.length; i++) {
					const sp = BITE_SPARKS[i];
					if (age > sp.life) continue;
					const p = age / sp.life;
					const d = sp.dist * E.easeOutCubic(p);
					const x = sp.x0 + Math.cos(sp.a) * d;
					const y = sp.y0 + Math.sin(sp.a) * d;
					const sz = sp.s0 * (1 - E.easeInQuad(p) * 0.78);
					let col = P.HOT;
					if (p > 0.70) col = P.DARK;
					else if (p > 0.42) col = P.MID;
					else if (p > 0.20) col = P.BRIGHT;
					drawPixelSpark(pb, x, y, sp.a, sz, col, p < 0.28 ? P.CORE : null, p > 0.80 ? "bayer50" : "none");
				}
			};

			// F0: JAWS CLOSING FAST (High-speed snap motion lines behind fangs, ZERO idle hover!)
			if (frameIndex === 0) {
				// Vertical snap-in speed streaks above upper jaw & below lower jaw
				const xs = [18, 27, 37, 46];
				for (let i = 0; i < xs.length; i++) {
					pb.drawLine(xs[i], 10, xs[i], 17, P.MID, 1, "bayer75");
					pb.drawLine(xs[i], 47, xs[i], 54, P.MID, 1, "bayer75");
				}
				drawBiteJaws(pb, 19.0, 45.0, 0.94, {
					P, bodyCol: P.BRIGHT, rimCol: P.MID, edgeCol: P.HOT, coreCol: P.CORE, archCol: P.DARK,
				});
				pb.addOutline(P.OUTLINE);
				return;
			}

			// F1 (hitFrame: 1): SNAP CLAMP + HORIZONTAL CRUNCH SPARK BURST
			if (frameIndex === 1) {
				drawBiteJaws(pb, 24.4, 39.6, 1.04, {
					P, bodyCol: P.HOT, rimCol: P.BRIGHT, edgeCol: P.CORE, coreCol: P.CORE, archCol: P.MID,
				});
				// Crisp horizontal crunch seam & left/right corner chomp bursts
				pb.fillEllipse(CX, CY, 21.5, 1.7, 0, P.HOT);
				pb.fillNeedle(6.5, CY, 11.5, 2.8, Math.PI, P.BRIGHT);
				pb.fillNeedle(57.5, CY, 11.5, 2.8, 0, P.BRIGHT);
				pb.fillNeedle(10.0, CY - 5.5, 7.5, 1.7, -2.62, P.HOT);
				pb.fillNeedle(10.0, CY + 5.5, 7.5, 1.7,  2.62, P.HOT);
				pb.fillNeedle(54.0, CY - 5.5, 7.5, 1.7, -0.52, P.HOT);
				pb.fillNeedle(54.0, CY + 5.5, 7.5, 1.7,  0.52, P.HOT);

				pb.addOutline(P.OUTLINE);
				// Re-gleam interlocking fangs crisply + razor horizontal crunch spark seam
				drawBiteJaws(pb, 24.4, 39.6, 1.04, {
					P, drawArch: false, bodyCol: P.HOT, rimCol: P.BRIGHT, edgeCol: P.CORE, coreCol: P.CORE,
				});
				pb.drawLine(8, CY, 56, CY, P.CORE, 1);
				drawBiteSparks(1);
				return;
			}

			// F2: TIGHT CLAMP VIBRATION & HORIZONTAL CRUNCH SHOCK SPIKES
			if (frameIndex === 2) {
				drawBiteJaws(pb, 25.0, 39.0, 1.00, {
					P, bodyCol: P.BRIGHT, rimCol: P.MID, edgeCol: P.HOT, coreCol: P.CORE, archCol: P.DARK,
				});
				// Left & right escaping crunch spikes
				pb.fillNeedle(5.5, CY, 9.5, 2.0, Math.PI, P.HOT);
				pb.fillNeedle(58.5, CY, 9.5, 2.0, 0, P.HOT);
				pb.addOutline(P.OUTLINE);
				pb.drawLine(14, CY, 50, CY, P.HOT, 1, "bayer75");
				drawBiteSparks(2);
				return;
			}

			// F3-F5: CRISP FANG IMPRINT HOLD & ARCH COOLING
			if (frameIndex <= 5) {
				const k = frameIndex - 3; // 0..2
				const open = k * 0.85;
				const scale = 0.96 - k * 0.06;
				drawBiteJaws(pb, 24.5 - open, 39.5 + open, scale, {
					P,
					bodyCol: k === 0 ? P.BRIGHT : P.MID,
					rimCol: k === 0 ? P.MID : P.DARK,
					edgeCol: k <= 1 ? P.HOT : P.BRIGHT,
					coreCol: k === 0 ? P.CORE : P.HOT,
					archCol: k === 0 ? P.DARK : P.SHADOW,
					archDither: k === 0 ? "none" : k === 1 ? "bayer75" : "bayer50",
					dither: k === 2 ? "bayer75" : "none",
				});
				if (k <= 1) pb.addOutline(P.OUTLINE);
				drawBiteSparks(frameIndex);
				return;
			}

			// F6-F10: JAW ARCHES DISSOLVE -> FLOATING FANG IMPRINT FADES CLEANLY
			if (frameIndex <= 10) {
				const k = frameIndex - 6; // 0..4
				const open = 2.4 + k * 0.8;
				const scale = 0.80 - k * 0.11;
				const dither = k === 0 ? "bayer75" : k <= 2 ? "bayer50" : "bayer25";
				drawBiteJaws(pb, 24.5 - open, 39.5 + open, scale, {
					P,
					drawArch: k === 0,
					showInner: k <= 2,
					bodyCol: k <= 1 ? P.MID : P.DARK,
					rimCol: k <= 1 ? P.DARK : P.SHADOW,
					edgeCol: k <= 1 ? P.BRIGHT : P.MID,
					coreCol: k === 0 ? P.HOT : null,
					archCol: P.SHADOW,
					archDither: "bayer25",
					dither,
				});
				drawBiteSparks(frameIndex);
				return;
			}

			// F11-F14: CANINE TIP GLINTS & DYING MICRO-SPARKS
			if (frameIndex <= 12) {
				const dither = frameIndex === 11 ? "bayer50" : "bayer25";
				drawBiteJaws(pb, 19.0, 45.0, 0.36 - (frameIndex - 11) * 0.10, {
					P, drawArch: false, showInner: false, bodyCol: P.DARK, rimCol: P.SHADOW, edgeCol: P.MID, coreCol: null, dither,
				});
			}
			drawBiteSparks(frameIndex);
		},
	});

	// =========================================================================
	// 6. hit_swipe — Swipe / Splat (Wide flat slap streak + asymmetric splat droplets)
	// =========================================================================
	// 10 asymmetric radial splat droplets (heavier spread horizontally for unmistakable slap/splat read!)
	const SPLAT_DROPS = [
		{ a: -0.14, r0: 12.0, dist: 14.5, rx0: 4.0, ry0: 2.2, grav: 1.6, life: 13 },
		{ a:  0.18, r0: 11.5, dist: 15.0, rx0: 3.8, ry0: 2.1, grav: 2.0, life: 14 },
		{ a:  3.04, r0: 12.0, dist: 14.2, rx0: 3.9, ry0: 2.2, grav: 1.8, life: 13 },
		{ a: -2.84, r0: 11.0, dist: 13.8, rx0: 3.4, ry0: 2.0, grav: 1.5, life: 12 },
		{ a: -0.62, r0: 9.5,  dist: 13.5, rx0: 3.2, ry0: 1.9, grav: 2.2, life: 13 },
		{ a:  0.72, r0: 9.5,  dist: 12.5, rx0: 3.0, ry0: 1.8, grav: 2.4, life: 11 },
		{ a:  2.42, r0: 9.5,  dist: 12.8, rx0: 3.1, ry0: 1.9, grav: 2.2, life: 12 },
		{ a: -2.36, r0: 9.2,  dist: 12.4, rx0: 2.9, ry0: 1.8, grav: 2.0, life: 11 },
		{ a: -1.42, r0: 7.5,  dist: 11.2, rx0: 2.5, ry0: 1.7, grav: 2.6, life: 10 },
		{ a:  1.62, r0: 7.8,  dist: 10.5, rx0: 2.6, ry0: 1.7, grav: 2.4, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_swipe",
		name: "Swipe / Splat",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 0,
		planeScale: [2.2, 2.2],
		size: [2.2, 2.2],
		planeOffsetY: 1.05,
		yOffset: 1.05,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitSwipe_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.34,
			Orientation: "FacingCamera",
		},
		description: "Wide flat slap/splat radial smear burst at (32, 32): broad horizontal slap streak + asymmetric splat droplets flying outward and shrinking cleanly.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawSplatDrops = (f, solidPass) => {
				for (let i = 0; i < SPLAT_DROPS.length; i++) {
					const d = SPLAT_DROPS[i];
					if (f > d.life) continue;
					const p = f / d.life;
					const travel = E.easeOutCubic(p);
					const dist = d.r0 + d.dist * travel;
					const x = CX + Math.cos(d.a) * dist;
					const y = CY + Math.sin(d.a) * dist + d.grav * E.easeInQuad(p);
					// Elongated tear early -> compact round bead late
					const shrink = 1 - E.easeInQuad(p) * 0.78;
					const rx = Math.max(0.55, E.lerp(d.rx0, d.ry0, Math.min(1, p * 1.4)) * shrink);
					const ry = Math.max(0.55, d.ry0 * shrink);

					const isLarge = rx >= 1.55;
					if (solidPass && !isLarge) continue;
					if (!solidPass && isLarge) continue;

					let col = P.BRIGHT;
					if (p > 0.74) col = P.DARK;
					else if (p > 0.48) col = P.MID;
					else if (p < 0.18) col = P.HOT;
					const dither = p > 0.80 ? "bayer50" : "none";

					if (rx >= 1.2) {
						pb.fillEllipse(x, y, rx, ry, d.a, col, dither);
						// Crisp pixel specular glint on upper-leading face of droplet
						if (rx >= 1.8 && p < 0.55) {
							pb.setPixel(x + Math.cos(d.a) * 0.7, y - 0.5, p < 0.25 ? P.CORE : P.HOT);
						}
					} else if (rx >= 0.8) {
						pb.fillRect(x, y, 2, 1, col, dither);
					} else {
						pb.setPixel(x, y, col, dither);
					}
				}
			};

			// F0: WIDE FLAT SLAP STREAK + ASYMMETRIC RADIAL SPLAT CORE
			if (frameIndex === 0) {
				// Broad horizontal slap smear (tilted gently -0.09 rad for kinetic feel)
				pb.fillEllipse(CX, CY, 23.0, 4.6, -0.09, P.MID);
				pb.fillEllipse(CX + 1, CY, 18.5, 3.6, -0.09, P.BRIGHT);
				// Asymmetric central splat body & 8 uneven radiating splat fingers
				pb.fillEllipse(CX, CY, 11.8, 7.6, -0.09, P.BRIGHT);
				for (let i = 0; i < SPLAT_DROPS.length; i++) {
					const d = SPLAT_DROPS[i];
					const rTip = d.r0 + 3.2;
					pb.fillNeedle(CX + Math.cos(d.a) * rTip, CY + Math.sin(d.a) * rTip, rTip * 0.75, d.ry0 * 1.1, d.a, P.MID);
					pb.fillCircle(CX + Math.cos(d.a) * (rTip - 1.5), CY + Math.sin(d.a) * (rTip - 1.5), d.ry0 * 0.95, P.BRIGHT);
				}
				pb.addOutline(P.OUTLINE);

				// Blazing flat horizontal slap flash core
				pb.fillEllipse(CX, CY, 16.5, 2.2, -0.09, P.HOT);
				pb.fillEllipse(CX, CY, 10.5, 1.5, -0.09, P.CORE);
				pb.fillEllipse(CX, CY, 6.2, 4.0, -0.09, P.CORE);
				return;
			}

			// F1: SLAP SMEAR SHEARS WIDE & SPLAT LOBES PINCH INTO FLYING DROPLETS
			if (frameIndex === 1) {
				// Wide sheared slap streak ribbons
				pb.fillEllipse(CX + 1, CY, 25.0, 2.6, -0.09, P.MID);
				pb.fillEllipse(CX - 3, CY - 4.2, 13.5, 1.4, -0.09, P.BRIGHT);
				pb.fillEllipse(CX + 4, CY + 4.4, 14.5, 1.5, -0.09, P.BRIGHT);
				// Hollowing splat crown ring
				pb.fillEllipseRing(CX, CY, 13.5, 9.2, 8.2, 5.2, -0.09, P.BRIGHT);
				drawSplatDrops(1, true);
				pb.addOutline(P.OUTLINE);

				pb.fillEllipse(CX + 1, CY, 19.0, 1.3, -0.09, P.HOT);
				pb.fillEllipseRing(CX, CY, 12.4, 8.2, 9.4, 6.0, -0.09, P.HOT);
				drawSplatDrops(1, false);
				return;
			}

			// F2-F3: HORIZONTAL SMEAR STREAKS FADE + ASYMMETRIC DROPLETS DETACH CLEANLY
			if (frameIndex === 2 || frameIndex === 3) {
				const k = frameIndex - 2; // 0..1
				const dither = k === 0 ? "none" : "bayer75";
				// Flat sheared slap speed streaks
				pb.drawLine(8 + k * 4, CY - 1, 56 - k * 2, CY - 4, k === 0 ? P.BRIGHT : P.MID, k === 0 ? 2 : 1, dither);
				pb.drawLine(11 + k * 3, CY + 3, 52 - k * 3, CY + 1, k === 0 ? P.MID : P.DARK, 1, dither);
				if (k === 0) {
					// Broken splat ring fragments
					pb.fillArcBand(CX, CY, 10.5, 13.2, -0.55, 0.55, 5, P.MID, "none", true);
					pb.fillArcBand(CX, CY, 10.5, 13.2, 2.55, 3.65, 5, P.MID, "none", true);
				}
				drawSplatDrops(frameIndex, true);
				if (k === 0) pb.addOutline(P.OUTLINE);
				drawSplatDrops(frameIndex, false);
				return;
			}

			// F4-F5: FINAL WISPY SLAP DASHES + COASTING SPLAT DROPLETS
			if (frameIndex <= 5) {
				const k = frameIndex - 4;
				pb.drawLine(14 + k * 4, CY - 2, 32 + k * 2, CY - 3, P.DARK, 1, k === 0 ? "bayer50" : "bayer25");
				pb.drawLine(36 + k * 2, CY + 2, 52 - k * 2, CY + 1, P.DARK, 1, k === 0 ? "bayer50" : "bayer25");
				drawSplatDrops(frameIndex, true);
				drawSplatDrops(frameIndex, false);
				return;
			}

			// F6-F14: CLEAN SHRINKING DROPLET BEADS
			drawSplatDrops(frameIndex, true);
			drawSplatDrops(frameIndex, false);
		},
	});

	// =========================================================================
	// 7. hit_stomp — Heavy Stomp (Top-down ground_xz floor shockwave slam + radial cracks + outer rubble)
	// =========================================================================
	const STOMP_CRACKS = [
		{ a: 0.14, kink:  0.14, maxR: 23.0, fork:  0.42 },
		{ a: 0.90, kink: -0.15, maxR: 21.5, fork:  0.00 },
		{ a: 1.66, kink:  0.13, maxR: 23.5, fork: -0.40 },
		{ a: 2.40, kink: -0.14, maxR: 20.5, fork:  0.00 },
		{ a: 3.20, kink:  0.15, maxR: 23.2, fork:  0.38 },
		{ a: 3.96, kink: -0.13, maxR: 21.0, fork:  0.00 },
		{ a: 4.76, kink:  0.14, maxR: 22.8, fork: -0.44 },
		{ a: 5.52, kink: -0.15, maxR: 20.8, fork:  0.00 },
	];

	const STOMP_RUBBLE = [
		{ a: 0.45, r0: 11.5, dist: 14.5, s0: 2.5, spin:  2.2, life: 13 },
		{ a: 1.18, r0: 12.0, dist: 14.0, s0: 2.3, spin: -2.0, life: 12 },
		{ a: 1.98, r0: 11.0, dist: 15.0, s0: 2.6, spin:  1.8, life: 14 },
		{ a: 2.76, r0: 11.8, dist: 13.8, s0: 2.2, spin: -2.4, life: 12 },
		{ a: 3.55, r0: 11.2, dist: 14.6, s0: 2.5, spin:  2.1, life: 13 },
		{ a: 4.30, r0: 12.2, dist: 13.6, s0: 2.1, spin: -1.9, life: 11 },
		{ a: 5.10, r0: 11.4, dist: 14.8, s0: 2.4, spin:  2.3, life: 13 },
		{ a: 5.88, r0: 11.6, dist: 14.0, s0: 2.2, spin: -2.1, life: 12 },
		{ a: 0.02, r0: 13.0, dist: 12.5, s0: 1.9, spin:  1.5, life: 10 },
		{ a: 3.12, r0: 13.0, dist: 12.5, s0: 1.9, spin: -1.6, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_stomp",
		name: "Heavy Stomp",
		category: "hits",
		planeType: "ground_xz",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		secondaryVfxId: "smoke_puff",
		hitFrame: 0,
		planeScale: [2.8, 2.8],
		size: [2.8, 2.8],
		planeOffsetY: 0.06,
		yOffset: 0.06,
		robloxOrientation: "FloorPart",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitStomp_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.32,
			Orientation: "FloorPart",
		},
		description: "Top-down ground_xz floor shockwave slam: F0 center crush flash + thick ring -> F1-F7 expanding heavy ground ring with jagged radial crack spokes & outer rubble flecks.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawCracks = (rStart, reachFrac, trenchCol, rimCol, thick, dither) => {
				for (let i = 0; i < STOMP_CRACKS.length; i++) {
					const c = STOMP_CRACKS[i];
					const rEnd = c.maxR * reachFrac;
					if (rEnd <= rStart + 1.5) continue;
					const rMid = E.lerp(rStart, rEnd, 0.52);

					const x0 = CX + Math.cos(c.a) * rStart;
					const y0 = CY + Math.sin(c.a) * rStart;
					const xm = CX + Math.cos(c.a + c.kink) * rMid;
					const ym = CY + Math.sin(c.a + c.kink) * rMid;
					const x1 = CX + Math.cos(c.a - c.kink * 0.45) * rEnd;
					const y1 = CY + Math.sin(c.a - c.kink * 0.45) * rEnd;

					// Lit crack edge (slightly offset perpendicular) so fissures stay legible on dark arenas too!
					if (rimCol) {
						const px = -Math.sin(c.a) * 1.1;
						const py =  Math.cos(c.a) * 1.1;
						pb.drawLine(x0 + px, y0 + py, xm + px, ym + py, rimCol, 1, dither);
						pb.drawLine(xm + px, ym + py, x1 + px, y1 + py, rimCol, 1, dither);
					}
					pb.drawLine(x0, y0, xm, ym, trenchCol, thick, dither);
					pb.drawLine(xm, ym, x1, y1, trenchCol, 1, dither);

					// Short secondary seismic fork on major spokes
					if (c.fork !== 0 && reachFrac >= 0.72) {
						const fx = xm + Math.cos(c.a + c.fork) * (rEnd - rMid) * 0.65;
						const fy = ym + Math.sin(c.a + c.fork) * (rEnd - rMid) * 0.65;
						pb.drawLine(xm, ym, fx, fy, trenchCol, 1, dither);
					}
				}
			};

			const drawRubble = (f, solidPass) => {
				for (let i = 0; i < STOMP_RUBBLE.length; i++) {
					const rb = STOMP_RUBBLE[i];
					if (f > rb.life) continue;
					const p = f / rb.life;
					const dist = rb.r0 + rb.dist * E.easeOutCubic(p);
					const x = CX + Math.cos(rb.a) * dist;
					const y = CY + Math.sin(rb.a) * dist;
					const sz = rb.s0 * (1 - E.easeInQuad(p) * 0.76);
					if (solidPass && sz < 1.55) continue;
					if (!solidPass && sz >= 1.55) continue;

					let col = P.BRIGHT;
					if (p > 0.72) col = P.SHADOW;
					else if (p > 0.46) col = P.DARK;
					else if (p > 0.22) col = P.MID;
					const dither = p > 0.78 ? "bayer50" : "none";

					if (sz >= 1.45) {
						pb.fillEqTriangle(x, y, sz, rb.a + rb.spin * p, col, dither);
						if (sz >= 2.0 && p < 0.45) {
							pb.setPixel(x, y, P.HOT);
						}
					} else if (sz >= 0.9) {
						pb.fillRect(x, y, 2, 2, col, dither);
					} else {
						pb.setPixel(x, y, col, dither);
					}
				}
			};

			// F0: INSTANT CENTER CRUSH FLASH + THICK FLOOR RING + RADIAL CRACKS
			if (frameIndex === 0) {
				drawCracks(6.0, 0.78, P.DARK, P.BRIGHT, 2, "none");
				pb.fillRing(CX, CY, 16.0, 11.0, P.BRIGHT);
				pb.fillRegularPoly(CX, CY, 10.2, 8, 0.2, P.HOT);
				pb.addOutline(P.OUTLINE);

				pb.fillRing(CX, CY, 14.8, 12.0, P.HOT);
				pb.fillCircle(CX, CY, 6.4, P.CORE);
				drawCracks(5.5, 0.66, P.HOT, null, 1, "none");
				return;
			}

			// F1: HEAVY FLOOR RING SURGE & CRATER CRACK SPREAD
			if (frameIndex === 1) {
				drawCracks(4.5, 0.94, P.SHADOW, P.BRIGHT, 2, "none");
				pb.fillRing(CX, CY, 20.8, 15.2, P.MID);
				pb.fillRing(CX, CY, 19.6, 16.2, P.BRIGHT);
				pb.fillRing(CX, CY, 9.2, 6.4, P.HOT);
				drawRubble(1, true);
				pb.addOutline(P.OUTLINE);

				pb.fillRing(CX, CY, 18.8, 17.0, P.CORE);
				drawRubble(1, false);
				return;
			}

			// F2-F3: HEAVY EXPANDING GROUND SHOCKWAVE RING + FULL SEISMIC CRACKS + RUBBLE
			if (frameIndex === 2 || frameIndex === 3) {
				const k = frameIndex - 2; // 0..1
				const rOut = 24.0 + k * 2.0;
				const rIn = 19.4 + k * 2.8;
				drawCracks(4.0 + k * 1.2, 1.00, P.SHADOW, k === 0 ? P.BRIGHT : P.MID, k === 0 ? 2 : 1, "none");
				pb.fillRing(CX, CY, rOut, rIn, k === 0 ? P.DARK : P.SHADOW);
				pb.fillRing(CX, CY, rOut - 0.7, rIn + 0.6, k === 0 ? P.MID : P.DARK);
				pb.fillRing(CX, CY, rOut - 1.4, rIn + 1.4, k === 0 ? P.HOT : P.BRIGHT);
				drawRubble(frameIndex, true);
				pb.addOutline(P.OUTLINE);
				drawRubble(frameIndex, false);
				return;
			}

			// F4-F7: OUTER FLOOR RING FRACTURES INTO 6 HEAVY ARCS + CRACKS & RUBBLE HOLD
			if (frameIndex <= 7) {
				const k = frameIndex - 4; // 0..3
				const rOut = Math.min(27.4, 26.6 + k * 0.35);
				const rIn = rOut - (2.8 - k * 0.45);
				const ringDither = k === 0 ? "none" : k === 1 ? "bayer75" : k === 2 ? "bayer50" : "bayer25";
				const ringCol = k === 0 ? P.MID : k === 1 ? P.DARK : P.SHADOW;
				drawBrokenRing(pb, CX, CY, rIn, rOut, 6, 0.16 + k * 0.12, 0.20 + k * 0.05, ringCol, ringDither, true);
				if (k === 0) {
					drawBrokenRing(pb, CX, CY, rIn + 0.6, rOut - 0.7, 6, 0.20, 0.20, P.BRIGHT, "none", true);
				}

				const crackDither = k <= 1 ? "none" : k === 2 ? "bayer75" : "bayer50";
				drawCracks(5.5 + k * 1.0, 0.96 - k * 0.06, P.SHADOW, k <= 1 ? P.MID : P.DARK, 1, crackDither);
				drawRubble(frameIndex, true);
				if (k === 0) pb.addOutline(P.OUTLINE);
				drawRubble(frameIndex, false);
				return;
			}

			// F8-F11: CRACKS DISSOLVE + RUBBLE FLECKS SHRINK
			if (frameIndex <= 11) {
				const k = frameIndex - 8; // 0..3
				if (k <= 2) {
					drawCracks(8.0 + k * 1.6, 0.78 - k * 0.12, P.SHADOW, k === 0 ? P.DARK : null, 1, k === 0 ? "bayer50" : "bayer25");
				}
				drawRubble(frameIndex, true);
				drawRubble(frameIndex, false);
				return;
			}

			// F12-F14: FINAL RUBBLE DUST SPECKS
			drawRubble(frameIndex, true);
			drawRubble(frameIndex, false);
		},
	});

	// =========================================================================
	// 8. hit_thrust — Javelin Thrust (Horizontal piercing lance L->R + conical shock ring + wind needles)
	// =========================================================================
	const THRUST_WIND = [
		{ y: CY - 16, x0: 10, len: 16, spd: 2.6, life: 10 },
		{ y: CY - 10, x0: 14, len: 21, spd: 3.0, life: 11 },
		{ y: CY -  5, x0: 18, len: 18, spd: 3.4, life: 9  },
		{ y: CY +  5, x0: 16, len: 19, spd: 3.3, life: 9  },
		{ y: CY + 10, x0: 12, len: 22, spd: 2.9, life: 11 },
		{ y: CY + 16, x0: 11, len: 15, spd: 2.5, life: 10 },
	];

	const THRUST_SPARKS = [
		{ x0: 36, y0: CY - 3, vx: 20, vy: -8, s0: 2.0, life: 13 },
		{ x0: 38, y0: CY + 3, vx: 21, vy:  7, s0: 2.0, life: 14 },
		{ x0: 42, y0: CY - 1, vx: 16, vy: -3, s0: 1.8, life: 12 },
		{ x0: 40, y0: CY + 1, vx: 18, vy:  4, s0: 1.7, life: 13 },
		{ x0: 34, y0: CY - 6, vx: 17, vy: -9, s0: 1.6, life: 11 },
		{ x0: 34, y0: CY + 6, vx: 17, vy:  9, s0: 1.6, life: 11 },
	];

	// Helper to draw a sleek piercing lance/spear polygon driving L->R along y = CY
	function drawPiercingLance(pb, xTail, xShoulder, xTip, halfH, col, dither) {
		if (xTip <= xTail + 2 || halfH < 0.4) return;
		pb.fillPolygon([
			[xTail, CY],
			[xShoulder, CY - halfH],
			[xTip, CY],
			[xShoulder, CY + halfH],
		], col, dither || "none");
		if (halfH <= 1.8) {
			pb.drawLine(xTail, CY, xTip, CY, col, 1, dither || "none");
		}
	}

	window.KYBERMON_PIXEL_VFX.push({
		id: "hit_thrust",
		name: "Javelin Thrust",
		category: "hits",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "melee_hit",
		role: "melee_hit",
		hitFrame: 0,
		planeScale: [2.4, 1.5],
		size: [2.4, 1.5],
		planeOffsetY: 1.08,
		yOffset: 1.08,
		robloxOrientation: "VelocityParallel",
		gridCols: 4,
		gridRows: 4,
		cols: 4,
		rows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		fps: 18,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_HitThrust_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.75",
			LightEmission: 0.42,
			Orientation: "VelocityParallel",
		},
		description: "Razor-sharp horizontal javelin/spear piercing lance driving left-to-right across (32, 32): F0 needle core + conical shock ring -> F1 through-pierce flash & wind needles -> clean decay.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();
			if (frameIndex >= 15) return;

			const drawWindNeedles = (f) => {
				for (let i = 0; i < THRUST_WIND.length; i++) {
					const w = THRUST_WIND[i];
					const isOuter = i === 0 || i === THRUST_WIND.length - 1;
					// Outer wind lines erupt on F1 through-pierce flash so F0 stays razor-focused on the lance + shock ring
					if (isOuter && f === 0) continue;
					if (f > w.life) continue;
					const p = f / w.life;
					const xStart = w.x0 + f * w.spd;
					const len = w.len * (f === 0 ? 0.65 : (1 - p * 0.72));
					const xEnd = Math.min(59, xStart + len);
					if (xEnd <= xStart + 1.5 || xStart > 58) continue;
					let col = isOuter ? P.MID : P.BRIGHT;
					let dither = "none";
					if (p > 0.72) { col = P.SHADOW; dither = "bayer25"; }
					else if (p > 0.48) { col = P.DARK; dither = "bayer50"; }
					else if (p > 0.24) { col = P.MID; dither = "bayer75"; }
					else if (!isOuter && f === 1) { col = P.HOT; }
					pb.drawLine(xStart, w.y, xEnd, w.y, col, 1, dither);
					if (!isOuter && p < 0.28 && len > 6) {
						pb.drawLine(xEnd - 4, w.y, xEnd, w.y, P.CORE, 1);
					}
				}
			};

			const drawThrustSparks = (f) => {
				if (f < 1) return;
				const age = f - 1;
				for (let i = 0; i < THRUST_SPARKS.length; i++) {
					const sp = THRUST_SPARKS[i];
					if (age > sp.life) continue;
					const p = age / sp.life;
					const t = E.easeOutCubic(p);
					const x = sp.x0 + sp.vx * t;
					const y = sp.y0 + sp.vy * t;
					const sz = sp.s0 * (1 - E.easeInQuad(p) * 0.78);
					let col = P.HOT;
					if (p > 0.72) col = P.DARK;
					else if (p > 0.45) col = P.MID;
					else if (p > 0.22) col = P.BRIGHT;
					drawPixelSpark(pb, x, y, Math.atan2(sp.vy, sp.vx), sz, col, p < 0.28 ? P.CORE : null, p > 0.80 ? "bayer50" : "none");
				}
			};

			// F0 (hitFrame: 0): INSTANT PIERCING NEEDLE CORE + TIGHT CONICAL SHOCK RING
			if (frameIndex === 0) {
				// Tight conical Mach-shock ring encircling the spear shaft at x = 30
				pb.fillEllipseRing(30, CY, 5.8, 15.2, 2.8, 11.4, 0, P.BRIGHT);
				// Forward piercing sonic chevron cone
				pb.fillChevron(43, CY, 14.5, 11.2, 5.2, 0, P.MID);
				// Piercing javelin lance body
				drawPiercingLance(pb, 6, 33, 54, 4.6, P.BRIGHT);
				pb.addOutline(P.OUTLINE);

				// Blazing razor needle core & shock collar highlight
				pb.fillEllipseRing(30, CY, 4.8, 14.0, 3.4, 12.2, 0, P.HOT);
				pb.fillChevron(42, CY, 10.5, 8.2, 3.6, 0, P.HOT);
				drawPiercingLance(pb, 9, 34, 53, 2.6, P.HOT);
				drawPiercingLance(pb, 13, 36, 52, 1.3, P.CORE);
				pb.drawLine(8, CY, 54, CY, P.CORE, 1);
				drawWindNeedles(0);
				return;
			}

			// F1: FULL THROUGH-PIERCE FLASH + DUAL SHOCK COLLARS + HORIZONTAL WIND NEEDLES
			if (frameIndex === 1) {
				// Primary shock collar expanding vertically + secondary forward pierce ring
				pb.fillEllipseRing(28, CY, 6.8, 20.2, 4.0, 16.6, 0, P.MID);
				pb.fillEllipseRing(39, CY, 4.6, 14.5, 2.4, 11.4, 0, P.BRIGHT);
				// Sharp forward sonic cone shearing past target
				pb.fillChevron(50, CY, 16.0, 13.5, 5.5, 0, P.BRIGHT);
				// Full through-pierce spear reaching x = 59
				drawPiercingLance(pb, 6, 39, 59, 4.2, P.BRIGHT);
				// Crisp pierce exit glint at x = 44
				drawCrossGlint(pb, 44, CY, 12.0, 7.5, 0, 1.8, 1.4, P.HOT);
				pb.addOutline(P.OUTLINE);

				pb.fillEllipseRing(28, CY, 5.8, 19.0, 4.5, 17.4, 0, P.HOT);
				pb.fillEllipseRing(39, CY, 4.0, 13.4, 2.9, 12.0, 0, P.CORE);
				drawPiercingLance(pb, 10, 40, 58, 2.3, P.HOT);
				drawPiercingLance(pb, 15, 42, 58, 1.2, P.CORE);
				pb.drawLine(7, CY, 59, CY, P.CORE, 1);
				drawWindNeedles(1);
				drawThrustSparks(1);
				return;
			}

			// F2: HIGH-VELOCITY PIERCE FOLLOW-THROUGH
			if (frameIndex === 2) {
				pb.fillEllipseRing(27, CY, 7.6, 23.2, 5.2, 20.4, 0, P.DARK);
				pb.fillEllipseRing(27, CY, 7.0, 22.4, 5.6, 21.0, 0, P.MID);
				pb.fillEllipseRing(41, CY, 5.2, 17.8, 3.3, 15.2, 0, P.MID);
				pb.fillEllipseRing(41, CY, 4.6, 17.0, 3.7, 15.8, 0, P.BRIGHT);
				// Slim blazing needle shooting right
				drawPiercingLance(pb, 12, 43, 59, 2.8, P.BRIGHT);
				// Sheared V-cone wind trails
				pb.drawLine(36, CY - 14, 54, CY - 3, P.HOT, 1);
				pb.drawLine(36, CY + 14, 54, CY + 3, P.HOT, 1);
				pb.addOutline(P.OUTLINE);

				drawPiercingLance(pb, 18, 45, 59, 1.4, P.CORE);
				pb.drawLine(14, CY, 59, CY, P.CORE, 1);
				drawWindNeedles(2);
				drawThrustSparks(2);
				return;
			}

			// F3-F5: RING BREAKUP INTO UPPER/LOWER ARCS + DASHING SHAFT FRAGMENTS
			if (frameIndex <= 5) {
				const k = frameIndex - 3; // 0..2
				const dither = k === 0 ? "none" : k === 1 ? "bayer75" : "bayer50";
				const col = k === 0 ? P.MID : k === 1 ? P.DARK : P.SHADOW;

				// Broken top & bottom crescent caps of the vertical shock collar (keeps clean vertical read!)
				const ry = 23.5 + k * 0.8;
				pb.fillEllipseRing(26 - k, CY, 7.8, ry, 6.2, ry - 2.0, 0, col, dither);
				pb.eraseCircle(26 - k, CY, 11.5 + k * 2.5); // Carve middle so only upper/lower arcs remain!

				if (k <= 1) {
					const ry2 = 19.8 + k * 1.5;
					pb.fillEllipseRing(42 + k, CY, 5.6, ry2, 4.1, ry2 - 2.0, 0, k === 0 ? P.BRIGHT : P.MID, dither);
					pb.eraseCircle(42 + k, CY, 9.5 + k * 2.5);
				}

				// Fractured horizontal spear dashes zipping right
				const dashCol = k === 0 ? P.HOT : k === 1 ? P.BRIGHT : P.MID;
				pb.drawLine(20 + k * 5, CY, 31 + k * 5, CY, dashCol, k === 0 ? 2 : 1, dither);
				pb.drawLine(36 + k * 4, CY, 52 + k * 2, CY, k === 0 ? P.CORE : dashCol, k === 0 ? 2 : 1, dither);
				if (k === 0) {
					pb.drawLine(41, CY - 10, 56, CY - 2, P.MID, 1, "bayer75");
					pb.drawLine(41, CY + 10, 56, CY + 2, P.MID, 1, "bayer75");
				}
				drawWindNeedles(frameIndex);
				drawThrustSparks(frameIndex);
				return;
			}

			// F6-F10: SLIPSTREAM WIND NEEDLES & RIGHTWARD PIERCE SPARKS
			if (frameIndex <= 8) {
				const k = frameIndex - 6;
				pb.drawLine(36 + k * 5, CY, Math.min(58, 49 + k * 4), CY, k === 0 ? P.MID : P.DARK, 1, k === 0 ? "bayer50" : "bayer25");
			}
			drawWindNeedles(frameIndex);
			drawThrustSparks(frameIndex);
		},
	});
})();
