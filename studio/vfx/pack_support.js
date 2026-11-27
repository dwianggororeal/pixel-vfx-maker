// Kybermon Pixel VFX 3D Studio — Pack 1: Support & Sustain (7 Universal Grayscale VFX)
// Classic IIFE <script> (100% file:/// compatible), pushes 7 VFX definitions to window.KYBERMON_PIXEL_VFX.
// All 7 VFX obey:
//   - Strict universal grayscale palettes (PE.GRAY.SOFT_TRANSPARENT / PE.GRAY.ALPHA_CRISP / PE.gray)
//   - Strict 2px Roblox UV safe margin (all pixels inside [2..61], 0 edge-bleed)
//   - Anti-mewah clean, restrained pixel readability
//   - Seamless 16-frame wrap-around for loops; 0px final frame (Frame 15) for oneshots

(function () {
	"use strict";

	const TAU = Math.PI * 2;
	const CX = 31.5;
	const CY = 31.5;

	// Deterministic radial motes for Energy Charge (8 universal neutral motes)
	// [angleDeg, phaseOffset, swirlDir, sizeClass]
	const CHARGE_MOTES = [
		[  12, 0.00,  1, 2],
		[  57, 0.25, -1, 1],
		[ 103, 0.50,  1, 2],
		[ 148, 0.75, -1, 1],
		[ 194, 0.125, 1, 2],
		[ 239, 0.375,-1, 1],
		[ 284, 0.625, 1, 2],
		[ 328, 0.875,-1, 1],
	];

	// Deterministic rising flank embers for Transparent Aura
	// [xBase, phaseOffset, swayAmp, tailLen]
	const AURA_WISPS = [
		[10.5, 0.00, 1.4, 4],
		[16.0, 0.31, 1.1, 3],
		[21.0, 0.68, 0.9, 3],
		[42.0, 0.19, 0.9, 3],
		[47.0, 0.54, 1.1, 3],
		[52.5, 0.84, 1.4, 4],
	];

	// Deterministic pure neutral rising motes (NO + crosses or heart icons!)
	// [xBase, phaseOffset, speedMult(int), swayAmp, swayPhase, kind]
	// kind: 0 = 2x2 soft orb + tail, 1 = 1x5 vertical light streak, 2 = 2x2 crisp square mote, 3 = 2x4 glowing vertical bead
	const RISE_MOTES = [
		[ 8.5, 0.04, 1, 1.5, 0.2, 0],
		[12.0, 0.42, 1, 1.2, 1.9, 3],
		[15.5, 0.76, 1, 1.3, 0.6, 1],
		[18.5, 0.21, 2, 1.0, 3.1, 2],
		[21.5, 0.58, 1, 1.2, 4.4, 0],
		[25.0, 0.90, 1, 0.9, 0.8, 1],
		[28.5, 0.34, 1, 1.1, 2.5, 2],
		[31.5, 0.68, 1, 0.8, 5.1, 1],
		[35.0, 0.14, 1, 1.0, 3.7, 2],
		[38.5, 0.51, 1, 0.9, 1.4, 1],
		[41.5, 0.85, 1, 1.2, 4.9, 0],
		[44.5, 0.29, 2, 1.0, 2.1, 2],
		[47.5, 0.63, 1, 1.3, 3.4, 1],
		[51.0, 0.09, 1, 1.2, 2.2, 3],
		[54.5, 0.47, 1, 1.5, 5.6, 0],
		[14.0, 0.17, 1, 1.1, 4.1, 2],
		[49.0, 0.81, 1, 1.1, 1.2, 2],
		[23.5, 0.02, 1, 1.0, 2.9, 3],
		[39.5, 0.39, 1, 1.0, 5.3, 3],
	];

	// Flanking vertical speed lines for Buff Up & Debuff Down
	// [x, startDelay, baseLen, phaseSeed]
	const STAT_LINES = [
		[10, 0, 11, 0.15],
		[15, 1, 14, 0.45],
		[21, 0,  9, 0.75],
		[42, 0,  9, 0.30],
		[48, 1, 14, 0.60],
		[53, 0, 11, 0.90],
	];

	// Pixel-perfect symmetrical chevron rasterizer (dirY: -1 = pointing UP ^, +1 = pointing DOWN v)
	// Avoids subpixel overhang and produces clean 3-tone grayscale pixel-art bevels.
	function drawSymmetricChevron(pb, cx, tipY, halfW, armH, thickness, dirY, colLead, colMid, colTrail, dither) {
		const hw = Math.max(2, Math.round(halfW));
		const th = Math.max(1, Math.round(thickness));
		const icx = Math.round(cx);
		const itipY = Math.round(tipY);

		for (let dx = -hw; dx <= hw; dx++) {
			const adx = Math.abs(dx);
			const slopeY = Math.round((adx / hw) * armH);
			// Slight 1px aerodynamic taper on the outer 2px wing tips
			const localTh = adx >= hw - 1 ? Math.max(1, th - 1) : th;
			const px = icx + dx;

			for (let k = 0; k < localTh; k++) {
				// dirY === -1 (UP): apex is top (itipY), wings slope downward (+slopeY), thickness goes downward (+k)
				// dirY === +1 (DOWN): apex is bottom (itipY), wings slope upward (-slopeY), thickness goes upward (-k)
				const py = dirY < 0 ? (itipY + slopeY + k) : (itipY - slopeY - k);
				let col = colMid;
				if (k === 0) col = colLead;
				else if (k === localTh - 1 && localTh >= 3) col = colTrail;
				pb.setPixel(px, py, col, dither);
			}
		}
	}

	// Draw a crisp neutral 2x2 square/orb spark (strictly non-cross, non-triangle)
	function drawNeutralMote2x2(pb, x, y, colCore, colHalo, dither) {
		const ix = Math.round(x);
		const iy = Math.round(y);
		if (colHalo) {
			pb.setPixel(ix - 1, iy, colHalo, "bayer50");
			pb.setPixel(ix + 2, iy, colHalo, "bayer50");
			pb.setPixel(ix, iy - 1, colHalo, "bayer50");
			pb.setPixel(ix + 1, iy + 2, colHalo, "bayer50");
		}
		pb.setPixel(ix, iy, colCore, dither);
		pb.setPixel(ix + 1, iy, colCore, dither);
		pb.setPixel(ix, iy + 1, colCore, dither);
		pb.setPixel(ix + 1, iy + 1, colCore, dither);
	}

	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];

	// =========================================================================
	// 1. ENERGY CHARGE (charge) — Billboard, Soft Transparent, Seamless Loop
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "charge",
		name: "Energy Charge",
		category: "support",
		planeType: "billboard",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ally_support",
		hitFrame: -1,
		planeScale: [2.1, 2.1],
		planeOffsetY: 1.05,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 16,
		exportFileName: "Kybermon_Gray_Support_EnergyCharge_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 16,
			Lifetime: "1.00",
			LightEmission: 0.45,
			Orientation: "FacingCamera",
		},
		description: "Seamless 16-frame universal energy gathering loop: concentric rings pulsing inward with 8 neutral radial motes feeding a breathing circular core.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const S = E.GRAY.SOFT_TRANSPARENT;
			pb.clear();

			const n = totalFrames || 16;
			const t = (frameIndex % n) / n;
			const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 2.0);

			// 1. Two staggered subtle concentric rings pulling radially inward (silky entry/exit envelope)
			for (let k = 0; k < 2; k++) {
				const p = (t + k * 0.5) % 1.0;
				const env = Math.sin(p * Math.PI);
				const envSoft = env * env;
				if (env <= 0.04) continue;

				const r = E.lerp(24.5, 5.2, E.easeInQuad(p));
				const haloAlpha = Math.round(96 * envSoft);
				const ringAlpha = Math.round((136 + 70 * p) * env);
				const lum = Math.round(176 + 58 * p);
				const haloDither = p < 0.14 ? "bayer25" : "bayer50";
				const ringDither = p < 0.14 ? "bayer50" : (p < 0.28 ? "bayer75" : "none");

				if (haloAlpha > 14) {
					pb.strokeCircle(CX, CY, r, E.gray(164, haloAlpha), 2.1, haloDither);
				}
				pb.strokeCircle(CX, CY, r, E.gray(lum, ringAlpha), 1.1, ringDither);
			}

			// 2. Subtle rotating segmented containment dots (12-fold symmetry -> exact loop at TAU/12)
			const segR = 13.8 + Math.sin(t * TAU) * 0.8;
			const segRot = t * (TAU / 12);
			for (let i = 0; i < 12; i++) {
				const a = segRot + (i * TAU) / 12;
				const sx = CX + Math.cos(a) * segR;
				const sy = CY + Math.sin(a) * segR;
				pb.setPixel(sx, sy, E.gray(196, 110), i % 2 === 0 ? "none" : "bayer75");
			}

			// 3. 8 clean neutral energy motes pulling radially into center core
			for (let i = 0; i < CHARGE_MOTES.length; i++) {
				const m = CHARGE_MOTES[i];
				const baseAng = (m[0] * Math.PI) / 180;
				const p = (t + m[1]) % 1.0;
				const env = Math.sin(p * Math.PI);
				if (env <= 0.05) continue;

				const swirl = (1.0 - p) * 0.28 * m[2];
				const ang = baseAng + swirl;
				const r = E.lerp(25.2, 4.4, Math.pow(p, 1.32));
				const mx = CX + Math.cos(ang) * r;
				const my = CY + Math.sin(ang) * r;

				// Radial inward motion tail trailing slightly outside the mote
				const tailR = Math.min(26.5, r + 2.6 + p * 2.2);
				const tx = CX + Math.cos(ang - 0.04 * m[2]) * tailR;
				const ty = CY + Math.sin(ang - 0.04 * m[2]) * tailR;
				pb.drawLine(mx, my, tx, ty, E.gray(186, Math.round(115 * env)), 1, "bayer75");

				// Neutral circular/square spark head (zero triangles)
				const headLum = Math.round(218 + 37 * p);
				const headAlpha = Math.round(238 * env);
				if (m[3] >= 2 && env > 0.35) {
					drawNeutralMote2x2(pb, mx - 0.5, my - 0.5, E.gray(headLum, headAlpha), null, "none");
				} else {
					pb.setPixel(mx, my, E.gray(headLum, headAlpha));
					pb.setPixel(mx + Math.cos(ang), my + Math.sin(ang), E.gray(196, Math.round(145 * env)));
				}
			}

			// 4. Pulsing neutral circular center core (soft layered halo -> bright core)
			const outerHaloR = 6.4 + pulse * 1.4;
			const midCoreR = 3.8 + pulse * 0.85;
			const innerCoreR = 2.0 + pulse * 0.45;

			pb.fillCircle(CX, CY, outerHaloR, E.gray(166, 74), "bayer50");
			pb.fillCircle(CX, CY, midCoreR, E.gray(214, 174), "none");
			pb.fillCircle(CX, CY, innerCoreR, E.gray(246, 236), "none");

			// Crisp 2x2 white-hot center
			pb.setPixel(31, 31, S.CORE);
			pb.setPixel(32, 31, S.CORE);
			pb.setPixel(31, 32, S.CORE);
			pb.setPixel(32, 32, S.CORE);
		},
	});

	// =========================================================================
	// 2. TRANSPARENT AURA (aura) — Crossed X-Plane, Soft Transparent, Loop
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "aura",
		name: "Transparent Aura",
		category: "support",
		planeType: "crossed_x",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ally_aura",
		hitFrame: -1,
		planeScale: [2.2, 2.5],
		planeOffsetY: 1.15,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 14,
		exportFileName: "Kybermon_Gray_Support_TransparentAura_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 14,
			Lifetime: "1.14",
			LightEmission: 0.4,
			Orientation: "CrossedMesh",
		},
		description: "Seamless 16-frame translucent upward-flowing energy wisps framing a character cleanly with an open transparent center window and soft Bayer alpha.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			pb.clear();

			const n = totalFrames || 16;
			const t = (frameIndex % n) / n;
			const breath = Math.sin(t * TAU);

			// 1. Subtle ground-hugging translucent energy base cradle (open center!)
			const baseY = 55.5;
			pb.fillEllipse(CX, baseY, 22.0 + breath * 0.8, 3.2, 0, E.gray(162, 62), "bayer50");
			pb.fillEllipseRing(CX, baseY, 21.0 + breath * 0.6, 2.6, 11.5, 1.0, 0, E.gray(204, 112), "bayer75");

			// 2. Four flanking upward-flowing translucent ribbons (center x in [23..40] kept open!)
			// [xBase, sideSign(-1 left, +1 right), baseHalfW, waveAmp, phaseOffset, isOuter]
			const ribbons = [
				[13.0, -1, 3.4, 2.0, 0.00, true],
				[50.0,  1, 3.4, 2.0, 0.50, true],
				[18.8, -1, 2.2, 1.5, 0.25, false],
				[44.2,  1, 2.2, 1.5, 0.75, false],
			];

			const yTop = 7;
			const yBot = 56;
			const ySpan = yBot - yTop;

			for (let rIdx = 0; rIdx < ribbons.length; rIdx++) {
				const rb = ribbons[rIdx];
				const xBase = rb[0];
				const side = rb[1];
				const baseHalfW = rb[2];
				const waveAmp = rb[3];
				const phaseOff = rb[4] * TAU;
				const isOuter = rb[5];

				for (let y = yTop; y <= yBot; y++) {
					const u = (y - yTop) / ySpan; // 0 at top, 1 at bottom
					const vEnv = Math.pow(Math.sin(u * Math.PI), 0.72);
					if (vEnv < 0.08) continue;

					// + t * TAU makes sinusoidal crests travel smoothly UPWARD (toward smaller y)
					const wavePhase = u * TAU * 1.5 + t * TAU + phaseOff;
					const crest = 0.5 + 0.5 * Math.sin(u * TAU * 2.0 + t * TAU * 2.0 + phaseOff);
					// Slight inward taper near the top crown while keeping center clear
					const inward = -side * (1.0 - u) * (isOuter ? 2.6 : 1.4);
					const rx = xBase + inward + Math.sin(wavePhase) * waveAmp * (0.45 + 0.55 * (1.0 - u));

					const outerHW = Math.max(0.8, baseHalfW * vEnv * (0.82 + 0.25 * crest));
					const innerHW = outerHW * 0.45;
					const x0 = Math.floor(rx - outerHW);
					const x1 = Math.ceil(rx + outerHW);

					for (let px = x0; px <= x1; px++) {
						const dist = Math.abs(px - rx);
						if (dist > outerHW) continue;
						// Keep center character silhouette window cleanly transparent
						if (px >= 23 && px <= 40 && y >= 13 && y <= 50) continue;

						if (dist <= innerHW) {
							const lum = Math.round((isOuter ? 210 : 196) + 34 * crest);
							const alpha = Math.round(((isOuter ? 124 : 96) + 64 * crest) * vEnv);
							pb.setPixel(px, y, E.gray(lum, alpha), crest > 0.55 ? "none" : "bayer75");
						} else {
							const edgeRatio = 1.0 - (dist - innerHW) / Math.max(0.5, outerHW - innerHW);
							const alpha = Math.round((56 + 44 * crest) * vEnv * (0.4 + 0.6 * edgeRatio));
							pb.setPixel(px, y, E.gray(172, alpha), "bayer50");
						}
					}

					// Thin ascending highlight filament along the wave crest
					if (isOuter && crest > 0.66 && vEnv > 0.28) {
						const fx = Math.round(rx - side * 0.4);
						if (fx < 23 || fx > 40) {
							pb.setPixel(fx, y, E.gray(244, Math.round(205 * vEnv)));
						}
					}
				}
			}

			// 3. Six delicate seamless upward-drifting flank aura wisps
			for (let i = 0; i < AURA_WISPS.length; i++) {
				const w = AURA_WISPS[i];
				const p = (t + w[1]) % 1.0;
				const env = Math.sin(p * Math.PI);
				if (env < 0.08) continue;

				const wy = E.lerp(54.0, 9.0, p);
				const wx = w[0] + Math.sin(p * TAU + i * 1.3) * w[2];
				const tail = w[3];

				pb.setPixel(wx, wy, E.gray(242, Math.round(215 * env)));
				for (let k = 1; k <= tail; k++) {
					const fade = 1.0 - k / (tail + 1);
					pb.setPixel(wx, wy + k, E.gray(194, Math.round(140 * env * fade)), k > 1 ? "bayer75" : "none");
				}
			}
		},
	});

	// =========================================================================
	// 3. FLOOR ZONE (floor_effect) — Ground XZ Plane, Soft Transparent, Loop
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "floor_effect",
		name: "Floor Zone",
		category: "support",
		planeType: "ground_xz",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "floor_zone",
		hitFrame: -1,
		planeScale: [2.8, 2.8],
		planeOffsetY: 0.04,
		robloxOrientation: "FloorPart",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 14,
		exportFileName: "Kybermon_Gray_Support_FloorZone_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 14,
			Lifetime: "1.14",
			LightEmission: 0.35,
			Orientation: "FloorPart",
		},
		description: "Seamless 16-frame top-down geometric ground field ring with rotating tick segments, soft translucent inner pulse, and perimeter pips.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			pb.clear();

			const n = totalFrames || 16;
			const t = (frameIndex % n) / n;
			const breath = 0.5 + 0.5 * Math.sin(t * TAU);

			// 1. Soft translucent inner floor wash (lighter in center, slightly richer near outer rim)
			pb.fillCircle(CX, CY, 23.8, E.gray(154, Math.round(38 + 14 * breath)), "bayer25");
			pb.fillRing(CX, CY, 23.8, 15.2, E.gray(174, Math.round(58 + 18 * breath)), "bayer25");

			// 2. Expanding seamless inner pulse wave (fades cleanly at 0 and 1)
			const pulseR = E.lerp(6.2, 22.8, E.easeOutQuad(t));
			const pulseEnv = Math.sin(t * Math.PI);
			if (pulseEnv > 0.06) {
				pb.strokeCircle(CX, CY, pulseR, E.gray(214, Math.round(138 * pulseEnv)), 1.4, "bayer75");
			}

			// 3. Geometric concentric field rings
			// Inner subtle anchor rings
			pb.strokeCircle(CX, CY, 5.8, E.gray(198, Math.round(96 + 24 * breath)), 1.0, "bayer50");
			pb.strokeCircle(CX, CY, 14.8, E.gray(192, 118), 1.0, "bayer75");

			// Primary outer boundary ring with soft glow halo
			pb.strokeCircle(CX, CY, 24.4, E.gray(164, 82), 2.8, "bayer50");
			pb.strokeCircle(CX, CY, 24.4, E.gray(222, 190), 1.2, "none");

			// 4. 8 rotating geometric tick segments (8-fold symmetry -> exact loop at TAU/8)
			const tickRot = t * (TAU / 8);
			for (let i = 0; i < 8; i++) {
				const aCenter = tickRot + (i * TAU) / 8;
				const span = 0.21;
				pb.fillArcBand(CX, CY, 18.8, 20.3, aCenter - span, aCenter + span, 5, E.gray(236, 198), "none", false);

				// Subtle inward radial tick pip on alternating segments
				if (i % 2 === 0) {
					const ix0 = CX + Math.cos(aCenter) * 16.0;
					const iy0 = CY + Math.sin(aCenter) * 16.0;
					const ix1 = CX + Math.cos(aCenter) * 18.4;
					const iy1 = CY + Math.sin(aCenter) * 18.4;
					pb.drawLine(ix0, iy0, ix1, iy1, E.gray(220, 168), 1);
				}
			}

			// 5. 4 counter-rotating outer corner geometric bracket arcs (4-fold symmetry -> exact loop at -TAU/4)
			const outerRot = -t * (TAU / 4);
			for (let i = 0; i < 4; i++) {
				const aCenter = outerRot + (i * TAU) / 4 + Math.PI / 4;
				const span = 0.16;
				pb.fillArcBand(CX, CY, 25.9, 27.0, aCenter - span, aCenter + span, 4, E.gray(244, Math.round(168 + 40 * breath)), "none", false);
			}

			// 6. 8 subtle pulsing/drifting perimeter pips
			for (let i = 0; i < 8; i++) {
				const p = (t + (i % 4) * 0.25) % 1.0;
				const env = Math.sin(p * Math.PI);
				if (env < 0.12) continue;

				const ang = (i * TAU) / 8 + 0.18 + t * (TAU / 8);
				const pr = E.lerp(22.2, 26.8, p);
				const px = CX + Math.cos(ang) * pr;
				const py = CY + Math.sin(ang) * pr;
				pb.setPixel(px, py, E.gray(250, Math.round(220 * env)));
			}
		},
	});

	// =========================================================================
	// 4. ENERGY BARRIER (barrier) — Crossed X-Plane, Soft Transparent, Loop
	//    Abstract futuristic geometric hex-grid dome shell (NOT a kite shield!)
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "barrier",
		name: "Energy Barrier",
		category: "support",
		planeType: "crossed_x",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ally_aura",
		hitFrame: -1,
		planeScale: [2.4, 2.4],
		planeOffsetY: 1.15,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 14,
		exportFileName: "Kybermon_Gray_Support_EnergyBarrier_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 14,
			Lifetime: "1.14",
			LightEmission: 0.45,
			Orientation: "CrossedMesh",
		},
		description: "Seamless 16-frame abstract geometric translucent hex-grid force-field dome pulsing gently with diagonal scanning shimmer bands.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			pb.clear();

			const n = totalFrames || 16;
			const t = (frameIndex % n) / n;
			const breath = Math.sin(t * TAU);
			const R = 24.8 + breath * 0.35;
			const hexR = 6.2;
			const SQRT3 = 1.7320508;
			const inRadius = hexR * (SQRT3 * 0.5);

			// 1. Per-pixel spherical/dome force-field shell + mathematical pointy-top hex lattice + scanning shimmer
			const minC = Math.max(pb.minCoord, Math.floor(CX - R - 1));
			const maxC = Math.min(pb.maxCoord, Math.ceil(CX + R + 1));

			for (let y = minC; y <= maxC; y++) {
				const dy = y - CY;
				for (let x = minC; x <= maxC; x++) {
					const dx = x - CX;
					const d = Math.hypot(dx, dy);
					if (d > R) continue;

					const nr = d / R; // 0 center .. 1 outer dome rim

					// Diagonal-vertical seamless scanning wave wrapping cleanly across the dome
					let scanPhase = ((dy * 0.82 + dx * 0.28) / 58.0 + 0.5 - t) % 1.0;
					if (scanPhase < 0) scanPhase += 1.0;
					if (scanPhase > 0.5) scanPhase -= 1.0; // [-0.5 .. 0.5]
					const scan = Math.max(0, 1.0 - Math.abs(scanPhase) / 0.13);
					const scanSharp = scan * scan;

					// Pointy-top hex axial coordinates + exact hex-edge distance
					const qf = ((SQRT3 / 3) * dx - (1 / 3) * dy) / hexR;
					const rf = ((2 / 3) * dy) / hexR;
					const sf = -qf - rf;
					let rq = Math.round(qf);
					let rr = Math.round(rf);
					let rs = Math.round(sf);
					const dq = Math.abs(rq - qf);
					const dr = Math.abs(rr - rf);
					const ds = Math.abs(rs - sf);
					if (dq > dr && dq > ds) rq = -rr - rs;
					else if (dr > ds) rr = -rq - rs;
					else rs = -rq - rr;

					const hcx = hexR * (SQRT3 * rq + (SQRT3 * 0.5) * rr);
					const hcy = hexR * (1.5 * rr);
					const lx = Math.abs(dx - hcx);
					const ly = Math.abs(dy - hcy);
					const hexDist = Math.max(lx, lx * 0.5 + ly * (SQRT3 * 0.5));
					const edgeDist = inRadius - hexDist; // 0 right on hex border

					// Fresnel dome surface (very clear in center so character stays visible, stronger toward rim)
					const fresnel = Math.pow(nr, 2.2);
					if (nr < 0.90) {
						const baseAlpha = Math.round(28 + 82 * fresnel);
						const ditherShell = nr < 0.62 ? "bayer25" : "bayer50";
						pb.setPixel(x, y, E.gray(168, baseAlpha), ditherShell);
					}

					// Subtle energized hex facet lighting up as scanline sweeps across
					if (scan > 0.25 && nr < 0.93) {
						const cellHash = E.hash01(rq * 37.1 + rr * 91.7);
						if (cellHash > 0.42) {
							const facetAlpha = Math.round((48 + 44 * fresnel) * scan);
							pb.setPixel(x, y, E.gray(216, facetAlpha), "bayer50");
						}
					}

					// Crisp 1px hex-grid lattice lines inside the shell
					if (edgeDist <= 0.68 && nr <= 0.96) {
						const gridBaseAlpha = Math.round(44 + 108 * fresnel + 96 * scanSharp);
						const gridLum = Math.round(186 + 64 * scanSharp + 18 * fresnel);
						const gridDither = (nr < 0.45 && scan < 0.2) ? "bayer50" : "none";
						pb.setPixel(x, y, E.gray(gridLum, gridBaseAlpha), gridDither);
					}

					// Outer rounded geometric energy shell rim (Fresnel bevel + scan glint)
					if (nr >= 0.91) {
						// Specular boost along upper-left & lower-right arcs for spherical 3D volume feel
						const rimDir = (-dx * 0.7 - dy * 0.7) / Math.max(1, d);
						const spec = Math.max(0, rimDir) * 0.65 + Math.max(0, -rimDir) * 0.25;
						const rimLum = Math.round(202 + 34 * spec + 26 * scanSharp);
						const rimAlpha = Math.round(168 + 46 * spec + 36 * scanSharp);
						pb.setPixel(x, y, E.gray(rimLum, rimAlpha));
					}
				}
			}

			// 2. Subtle outer Fresnel air-halo ring (soft dithered 1.5px aura outside dome)
			pb.strokeCircle(CX, CY, R + 0.9, E.gray(178, Math.round(68 + 20 * (0.5 + 0.5 * breath))), 1.4, "bayer50");

			// 3. Four minimal floating geometric field anchor ticks at 45-degree diagonals
			const anchorAlpha = Math.round(135 + 55 * (0.5 + 0.5 * breath));
			for (let i = 0; i < 4; i++) {
				const a = Math.PI / 4 + (i * TAU) / 4;
				const rIn = R + 1.8;
				const rOut = R + 2.7;
				pb.fillArcBand(CX, CY, rIn, rOut, a - 0.14, a + 0.14, 3, E.gray(236, anchorAlpha), "none", false);
			}
		},
	});

	// =========================================================================
	// 5. RISING MOTES (rise_particles) — Crossed X-Plane, Soft Transparent, Loop
	//    Pure neutral particles ONLY — NO medical + crosses or heart icons!
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "rise_particles",
		name: "Rising Motes",
		category: "support",
		planeType: "crossed_x",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		combatRole: "ally_support",
		hitFrame: -1,
		planeScale: [2.1, 2.6],
		planeOffsetY: 1.2,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 14,
		exportFileName: "Kybermon_Gray_Support_RisingMotes_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "Loop",
			FlipbookFramerate: 14,
			Lifetime: "1.14",
			LightEmission: 0.45,
			Orientation: "CrossedMesh",
		},
		description: "Seamless 16-frame upward drift of pure neutral pixel motes, soft orbs, and vertical light streaks wrapping cleanly bottom-to-top.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			pb.clear();

			const n = totalFrames || 16;
			const t = (frameIndex % n) / n;

			for (let i = 0; i < RISE_MOTES.length; i++) {
				const m = RISE_MOTES[i];
				const xBase = m[0];
				const phase = m[1];
				const speedMult = m[2]; // integer 1 or 2 -> guaranteed exact wrap-around
				const swayAmp = m[3];
				const swayPhase = m[4];
				const kind = m[5];

				const p = (t * speedMult + phase) % 1.0;
				const env = Math.pow(Math.sin(p * Math.PI), 0.62);
				if (env < 0.06) continue;

				const twinkle = 0.78 + 0.22 * Math.sin(p * TAU * 2.0 + swayPhase);
				const y = E.lerp(56.5, 6.5, p);
				const x = xBase + Math.sin(p * TAU + swayPhase) * swayAmp;
				const ix = Math.round(x);
				const iy = Math.round(y);
				const aMain = Math.round(234 * env * twinkle);
				const lumMain = Math.round(218 + 37 * twinkle);

				if (kind === 0) {
					// Soft 2x2 orb with subtle fading downward wake (zero + arms!)
					pb.setPixel(ix, iy, E.gray(lumMain, aMain));
					pb.setPixel(ix + 1, iy, E.gray(lumMain, aMain));
					pb.setPixel(ix, iy + 1, E.gray(lumMain - 12, Math.round(aMain * 0.92)));
					pb.setPixel(ix + 1, iy + 1, E.gray(lumMain - 12, Math.round(aMain * 0.92)));
					pb.setPixel(ix, iy + 2, E.gray(196, Math.round(145 * env)));
					pb.setPixel(ix + 1, iy + 2, E.gray(188, Math.round(125 * env)), "bayer75");
					pb.setPixel(ix, iy + 3, E.gray(176, Math.round(92 * env)), "bayer50");
					pb.setPixel(ix + 1, iy + 3, E.gray(168, Math.round(68 * env)), "bayer50");
				} else if (kind === 1) {
					// Delicate 1x5 vertical rising light streak
					pb.setPixel(ix, iy, E.gray(252, aMain));
					pb.setPixel(ix, iy + 1, E.gray(232, Math.round(aMain * 0.84)));
					pb.setPixel(ix, iy + 2, E.gray(204, Math.round(aMain * 0.62)));
					pb.setPixel(ix, iy + 3, E.gray(184, Math.round(aMain * 0.42)), "bayer75");
					pb.setPixel(ix, iy + 4, E.gray(166, Math.round(aMain * 0.24)), "bayer50");
				} else if (kind === 2) {
					// Crisp 2x2 pixel spark + 1px trail underneath
					pb.setPixel(ix, iy, E.gray(lumMain, aMain));
					pb.setPixel(ix + 1, iy, E.gray(lumMain - 10, Math.round(aMain * 0.88)));
					pb.setPixel(ix, iy + 1, E.gray(200, Math.round(aMain * 0.65)));
					pb.setPixel(ix + 1, iy + 1, E.gray(184, Math.round(aMain * 0.45)), "bayer75");
				} else {
					// Faceted 2x4 vertical neutral energy bead (2px wide luminous head + smooth tail)
					pb.setPixel(ix, iy, E.gray(254, aMain));
					pb.setPixel(ix + 1, iy, E.gray(246, aMain));
					pb.setPixel(ix, iy + 1, E.gray(228, Math.round(aMain * 0.90)));
					pb.setPixel(ix + 1, iy + 1, E.gray(218, Math.round(aMain * 0.86)));
					pb.setPixel(ix, iy + 2, E.gray(194, Math.round(135 * env)));
					pb.setPixel(ix + 1, iy + 2, E.gray(186, Math.round(115 * env)), "bayer75");
					pb.setPixel(ix, iy + 3, E.gray(172, Math.round(74 * env)), "bayer50");
				}
			}
		},
	});

	// =========================================================================
	// 6. STAT BUFF UP (buff_up) — Crossed X-Plane, Alpha Crisp, OneShot
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "buff_up",
		name: "Stat Buff Up",
		category: "support",
		planeType: "crossed_x",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "ally_support",
		hitFrame: 2,
		planeScale: [2.1, 2.5],
		planeOffsetY: 1.25,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_Support_StatBuffUp_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 18,
			Lifetime: "0.89",
			LightEmission: 0.35,
			Orientation: "CrossedMesh",
		},
		description: "Crisp upward-rising triple energy chevrons with sleek vertical ascending speed lines, peaking at Frame 2 and dissolving cleanly to 0px at Frame 15.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			// Mandatory OneShot final empty cell (0px at Frame 15)
			if (frameIndex >= (totalFrames || 16) - 1) return;

			const f = frameIndex; // 0..14

			// 1. Triple ascending energy chevrons (drawn first so crisp 1px outline frames ONLY chevrons)
			// Clean vertical spacing across center torso on hitFrame 2 (tipY ~ 18, 30, 44)
			// [startF, endF, yStart, yEnd, halfW, armH, baseTh]
			const chevrons = [
				[1, 11, 23,  5, 10, 5, 3], // Upper leading chevron
				[0, 13, 39, 12, 14, 7, 4], // Center hero chevron
				[2, 14, 44, 21, 11, 5, 3], // Lower trailing companion chevron
			];

			for (let i = 0; i < chevrons.length; i++) {
				const c = chevrons[i];
				if (f < c[0] || f > c[1]) continue;

				const localT = (f - c[0]) / Math.max(1, c[1] - c[0]);
				const tipY = E.lerp(c[2], c[3], E.easeOutQuad(localT));
				const remain = c[1] - f;

				// Clean gradual dissolution dither & thinning
				let dither = "none";
				let th = c[6];
				if (remain === 0) {
					dither = "bayer25";
					th = Math.max(1, c[6] - 2);
				} else if (remain === 1) {
					dither = "bayer50";
					th = Math.max(2, c[6] - 1);
				} else if (remain === 2) {
					dither = "bayer75";
				}

				const isPeak = (f === 2 || f === 3);
				const colLead = isPeak ? P.CORE : (localT < 0.65 ? P.HOT : P.BRIGHT);
				const colMid = isPeak ? P.HOT : (localT < 0.65 ? P.BRIGHT : P.MID);
				const colTrail = localT < 0.55 ? P.MID : P.DARK;

				drawSymmetricChevron(pb, 32, tipY, c[4], c[5], th, -1, colLead, colMid, colTrail, dither);
			}

			// Crisp 1px silhouette outline around solid active chevrons (fades gently at F10..F11 before dissolving)
			if (f <= 9) {
				pb.addOutline(P.OUTLINE, 220);
			} else if (f === 10) {
				pb.addOutline(P.SHADOW, 220);
			}

			// 2. Subtle base lift horizontal energy flash at feet on F0..F4
			if (f <= 4) {
				const ringW = E.lerp(10, 21, f / 4);
				const ringCol = f === 2 ? P.CORE : (f <= 2 ? P.BRIGHT : P.MID);
				const ringDither = f >= 4 ? "bayer50" : "none";
				pb.drawLine(32 - ringW, 55, 32 + ringW, 55, ringCol, 1, ringDither);
				if (f >= 1 && f <= 3) {
					pb.drawLine(32 - ringW * 0.65, 56, 32 + ringW * 0.65, 56, P.DARK, 1, "bayer75");
				}
			}

			// 3. Sleek 1px vertical ascending speed lines (drawn AFTER outline so they stay razor-thin!)
			if (f <= 13) {
				for (let i = 0; i < STAT_LINES.length; i++) {
					const sl = STAT_LINES[i];
					const lx = sl[0];
					const startF = sl[1];
					const baseLen = sl[2];
					if (f < startF) continue;

					const u = (f - startF) / Math.max(1, 13 - startF);
					const yHead = E.lerp(52, 6 + (i % 2) * 3, E.easeOutQuad(u));
					const curLen = Math.max(2, Math.round(baseLen * (1.0 - u * 0.72)));
					const yTail = Math.min(58, yHead + curLen);

					const lineDither = f >= 12 ? "bayer50" : (f >= 10 ? "bayer75" : "none");
					const headCol = f <= 4 ? P.CORE : P.BRIGHT;
					const tailCol = f <= 5 ? P.MID : P.DARK;

					pb.drawLine(lx, yHead, lx, yTail, tailCol, 1, lineDither);
					pb.drawLine(lx, yHead, lx, Math.min(yTail, yHead + Math.ceil(curLen * 0.45)), headCol, 1, lineDither);
				}
			}

			// 4. Minimal lingering upward spark pips on F13..F14 before 0px F15
			if (f === 13 || f === 14) {
				const sy = f === 13 ? 11 : 8;
				const col = f === 13 ? P.BRIGHT : P.MID;
				pb.setPixel(22, sy + 2, col);
				pb.setPixel(32, sy, col);
				pb.setPixel(42, sy + 2, col);
				if (f === 13) {
					pb.setPixel(16, sy + 6, P.MID);
					pb.setPixel(48, sy + 6, P.MID);
				}
			}
		},
	});

	// =========================================================================
	// 7. STAT DEBUFF DOWN (debuff_down) — Crossed X-Plane, Alpha Crisp, OneShot
	// =========================================================================
	window.KYBERMON_PIXEL_VFX.push({
		id: "debuff_down",
		name: "Stat Debuff Down",
		category: "support",
		planeType: "crossed_x",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "status_enemy",
		hitFrame: 2,
		planeScale: [2.1, 2.5],
		planeOffsetY: 1.25,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 18,
		exportFileName: "Kybermon_Gray_Support_StatDebuffDown_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 18,
			Lifetime: "0.89",
			LightEmission: 0.25,
			Orientation: "CrossedMesh",
		},
		description: "Crisp heavy downward-pressing chevrons with descending pressure lines weighing onto the target, peaking at Frame 2 and dissolving cleanly to 0px at Frame 15.",

		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			// Mandatory OneShot final empty cell (0px at Frame 15)
			if (frameIndex >= (totalFrames || 16) - 1) return;

			const f = frameIndex; // 0..14

			// 1. Triple heavy downward-pressing chevrons (broader, heavier dark bevel than buff_up)
			// Clean dramatic slam distribution across target on hitFrame 2 (tipY ~ 42, 30, 18)
			// [startF, endF, yStart(apex), yEnd(apex), halfW, armH, baseTh]
			const chevrons = [
				[0, 12, 28, 54, 15, 7, 4], // Hero lower heavy pressing chevron
				[1, 13, 21, 44, 13, 6, 4], // Mid weight chevron
				[2, 14, 17, 34, 10, 5, 3], // Upper capping weight chevron
			];

			for (let i = 0; i < chevrons.length; i++) {
				const c = chevrons[i];
				if (f < c[0] || f > c[1]) continue;

				const localT = (f - c[0]) / Math.max(1, c[1] - c[0]);
				// Cubic ease-out creates a fast heavy slam followed by sluggish weighed-down settling
				const tipY = E.lerp(c[2], c[3], E.easeOutCubic(localT));
				const remain = c[1] - f;

				let dither = "none";
				let th = c[6];
				if (remain === 0) {
					dither = "bayer25";
					th = Math.max(1, c[6] - 2);
				} else if (remain === 1) {
					dither = "bayer50";
					th = Math.max(2, c[6] - 1);
				} else if (remain === 2) {
					dither = "bayer75";
				}

				// Heavier value contrast (bright bottom edge at impact, dark weighted upper bevel)
				const isPeak = (f === 2 || f === 3);
				const colLead = isPeak ? P.HOT : (localT < 0.5 ? P.BRIGHT : P.MID);
				const colMid = isPeak ? P.MID : P.DARK;
				const colTrail = P.SHADOW;

				drawSymmetricChevron(pb, 32, tipY, c[4], c[5], th, 1, colLead, colMid, colTrail, dither);
			}

			// Crisp 1px silhouette outline around solid heavy chevrons (softens at F10 before dissolving)
			if (f <= 9) {
				pb.addOutline(P.OUTLINE, 220);
			} else if (f === 10) {
				pb.addOutline(P.SHADOW, 220);
			}

			// 2. Overhead ceiling clamp bar on F0..F3 (sells top-down pressure onset)
			if (f <= 3) {
				const barW = E.lerp(18, 12, f / 3);
				const barY = 7 + f;
				pb.drawLine(32 - barW, barY, 32 + barW, barY, f === 2 ? P.BRIGHT : P.MID, 1, f === 3 ? "bayer50" : "none");
				pb.drawLine(32 - barW * 0.7, barY - 1, 32 + barW * 0.7, barY - 1, P.SHADOW, 1, "bayer75");
			}

			// 3. Flattened lower ground compression band when weight slams down (F3..F11)
			if (f >= 3 && f <= 11) {
				const compU = (f - 3) / 8;
				const compW = E.lerp(14, 22, E.easeOutQuad(compU));
				const compDither = f >= 10 ? "bayer25" : (f >= 8 ? "bayer50" : "none");
				pb.drawLine(32 - compW, 56, 32 + compW, 56, f <= 5 ? P.MID : P.DARK, 1, compDither);
				if (f <= 7) {
					pb.drawLine(32 - compW * 0.65, 57, 32 + compW * 0.65, 57, P.SHADOW, 1, "bayer75");
				}
			}

			// 4. Descending vertical pressure lines flanking the target (razor-thin 1px)
			if (f <= 13) {
				for (let i = 0; i < STAT_LINES.length; i++) {
					const sl = STAT_LINES[i];
					const lx = sl[0];
					const startF = sl[1];
					const baseLen = sl[2];
					if (f < startF) continue;

					const u = (f - startF) / Math.max(1, 13 - startF);
					const yHead = E.lerp(11 + (i % 2) * 3, 56, E.easeOutCubic(u));
					const curLen = Math.max(2, Math.round(baseLen * (1.0 - u * 0.68)));
					const yTail = Math.max(5, yHead - curLen);

					const lineDither = f >= 12 ? "bayer50" : (f >= 10 ? "bayer75" : "none");
					const headCol = f <= 4 ? P.BRIGHT : P.MID;
					const tailCol = P.SHADOW;

					pb.drawLine(lx, yTail, lx, yHead, tailCol, 1, lineDither);
					pb.drawLine(lx, Math.max(yTail, yHead - Math.ceil(curLen * 0.45)), lx, yHead, headCol, 1, lineDither);
				}
			}

			// 5. Minimal weighted floor dust specks on F13..F14 before 0px F15
			if (f === 13 || f === 14) {
				const sy = f === 13 ? 52 : 55;
				const col = f === 13 ? P.DARK : P.SHADOW;
				pb.setPixel(22, sy - 1, col);
				pb.setPixel(32, sy, col);
				pb.setPixel(42, sy - 1, col);
				if (f === 13) {
					pb.setPixel(17, sy - 3, P.SHADOW);
					pb.setPixel(47, sy - 3, P.SHADOW);
				}
			}
		},
	});
})();
