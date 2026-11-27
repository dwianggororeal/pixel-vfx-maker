// Kybermon Pixel VFX 3D Studio — Abstract Kybermon Status VFX Pack (4 Lightweight 8-Frame 4x2 Cycles)
// 100% file:/// compatible (classic IIFE <script>, pushes to window.KYBERMON_PIXEL_VFX).
// Universal grayscale only (Alpha Crisp / Soft Transparent) — safe for Red, Green, Blue, Black & White tinting.
// Strictly abstract geometric forms: NO dizzy stars, NO poison skulls, NO flame icons, NO medical crosses.
// Strict 2px Roblox UV safe margin [2..61] (0 edge-bleed pixels); all OneShot VFX end with 0px on Frame 7.

(function () {
	"use strict";

	// =========================================================================
	// SHARED INTEGER PIXEL-ART HELPERS
	// =========================================================================

	function getPE(PE) {
		return PE || window.PixelEngine;
	}

	// Crisp Manhattan diamond (far sharper than tiny circles at 1-4px scale)
	function drawDiamond(pb, cx, cy, r, col, ditherMode) {
		const icx = Math.round(cx);
		const icy = Math.round(cy);
		const ir = Math.floor(r);
		if (ir <= 0) {
			pb.setPixel(icx, icy, col, ditherMode);
			return;
		}
		for (let dy = -ir; dy <= ir; dy++) {
			const span = ir - Math.abs(dy);
			for (let dx = -span; dx <= span; dx++) {
				pb.setPixel(icx + dx, icy + dy, col, ditherMode);
			}
		}
	}

	// Tapered 4-vertex directional blade (razor ends or split half-slash)
	function drawTaperedBlade(pb, x0, y0, x1, y1, halfW0, halfW1, col, ditherMode) {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const len = Math.hypot(dx, dy);
		if (len < 0.5) return;
		const nx = -dy / len;
		const ny = dx / len;

		if (halfW0 <= 0.55 && halfW1 <= 0.55) {
			pb.drawLine(x0, y0, x1, y1, col, 1, ditherMode);
			return;
		}

		const pts = [
			[x0 + nx * halfW0, y0 + ny * halfW0],
			[x1 + nx * halfW1, y1 + ny * halfW1],
			[x1 - nx * halfW1, y1 - ny * halfW1],
			[x0 - nx * halfW0, y0 - ny * halfW0],
		];
		pb.fillPolygon(pts, col, ditherMode);
		if (Math.min(halfW0, halfW1) <= 1.2) {
			pb.drawLine(x0, y0, x1, y1, col, 1, ditherMode);
		}
	}

	// Segmented elliptical ring with optional rotation, front/back depth shading, and crisp dash gaps
	function drawSegmentedEllipseBand(pb, opts) {
		const cx = opts.cx;
		const cy = opts.cy;
		const rxOut = opts.rxOut;
		const ryOut = opts.ryOut;
		const rxIn = Math.max(0.2, opts.rxIn);
		const ryIn = Math.max(0.2, opts.ryIn);
		const rot = opts.rot || 0;
		const segCount = opts.segCount || 6;
		const duty = opts.duty !== undefined ? opts.duty : 0.62;
		const phaseOffset = opts.phaseOffset || 0;
		const colFront = opts.colFront;
		const colBack = opts.colBack || colFront;
		const colGlint = opts.colGlint || null;
		const ditherFront = opts.ditherFront || "none";
		const ditherBack = opts.ditherBack || ditherFront;
		const baseTrackCol = opts.baseTrackCol || null;
		const baseTrackDither = opts.baseTrackDither || "bayer50";

		if (rxOut <= 0.5 || ryOut <= 0.5) return;

		const ca = Math.cos(-rot);
		const sa = Math.sin(-rot);
		const bound = Math.max(rxOut, ryOut) + 1;
		const minX = Math.max(pb.minCoord, Math.floor(cx - bound));
		const maxX = Math.min(pb.maxCoord, Math.ceil(cx + bound));
		const minY = Math.max(pb.minCoord, Math.floor(cy - bound));
		const maxY = Math.min(pb.maxCoord, Math.ceil(cy + bound));

		const invOutRx2 = 1 / (rxOut * rxOut);
		const invOutRy2 = 1 / (ryOut * ryOut);
		const invInRx2 = 1 / (rxIn * rxIn);
		const invInRy2 = 1 / (ryIn * ryIn);
		const rxMid = (rxOut + rxIn) * 0.5;
		const ryMid = (ryOut + ryIn) * 0.5;
		const twoPi = Math.PI * 2;

		for (let y = minY; y <= maxY; y++) {
			const dy = y - cy;
			for (let x = minX; x <= maxX; x++) {
				const dx = x - cx;
				const lx = dx * ca - dy * sa;
				const ly = dx * sa + dy * ca;
				const outD = lx * lx * invOutRx2 + ly * ly * invOutRy2;
				if (outD > 1.0) continue;
				const inD = lx * lx * invInRx2 + ly * ly * invInRy2;
				if (inD < 1.0) continue;

				const isFront = ly >= 0;
				let theta = Math.atan2(ly / ryMid, lx / rxMid);
				if (theta < 0) theta += twoPi;

				const rawSeg = (theta / twoPi) * segCount + phaseOffset;
				const segU = ((rawSeg % 1) + 1) % 1;

				if (segU <= duty) {
					// Glint near leading edge of front arc segments
					if (colGlint && isFront && segU > duty - 0.16 && segU <= duty - 0.02) {
						pb.setPixel(x, y, colGlint, "none");
					} else {
						pb.setPixel(x, y, isFront ? colFront : colBack, isFront ? ditherFront : ditherBack);
					}
				} else if (baseTrackCol) {
					pb.setPixel(x, y, baseTrackCol, baseTrackDither);
				}
			}
		}
	}

	// Vertical geometric clamp bracket (left: side = -1, right: side = 1)
	function drawClampBracket(pb, xEdge, yTop, yBot, side, hookLen, detentY, colRim, colBody, colCore, showHotNode) {
		const dir = -side; // points inward toward center
		const ix = Math.round(xEdge);
		const iy0 = Math.round(yTop);
		const iy1 = Math.round(yBot);
		const hLen = Math.round(hookLen);

		// Subtle outer translucent rim shadow (keeps dark/Black tint readable)
		if (colRim) {
			pb.drawLine(ix + side, iy0, ix + side, iy1, colRim, 1, "bayer75");
		}

		// Main 1px crisp vertical clamp rail
		pb.drawLine(ix, iy0, ix, iy1, colBody, 1, "none");

		// Short inward corner return hook
		const hookY = iy0 < 32 ? iy0 : iy1;
		pb.drawLine(ix, hookY, ix + dir * hLen, hookY, colBody, 1, "none");
		pb.setPixel(ix + dir * hLen, hookY + (iy0 < 32 ? 1 : -1), colBody);

		// Small inward detent tick aligned with ring band
		if (detentY !== null && detentY !== undefined) {
			const dy = Math.round(detentY);
			pb.setPixel(ix + dir, dy, colCore || colBody);
			pb.setPixel(ix + dir * 2, dy, colBody);
		}

		// Corner lock highlight pixel
		if (colCore) {
			pb.setPixel(ix, hookY, colCore);
			if (showHotNode) {
				pb.setPixel(ix + dir, hookY, colCore);
				pb.setPixel(ix, hookY + (iy0 < 32 ? 1 : -1), colCore);
			}
		}
	}

	// Fractured quadrant wedge of a diamond centered at (cx, cy)
	// quadIdx: 0 = Top (N), 1 = Right (E), 2 = Bottom (S), 3 = Left (W)
	function drawDiamondQuadrant(pb, cx, cy, r, quadIdx, offsetDist, spreadScale, col, ditherMode) {
		if (r < 0.8) return;
		const dirs = [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		];
		const d = dirs[quadIdx & 3];
		const ox = cx + d[0] * offsetDist;
		const oy = cy + d[1] * offsetDist;
		const halfSpan = r * (spreadScale !== undefined ? spreadScale : 0.72);

		// Apex points outward; base faces inward along the diagonal fracture seam
		const tipX = ox + d[0] * r;
		const tipY = oy + d[1] * r;
		const px = -d[1] * halfSpan;
		const py = d[0] * halfSpan;
		const b1x = ox + px;
		const b1y = oy + py;
		const b2x = ox - px;
		const b2y = oy - py;

		pb.fillTriangle(tipX, tipY, b1x, b1y, b2x, b2y, col, ditherMode || "none");
	}

	// =========================================================================
	// DETERMINISTIC FLECK & SPARK TABLES
	// =========================================================================

	// 6 compact rising/popping pixel flecks for status_dot_tick (never occlude torso)
	const DOT_FLECKS = [
		{ x0: 25, y0: 31, vx: -5.5, vy: -14.5, born: 1, life: 4, popAt: 3, size: 2.0, bright: true  },
		{ x0: 38, y0: 30, vx:  6.0, vy: -16.0, born: 1, life: 5, popAt: 4, size: 2.0, bright: true  },
		{ x0: 29, y0: 26, vx: -2.0, vy: -15.5, born: 1, life: 5, popAt: 3, size: 1.5, bright: false },
		{ x0: 35, y0: 27, vx:  3.0, vy: -12.5, born: 1, life: 4, popAt: 4, size: 1.5, bright: true  },
		{ x0: 23, y0: 37, vx: -4.5, vy: -11.5, born: 2, life: 4, popAt: 4, size: 1.5, bright: false },
		{ x0: 41, y0: 36, vx:  4.5, vy: -13.0, born: 2, life: 4, popAt: 5, size: 1.5, bright: true  },
	];

	// 12 delicate rising spark curtain motes for status_cleanse (base y=56 -> crown y=8)
	const CLEANSE_SPARKS = [
		{ x: 14, yBase: 55, driftX:  1.2, rise: 14, born: 0, life: 4, tall: true  },
		{ x: 21, yBase: 54, driftX: -0.8, rise: 17, born: 0, life: 4, tall: false },
		{ x: 32, yBase: 56, driftX:  0.0, rise: 19, born: 0, life: 5, tall: true  },
		{ x: 43, yBase: 54, driftX:  0.9, rise: 16, born: 0, life: 4, tall: false },
		{ x: 50, yBase: 55, driftX: -1.1, rise: 14, born: 0, life: 4, tall: true  },
		{ x: 17, yBase: 46, driftX:  1.0, rise: 20, born: 1, life: 5, tall: true  },
		{ x: 26, yBase: 45, driftX: -0.6, rise: 22, born: 1, life: 5, tall: false },
		{ x: 38, yBase: 45, driftX:  0.7, rise: 21, born: 1, life: 5, tall: true  },
		{ x: 47, yBase: 46, driftX: -1.0, rise: 19, born: 1, life: 5, tall: false },
		{ x: 22, yBase: 32, driftX:  0.8, rise: 21, born: 2, life: 4, tall: true  },
		{ x: 33, yBase: 30, driftX: -0.4, rise: 22, born: 2, life: 4, tall: true  },
		{ x: 42, yBase: 32, driftX: -0.8, rise: 20, born: 2, life: 4, tall: false },
		{ x: 20, yBase: 21, driftX:  0.7, rise: 13, born: 3, life: 3, tall: true  },
		{ x: 32, yBase: 19, driftX:  0.0, rise: 12, born: 3, life: 3, tall: false },
		{ x: 44, yBase: 21, driftX: -0.7, rise: 13, born: 3, life: 3, tall: true  },
	];

	// =========================================================================
	// REGISTER 4 ABSTRACT KYBERMON STATUS VFX
	// =========================================================================
	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];

	// -------------------------------------------------------------------------
	// 1. status_lock — Action Lock / Pause (Seamless 8-Frame Loop, Crossed X)
	// -------------------------------------------------------------------------
	window.KYBERMON_PIXEL_VFX.push({
		id: "status_lock",
		name: "Action Lock / Pause",
		category: "status",
		planeType: "crossed_x",
		materialPreset: "soft_transparent",
		playbackMode: "loop",
		gridCols: 4,
		gridRows: 2,
		frameCount: 8,
		pixelRes: 64,
		defaultFps: 10,
		combatRole: "status_enemy",
		hitFrame: -1,
		planeScale: [2.1, 2.2],
		planeOffsetY: 1.1,
		robloxOrientation: "CrossedMesh",
		exportFileName: "Kybermon_Gray_StatusLock_4x2_1024x512.png",
		covers: [
			"Cannot Basic/Skill/Ult/Move/Heal/Do Anything",
			"Pause Motion",
		],
		description: "Seamless 8-frame looping geometric constraint bands — two thin segmented angled lock rings & subtle vertical clamp brackets pulsing gently around the unit.",
		robloxPreset: {
			FlipbookLayout: "Grid4x2",
			FlipbookMode: "Loop",
			FlipbookFramerate: 10,
			LightEmission: 0.30,
			Orientation: "CrossedMesh",
		},
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const eng = getPE(PE);
			const S = eng.GRAY.SOFT_TRANSPARENT;
			const count = totalFrames || 8;
			pb.clear();

			// Exact periodic phase [0..1) so Frame 7 -> Frame 0 wraps seamlessly
			const u = ((frameIndex % count) + count) % count / count;
			const phase = u * Math.PI * 2;
			const breath = Math.sin(phase);            // -1 .. +1
			const pulse = 0.5 + 0.5 * breath;          // 0 .. 1
			const counterPulse = 0.5 + 0.5 * Math.cos(phase);

			// Dynamic gentle clamping contraction
			const rxMain = 23.0 - pulse * 1.1;
			const ryMain = 4.8 - pulse * 0.25;
			const cyUpper = 21.0 + breath * 0.6;
			const cyLower = 43.0 - breath * 0.6;

			const colTrack = eng.gray(142, Math.round(62 + pulse * 24));
			const colBack = eng.gray(172, Math.round(118 + pulse * 30));
			const colFront = eng.gray(224, Math.round(188 + pulse * 36));
			const colGlint = eng.gray(255, Math.round(226 + pulse * 24));
			const colRim = S.RIM;
			const colBracket = eng.gray(208, Math.round(166 + pulse * 42));
			const colNode = eng.gray(248, Math.round(200 + pulse * 46));
			const hotNode = pulse > 0.55;

			// 1. Subtle outer translucent lock-field ticks at top & bottom (keeps center open)
			const stabAlpha = Math.round(112 + counterPulse * 56);
			const colStab = eng.gray(196, stabAlpha);
			pb.drawLine(29, 9, 35, 9, colStab, 1, "none");
			pb.setPixel(32, 9, eng.gray(244, Math.min(242, stabAlpha + 48)));
			pb.drawLine(29, 54, 35, 54, colStab, 1, "none");
			pb.setPixel(32, 54, eng.gray(244, Math.min(242, stabAlpha + 48)));

			// 2. Four subtle vertical clamp brackets on left & right flanks (symmetric around cx=32, open center y=26..37)
			const xLeft = 10.4 + pulse * 1.25;
			const xRight = 53.6 - pulse * 1.25;
			drawClampBracket(pb, xLeft, 12, 24, -1, 4, cyUpper, colRim, colBracket, colNode, hotNode);
			drawClampBracket(pb, xRight, 12, 24, 1, 4, cyUpper, colRim, colBracket, colNode, hotNode);
			drawClampBracket(pb, xLeft, 39, 51, -1, 4, cyLower, colRim, colBracket, colNode, hotNode);
			drawClampBracket(pb, xRight, 39, 51, 1, 4, cyLower, colRim, colBracket, colNode, hotNode);

			// 3. Upper thin segmented angled lock ring (rotates smoothly by +1 segment per 8 frames)
			drawSegmentedEllipseBand(pb, {
				cx: 32,
				cy: cyUpper,
				rxOut: rxMain + 1.1,
				ryOut: ryMain + 0.9,
				rxIn: rxMain - 1.0,
				ryIn: ryMain - 0.8,
				rot: 0.085,
				segCount: 6,
				duty: 0.64,
				phaseOffset: u,
				colFront: colFront,
				colBack: colBack,
				colGlint: colGlint,
				ditherFront: "none",
				ditherBack: "bayer75",
				baseTrackCol: colTrack,
				baseTrackDither: "bayer50",
			});

			// 4. Lower thin segmented counter-angled lock ring (counter-rotates by -1 segment per 8 frames)
			drawSegmentedEllipseBand(pb, {
				cx: 32,
				cy: cyLower,
				rxOut: rxMain + 1.1,
				ryOut: ryMain + 0.9,
				rxIn: rxMain - 1.0,
				ryIn: ryMain - 0.8,
				rot: -0.085,
				segCount: 6,
				duty: 0.64,
				phaseOffset: -u + 0.5,
				colFront: colFront,
				colBack: colBack,
				colGlint: colGlint,
				ditherFront: "none",
				ditherBack: "bayer75",
				baseTrackCol: colTrack,
				baseTrackDither: "bayer50",
			});

			// 5. Crisp lock-node pins anchoring ring flanks (subtly pulsing inward on the beat)
			const pinOffset = Math.round(rxMain);
			const pinR = hotNode ? 1 : 0;
			const pinCol = hotNode ? S.CORE : S.BRIGHT;
			drawDiamond(pb, 32 - pinOffset, cyUpper - 1.5, pinR, pinCol, "none");
			drawDiamond(pb, 32 + pinOffset, cyUpper + 1.5, pinR, pinCol, "none");
			drawDiamond(pb, 32 - pinOffset, cyLower + 1.5, pinR, pinCol, "none");
			drawDiamond(pb, 32 + pinOffset, cyLower - 1.5, pinR, pinCol, "none");
		},
	});

	// -------------------------------------------------------------------------
	// 2. status_cancel — Action Cancel / Strip (8-Frame OneShot, Billboard)
	// -------------------------------------------------------------------------
	window.KYBERMON_PIXEL_VFX.push({
		id: "status_cancel",
		name: "Action Cancel / Strip",
		category: "status",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		gridCols: 4,
		gridRows: 2,
		frameCount: 8,
		pixelRes: 64,
		defaultFps: 14,
		combatRole: "status_enemy",
		hitFrame: 0,
		planeScale: [1.9, 1.9],
		planeOffsetY: 1.25,
		robloxOrientation: "FacingCamera",
		exportFileName: "Kybermon_Gray_StatusCancel_4x2_1024x512.png",
		covers: [
			"Cancel Basic/Skill/Ult/Move",
			"Remove Positive Effect",
		],
		description: "Crisp 8-frame instant interruption snap — sharp geometric X-slash & fractured diamond snapping across center at F0-F1, splitting cleanly apart across F2-F6, 0px at F7.",
		robloxPreset: {
			FlipbookLayout: "Grid4x2",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 14,
			LightEmission: 0.42,
			Orientation: "FacingCamera",
		},
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const eng = getPE(PE);
			const P = eng.GRAY.ALPHA_CRISP;
			pb.clear();

			const cx = 32;
			const cy = 32;
			const diag = Math.SQRT1_2;

			// Frame 7: Guaranteed 0px clean OneShot finish
			if (frameIndex >= 7) return;

			// FRAME 0 (hitFrame: 0): Instant X-slash & diamond lock-snap across center
			if (frameIndex === 0) {
				// Outer diamond containment flash
				pb.fillRegularPoly(cx, cy, 11.5, 4, 0, P.MID);
				pb.fillRegularPoly(cx, cy, 9.2, 4, 0, P.BRIGHT);

				// Crisp crossed diagonal razor-blades snapping simultaneously
				const rArm = 23.0;
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];
				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					drawTaperedBlade(pb, cx, cy, cx + dx * rArm, cy + dy * rArm, 3.6, 0.5, P.MID, "none");
					drawTaperedBlade(pb, cx, cy, cx + dx * (rArm - 1.5), cy + dy * (rArm - 1.5), 2.5, 0.4, P.BRIGHT, "none");
					drawTaperedBlade(pb, cx, cy, cx + dx * (rArm - 4.0), cy + dy * (rArm - 4.0), 1.5, 0.3, P.HOT, "none");
					drawTaperedBlade(pb, cx, cy, cx + dx * (rArm - 8.5), cy + dy * (rArm - 8.5), 0.9, 0.2, P.CORE, "none");
				}

				// White-hot snap core
				pb.fillRegularPoly(cx, cy, 6.2, 4, 0, P.HOT);
				pb.fillRegularPoly(cx, cy, 3.8, 4, 0, P.CORE);
				pb.addOutline(P.OUTLINE);

				// 4 crisp corner snap-ticks
				for (let i = 0; i < 4; i++) {
					const sx = cx + corners[i][0] * diag * 25.0;
					const sy = cy + corners[i][1] * diag * 25.0;
					pb.setPixel(sx, sy, P.HOT);
				}
				return;
			}

			// FRAME 1: Peak Snap & Clean Diagonal Fracture Seam splitting the diamond
			if (frameIndex === 1) {
				const rArm = 24.5;
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];

				// Expanding crisp diamond shock-frame
				pb.strokeRegularPoly(cx, cy, 16.5, 4, 0, P.MID, 1, "none");

				// 4 fractured diamond quadrants beginning to split from the X-seam
				for (let q = 0; q < 4; q++) {
					drawDiamondQuadrant(pb, cx, cy, 8.2, q, 2.2, 0.72, P.MID, "none");
					drawDiamondQuadrant(pb, cx, cy, 6.4, q, 2.5, 0.66, P.BRIGHT, "none");
					drawDiamondQuadrant(pb, cx, cy, 4.2, q, 2.9, 0.58, P.HOT, "none");
				}

				// Sharp full-span X-slash blades slicing right through the fracture seam
				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					drawTaperedBlade(pb, cx + dx * 1.4, cy + dy * 1.4, cx + dx * rArm, cy + dy * rArm, 2.8, 0.4, P.BRIGHT, "none");
					drawTaperedBlade(pb, cx + dx * 1.2, cy + dy * 1.2, cx + dx * (rArm - 3.0), cy + dy * (rArm - 3.0), 1.6, 0.25, P.HOT, "none");
					pb.drawLine(cx + dx * 1.5, cy + dy * 1.5, cx + dx * (rArm - 6.0), cy + dy * (rArm - 6.0), P.CORE, 1, "none");
				}

				// Tiny fracture center flash
				drawDiamond(pb, cx, cy, 2, P.CORE, "none");
				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 2: Clean Center Split — X-blades separate outward & 4 diamond shards recoil
			if (frameIndex === 2) {
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];

				// Expanding fractured diamond ring (thinned)
				pb.strokeRegularPoly(cx, cy, 20.5, 4, 0, P.DARK, 1, "bayer50");

				// 4 separated diamond quadrant shards moving cleanly along N/E/S/W
				for (let q = 0; q < 4; q++) {
					drawDiamondQuadrant(pb, cx, cy, 6.2, q, 6.6, 0.68, P.DARK, "none");
					drawDiamondQuadrant(pb, cx, cy, 4.7, q, 6.9, 0.60, P.BRIGHT, "none");
					drawDiamondQuadrant(pb, cx, cy, 2.7, q, 7.4, 0.50, P.HOT, "none");
				}

				// 4 split diagonal slash blades pulling cleanly away from center gap (r=6.4..24.8)
				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					const x0 = cx + dx * 6.4;
					const y0 = cy + dy * 6.4;
					const x1 = cx + dx * 24.8;
					const y1 = cy + dy * 24.8;
					drawTaperedBlade(pb, x0, y0, x1, y1, 1.9, 0.3, P.MID, "none");
					drawTaperedBlade(pb, x0 + dx * 1.0, y0 + dy * 1.0, x1 - dx * 3.0, y1 - dy * 3.0, 1.05, 0.2, P.BRIGHT, "none");
					pb.drawLine(x0 + dx * 1.5, y0 + dy * 1.5, x0 + dx * 10.5, y0 + dy * 10.5, P.HOT, 1, "none");
				}

				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 3: Mid Separation & Shear
			if (frameIndex === 3) {
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];

				// 4 diamond quadrant shards flying further outward & narrowing
				for (let q = 0; q < 4; q++) {
					drawDiamondQuadrant(pb, cx, cy, 5.2, q, 10.6, 0.65, P.DARK, "none");
					drawDiamondQuadrant(pb, cx, cy, 3.6, q, 11.0, 0.56, P.MID, "none");
					drawDiamondQuadrant(pb, cx, cy, 2.0, q, 11.5, 0.48, P.BRIGHT, "none");
				}

				// 4 diagonal blade tips sliding outward (r=11.5..25.5)
				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					drawTaperedBlade(pb, cx + dx * 11.5, cy + dy * 11.5, cx + dx * 25.5, cy + dy * 25.5, 1.55, 0.25, P.MID, "none");
					pb.drawLine(cx + dx * 12.5, cy + dy * 12.5, cx + dx * 22.5, cy + dy * 22.5, P.BRIGHT, 1, "none");
				}

				pb.addOutline(P.OUTLINE);

				// 4 tiny corner ring ticks at r=23
				pb.drawLine(cx - 2, cy - 23, cx + 2, cy - 23, P.DARK, 1, "bayer75");
				pb.drawLine(cx - 2, cy + 23, cx + 2, cy + 23, P.DARK, 1, "bayer75");
				pb.drawLine(cx - 23, cy - 2, cx - 23, cy + 2, P.DARK, 1, "bayer75");
				pb.drawLine(cx + 23, cy - 2, cx + 23, cy + 2, P.DARK, 1, "bayer75");
				return;
			}

			// FRAME 4: Dispersing Shards
			if (frameIndex === 4) {
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];

				for (let q = 0; q < 4; q++) {
					drawDiamondQuadrant(pb, cx, cy, 3.8, q, 14.8, 0.60, P.DARK, "none");
					drawDiamondQuadrant(pb, cx, cy, 2.3, q, 15.3, 0.50, P.BRIGHT, "none");
				}

				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					pb.drawLine(cx + dx * 16.5, cy + dy * 16.5, cx + dx * 24.5, cy + dy * 24.5, P.MID, 1, "none");
					pb.setPixel(cx + dx * 24.5, cy + dy * 24.5, P.BRIGHT);
				}

				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 5: Cooling Outer Fragments
			if (frameIndex === 5) {
				const corners = [
					[-1, -1],
					[ 1, -1],
					[ 1,  1],
					[-1,  1],
				];

				for (let q = 0; q < 4; q++) {
					drawDiamondQuadrant(pb, cx, cy, 2.4, q, 18.6, 0.58, P.DARK, "none");
					drawDiamondQuadrant(pb, cx, cy, 1.3, q, 19.0, 0.50, P.MID, "none");
				}

				pb.addOutline(P.SHADOW);

				for (let i = 0; i < 4; i++) {
					const dx = corners[i][0] * diag;
					const dy = corners[i][1] * diag;
					pb.drawLine(cx + dx * 20.5, cy + dy * 20.5, cx + dx * 24.2, cy + dy * 24.2, P.DARK, 1, "bayer75");
				}
				return;
			}

			// FRAME 6: Final Crisp Micro-Sparks before clean F7 vanish
			if (frameIndex === 6) {
				const dirs = [
					[0, -21.5],
					[21.5, 0],
					[0, 21.5],
					[-21.5, 0],
				];
				for (let q = 0; q < 4; q++) {
					const sx = cx + dirs[q][0];
					const sy = cy + dirs[q][1];
					pb.setPixel(sx, sy, P.MID);
					pb.setPixel(sx + (dirs[q][0] > 0 ? 1 : dirs[q][0] < 0 ? -1 : 0), sy + (dirs[q][1] > 0 ? 1 : dirs[q][1] < 0 ? -1 : 0), P.DARK);
				}
				const dOff = 24.0 * diag;
				pb.setPixel(cx - dOff, cy - dOff, P.DARK);
				pb.setPixel(cx + dOff, cy - dOff, P.DARK);
				pb.setPixel(cx + dOff, cy + dOff, P.DARK);
				pb.setPixel(cx - dOff, cy + dOff, P.DARK);
			}
		},
	});

	// -------------------------------------------------------------------------
	// 3. status_dot_tick — DOT / Anti-Heal Tick (8-Frame OneShot, Billboard)
	// -------------------------------------------------------------------------
	window.KYBERMON_PIXEL_VFX.push({
		id: "status_dot_tick",
		name: "DOT / Anti-Heal Tick",
		category: "status",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		gridCols: 4,
		gridRows: 2,
		frameCount: 8,
		pixelRes: 64,
		defaultFps: 14,
		combatRole: "status_enemy",
		hitFrame: 0,
		planeScale: [1.55, 1.55],
		planeOffsetY: 1.05,
		robloxOrientation: "FacingCamera",
		exportFileName: "Kybermon_Gray_StatusDotTick_4x2_1024x512.png",
		covers: [
			"1s DOT Tick",
			"Anti Heal Trigger",
		],
		description: "Compact 8-frame corrosive/damage tick pop at torso — tight inward-outward micro-burst ring + 6 small rising/popping pixel flecks that read cleanly without hiding the monster, 0px at F7.",
		robloxPreset: {
			FlipbookLayout: "Grid4x2",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 14,
			LightEmission: 0.38,
			Orientation: "FacingCamera",
		},
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const eng = getPE(PE);
			const P = eng.GRAY.ALPHA_CRISP;
			pb.clear();

			const cx = 32;
			const cy = 34;

			// Frame 7: Guaranteed 0px clean OneShot finish
			if (frameIndex >= 7) return;

			// Helper: draw the 6 deterministic rising/popping pixel flecks
			function drawFlecks(withOutline) {
				for (let i = 0; i < DOT_FLECKS.length; i++) {
					const f = DOT_FLECKS[i];
					const age = frameIndex - f.born;
					if (age < 0 || age > f.life) continue;
					const p = age / f.life;
					const riseT = eng.easeOutQuad(p);
					const x = f.x0 + f.vx * eng.easeOutCubic(p);
					const y = f.y0 + f.vy * riseT;

					// Crisp staggered micro-pop frame: splits briefly into a tight 2-pixel diagonal snap
					if (frameIndex === f.popAt) {
						const ix = Math.round(x);
						const iy = Math.round(y);
						pb.setPixel(ix - 1, iy - 1, f.bright ? P.HOT : P.BRIGHT);
						pb.setPixel(ix + 1, iy + 1, P.MID);
						pb.setPixel(ix + 1, iy - 1, P.DARK);
						continue;
					}

					if (age < f.life - 1) {
						if (f.size >= 1.9 && p < 0.45) {
							// Compact 2x2 crisp pixel pip (never blobs or crosses)
							pb.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2, f.bright ? P.BRIGHT : P.MID);
							pb.setPixel(Math.round(x), Math.round(y) - 1, f.bright ? P.CORE : P.HOT);
						} else {
							// Compact 1x2 rising fleck chip
							const ix = Math.round(x);
							const iy = Math.round(y);
							pb.setPixel(ix, iy, f.bright ? P.HOT : P.BRIGHT);
							pb.setPixel(ix, iy + 1, P.DARK);
						}
					} else {
						// Final fading 1px pixel fleck
						pb.setPixel(x, y, f.bright ? P.MID : P.DARK);
					}
				}
				if (withOutline) {
					pb.addOutline(P.OUTLINE);
				}
			}

			// FRAME 0 (hitFrame: 0): Tight Inward-Pinch Micro-Snap
			if (frameIndex === 0) {
				// Tight pinched micro-ring with crisp hollow center peek
				pb.fillRing(cx, cy, 9.4, 4.8, P.MID);
				pb.fillRing(cx, cy, 8.1, 5.7, P.BRIGHT);
				pb.fillRing(cx, cy, 7.2, 6.2, P.CORE);

				// Compact central flash diamond
				drawDiamond(pb, cx, cy, 2, P.HOT);
				pb.setPixel(cx, cy, P.CORE);

				// 4 sharp diagonal pinch-ticks snapping inward (45 deg diagonals — never a + cross)
				const diag = Math.SQRT1_2;
				const dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
				for (let i = 0; i < 4; i++) {
					const dx = dirs[i][0] * diag;
					const dy = dirs[i][1] * diag;
					pb.drawLine(cx + dx * 10.5, cy + dy * 10.5, cx + dx * 13.8, cy + dy * 13.8, P.HOT, 1, "none");
					pb.setPixel(cx + dx * 14.5, cy + dy * 14.5, P.MID);
				}

				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 1: Outward Micro-Burst Peak (hollow center keeps monster visible!) + Fleck Birth
			if (frameIndex === 1) {
				pb.fillRing(cx, cy, 13.4, 9.4, P.MID);
				pb.fillRing(cx, cy, 12.2, 10.2, P.HOT);
				pb.strokeCircle(cx, cy, 11.2, P.CORE, 1, "none");

				// 4 tiny diagonal burst thorns kicking off the ring
				const diag = Math.SQRT1_2;
				const dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
				for (let i = 0; i < 4; i++) {
					const dx = dirs[i][0] * diag;
					const dy = dirs[i][1] * diag;
					pb.fillNeedle(cx + dx * 16.5, cy + dy * 16.5, 4.0, 1.3, Math.atan2(dy, dx), P.BRIGHT);
				}

				drawFlecks(false);
				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 2: Compact Ring Breaks into 6 Crisp Arc Dashes + Flecks Rising
			if (frameIndex === 2) {
				drawSegmentedEllipseBand(pb, {
					cx: cx,
					cy: cy,
					rxOut: 16.2,
					ryOut: 16.2,
					rxIn: 13.6,
					ryIn: 13.6,
					rot: 0.25,
					segCount: 6,
					duty: 0.56,
					phaseOffset: 0.1,
					colFront: P.BRIGHT,
					colBack: P.MID,
					colGlint: P.HOT,
				});

				drawFlecks(false);
				pb.addOutline(P.OUTLINE);
				return;
			}

			// FRAME 3: Thin Outer Ring Ticks Dissipate + Rising Flecks Staggered Pop
			if (frameIndex === 3) {
				drawSegmentedEllipseBand(pb, {
					cx: cx,
					cy: cy,
					rxOut: 18.2,
					ryOut: 18.2,
					rxIn: 16.9,
					ryIn: 16.9,
					rot: 0.42,
					segCount: 6,
					duty: 0.34,
					phaseOffset: 0.18,
					colFront: P.MID,
					colBack: P.DARK,
					ditherFront: "bayer75",
					ditherBack: "bayer75",
				});

				drawFlecks(true);
				return;
			}

			// FRAME 4: Ring Gone — Clean Open Torso with Rising/Popping Flecks
			if (frameIndex === 4) {
				drawFlecks(true);
				return;
			}

			// FRAME 5: Upper Flecks Contracting & Popping
			if (frameIndex === 5) {
				drawFlecks(false);
				pb.addOutline(P.SHADOW);
				return;
			}

			// FRAME 6: Final 3 Tiny Rising Micro-Flecks Vanishing Cleanly
			if (frameIndex === 6) {
				drawFlecks(false);
			}
		},
	});

	// -------------------------------------------------------------------------
	// 4. status_cleanse — Purify / Cleanse (8-Frame OneShot, Crossed X)
	// -------------------------------------------------------------------------
	window.KYBERMON_PIXEL_VFX.push({
		id: "status_cleanse",
		name: "Purify / Cleanse",
		category: "status",
		planeType: "crossed_x",
		materialPreset: "soft_transparent",
		playbackMode: "oneshot",
		gridCols: 4,
		gridRows: 2,
		frameCount: 8,
		pixelRes: 64,
		defaultFps: 14,
		combatRole: "status_ally",
		hitFrame: 1,
		planeScale: [2.2, 2.5],
		planeOffsetY: 1.2,
		robloxOrientation: "CrossedMesh",
		exportFileName: "Kybermon_Gray_StatusCleanse_4x2_1024x512.png",
		covers: [
			"Remove Negative Effects",
			"Immune All Negative",
		],
		description: "Crisp 8-frame upward purifying wave — clean bright horizontal ring + delicate spark curtain sweeping smoothly from base (y=56) to crown (y=8) and vanishing cleanly to 0px at F7 (no medical cross).",
		robloxPreset: {
			FlipbookLayout: "Grid4x2",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 14,
			LightEmission: 0.40,
			Orientation: "CrossedMesh",
		},
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const eng = getPE(PE);
			const S = eng.GRAY.SOFT_TRANSPARENT;
			pb.clear();

			// Frame 7: Guaranteed 0px clean OneShot finish
			if (frameIndex >= 7) return;

			// Exact vertical wave sweep progression from base (y=56) to crown (y=8) across F0..F6
			const sweepY  = [56.0, 47.0, 37.0, 27.0, 18.0, 11.5, 8.0];
			const sweepRx = [20.5, 23.8, 24.6, 23.4, 20.4, 15.8, 10.5];
			const sweepRy = [ 2.8,  3.5,  3.8,  3.5,  3.0,  2.3,  1.5];
			const curtainLen = [4, 10, 13, 12, 9, 5, 0];

			const cx = 32;
			const cy = sweepY[frameIndex];
			const rx = sweepRx[frameIndex];
			const ry = sweepRy[frameIndex];
			const tailH = curtainLen[frameIndex];

			// 1. Delicate trailing vertical purifying shimmer curtain beneath the rising ring (F0..F5)
			if (tailH > 0) {
				const strandCount = frameIndex <= 3 ? 9 : 7;
				for (let s = 0; s < strandCount; s++) {
					const frac = (s + 0.5) / strandCount; // 0..1 across ring width
					const normX = frac * 2 - 1;           // -1..+1
					const sx = Math.round(cx + normX * (rx * 0.86));
					const arcDrop = Math.sqrt(Math.max(0, 1 - normX * normX)) * ry;
					const startY = Math.round(cy + arcDrop);
					const localLen = Math.round(tailH * (0.55 + 0.45 * eng.hash01(s * 17.3 + frameIndex * 3.1)));
					const endY = Math.min(59, startY + localLen);

					for (let y = startY; y <= endY; y++) {
						const t = (y - startY) / Math.max(1, endY - startY);
						if (t < 0.35) {
							pb.setPixel(sx, y, S.SOFT, "bayer75");
						} else if (t < 0.72) {
							pb.setPixel(sx, y, S.FAINT, "bayer50");
						} else {
							pb.setPixel(sx, y, S.FAINT, "bayer25");
						}
					}
				}
			}

			// 2. Main clean bright horizontal purifying wave ring
			if (frameIndex <= 4) {
				const peakBoost = frameIndex === 1 || frameIndex === 2 ? 1.0 : 0.85;

				// Soft translucent outer halo band (also carries RIM tint separation for Black element)
				pb.fillEllipseRing(
					cx,
					cy + 0.5,
					rx + 1.4,
					ry + 1.2,
					Math.max(1.0, rx - 1.6),
					Math.max(0.6, ry - 1.2),
					0,
					eng.gray(128, Math.round(115 * peakBoost)),
					"bayer75"
				);

				// Mid luminous horizontal wave body
				pb.fillEllipseRing(
					cx,
					cy,
					rx + 0.6,
					ry + 0.5,
					Math.max(0.8, rx - 1.1),
					Math.max(0.4, ry - 0.8),
					0,
					S.MID,
					"none"
				);

				// Crisp bright upper/front crest of the wave ring
				drawSegmentedEllipseBand(pb, {
					cx: cx,
					cy: cy,
					rxOut: rx + 0.2,
					ryOut: ry + 0.15,
					rxIn: Math.max(0.6, rx - 0.9),
					ryIn: Math.max(0.3, ry - 0.7),
					rot: 0,
					segCount: 4,
					duty: 0.86,
					phaseOffset: frameIndex * 0.125,
					colFront: S.CORE,
					colBack: S.BRIGHT,
					colGlint: S.CORE,
					ditherFront: "none",
					ditherBack: "bayer75",
				});
			} else if (frameIndex === 5) {
				// F5: Crown arrival — opening cleanly into delicate luminous arc segments
				drawSegmentedEllipseBand(pb, {
					cx: cx,
					cy: cy,
					rxOut: rx + 0.6,
					ryOut: ry + 0.5,
					rxIn: Math.max(0.5, rx - 0.9),
					ryIn: Math.max(0.3, ry - 0.7),
					rot: 0,
					segCount: 6,
					duty: 0.62,
					phaseOffset: 0.15,
					colFront: S.BRIGHT,
					colBack: S.SOFT,
					colGlint: S.CORE,
					ditherFront: "none",
					ditherBack: "bayer50",
				});
			} else if (frameIndex === 6) {
				// F6: Crown wisp at y=8 dissolving smoothly
				drawSegmentedEllipseBand(pb, {
					cx: cx,
					cy: cy,
					rxOut: rx + 0.4,
					ryOut: ry + 0.4,
					rxIn: Math.max(0.5, rx - 0.6),
					ryIn: Math.max(0.2, ry - 0.5),
					rot: 0,
					segCount: 6,
					duty: 0.42,
					phaseOffset: 0.28,
					colFront: S.SOFT,
					colBack: S.FAINT,
					ditherFront: "bayer50",
					ditherBack: "bayer25",
				});
			}

			// 3. Delicate rising spark curtain motes (strictly abstract 1px / 1x2 / micro-diamond — NO crosses!)
			for (let i = 0; i < CLEANSE_SPARKS.length; i++) {
				const sp = CLEANSE_SPARKS[i];
				const age = frameIndex - sp.born;
				if (age < 0 || age > sp.life) continue;
				const p = age / sp.life;
				const sx = Math.round(sp.x + sp.driftX * p);
				const sy = Math.round(sp.yBase - sp.rise * eng.easeOutQuad(p));
				if (sy < 5 || sy > 59) continue;

				if (p < 0.35) {
					// Bright newly-lifted mote
					pb.setPixel(sx, sy, S.CORE);
					if (sp.tall && sy + 1 <= 59) {
						pb.setPixel(sx, sy + 1, S.MID);
					}
				} else if (p < 0.75) {
					// Mid-ascent luminous vertical shimmer dash
					pb.setPixel(sx, sy, S.BRIGHT);
					if (sp.tall && sy + 1 <= 59) {
						pb.setPixel(sx, sy + 1, S.SOFT, "bayer75");
					}
				} else {
					// Gentle dissolving 1px crown spark
					pb.setPixel(sx, sy, S.SOFT, "bayer75");
				}
			}
		},
	});
})();
