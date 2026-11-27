// Kybermon Pixel VFX 3D Studio — Area & World Pack (6 Universal Grayscale VFX)
// 100% file:/// compatible classic IIFE <script> pushing to window.KYBERMON_PIXEL_VFX.
// All 6 VFX: 64x64 integer pixel-art, 4x4 (16-frame) OneShot, strict 2px Roblox UV margin [2..61],
// universal grayscale palettes (safe for Red, Green, Blue, Black, White tinting), F15 === 0px.

(function () {
	"use strict";

	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];

	// =========================================================================
	// SHARED GEOMETRY & PIXEL-ART HELPERS
	// =========================================================================

	function polar(cx, cy, r, angle) {
		return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
	}

	// Crisp 1-3px angular diamond/spark glint (never blurry)
	function drawSpark(pb, cx, cy, size, col, ditherMode) {
		const ix = Math.round(cx);
		const iy = Math.round(cy);
		const d = ditherMode || "none";
		if (size < 0.45) return;
		if (size < 1.15) {
			pb.setPixel(ix, iy, col, d);
			return;
		}
		if (size < 1.85) {
			pb.setPixel(ix, iy, col, d);
			pb.setPixel(ix - 1, iy, col, d);
			pb.setPixel(ix + 1, iy, col, d);
			pb.setPixel(ix, iy - 1, col, d);
			pb.setPixel(ix, iy + 1, col, d);
			return;
		}
		pb.fillRegularPoly(cx, cy, size, 4, 0, col, d);
	}

	// Tapered quadratic Bezier ribbon (for clean pixel splash tendrils)
	function drawTaperedCurve(pb, x0, y0, x1, y1, x2, y2, wStart, wMid, wEnd, segs, col, ditherMode) {
		const n = Math.max(3, segs || 7);
		const pts = [];
		const widths = [];
		for (let i = 0; i <= n; i++) {
			const u = i / n;
			const inv = 1 - u;
			const px = inv * inv * x0 + 2 * inv * u * x1 + u * u * x2;
			const py = inv * inv * y0 + 2 * inv * u * y1 + u * u * y2;
			pts.push([px, py]);
			const w = u < 0.5
				? wStart + (wMid - wStart) * (u * 2)
				: wMid + (wEnd - wMid) * ((u - 0.5) * 2);
			widths.push(Math.max(0.45, w));
		}

		for (let i = 0; i < n; i++) {
			const a = pts[i];
			const b = pts[i + 1];
			const dx = b[0] - a[0];
			const dy = b[1] - a[1];
			const len = Math.hypot(dx, dy);
			if (len < 0.01) continue;
			const nx = -dy / len;
			const ny = dx / len;
			const wa = widths[i] * 0.5;
			const wb = widths[i + 1] * 0.5;

			const aL = [a[0] + nx * wa, a[1] + ny * wa];
			const aR = [a[0] - nx * wa, a[1] - ny * wa];
			const bL = [b[0] + nx * wb, b[1] + ny * wb];
			const bR = [b[0] - nx * wb, b[1] - ny * wb];

			pb.fillTriangle(aL[0], aL[1], aR[0], aR[1], bR[0], bR[1], col, ditherMode);
			pb.fillTriangle(aL[0], aL[1], bR[0], bR[1], bL[0], bL[1], col, ditherMode);
			if (wa <= 0.75 && wb <= 0.75) {
				pb.drawLine(a[0], a[1], b[0], b[1], col, 1, ditherMode);
			}
		}
	}

	// Faceted 2/3-tone angular pixel rock polygon (lit upper-left, shaded lower-right)
	function drawFacetedRock(pb, cx, cy, r, angle, facetRadii, P, coolFactor, ditherMode) {
		if (r < 0.7) return;
		const d = ditherMode || "none";
		const sides = facetRadii.length;

		// Small pebble fallback (< 2.1px)
		if (r < 2.1) {
			const cMain = coolFactor > 0.65 ? P.DARK : P.MID;
			const cLit = coolFactor > 0.65 ? P.MID : P.BRIGHT;
			pb.fillRegularPoly(cx, cy, r, 4, angle, cMain, d);
			pb.setPixel(cx - 0.5, cy - 0.5, cLit, d);
			return;
		}

		const verts = [];
		for (let i = 0; i < sides; i++) {
			const a = angle + (i * Math.PI * 2) / sides;
			const vr = r * facetRadii[i];
			verts.push([cx + Math.cos(a) * vr, cy + Math.sin(a) * vr]);
		}

		// Light vector from upper-left (-0.68, -0.73)
		const lx = -0.68;
		const ly = -0.73;

		const colHot = coolFactor < 0.35 ? P.HOT : P.BRIGHT;
		const colLit = coolFactor < 0.55 ? P.BRIGHT : P.MID;
		const colMid = coolFactor < 0.55 ? P.MID : P.DARK;
		const colShd = coolFactor < 0.70 ? P.SHADOW : P.DARK;

		for (let i = 0; i < sides; i++) {
			const v0 = verts[i];
			const v1 = verts[(i + 1) % sides];
			const mx = (v0[0] + v1[0]) * 0.5 - cx;
			const my = (v0[1] + v1[1]) * 0.5 - cy;
			const mlen = Math.hypot(mx, my) || 1;
			const dot = (mx / mlen) * lx + (my / mlen) * ly;

			let faceCol = colShd;
			if (dot > 0.42) faceCol = colHot;
			else if (dot > 0.05) faceCol = colLit;
			else if (dot > -0.35) faceCol = colMid;

			pb.fillTriangle(cx, cy, v0[0], v0[1], v1[0], v1[1], faceCol, d);
		}

		// Crisp inner bevel pixel toward light side on larger rocks
		if (r >= 3.2 && d === "none") {
			pb.setPixel(cx - r * 0.28, cy - r * 0.28, coolFactor < 0.45 ? P.CORE : P.HOT);
		}
	}

	// =========================================================================
	// 1. pulse — Radial Pulse (ground_xz, soft_transparent, oneshot)
	// =========================================================================
	const PULSE_PIPS = [
		{ angle: 0.15,  rOff: -2.2, speed: 0.94, born: 1, life: 9 },
		{ angle: 0.92,  rOff: -1.8, speed: 0.98, born: 1, life: 10 },
		{ angle: 1.72,  rOff: -2.6, speed: 0.92, born: 2, life: 9 },
		{ angle: 2.48,  rOff: -2.0, speed: 0.96, born: 1, life: 10 },
		{ angle: 3.32,  rOff: -2.3, speed: 0.93, born: 2, life: 9 },
		{ angle: 4.10,  rOff: -1.7, speed: 0.97, born: 1, life: 10 },
		{ angle: 4.86,  rOff: -2.5, speed: 0.91, born: 2, life: 9 },
		{ angle: 5.64,  rOff: -1.9, speed: 0.95, born: 1, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "pulse",
		name: "Radial Pulse",
		category: "world",
		planeType: "ground_xz",
		materialPreset: "soft_transparent",
		playbackMode: "oneshot",
		combatRole: "world_burst",
		hitFrame: 0,
		planeScale: [3.2, 3.2],
		planeOffsetY: 0.05,
		robloxOrientation: "FloorPart",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Grayscale_World_RadialPulse_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.80",
			LightEmission: 0.45,
			Orientation: "FloorPart",
		},
		description: "Clean concentric expanding ground shockwave ring (r 5 -> 28) with inner echo ring and smooth Bayer dither fade to 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const S = E.GRAY.SOFT_TRANSPARENT;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const cx = 31.5;
			const cy = 31.5;
			const t = frameIndex / 14; // 0..1 across F0..F14
			const rMain = E.lerp(5.0, 27.6, E.easeOutCubic(t));

			// Frame 0: Instant contact center flash + tight r=5 ring + 4 micro cardinal ticks
			if (frameIndex === 0) {
				pb.fillCircle(cx, cy, 7.6, S.SOFT, "bayer75");
				pb.fillCircle(cx, cy, 6.2, S.MID);
				pb.fillCircle(cx, cy, 5.0, S.BRIGHT);
				pb.fillCircle(cx, cy, 3.4, S.CORE);
				pb.strokeCircle(cx, cy, 5.2, S.CORE, 1.4);
				for (let k = 0; k < 4; k++) {
					const a = (k * Math.PI) / 2;
					const p0 = polar(cx, cy, 7.2, a);
					const p1 = polar(cx, cy, 10.2, a);
					pb.drawLine(p0[0], p0[1], p1[0], p1[1], S.BRIGHT, 1);
				}
				return;
			}

			// Determine main ring thickness & Bayer dissipation stage
			const thick = E.lerp(3.8, 1.3, E.easeOutQuad(t));
			const rOut = Math.min(28.0, rMain + thick * 0.5);
			const rIn = Math.max(1.5, rMain - thick * 0.5);

			let mainDither = "none";
			let outerDither = "none";
			if (frameIndex >= 14) {
				mainDither = "bayer12";
				outerDither = "bayer12";
			} else if (frameIndex === 13) {
				mainDither = "bayer25";
				outerDither = "bayer25";
			} else if (frameIndex === 12) {
				mainDither = "bayer50";
				outerDither = "bayer25";
			} else if (frameIndex === 11) {
				mainDither = "bayer75";
				outerDither = "bayer50";
			} else if (frameIndex >= 8) {
				outerDither = "bayer50";
			} else if (frameIndex >= 5) {
				outerDither = "bayer75";
			}

			// Soft outer halo rim (stays <= 28.5 so strictly inside [3..60])
			if (frameIndex <= 11) {
				const haloOut = Math.min(28.6, rOut + 1.2);
				const haloCol = frameIndex <= 5 ? S.RIM : S.FAINT;
				pb.fillRing(cx, cy, haloOut, Math.max(0.5, rIn - 0.8), haloCol, outerDither);
			}

			// Primary shockwave band
			let bodyCol = S.BRIGHT;
			if (frameIndex >= 13) bodyCol = S.FAINT;
			else if (frameIndex >= 11) bodyCol = S.SOFT;
			else if (frameIndex >= 8) bodyCol = S.MID;

			pb.fillRing(cx, cy, rOut, rIn, bodyCol, mainDither);

			// Crisp luminous leading crest on F1..F9
			if (frameIndex <= 9) {
				const crestCol = frameIndex <= 3 ? S.CORE : (frameIndex <= 6 ? S.BRIGHT : S.MID);
				const crestDither = frameIndex >= 7 ? "bayer75" : "none";
				const crestThick = frameIndex <= 3 ? 1.5 : 1.0;
				pb.fillRing(cx, cy, rOut - 0.1, Math.max(rIn, rOut - crestThick), crestCol, crestDither);
			}

			// Brief fading center floor wash on F1..F2 only
			if (frameIndex === 1) {
				pb.fillCircle(cx, cy, 4.2, S.SOFT, "bayer50");
				pb.fillCircle(cx, cy, 2.2, S.BRIGHT, "bayer75");
			} else if (frameIndex === 2) {
				pb.fillCircle(cx, cy, 3.0, S.FAINT, "bayer25");
			}

			// Inner echo ring (F2..F12): clean concentric secondary pulse
			if (frameIndex >= 2 && frameIndex <= 12) {
				const te = (frameIndex - 2) / 10;
				const rEcho = E.lerp(4.2, 20.6, E.easeOutQuad(te));
				const echoThick = E.lerp(2.2, 1.0, te);
				let echoDither = "none";
				let echoCol = S.BRIGHT;
				if (frameIndex >= 11) {
					echoDither = "bayer25";
					echoCol = S.FAINT;
				} else if (frameIndex >= 9) {
					echoDither = "bayer50";
					echoCol = S.SOFT;
				} else if (frameIndex >= 7) {
					echoDither = "bayer75";
					echoCol = S.MID;
				} else if (frameIndex >= 5) {
					echoCol = S.MID;
				}
				pb.strokeCircle(cx, cy, rEcho, echoCol, echoThick, echoDither);
				if (frameIndex <= 4) {
					pb.strokeCircle(cx, cy, rEcho, S.CORE, 0.9, "bayer75");
				}
			}

			// Trailing floor pressure micro-pips inside the shockwave crest
			for (let i = 0; i < PULSE_PIPS.length; i++) {
				const pip = PULSE_PIPS[i];
				const age = frameIndex - pip.born;
				if (age < 0 || age > pip.life) continue;
				const p = age / pip.life;
				const pr = Math.min(26.5, rMain * pip.speed + pip.rOff);
				if (pr < 3) continue;
				const pos = polar(cx, cy, pr, pip.angle + p * 0.08);
				const col = p < 0.35 ? S.BRIGHT : (p < 0.7 ? S.MID : S.SOFT);
				const dit = p > 0.72 ? "bayer50" : "none";
				pb.setPixel(pos[0], pos[1], col, dit);
				if (p < 0.45 && i % 2 === 0) {
					const tail = polar(cx, cy, pr - 1.4, pip.angle + p * 0.08);
					pb.setPixel(tail[0], tail[1], S.SOFT, "bayer75");
				}
			}
		},
	});

	// =========================================================================
	// 2. nova_explode — Nova Burst (billboard, alpha_crisp, oneshot)
	// =========================================================================
	const NOVA_CHUNKS = [
		{ a: -2.72, r0: 6.5, dist: 19.5, sz: 3.5, spin:  2.8, born: 1, life: 12, hot: true  },
		{ a: -2.05, r0: 7.0, dist: 17.0, sz: 2.9, spin: -3.2, born: 1, life: 11, hot: false },
		{ a: -1.32, r0: 6.0, dist: 20.5, sz: 3.6, spin:  2.4, born: 1, life: 13, hot: true  },
		{ a: -0.62, r0: 7.2, dist: 18.0, sz: 3.1, spin: -2.9, born: 1, life: 12, hot: true  },
		{ a:  0.14, r0: 6.5, dist: 20.0, sz: 3.4, spin:  3.4, born: 1, life: 13, hot: false },
		{ a:  0.86, r0: 7.0, dist: 17.5, sz: 3.0, spin: -2.5, born: 1, life: 11, hot: true  },
		{ a:  1.58, r0: 6.2, dist: 20.2, sz: 3.5, spin:  2.7, born: 1, life: 12, hot: true  },
		{ a:  2.36, r0: 7.4, dist: 18.2, sz: 2.8, spin: -3.5, born: 1, life: 11, hot: false },
		// Secondary inner-ring fragments
		{ a: -2.38, r0: 5.0, dist: 15.0, sz: 2.4, spin:  3.8, born: 2, life: 11, hot: true  },
		{ a: -0.95, r0: 5.5, dist: 15.8, sz: 2.5, spin: -3.1, born: 2, life: 12, hot: false },
		{ a:  0.52, r0: 5.2, dist: 16.2, sz: 2.3, spin:  4.0, born: 2, life: 11, hot: true  },
		{ a:  1.98, r0: 5.4, dist: 15.4, sz: 2.5, spin: -3.6, born: 2, life: 12, hot: true  },
	];

	const NOVA_SPARKS = [
		{ a: -2.98, r0: 9,  dist: 17.5, born: 1, life: 13 },
		{ a: -1.68, r0: 10, dist: 16.5, born: 1, life: 12 },
		{ a: -0.24, r0: 9,  dist: 17.0, born: 1, life: 13 },
		{ a:  1.20, r0: 10, dist: 16.8, born: 2, life: 12 },
		{ a:  2.72, r0: 9,  dist: 17.2, born: 2, life: 12 },
		{ a: -0.82, r0: 8,  dist: 14.0, born: 3, life: 10 },
		{ a:  2.14, r0: 8,  dist: 13.8, born: 3, life: 10 },
		{ a: -2.18, r0: 7,  dist: 14.5, born: 3, life: 11 },
	];

	function drawNovaChunks(pb, P, E, frameIndex, pass) {
		const cx = 31.5;
		const cy = 31.5;
		for (let i = 0; i < NOVA_CHUNKS.length; i++) {
			const c = NOVA_CHUNKS[i];
			const age = frameIndex - c.born;
			if (age < 0 || age > c.life) continue;
			const p = age / c.life;
			const r = c.r0 + c.dist * E.easeOutCubic(p);
			const pos = polar(cx, cy, r, c.a);
			const sz = c.sz * (1 - E.easeInQuad(p) * 0.78);
			const isSmall = sz < 1.85 || p > 0.72;
			if (pass === "large" && isSmall) continue;
			if (pass === "small" && !isSmall) continue;

			const rot = c.a + c.spin * p;
			let col = P.BRIGHT;
			if (p < 0.25) col = c.hot ? P.HOT : P.BRIGHT;
			else if (p < 0.58) col = c.hot ? P.BRIGHT : P.MID;
			else if (p < 0.82) col = c.hot ? P.MID : P.DARK;
			else col = P.DARK;

			let dit = "none";
			if (p > 0.85) dit = "bayer25";
			else if (p > 0.70) dit = "bayer50";
			else if (p > 0.56) dit = "bayer75";

			if (sz >= 1.65) {
				pb.fillIsoTriangle(pos[0], pos[1], sz, rot, 1.45, col, dit, 0.62);
				if (sz >= 2.25 && p < 0.55) {
					pb.fillIsoTriangle(pos[0], pos[1], sz * 0.52, rot, 1.35, p < 0.25 ? P.CORE : P.HOT, "none", 0.52);
				}
			} else {
				drawSpark(pb, pos[0], pos[1], sz, p > 0.82 ? P.MID : col, dit);
			}
		}
	}

	window.KYBERMON_PIXEL_VFX.push({
		id: "nova_explode",
		name: "Nova Burst",
		category: "world",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "world_burst",
		secondaryVfxId: "pulse",
		hitFrame: 0,
		planeScale: [2.8, 2.8],
		planeOffsetY: 1.2,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Grayscale_World_NovaBurst_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.80",
			LightEmission: 0.45,
			Orientation: "FacingCamera",
		},
		description: "Instant-contact 360-degree spherical burst: F0 blinding core + 8 radial rays -> F1-F3 expanding double blast ring + fracturing energy chunks -> F4-F14 tumbling fragments & crisp dither dissolve -> 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const cx = 31.5;
			const cy = 31.5;

			// FRAME 0: Instant blinding core + 8 radial starburst rays + tight pressure ring
			if (frameIndex === 0) {
				const baseAngle = -0.22;
				for (let i = 0; i < 8; i++) {
					const a = baseAngle + (i * Math.PI) / 4;
					const major = i % 2 === 0;
					const len = major ? 24.5 : 16.5;
					const w = major ? 3.2 : 2.3;
					const tip = polar(cx, cy, len, a);
					pb.fillNeedle(tip[0], tip[1], len * 0.88, w, a, P.MID);
					const tipB = polar(cx, cy, len * 0.86, a);
					pb.fillNeedle(tipB[0], tipB[1], len * 0.78, w * 0.72, a, P.BRIGHT);
					const tipH = polar(cx, cy, len * 0.68, a);
					pb.fillNeedle(tipH[0], tipH[1], len * 0.64, w * 0.48, a, P.HOT);
				}

				pb.fillRing(cx, cy, 13.6, 11.4, P.BRIGHT);
				pb.fillCircle(cx, cy, 10.6, P.BRIGHT);
				pb.fillCircle(cx, cy, 8.6, P.HOT);
				pb.fillCircle(cx, cy, 6.4, P.CORE);

				pb.addOutline(P.OUTLINE);

				// Re-stamp blazing inner core & cardinal spears cleanly
				pb.fillCircle(cx, cy, 5.2, P.CORE);
				for (let i = 0; i < 4; i++) {
					const a = baseAngle + (i * Math.PI) / 2;
					const pEnd = polar(cx, cy, 15.0, a);
					pb.drawLine(cx, cy, pEnd[0], pEnd[1], P.CORE, 1);
				}
				return;
			}

			// FRAME 1: Expanding double blast ring + radial burst spikes + emerging chunks
			if (frameIndex === 1) {
				// Outer blast ring
				pb.fillRing(cx, cy, 19.6, 15.2, P.MID);
				pb.fillRing(cx, cy, 18.8, 15.8, P.BRIGHT);
				pb.fillRing(cx, cy, 17.8, 16.2, P.HOT);

				// 8 short outer ray tips breaking off outer ring
				for (let i = 0; i < 8; i++) {
					const a = -0.22 + (i * Math.PI) / 4;
					const tip = polar(cx, cy, i % 2 === 0 ? 25.4 : 22.8, a);
					pb.fillNeedle(tip[0], tip[1], i % 2 === 0 ? 7.0 : 4.8, 1.8, a, i % 2 === 0 ? P.HOT : P.BRIGHT);
				}

				// Inner blast ring + hollowing core flash
				pb.fillRing(cx, cy, 11.4, 8.8, P.HOT);
				pb.fillRing(cx, cy, 10.6, 9.4, P.CORE);
				pb.fillCircle(cx, cy, 5.4, P.HOT, "bayer75");
				pb.fillCircle(cx, cy, 3.2, P.CORE);

				drawNovaChunks(pb, P, E, frameIndex, "large");
				pb.addOutline(P.OUTLINE);
				drawNovaChunks(pb, P, E, frameIndex, "small");
				return;
			}

			// FRAME 2: Double ring begins fracturing into crisp segments + chunks accelerating out
			if (frameIndex === 2) {
				const segCount = 6;
				for (let k = 0; k < segCount; k++) {
					const a0 = -0.15 + (k * Math.PI * 2) / segCount;
					const a1 = a0 + 0.74;
					pb.fillArcBand(cx, cy, 19.8, 23.0, a0, a1, 5, P.MID, "none", true);
					pb.fillArcBand(cx, cy, 20.4, 22.4, a0 + 0.06, a1 - 0.06, 5, P.BRIGHT, "none", true);
					pb.fillArcBand(cx, cy, 21.0, 21.9, a0 + 0.14, a1 - 0.14, 4, P.HOT, "none", true);
				}
				// Inner fracturing ring
				for (let k = 0; k < 6; k++) {
					const a0 = 0.25 + (k * Math.PI * 2) / 6;
					const a1 = a0 + 0.62;
					pb.fillArcBand(cx, cy, 13.0, 15.1, a0, a1, 4, P.BRIGHT, "none", true);
					pb.fillArcBand(cx, cy, 13.6, 14.5, a0 + 0.10, a1 - 0.10, 3, P.CORE, "none", true);
				}
				// Fading center spark cross
				drawSpark(pb, cx, cy, 2.5, P.HOT, "bayer50");

				drawNovaChunks(pb, P, E, frameIndex, "large");
				pb.addOutline(P.OUTLINE);
				drawNovaChunks(pb, P, E, frameIndex, "small");
			} else if (frameIndex === 3) {
				// FRAME 3: Fracturing rings separate cleanly + chunks lead outward
				for (let k = 0; k < 6; k++) {
					const a0 = -0.05 + (k * Math.PI * 2) / 6;
					const a1 = a0 + 0.56;
					pb.fillArcBand(cx, cy, 22.8, 25.0, a0, a1, 4, P.DARK, "bayer75", true);
					pb.fillArcBand(cx, cy, 23.4, 24.6, a0 + 0.08, a1 - 0.08, 4, P.MID, "none", true);
				}
				for (let k = 0; k < 6; k++) {
					const a0 = 0.34 + (k * Math.PI * 2) / 6;
					const a1 = a0 + 0.44;
					pb.fillArcBand(cx, cy, 16.4, 17.9, a0, a1, 3, P.MID, "bayer75", true);
				}
				drawNovaChunks(pb, P, E, frameIndex, "large");
				pb.addOutline(P.OUTLINE);
				drawNovaChunks(pb, P, E, frameIndex, "small");
			} else if (frameIndex === 4 || frameIndex === 5) {
				// FRAMES 4-5: Residual ring fragments dither out; tumbling chunks dominate
				const outerR = frameIndex === 4 ? 25.8 : 26.8;
				const ringDit = frameIndex === 4 ? "bayer50" : "bayer25";
				for (let k = 0; k < 6; k++) {
					const a0 = 0.06 + (k * Math.PI * 2) / 6;
					const a1 = a0 + (frameIndex === 4 ? 0.38 : 0.24);
					pb.fillArcBand(cx, cy, outerR - 0.9, outerR + 0.7, a0, a1, 3, P.DARK, ringDit, true);
				}
				if (frameIndex === 4) {
					for (let k = 0; k < 6; k++) {
						const a0 = 0.42 + (k * Math.PI * 2) / 6;
						pb.fillArcBand(cx, cy, 19.2, 20.3, a0, a0 + 0.26, 3, P.DARK, "bayer50", true);
					}
				}
				drawNovaChunks(pb, P, E, frameIndex, "large");
				pb.addOutline(P.OUTLINE);
				drawNovaChunks(pb, P, E, frameIndex, "small");
			} else {
				// FRAMES 6-14: Tumbling fragments & crisp dither dissolve
				drawNovaChunks(pb, P, E, frameIndex, "large");
				if (frameIndex <= 9) {
					pb.addOutline(P.OUTLINE);
				}
				drawNovaChunks(pb, P, E, frameIndex, "small");
			}

			// Crisp radial sparks across F1..F14
			for (let i = 0; i < NOVA_SPARKS.length; i++) {
				const sp = NOVA_SPARKS[i];
				const age = frameIndex - sp.born;
				if (age < 0 || age > sp.life) continue;
				const p = age / sp.life;
				const r = Math.min(27.5, sp.r0 + sp.dist * E.easeOutCubic(p));
				const pos = polar(cx, cy, r, sp.a);
				const col = p < 0.30 ? P.CORE : (p < 0.62 ? P.HOT : (p < 0.84 ? P.BRIGHT : P.MID));
				const dit = p > 0.82 ? "bayer50" : "none";
				const sz = p < 0.35 ? 1.4 : 0.9;
				drawSpark(pb, pos[0], pos[1], sz, col, dit);
			}
		},
	});

	// =========================================================================
	// 3. pilar — Energy Pillar (crossed_x, alpha_crisp, oneshot)
	// =========================================================================
	const PILLAR_STREAKS = [
		{ xOff: -9.5, y0: 54, vy: -3.2, h0: 11, w: 2, born: 2, life: 11 },
		{ xOff:  9.5, y0: 52, vy: -3.4, h0: 10, w: 2, born: 2, life: 11 },
		{ xOff: -5.0, y0: 50, vy: -3.8, h0: 13, w: 2, born: 4, life: 10 },
		{ xOff:  5.0, y0: 48, vy: -3.6, h0: 12, w: 2, born: 4, life: 10 },
		{ xOff:  0.0, y0: 46, vy: -3.5, h0: 15, w: 3, born: 5, life: 9  },
		{ xOff: -2.8, y0: 36, vy: -2.9, h0: 10, w: 2, born: 6, life: 8  },
		{ xOff:  2.8, y0: 32, vy: -2.8, h0: 9,  w: 2, born: 6, life: 8  },
		{ xOff: -7.2, y0: 40, vy: -2.6, h0: 7,  w: 1, born: 5, life: 9  },
		{ xOff:  7.2, y0: 42, vy: -2.7, h0: 7,  w: 1, born: 5, life: 9  },
	];

	const PILLAR_SPARKS = [
		{ xOff: -12, y0: 55, vy: -3.5, born: 1, life: 10 },
		{ xOff:  12, y0: 53, vy: -3.7, born: 1, life: 10 },
		{ xOff: -14, y0: 48, vy: -3.0, born: 2, life: 10 },
		{ xOff:  14, y0: 46, vy: -3.1, born: 2, life: 11 },
		{ xOff:  -8, y0: 44, vy: -3.3, born: 4, life: 10 },
		{ xOff:   8, y0: 42, vy: -3.4, born: 4, life: 10 },
		{ xOff:  -4, y0: 38, vy: -2.8, born: 6, life: 8  },
		{ xOff:   4, y0: 35, vy: -2.7, born: 6, life: 8  },
		{ xOff:   0, y0: 30, vy: -2.2, born: 7, life: 7  },
	];

	// Helper: render tapered vertical energy column between yTop..yBot with crisp pixel modulation
	function drawPillarShaft(pb, cx, yTop, yBot, halfW, col, wavePhase, waveAmp, ditherMode) {
		if (halfW < 0.5 || yBot <= yTop) return;
		const d = ditherMode || "none";
		const topInt = Math.max(3, Math.round(yTop));
		const botInt = Math.min(60, Math.round(yBot));
		const span = Math.max(1, botInt - topInt);

		for (let y = topInt; y <= botInt; y++) {
			const u = (y - topInt) / span; // 0 = top, 1 = bottom
			// Clean tapered top crest + slight grounded base flare
			let profile = 1.0;
			if (u < 0.12) {
				profile = Math.pow(u / 0.12, 0.55);
			} else if (u > 0.86) {
				const bu = (u - 0.86) / 0.14;
				profile = 1.0 + bu * bu * 0.42;
			}
			const wave = waveAmp > 0 ? Math.sin(y * 0.34 + wavePhase) * waveAmp : 0;
			const hw = Math.max(0.45, halfW * profile + wave);
			const x0 = Math.round(cx - hw);
			const x1 = Math.round(cx + hw);
			for (let x = x0; x <= x1; x++) {
				pb.setPixel(x, y, col, d);
			}
		}
	}

	window.KYBERMON_PIXEL_VFX.push({
		id: "pilar",
		name: "Energy Pillar",
		category: "world",
		planeType: "crossed_x",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "world_pillar",
		secondaryVfxId: "pulse",
		hitFrame: 1,
		planeScale: [2.0, 3.6],
		planeOffsetY: 1.8,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Grayscale_World_EnergyPillar_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.80",
			LightEmission: 0.45,
			Orientation: "CrossedMesh",
		},
		description: "Vertical energy column erupting cleanly upward from y=60 to y=3: F0 tight ground flare rising fast -> F1-F4 full bright-core column with rising inner bands & base flare -> F5-F14 narrows into rising streaks & sparkles -> 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const cx = 31.5;

			// FRAME 0: Tight ground flare + fast rising vertical eruption spear (y=60 -> y=20)
			if (frameIndex === 0) {
				pb.fillEllipse(cx, 57.5, 13.5, 2.8, 0, P.MID);
				pb.fillEllipse(cx, 57.2, 9.8, 2.2, 0, P.BRIGHT);
				pb.fillEllipse(cx, 57.0, 6.2, 1.5, 0, P.CORE);

				drawPillarShaft(pb, cx, 20, 58, 5.4, P.MID, 0.0, 0.4);
				drawPillarShaft(pb, cx, 21, 58, 3.6, P.BRIGHT, 0.0, 0.3);
				drawPillarShaft(pb, cx, 23, 58, 2.0, P.HOT, 0.0, 0.0);
				drawPillarShaft(pb, cx, 26, 58, 0.9, P.CORE, 0.0, 0.0);

				// Rising pressure ring chevrons
				pb.fillEllipseRing(cx, 44, 8.8, 2.3, 6.6, 1.4, 0, P.HOT);
				pb.fillEllipseRing(cx, 33, 6.4, 1.8, 4.6, 1.0, 0, P.CORE);

				pb.addOutline(P.OUTLINE);
				pb.drawLine(cx, 21, cx, 57, P.CORE, 1);
				return;
			}

			// FRAMES 1-4: Full vertical bright-core column (y=60 -> y=3) with rising inner bands & base flare
			if (frameIndex >= 1 && frameIndex <= 4) {
				const widths = [0, 10.2, 9.6, 8.2, 6.4];
				const flareRx = [0, 17.0, 15.8, 13.6, 10.6];
				const hw = widths[frameIndex];
				const frx = flareRx[frameIndex];
				const phase = frameIndex * 1.35;

				// Ground base flare anchoring pillar to floor (y <= 60 so outline <= 61)
				pb.fillEllipse(cx, 57.2, frx, 3.0, 0, P.DARK);
				pb.fillEllipse(cx, 57.0, frx * 0.78, 2.3, 0, P.BRIGHT);
				pb.fillEllipse(cx, 56.8, frx * 0.50, 1.6, 0, P.CORE);

				// Full vertical column y=3..59
				drawPillarShaft(pb, cx, 3, 59, hw, P.MID, phase, 0.85);
				drawPillarShaft(pb, cx, 4, 59, hw * 0.74, P.BRIGHT, phase + 0.5, 0.55);
				drawPillarShaft(pb, cx, 5, 59, hw * 0.48, P.HOT, phase + 1.1, 0.30);
				drawPillarShaft(pb, cx, 6, 58, Math.max(1.2, hw * 0.25), P.CORE, 0, 0);

				// 2 rising horizontal energy bands sweeping up the column
				for (let b = 0; b < 2; b++) {
					const by = 52 - ((frameIndex * 11 + b * 24) % 44);
					if (by >= 8 && by <= 54) {
						const brx = hw + 2.8 - b * 0.6;
						pb.fillEllipseRing(cx, by, brx, 2.4, Math.max(1.5, brx - 2.2), 1.3, 0, P.BRIGHT);
						pb.fillEllipseRing(cx, by - 0.5, brx * 0.9, 1.6, Math.max(1.0, brx * 0.9 - 1.4), 0.8, 0, P.CORE);
					}
				}

				// Crisp rising inner core pulses
				for (let k = 0; k < 3; k++) {
					const py = 54 - ((frameIndex * 9 + k * 17) % 46);
					if (py >= 7 && py <= 55) {
						pb.fillRect(cx - 1.5, py - 2, 3, 5, P.CORE);
					}
				}

				pb.addOutline(P.OUTLINE);

				// Crisp bright inner beam spine re-stamped
				drawPillarShaft(pb, cx, 5, 58, Math.max(0.8, hw * 0.20), P.CORE, 0, 0);
			} else if (frameIndex === 5 || frameIndex === 6) {
				// FRAMES 5-6: Column narrows sharply and fractures into vertical energy ribbons
				const hw = frameIndex === 5 ? 4.4 : 2.6;
				const baseDit = frameIndex === 5 ? "bayer75" : "bayer50";
				pb.fillEllipse(cx, 57.2, frameIndex === 5 ? 8.2 : 5.8, 1.8, 0, P.MID, baseDit);
				pb.fillEllipse(cx, 57.0, frameIndex === 5 ? 4.6 : 2.8, 1.1, 0, P.BRIGHT, baseDit);

				if (frameIndex === 5) {
					drawPillarShaft(pb, cx, 4, 57, hw, P.MID, 6.2, 0.5);
					drawPillarShaft(pb, cx, 5, 56, hw * 0.60, P.BRIGHT, 6.6, 0.3);
					drawPillarShaft(pb, cx, 7, 54, 1.1, P.HOT, 0, 0);
				} else {
					// F6: split vertically into 3 rising column segments with clean negative-space breaks
					drawPillarShaft(pb, cx, 4, 21, 2.2, P.BRIGHT, 7.1, 0.3);
					drawPillarShaft(pb, cx, 26, 42, 2.4, P.BRIGHT, 7.4, 0.3);
					drawPillarShaft(pb, cx, 47, 56, 1.9, P.MID, 7.8, 0.2, "bayer75");
					pb.drawLine(cx, 6, cx, 19, P.HOT, 1);
					pb.drawLine(cx, 28, cx, 40, P.HOT, 1);
				}

				pb.addOutline(P.OUTLINE);
			}

			// Rising vertical streaks (F2..F14) — take over cleanly as pillar breaks up
			for (let i = 0; i < PILLAR_STREAKS.length; i++) {
				const st = PILLAR_STREAKS[i];
				const age = frameIndex - st.born;
				if (age < 0 || age > st.life) continue;
				const p = age / st.life;
				const yHead = st.y0 + st.vy * age;
				const h = Math.max(2, Math.round(st.h0 * (1 - p * 0.72)));
				const yTop = Math.max(3, Math.round(yHead - h));
				const yBot = Math.min(59, Math.round(yHead));
				if (yBot - yTop < 1 || yBot < 5) continue;

				const sx = cx + st.xOff * (1 + p * 0.12);
				const col = p < 0.30 ? P.HOT : (p < 0.62 ? P.BRIGHT : (p < 0.84 ? P.MID : P.DARK));
				let dit = "none";
				if (p > 0.82) dit = "bayer25";
				else if (p > 0.66) dit = "bayer50";
				else if (p > 0.50) dit = "bayer75";

				const w = (st.w >= 2 && p < 0.55) ? st.w : 1;
				pb.fillRect(Math.round(sx - w * 0.5), yTop, w, yBot - yTop + 1, col, dit);
				if (p < 0.45 && yBot - yTop >= 4) {
					pb.drawLine(sx, yTop + 1, sx, yTop + Math.floor((yBot - yTop) * 0.5), P.CORE, 1);
				}
			}

			// Outline lingering bold streaks on F7..F8 for pixel punch
			if (frameIndex === 7 || frameIndex === 8) {
				pb.addOutline(P.OUTLINE);
			}

			// Crisp ascending energy sparkles (F1..F14)
			for (let i = 0; i < PILLAR_SPARKS.length; i++) {
				const sp = PILLAR_SPARKS[i];
				const age = frameIndex - sp.born;
				if (age < 0 || age > sp.life) continue;
				const p = age / sp.life;
				const sy = sp.y0 + sp.vy * age;
				if (sy < 4 || sy > 59) continue;
				const sx = cx + sp.xOff + Math.sin(age * 0.9 + i) * 1.2;
				const col = p < 0.35 ? P.CORE : (p < 0.70 ? P.HOT : P.BRIGHT);
				const dit = p > 0.78 ? "bayer50" : "none";
				drawSpark(pb, sx, sy, p < 0.4 ? 1.35 : 0.85, col, dit);
			}
		},
	});

	// =========================================================================
	// 4. rubble — Rubble Erupt (billboard, alpha_crisp, oneshot)
	// =========================================================================
	// 9 deterministic angular rock chunks on realistic parabolic gravity arcs from y = 56
	const RUBBLE_ROCKS = [
		// High central hero boulders
		{ x0: 30, y0: 55, vx: -0.95, vy0: -7.8, g: 1.02, r0: 5.0, a0: 0.3,  spin:  0.48, life: 14, facets: [1.05, 0.82, 1.00, 0.88, 0.96] },
		{ x0: 34, y0: 55, vx:  1.15, vy0: -7.2, g: 1.00, r0: 4.6, a0: 1.4,  spin: -0.54, life: 14, facets: [0.96, 1.08, 0.84, 1.02, 0.86] },
		// Mid-arc flanking chunks
		{ x0: 27, y0: 56, vx: -1.85, vy0: -6.4, g: 0.98, r0: 4.3, a0: 2.2,  spin: -0.62, life: 13, facets: [1.04, 0.85, 0.95, 1.06, 0.80] },
		{ x0: 36, y0: 56, vx:  1.95, vy0: -6.1, g: 0.98, r0: 4.2, a0: 0.8,  spin:  0.65, life: 13, facets: [0.88, 1.05, 0.92, 0.82, 1.04] },
		// Wide low-arc flying debris
		{ x0: 25, y0: 56, vx: -2.35, vy0: -4.9, g: 0.92, r0: 3.5, a0: 1.9,  spin: -0.78, life: 12, facets: [1.08, 0.84, 0.98, 0.86, 0.94] },
		{ x0: 38, y0: 56, vx:  2.30, vy0: -5.1, g: 0.94, r0: 3.6, a0: 2.8,  spin:  0.74, life: 12, facets: [0.92, 1.04, 0.80, 1.06, 0.88] },
		// Smaller high-velocity shards
		{ x0: 31, y0: 54, vx: -0.25, vy0: -8.6, g: 1.12, r0: 3.3, a0: 0.5,  spin:  0.88, life: 13, facets: [1.06, 0.78, 1.02, 0.88, 0.92] },
		{ x0: 29, y0: 56, vx: -1.40, vy0: -4.4, g: 0.90, r0: 3.0, a0: 3.1,  spin: -0.82, life: 11, facets: [0.95, 1.05, 0.86, 0.98, 0.82] },
		{ x0: 35, y0: 56, vx:  1.50, vy0: -4.2, g: 0.90, r0: 2.9, a0: 1.1,  spin:  0.85, life: 11, facets: [1.02, 0.84, 1.06, 0.82, 0.94] },
	];

	const RUBBLE_DUST = [
		{ x0: 24, y0: 55, vx: -2.4, vy0: -3.2, g: 0.55, born: 0, life: 10 },
		{ x0: 39, y0: 55, vx:  2.5, vy0: -3.4, g: 0.55, born: 0, life: 10 },
		{ x0: 28, y0: 54, vx: -1.5, vy0: -5.2, g: 0.78, born: 0, life: 12 },
		{ x0: 35, y0: 54, vx:  1.6, vy0: -5.5, g: 0.80, born: 0, life: 12 },
		{ x0: 31, y0: 53, vx:  0.4, vy0: -6.8, g: 0.90, born: 1, life: 13 },
		{ x0: 26, y0: 55, vx: -2.0, vy0: -4.5, g: 0.72, born: 1, life: 11 },
		{ x0: 37, y0: 55, vx:  2.1, vy0: -4.3, g: 0.72, born: 1, life: 11 },
		{ x0: 33, y0: 55, vx: -0.8, vy0: -6.0, g: 0.84, born: 1, life: 12 },
		{ x0: 29, y0: 56, vx: -2.6, vy0: -2.6, g: 0.48, born: 2, life: 10 },
		{ x0: 34, y0: 56, vx:  2.6, vy0: -2.8, g: 0.50, born: 2, life: 10 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "rubble",
		name: "Rubble Erupt",
		category: "world",
		planeType: "billboard",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "world_burst",
		secondaryVfxId: "smoke_puff",
		hitFrame: 0,
		planeScale: [2.4, 2.2],
		planeOffsetY: 0.95,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 18,
		exportFileName: "Kybermon_Grayscale_World_RubbleErupt_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 18,
			Lifetime: "0.89",
			LightEmission: 0.20,
			Orientation: "FacingCamera",
		},
		description: "9 crisp angular pixel rock polygons erupting upward from y=56 along parabolic gravity arcs, tumbling with 2-tone lit/shadow faces + dust pips, landing and fading cleanly to 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const cx = 31.5;
			const groundY = 56;

			// Ground eruption kick-up / fracture lip on F0..F3
			if (frameIndex <= 3) {
				const spread = 12 + frameIndex * 3.2;
				const dit = frameIndex === 3 ? "bayer50" : (frameIndex === 2 ? "bayer75" : "none");
				pb.fillEllipse(cx, groundY + 1.0, spread, 2.4 - frameIndex * 0.4, 0, frameIndex === 0 ? P.MID : P.DARK, dit);
				if (frameIndex <= 1) {
					// Crisp angular ground crack burst spikes
					pb.fillTriangle(cx - 11, groundY + 1, cx - 15 - frameIndex * 2, groundY - 4, cx - 7, groundY - 1, P.BRIGHT);
					pb.fillTriangle(cx + 11, groundY + 1, cx + 15 + frameIndex * 2, groundY - 4, cx + 7, groundY - 1, P.BRIGHT);
					pb.fillEllipse(cx, groundY + 0.5, 7.5 - frameIndex * 2, 1.5, 0, P.HOT);
				}
			}

			// Draw 9 tumbling parabolic rocks (pass 1: larger outlined rocks)
			const smallRocks = [];
			for (let i = 0; i < RUBBLE_ROCKS.length; i++) {
				const rk = RUBBLE_ROCKS[i];
				if (frameIndex > rk.life) continue;

				const t = frameIndex;
				const p = t / rk.life;
				let rx = rk.x0 + rk.vx * t;
				let ry = rk.y0 + rk.vy0 * t + 0.5 * rk.g * t * t;

				// Realistic crisp micro-bounce when hitting groundY = 56
				if (ry > groundY) {
					const over = ry - groundY;
					ry = groundY - Math.max(0, 2.6 - over * 0.35);
				}
				rx = E.clamp(rx, 6, 57);
				ry = E.clamp(ry, 6, 57);

				const rot = rk.a0 + rk.spin * t;
				// Hold solid rock size through flight, then crumble/shrink cleanly as it lands
				const shrink = p > 0.65 ? E.easeInQuad((p - 0.65) / 0.35) * 0.68 : 0;
				const rad = rk.r0 * (1 - shrink);

				let dit = "none";
				if (p > 0.88) dit = "bayer25";
				else if (p > 0.78) dit = "bayer50";
				else if (p > 0.68) dit = "bayer75";

				if (rad >= 2.2 && dit === "none") {
					drawFacetedRock(pb, rx, ry, rad, rot, rk.facets, P, p * 0.75, "none");
				} else {
					smallRocks.push({ rx, ry, rad, rot, facets: rk.facets, cool: p * 0.85, dit });
				}
			}

			// Crisp 1px pixel silhouette outline around solid flying rocks
			pb.addOutline(P.OUTLINE);

			// Draw shrinking/fading rocks (pass 2, un-outlined so Bayer decay stays airy & crisp)
			for (let i = 0; i < smallRocks.length; i++) {
				const sr = smallRocks[i];
				drawFacetedRock(pb, sr.rx, sr.ry, sr.rad, sr.rot, sr.facets, P, sr.cool, sr.dit);
			}

			// Tiny dust & pebble pips arcing outward (F0..F14)
			for (let i = 0; i < RUBBLE_DUST.length; i++) {
				const dp = RUBBLE_DUST[i];
				const age = frameIndex - dp.born;
				if (age < 0 || age > dp.life) continue;
				const p = age / dp.life;
				const dx = E.clamp(dp.x0 + dp.vx * age, 4, 59);
				let dy = dp.y0 + dp.vy0 * age + 0.5 * dp.g * age * age;
				if (dy > groundY + 1) dy = groundY + 1;
				if (dy < 4) continue;

				const col = p < 0.30 ? P.BRIGHT : (p < 0.65 ? P.MID : P.DARK);
				const dit = p > 0.75 ? "bayer50" : "none";
				pb.setPixel(dx, dy, col, dit);
				if (p < 0.40 && i % 2 === 0) {
					pb.setPixel(dx + 1, dy, P.SHADOW, dit);
				}
			}
		},
	});

	// =========================================================================
	// 5. splash — Impact Splash (crossed_x, alpha_crisp, oneshot)
	// =========================================================================
	// 7 main arching crown tendrils (angle spread symmetrically around vertical for crossed_x 3D volume)
	const SPLASH_TENDRILS = [
		{ xBase: -10, xCtrl: -19, yCtrl: 28, xTip: -23, yTip: 34, w: 3.0, peakH: 0.82 },
		{ xBase:  -6, xCtrl: -14, yCtrl: 18, xTip: -17, yTip: 22, w: 3.4, peakH: 0.96 },
		{ xBase:  -2, xCtrl:  -7, yCtrl: 12, xTip:  -9, yTip: 15, w: 3.3, peakH: 1.00 },
		{ xBase:   0, xCtrl:   0, yCtrl:  9, xTip:   1, yTip: 12, w: 3.5, peakH: 1.04 },
		{ xBase:   2, xCtrl:   8, yCtrl: 13, xTip:  10, yTip: 16, w: 3.2, peakH: 0.98 },
		{ xBase:   6, xCtrl:  15, yCtrl: 19, xTip:  18, yTip: 23, w: 3.4, peakH: 0.94 },
		{ xBase:  10, xCtrl:  20, yCtrl: 29, xTip:  24, yTip: 35, w: 2.9, peakH: 0.80 },
	];

	// 12 crisp falling droplets (7 released from crown tips + 5 secondary spray beads)
	const SPLASH_DROPLETS = [
		// Main crown tip drops born as tendrils pinch off (F3)
		{ x0:  9.0, y0: 35.0, vx: -0.55, vy0: -0.9, g: 0.62, r0: 2.6, born: 3, life: 10 },
		{ x0: 15.0, y0: 23.0, vx: -0.75, vy0: -1.4, g: 0.72, r0: 2.8, born: 3, life: 11 },
		{ x0: 22.5, y0: 16.0, vx: -0.45, vy0: -1.6, g: 0.76, r0: 2.7, born: 3, life: 11 },
		{ x0: 32.0, y0: 13.0, vx:  0.12, vy0: -1.7, g: 0.80, r0: 2.9, born: 3, life: 11 },
		{ x0: 41.0, y0: 17.0, vx:  0.50, vy0: -1.5, g: 0.76, r0: 2.7, born: 3, life: 11 },
		{ x0: 49.0, y0: 24.0, vx:  0.72, vy0: -1.3, g: 0.72, r0: 2.8, born: 3, life: 11 },
		{ x0: 54.5, y0: 36.0, vx:  0.52, vy0: -0.8, g: 0.62, r0: 2.5, born: 3, life: 10 },
		// Secondary spray beads arcing outward earlier (F2)
		{ x0: 19.0, y0: 34.0, vx: -1.10, vy0: -2.4, g: 0.76, r0: 2.0, born: 2, life: 10 },
		{ x0: 44.5, y0: 33.0, vx:  1.12, vy0: -2.5, g: 0.76, r0: 2.0, born: 2, life: 10 },
		{ x0: 27.0, y0: 25.0, vx: -0.40, vy0: -2.6, g: 0.84, r0: 2.1, born: 2, life: 11 },
		{ x0: 36.5, y0: 24.0, vx:  0.42, vy0: -2.5, g: 0.84, r0: 2.1, born: 2, life: 11 },
		{ x0: 31.5, y0: 28.0, vx: -0.15, vy0: -2.2, g: 0.86, r0: 1.9, born: 4, life: 10 },
	];

	function drawDroplet(pb, x, y, vx, vy, r, P, p, ditherMode) {
		const d = ditherMode || "none";
		const colBody = p < 0.35 ? P.HOT : (p < 0.72 ? P.BRIGHT : P.MID);
		const colTail = p < 0.50 ? P.BRIGHT : P.DARK;
		if (r >= 1.55) {
			const velAng = Math.atan2(vy, vx);
			const tailLen = Math.min(5.2, r * 1.85);
			const tailTip = polar(x, y, tailLen, velAng + Math.PI);
			pb.fillNeedle(tailTip[0], tailTip[1], tailLen, r * 0.72, velAng + Math.PI, colTail, d);
			pb.fillCircle(x, y, r, colBody, d);
			if (p < 0.65 && d === "none") {
				pb.setPixel(x - r * 0.35, y - r * 0.35, P.CORE);
			}
		} else if (r >= 0.85) {
			pb.fillCircle(x, y, r, colBody, d);
			pb.setPixel(x, y - 1, P.HOT, d);
		} else {
			pb.setPixel(x, y, p < 0.8 ? P.BRIGHT : P.MID, d);
		}
	}

	window.KYBERMON_PIXEL_VFX.push({
		id: "splash",
		name: "Impact Splash",
		category: "world",
		planeType: "crossed_x",
		materialPreset: "alpha_crisp",
		playbackMode: "oneshot",
		combatRole: "world_burst",
		hitFrame: 0,
		planeScale: [2.4, 2.2],
		planeOffsetY: 0.95,
		robloxOrientation: "CrossedMesh",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 20,
		exportFileName: "Kybermon_Grayscale_World_ImpactSplash_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 20,
			Lifetime: "0.80",
			LightEmission: 0.35,
			Orientation: "CrossedMesh",
		},
		description: "Upward & outward pixel splash crown bursting from y=54: F0 sharp splash fan -> F1-F4 arching crown tendrils pinching into falling droplets -> F5-F14 droplets arc down and vanish cleanly to 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const P = E.GRAY.ALPHA_CRISP;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const cx = 31.5;
			const baseY = 54;

			// FRAME 0: Sharp erupting splash fan bursting upward from baseY = 54
			if (frameIndex === 0) {
				pb.fillEllipse(cx, baseY, 12.5, 3.2, 0, P.MID);
				pb.fillEllipse(cx, baseY - 0.8, 9.2, 2.4, 0, P.BRIGHT);
				pb.fillEllipse(cx, baseY - 1.0, 5.8, 1.5, 0, P.CORE);

				for (let i = 0; i < SPLASH_TENDRILS.length; i++) {
					const tr = SPLASH_TENDRILS[i];
					const sx = cx + tr.xBase * 0.65;
					const tx = cx + tr.xTip * 0.56;
					const ty = baseY - (baseY - tr.yTip) * 0.52;
					const ang = Math.atan2(ty - baseY, tx - sx);
					const len = Math.hypot(tx - sx, ty - baseY);
					pb.fillNeedle(tx, ty, len, tr.w * 0.85, ang, P.MID);
					pb.fillNeedle(tx, ty, len * 0.85, tr.w * 0.55, ang, P.BRIGHT);
					pb.fillNeedle(tx, ty, len * 0.65, tr.w * 0.32, ang, P.HOT);
				}

				pb.addOutline(P.OUTLINE);
				pb.fillEllipse(cx, baseY - 1.2, 4.8, 1.2, 0, P.CORE);
				return;
			}

			// FRAMES 1-4: Arching crown tendrils rising, swelling at tips, then pinching off into droplets
			if (frameIndex >= 1 && frameIndex <= 4) {
				const grow = frameIndex === 1 ? 0.82 : (frameIndex === 2 ? 1.0 : 1.05);

				// Base splash cup rim widening & thinning cleanly
				if (frameIndex <= 2) {
					const cupRx = 13.5 + frameIndex * 2.2;
					pb.fillEllipse(cx, baseY, cupRx, 3.0 - frameIndex * 0.5, 0, P.MID);
					pb.fillEllipse(cx, baseY - 0.8, cupRx * 0.78, 2.0 - frameIndex * 0.3, 0, P.BRIGHT);
					if (frameIndex === 1) {
						pb.fillEllipse(cx, baseY - 1.0, 6.2, 1.4, 0, P.CORE);
					}
				} else {
					const dit = frameIndex === 3 ? "bayer75" : "bayer50";
					pb.fillEllipseRing(cx, baseY + 0.5, 17.5 + (frameIndex - 3) * 2.5, 2.5, 14.5 + (frameIndex - 3) * 2.5, 1.3, 0, P.MID, dit);
				}

				// Draw arching tendrils (full connected crown on F1-F2, pinching off on F3, short base receding stubs on F4)
				for (let i = 0; i < SPLASH_TENDRILS.length; i++) {
					const tr = SPLASH_TENDRILS[i];
					const x0 = cx + tr.xBase * (0.85 + frameIndex * 0.14);
					const y0 = baseY;
					const x1 = cx + tr.xCtrl * grow;
					const y1 = baseY - (baseY - tr.yCtrl) * grow;
					const x2 = cx + tr.xTip * grow;
					const y2 = baseY - (baseY - tr.yTip) * grow;

					if (frameIndex <= 2) {
						const wBase = tr.w * (frameIndex === 1 ? 1.10 : 0.88);
						const wMid = tr.w * (frameIndex === 1 ? 0.65 : 0.45);
						const wTip = tr.w * (frameIndex === 1 ? 0.72 : 0.82);
						drawTaperedCurve(pb, x0, y0, x1, y1, x2, y2, wBase, wMid, wTip, 7, P.MID);
						drawTaperedCurve(pb, x0, y0 - 0.5, x1, y1 - 0.7, x2, y2 - 0.5, wBase * 0.65, wMid * 0.55, wTip * 0.65, 6, P.BRIGHT);
						// Plump bright liquid tip bead
						pb.fillCircle(x2, y2, wTip * 0.85, P.HOT);
						pb.setPixel(x2 - 0.5, y2 - 0.5, P.CORE);
					} else if (frameIndex === 3) {
						// Stem pinches off in the middle! Draw lower receding stem stub only (droplets spawn at tips)
						const mx = (x0 + x1) * 0.52;
						const my = (y0 + y1) * 0.54;
						drawTaperedCurve(pb, x0, y0, (x0 + mx) * 0.5, (y0 + my) * 0.5, mx, my, tr.w * 0.65, tr.w * 0.36, 0.7, 4, P.MID);
						pb.drawLine(x0, y0 - 1, mx, my, P.BRIGHT, 1);
					} else if (frameIndex === 4) {
						// Tiny receding base splash peaks dithering away
						const mx = x0 + (x1 - x0) * 0.25;
						const my = baseY - 4.5;
						pb.drawLine(x0, baseY, mx, my, P.DARK, 1, "bayer50");
					}
				}
			}

			// Falling & arcing droplets (F2..F14)
			const smallDrops = [];
			for (let i = 0; i < SPLASH_DROPLETS.length; i++) {
				const dr = SPLASH_DROPLETS[i];
				const age = frameIndex - dr.born;
				if (age < 0 || age > dr.life) continue;

				const p = age / dr.life;
				const dx = E.clamp(dr.x0 + dr.vx * age, 4, 59);
				const dy = dr.y0 + dr.vy0 * age + 0.5 * dr.g * age * age;
				const vyNow = dr.vy0 + dr.g * age;

				// Floor micro-splat when droplet hits baseY
				if (dy >= baseY) {
					const splatAge = dy - baseY;
					if (splatAge < 5.5) {
						const sDit = splatAge > 2.8 ? "bayer50" : "none";
						const sCol = splatAge > 2.2 ? P.MID : P.BRIGHT;
						pb.fillRect(dx - 1, baseY, 3, 1, sCol, sDit);
						if (splatAge < 2.2) {
							pb.setPixel(dx, baseY - 1, P.HOT);
						}
					}
					continue;
				}
				if (dy < 4) continue;

				const rad = dr.r0 * (1 - E.easeInQuad(p) * 0.72);
				let dit = "none";
				if (p > 0.86) dit = "bayer25";
				else if (p > 0.74) dit = "bayer50";

				if (rad >= 1.65 && dit === "none" && frameIndex <= 9) {
					drawDroplet(pb, dx, dy, dr.vx, vyNow, rad, P, p, "none");
				} else {
					smallDrops.push({ dx, dy, vx: dr.vx, vy: vyNow, rad, p, dit });
				}
			}

			// Crisp 1px silhouette outline around solid crown & main droplets
			if (frameIndex <= 9) {
				pb.addOutline(P.OUTLINE);
			}

			// Draw fine/dithering late droplets un-outlined for clean vanish
			for (let i = 0; i < smallDrops.length; i++) {
				const sd = smallDrops[i];
				drawDroplet(pb, sd.dx, sd.dy, sd.vx, sd.vy, sd.rad, P, sd.p, sd.dit);
			}
		},
	});

	// =========================================================================
	// 6. smoke_puff — Smoke Puff (billboard, soft_transparent, oneshot)
	// =========================================================================
	// 6 overlapping crisp cel-shaded pixel puffs expanding gently outward & upward (ZERO blurry gradients!)
	const SMOKE_PUFFS = [
		// Main upper-center puff
		{ x0: 31.5, y0: 34.0, dx:  0.0, dy: -13.0, rStart: 6.8, rPeak: 10.6, rEnd: 4.4, fadeAt: 14 },
		// Upper-left puff
		{ x0: 26.0, y0: 36.0, dx: -9.5, dy: -10.5, rStart: 5.6, rPeak:  8.8, rEnd: 3.6, fadeAt: 14 },
		// Upper-right puff
		{ x0: 37.0, y0: 35.5, dx:  9.5, dy: -11.0, rStart: 5.8, rPeak:  9.0, rEnd: 3.8, fadeAt: 14 },
		// Lower-left puff
		{ x0: 25.0, y0: 41.0, dx: -10.5, dy: -4.0, rStart: 5.0, rPeak:  7.8, rEnd: 3.0, fadeAt: 13 },
		// Lower-right puff
		{ x0: 38.0, y0: 41.0, dx:  10.5, dy: -4.5, rStart: 5.2, rPeak:  8.0, rEnd: 3.2, fadeAt: 13 },
		// Center-lower core puff (erodes earlier to open airy negative space inside cluster)
		{ x0: 31.5, y0: 41.5, dx:  0.0, dy:  -3.0, rStart: 5.5, rPeak:  7.5, rEnd: 0.0, fadeAt: 9  },
	];

	const SMOKE_PIPS = [
		{ x0: 22, y0: 33, vx: -1.1, vy: -1.3, born: 0, life: 7 },
		{ x0: 41, y0: 32, vx:  1.2, vy: -1.4, born: 0, life: 7 },
		{ x0: 20, y0: 43, vx: -1.3, vy: -0.5, born: 0, life: 6 },
		{ x0: 43, y0: 43, vx:  1.3, vy: -0.6, born: 0, life: 6 },
	];

	window.KYBERMON_PIXEL_VFX.push({
		id: "smoke_puff",
		name: "Smoke Puff",
		category: "world",
		planeType: "billboard",
		materialPreset: "soft_transparent",
		playbackMode: "oneshot",
		combatRole: "world_burst",
		hitFrame: 0,
		planeScale: [2.0, 1.8],
		planeOffsetY: 0.75,
		robloxOrientation: "FacingCamera",
		gridCols: 4,
		gridRows: 4,
		gridSize: 4,
		frameCount: 16,
		pixelRes: 64,
		defaultFps: 16,
		exportFileName: "Kybermon_Grayscale_World_SmokePuff_4x4_1024.png",
		robloxPreset: {
			FlipbookLayout: "Grid4x4",
			FlipbookMode: "OneShot",
			FlipbookFramerate: 16,
			Lifetime: "1.00",
			LightEmission: 0.15,
			Orientation: "FacingCamera",
		},
		description: "Minimalist pixel-art dust/smoke poof: 6 overlapping crisp cel-shaded pixel puffs expanding gently outward & upward, eroding cleanly via Bayer75 -> Bayer50 -> Bayer25 -> 0px at F15.",
		renderFrame(pb, frameIndex, totalFrames, PE) {
			const E = PE || window.PixelEngine;
			const S = E.GRAY.SOFT_TRANSPARENT;
			pb.clear();

			if (frameIndex >= 15) return; // Clean 0px OneShot final cell

			const t = frameIndex / 14; // 0..1 across F0..F14
			const moveEase = E.easeOutCubic(t);

			// Compute active puff circles for this frame
			const active = [];
			for (let i = 0; i < SMOKE_PUFFS.length; i++) {
				const pf = SMOKE_PUFFS[i];
				if (frameIndex > pf.fadeAt) continue;
				const pfT = frameIndex / pf.fadeAt;
				// Quick pop to peak at F3-F4, then gentle shrink as puffs disperse
				let r;
				if (frameIndex <= 4) {
					r = E.lerp(pf.rStart, pf.rPeak, E.easeOutQuad(frameIndex / 4));
				} else {
					const shrinkT = (frameIndex - 4) / Math.max(1, pf.fadeAt - 4);
					r = E.lerp(pf.rPeak, pf.rEnd, E.easeInQuad(shrinkT));
				}
				if (r < 1.2) continue;

				const px = pf.x0 + pf.dx * moveEase;
				const py = pf.y0 + pf.dy * moveEase;
				active.push({ x: px, y: py, r, r2: r * r, pfT });
			}

			// Optional subtle center negative-space carve starting at F7 so smoke breaks into airy pixel tufts
			const hasHole = frameIndex >= 7;
			const holeX = 31.5;
			const holeY = 36.5 - (frameIndex - 7) * 1.1;
			const holeR = hasHole ? E.lerp(2.2, 8.8, (frameIndex - 7) / 7) : 0;
			const holeR2 = holeR * holeR;

			// Strict stepped Bayer erosion schedule: solid (F0-F5) -> Bayer75 (F6-F8) -> Bayer50 (F9-F11) -> Bayer25 (F12-F13) -> Bayer12 (F14)
			let globalDither = "none";
			if (frameIndex === 14) globalDither = "bayer12";
			else if (frameIndex >= 12) globalDither = "bayer25";
			else if (frameIndex >= 9) globalDither = "bayer50";
			else if (frameIndex >= 6) globalDither = "bayer75";

			// Unified crisp cel-shaded raster pass (single write per pixel via replacePixel = zero muddy double-alpha seams!)
			for (let y = pb.minCoord; y <= pb.maxCoord; y++) {
				for (let x = pb.minCoord; x <= pb.maxCoord; x++) {
					if (hasHole) {
						const hdx = x - holeX;
						const hdy = y - holeY;
						if (hdx * hdx + hdy * hdy <= holeR2) continue;
					}

					let inAny = false;
					let inLit = false;
					let inHighlight = false;
					let inShadowZone = false;

					for (let i = 0; i < active.length; i++) {
						const c = active[i];
						const dx = x - c.x;
						const dy = y - c.y;
						const d2 = dx * dx + dy * dy;
						if (d2 <= c.r2) {
							inAny = true;

							// Upper-left shifted cel-lit dome inside each puff
							const ldx = dx + c.r * 0.16;
							const ldy = dy + c.r * 0.22;
							if (ldx * ldx + ldy * ldy <= (c.r * 0.78) * (c.r * 0.78)) {
								inLit = true;
							}

							// Crisp top-left highlight cap on early/mid frames
							const hdx = dx + c.r * 0.28;
							const hdy = dy + c.r * 0.34;
							if (hdx * hdx + hdy * hdy <= (c.r * 0.44) * (c.r * 0.44)) {
								inHighlight = true;
							}

							// Lower-right underside shading crescent
							if (dy > c.r * 0.30 || dx > c.r * 0.45) {
								inShadowZone = true;
							}
						}
					}

					if (!inAny) continue;

					// Discrete cel-shaded grayscale tone (ZERO continuous gradients!)
					let col;
					let pxDither = globalDither;

					if (frameIndex <= 2) {
						if (inHighlight) col = S.CORE;
						else if (inLit) col = S.BRIGHT;
						else if (inShadowZone) col = S.RIM;
						else col = S.MID;
					} else if (frameIndex <= 5) {
						if (inHighlight) col = S.BRIGHT;
						else if (inLit) col = S.MID;
						else if (inShadowZone) {
							col = S.RIM;
							if (frameIndex === 5) pxDither = "bayer75";
						} else {
							col = S.SOFT;
						}
					} else if (frameIndex <= 8) {
						if (inHighlight || inLit) col = S.MID;
						else if (inShadowZone) col = S.RIM;
						else col = S.SOFT;
					} else if (frameIndex <= 11) {
						col = inLit ? S.SOFT : S.FAINT;
					} else {
						col = S.FAINT;
					}

					pb.replacePixel(x, y, col, pxDither);
				}
			}

			// Subtle crisp dust micro-pips popping around the poof rim on F0..F7
			for (let i = 0; i < SMOKE_PIPS.length; i++) {
				const sp = SMOKE_PIPS[i];
				const age = frameIndex - sp.born;
				if (age < 0 || age > sp.life) continue;
				const p = age / sp.life;
				const sx = sp.x0 + sp.vx * age;
				const sy = sp.y0 + sp.vy * age;
				const col = p < 0.4 ? S.BRIGHT : (p < 0.75 ? S.MID : S.FAINT);
				const dit = p > 0.65 ? "bayer50" : "none";
				pb.setPixel(sx, sy, col, dit);
			}
		},
	});
})();
