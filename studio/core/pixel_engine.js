// Kybermon Pixel VFX 3D Studio — Shared Integer Grayscale Rasterizer & Palette Engine
// 100% file:/// compatible (classic <script>, attaches to window.PixelEngine & window.KYBERMON_PIXEL_VFX).
// Guarantees zero anti-aliasing, strict 2px Roblox UV safe margin [2..61], and calibrated grayscale ramps.

(function () {
	"use strict";

	// 4x4 Bayer threshold matrix normalized to 0..15
	const BAYER4 = [
		0, 8, 2, 10,
		12, 4, 14, 6,
		3, 11, 1, 9,
		15, 7, 13, 5,
	];

	function passDither(x, y, mode) {
		if (!mode || mode === "none") return true;
		const idx = ((y & 3) << 2) | (x & 3);
		const v = BAYER4[idx];
		if (mode === "bayer75") return v < 12;
		if (mode === "bayer50") return v < 8;
		if (mode === "bayer25") return v < 4;
		if (mode === "bayer12") return v < 2;
		return true;
	}

	function clamp(v, lo, hi) {
		return v < lo ? lo : v > hi ? hi : v;
	}

	function clamp01(v) {
		return v < 0 ? 0 : v > 1 ? 1 : v;
	}

	function lerp(a, b, t) {
		return a + (b - a) * t;
	}

	function easeOutQuad(t) {
		const u = clamp01(t);
		return 1 - (1 - u) * (1 - u);
	}

	function easeOutCubic(t) {
		const u = clamp01(t);
		return 1 - Math.pow(1 - u, 3);
	}

	function easeInQuad(t) {
		const u = clamp01(t);
		return u * u;
	}

	function easeInCubic(t) {
		const u = clamp01(t);
		return u * u * u;
	}

	function easeInOutQuad(t) {
		const u = clamp01(t);
		return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
	}

	function hash01(seed) {
		const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
		return s - Math.floor(s);
	}

	function gray(lum, alpha) {
		const c = clamp(Math.round(lum), 0, 255);
		const a = alpha === undefined ? 255 : clamp(Math.round(alpha), 0, 255);
		return [c, c, c, a];
	}

	// Calibrated Universal Grayscale Palettes (safe for Red, Green, Blue, Black, White tinting!)
	const GRAY = {
		// Preset 1: Alpha Crisp — solid pixel-art hits, projectiles, pillars, rubble, icons
		ALPHA_CRISP: {
			OUTLINE: [24, 24, 28, 255],
			SHADOW:  [68, 68, 74, 255],
			DARK:    [112, 112, 118, 255],
			MID:     [168, 168, 174, 255],
			BRIGHT:  [216, 216, 222, 255],
			HOT:     [242, 242, 246, 255],
			CORE:    [255, 255, 255, 255],
		},
		// Preset 2: Soft Transparent — aura, floor_effect, barrier, rise_particles, charge, beam glow
		SOFT_TRANSPARENT: {
			RIM:     [96, 96, 104, 155],
			FAINT:   [148, 148, 155, 76],
			SOFT:    [178, 178, 185, 132],
			MID:     [208, 208, 214, 182],
			BRIGHT:  [234, 234, 240, 224],
			CORE:    [255, 255, 255, 246],
		},
	};

	// Kybermon 5 Elements + Raw Grayscale for universal shader/canvas tinting
	const ELEMENTS = {
		GRAY:  { id: "GRAY",  name: "Grayscale (Raw)", hex: "#DCE2EC", rgb: [0.92, 0.94, 0.98], hot: [1.00, 1.00, 1.00], rim: [0.88, 0.90, 0.95], isDark: false },
		RED:   { id: "RED",   name: "Red",             hex: "#E62240", rgb: [0.95, 0.16, 0.27], hot: [1.00, 0.72, 0.62], rim: [1.00, 0.42, 0.46], isDark: false },
		GREEN: { id: "GREEN", name: "Green",           hex: "#28CC62", rgb: [0.18, 0.86, 0.42], hot: [0.80, 1.00, 0.72], rim: [0.46, 0.98, 0.62], isDark: false },
		BLUE:  { id: "BLUE",  name: "Blue",            hex: "#2C94FF", rgb: [0.20, 0.60, 1.00], hot: [0.76, 0.95, 1.00], rim: [0.46, 0.82, 1.00], isDark: false },
		BLACK: { id: "BLACK", name: "Black",           hex: "#6B5294", rgb: [0.22, 0.17, 0.30], hot: [0.78, 0.66, 0.98], rim: [0.58, 0.44, 0.86], isDark: true  },
		WHITE: { id: "WHITE", name: "White",           hex: "#F2F6FF", rgb: [0.96, 0.98, 1.00], hot: [1.00, 1.00, 1.00], rim: [0.74, 0.84, 0.98], isDark: false },
	};

	// Modular Anti-Mewah Tier Presets (exact Kybermon progression!)
	const TIERS = {
		common_uncommon: {
			id: "common_uncommon",
			label: "Common / Uncommon",
			short: "C / U",
			scaleMult: 0.80,
			layerCount: 1,
			showCharge: false,
			showFloorRing: false,
			showSecondaryImpact: false,
			showAuraAccent: false,
			dualColor: false,
			shakePower: 0.0,
			desc: "1 layer minimal, ukuran compact (0.80x), cepat pudar, tanpa shockwave/shake tambahan.",
		},
		combine_cc_uc: {
			id: "combine_cc_uc",
			label: "Combine (C+C, U+C)",
			short: "C+C / U+C",
			scaleMult: 0.95,
			layerCount: 2,
			showCharge: true,
			showFloorRing: false,
			showSecondaryImpact: true,
			showAuraAccent: false,
			dualColor: false,
			shakePower: 0.30,
			desc: "1-2 layer: base VFX + accent charge/impact ringan, skala standar (0.95x).",
		},
		rare: {
			id: "rare",
			label: "Rare",
			short: "Rare",
			scaleMult: 1.08,
			layerCount: 2,
			showCharge: true,
			showFloorRing: true,
			showSecondaryImpact: true,
			showAuraAccent: false,
			dualColor: false,
			shakePower: 0.55,
			desc: "2 layer: base VFX (1.08x) + ring lantai / impact pendukung + hit punch tegas.",
		},
		combine_uu_cr: {
			id: "combine_uu_cr",
			label: "Combine (U+U, C+R)",
			short: "U+U / C+R",
			scaleMult: 1.18,
			layerCount: 3,
			showCharge: true,
			showFloorRing: true,
			showSecondaryImpact: true,
			showAuraAccent: true,
			dualColor: true,
			shakePower: 0.80,
			desc: "2-3 layer + Dual-Color Tint (warna Elemen 1 di inti + Elemen 2 di ring/aura fusi).",
		},
		epic: {
			id: "epic",
			label: "Epic",
			short: "Epic",
			scaleMult: 1.32,
			layerCount: 4,
			showCharge: true,
			showFloorRing: true,
			showSecondaryImpact: true,
			showAuraAccent: true,
			dualColor: true,
			shakePower: 1.10,
			desc: "3-4 layer penuh 10 fase (Charge + Aura + Travel + Crossed Impact + Floor/Debris, 1.32x).",
		},
	};

	const CATEGORIES = [
		{ id: "all",      label: "All (32)" },
		{ id: "support",  label: "Support & Aura (7)" },
		{ id: "delivery", label: "Travel & Delivery (7)" },
		{ id: "hits",     label: "Contact Hits (8)" },
		{ id: "world",    label: "Area & World (6)" },
		{ id: "status",   label: "Kybermon Status (4)" },
	];

	// =========================================================================
	// INTEGER PIXEL BUFFER (64x64 default, strict 2px Roblox UV safe margin)
	// =========================================================================
	class PixelBuffer {
		constructor(size, margin) {
			this.size = size || 64;
			this.margin = margin === undefined ? 2 : margin;
			this.minCoord = this.margin;
			this.maxCoord = this.size - 1 - this.margin;
			this.data = new Uint8ClampedArray(this.size * this.size * 4);
		}

		clear() {
			this.data.fill(0);
		}

		inSafeBounds(x, y) {
			return x >= this.minCoord && x <= this.maxCoord && y >= this.minCoord && y <= this.maxCoord;
		}

		// Standard pixel write; if alpha < 255, alpha-blends cleanly over existing pixel
		setPixel(x, y, col, ditherMode) {
			if (!col) return;
			const ix = Math.round(x);
			const iy = Math.round(y);
			if (ix < this.minCoord || ix > this.maxCoord || iy < this.minCoord || iy > this.maxCoord) return;
			if (!passDither(ix, iy, ditherMode)) return;

			const off = (iy * this.size + ix) * 4;
			const sa = col.length > 3 ? col[3] : 255;
			if (sa <= 0) return;

			if (sa >= 255 || this.data[off + 3] === 0) {
				this.data[off]     = col[0];
				this.data[off + 1] = col[1];
				this.data[off + 2] = col[2];
				this.data[off + 3] = sa;
				return;
			}

			// Porter-Duff source-over integer blend for translucent soft layers
			const da = this.data[off + 3];
			const invSa = 255 - sa;
			const outA = sa + Math.round((da * invSa) / 255);
			if (outA <= 0) return;
			this.data[off]     = Math.round((col[0] * sa + this.data[off]     * da * invSa / 255) / outA);
			this.data[off + 1] = Math.round((col[1] * sa + this.data[off + 1] * da * invSa / 255) / outA);
			this.data[off + 2] = Math.round((col[2] * sa + this.data[off + 2] * da * invSa / 255) / outA);
			this.data[off + 3] = outA;
		}

		// Force-replace pixel (even with lower alpha or transparent [0,0,0,0] for carving holes)
		replacePixel(x, y, col, ditherMode) {
			if (!col) return;
			const ix = Math.round(x);
			const iy = Math.round(y);
			if (ix < this.minCoord || ix > this.maxCoord || iy < this.minCoord || iy > this.maxCoord) return;
			if (!passDither(ix, iy, ditherMode)) return;
			const off = (iy * this.size + ix) * 4;
			this.data[off]     = col[0];
			this.data[off + 1] = col[1];
			this.data[off + 2] = col[2];
			this.data[off + 3] = col.length > 3 ? col[3] : 255;
		}

		getAlpha(x, y) {
			const ix = Math.round(x);
			const iy = Math.round(y);
			if (ix < 0 || ix >= this.size || iy < 0 || iy >= this.size) return 0;
			return this.data[(iy * this.size + ix) * 4 + 3];
		}

		fillRect(x, y, w, h, col, ditherMode) {
			const x0 = Math.round(x);
			const y0 = Math.round(y);
			const x1 = Math.round(x + w - 1);
			const y1 = Math.round(y + h - 1);
			for (let py = y0; py <= y1; py++) {
				for (let px = x0; px <= x1; px++) {
					this.setPixel(px, py, col, ditherMode);
				}
			}
		}

		strokeRect(x, y, w, h, col, thickness, ditherMode) {
			const t = Math.max(1, Math.round(thickness || 1));
			this.fillRect(x, y, w, t, col, ditherMode);
			this.fillRect(x, y + h - t, w, t, col, ditherMode);
			this.fillRect(x, y, t, h, col, ditherMode);
			this.fillRect(x + w - t, y, t, h, col, ditherMode);
		}

		// Bresenham integer line with optional pixel thickness
		drawLine(x0, y0, x1, y1, col, thickness, ditherMode) {
			let ix0 = Math.round(x0);
			let iy0 = Math.round(y0);
			const ix1 = Math.round(x1);
			const iy1 = Math.round(y1);
			const t = Math.max(1, Math.round(thickness || 1));
			const r = Math.floor(t / 2);

			const dx = Math.abs(ix1 - ix0);
			const dy = -Math.abs(iy1 - iy0);
			const sx = ix0 < ix1 ? 1 : -1;
			const sy = iy0 < iy1 ? 1 : -1;
			let err = dx + dy;

			for (let guard = 0; guard < 512; guard++) {
				if (t === 1) {
					this.setPixel(ix0, iy0, col, ditherMode);
				} else {
					for (let oy = -r; oy <= r; oy++) {
						for (let ox = -r; ox <= r; ox++) {
							if (ox * ox + oy * oy <= r * r + (t % 2 === 0 ? 1 : 0)) {
								this.setPixel(ix0 + ox, iy0 + oy, col, ditherMode);
							}
						}
					}
				}
				if (ix0 === ix1 && iy0 === iy1) break;
				const e2 = 2 * err;
				if (e2 >= dy) { err += dy; ix0 += sx; }
				if (e2 <= dx) { err += dx; iy0 += sy; }
			}
		}

		fillCircle(cx, cy, r, col, ditherMode) {
			if (r <= 0.3) return;
			const r2 = r * r;
			const minX = Math.max(this.minCoord, Math.floor(cx - r));
			const maxX = Math.min(this.maxCoord, Math.ceil(cx + r));
			const minY = Math.max(this.minCoord, Math.floor(cy - r));
			const maxY = Math.min(this.maxCoord, Math.ceil(cy + r));
			for (let y = minY; y <= maxY; y++) {
				const dy = y - cy;
				for (let x = minX; x <= maxX; x++) {
					const dx = x - cx;
					if (dx * dx + dy * dy <= r2) {
						this.setPixel(x, y, col, ditherMode);
					}
				}
			}
		}

		fillRing(cx, cy, rOut, rIn, col, ditherMode) {
			if (rOut <= 0.5 || rOut <= rIn) return;
			const rOut2 = rOut * rOut;
			const rIn2 = Math.max(0, rIn) * Math.max(0, rIn);
			const minX = Math.max(this.minCoord, Math.floor(cx - rOut));
			const maxX = Math.min(this.maxCoord, Math.ceil(cx + rOut));
			const minY = Math.max(this.minCoord, Math.floor(cy - rOut));
			const maxY = Math.min(this.maxCoord, Math.ceil(cy + rOut));
			for (let y = minY; y <= maxY; y++) {
				const dy = y - cy;
				for (let x = minX; x <= maxX; x++) {
					const dx = x - cx;
					const d2 = dx * dx + dy * dy;
					if (d2 <= rOut2 && d2 >= rIn2) {
						this.setPixel(x, y, col, ditherMode);
					}
				}
			}
		}

		strokeCircle(cx, cy, r, col, thickness, ditherMode) {
			const t = Math.max(1, thickness || 1);
			this.fillRing(cx, cy, r + t * 0.5, Math.max(0, r - t * 0.5), col, ditherMode);
		}

		fillEllipse(cx, cy, rx, ry, rotRad, col, ditherMode) {
			if (rx <= 0.4 || ry <= 0.4) return;
			const ca = Math.cos(-(rotRad || 0));
			const sa = Math.sin(-(rotRad || 0));
			const bound = Math.max(rx, ry) + 1;
			const minX = Math.max(this.minCoord, Math.floor(cx - bound));
			const maxX = Math.min(this.maxCoord, Math.ceil(cx + bound));
			const minY = Math.max(this.minCoord, Math.floor(cy - bound));
			const maxY = Math.min(this.maxCoord, Math.ceil(cy + bound));
			const invRx2 = 1 / (rx * rx);
			const invRy2 = 1 / (ry * ry);
			for (let y = minY; y <= maxY; y++) {
				const dy = y - cy;
				for (let x = minX; x <= maxX; x++) {
					const dx = x - cx;
					const lx = dx * ca - dy * sa;
					const ly = dx * sa + dy * ca;
					if (lx * lx * invRx2 + ly * ly * invRy2 <= 1.0) {
						this.setPixel(x, y, col, ditherMode);
					}
				}
			}
		}

		fillEllipseRing(cx, cy, rxOut, ryOut, rxIn, ryIn, rotRad, col, ditherMode) {
			if (rxOut <= 0.5 || ryOut <= 0.5) return;
			const ca = Math.cos(-(rotRad || 0));
			const sa = Math.sin(-(rotRad || 0));
			const bound = Math.max(rxOut, ryOut) + 1;
			const minX = Math.max(this.minCoord, Math.floor(cx - bound));
			const maxX = Math.min(this.maxCoord, Math.ceil(cx + bound));
			const minY = Math.max(this.minCoord, Math.floor(cy - bound));
			const maxY = Math.min(this.maxCoord, Math.ceil(cy + bound));
			const oRx2 = 1 / (rxOut * rxOut);
			const oRy2 = 1 / (ryOut * ryOut);
			const hasIn = rxIn > 0.2 && ryIn > 0.2;
			const iRx2 = hasIn ? 1 / (rxIn * rxIn) : 0;
			const iRy2 = hasIn ? 1 / (ryIn * ryIn) : 0;
			for (let y = minY; y <= maxY; y++) {
				const dy = y - cy;
				for (let x = minX; x <= maxX; x++) {
					const dx = x - cx;
					const lx = dx * ca - dy * sa;
					const ly = dx * sa + dy * ca;
					const outD = lx * lx * oRx2 + ly * ly * oRy2;
					if (outD <= 1.0) {
						if (!hasIn || lx * lx * iRx2 + ly * ly * iRy2 >= 1.0) {
							this.setPixel(x, y, col, ditherMode);
						}
					}
				}
			}
		}

		strokeEllipse(cx, cy, rx, ry, rotRad, col, thickness, ditherMode) {
			const t = Math.max(1, thickness || 1);
			this.fillEllipseRing(cx, cy, rx + t * 0.5, ry + t * 0.5, Math.max(0.2, rx - t * 0.5), Math.max(0.2, ry - t * 0.5), rotRad, col, ditherMode);
		}

		// Exact barycentric triangle rasterizer (zero anti-aliasing)
		fillTriangle(x0, y0, x1, y1, x2, y2, col, ditherMode) {
			const minX = Math.max(this.minCoord, Math.floor(Math.min(x0, x1, x2)));
			const maxX = Math.min(this.maxCoord, Math.ceil(Math.max(x0, x1, x2)));
			const minY = Math.max(this.minCoord, Math.floor(Math.min(y0, y1, y2)));
			const maxY = Math.min(this.maxCoord, Math.ceil(Math.max(y0, y1, y2)));

			let area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
			if (Math.abs(area) < 0.01) return;
			const sign = area > 0 ? 1 : -1;

			for (let py = minY; py <= maxY; py++) {
				for (let px = minX; px <= maxX; px++) {
					const w0 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * sign;
					const w1 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * sign;
					const w2 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * sign;
					if (w0 >= -0.001 && w1 >= -0.001 && w2 >= -0.001) {
						this.setPixel(px, py, col, ditherMode);
					}
				}
			}
		}

		fillEqTriangle(cx, cy, r, angleRad, col, ditherMode) {
			if (r < 0.5) return;
			const a0 = angleRad || 0;
			const a1 = a0 + (Math.PI * 2) / 3;
			const a2 = a0 + (Math.PI * 4) / 3;
			this.fillTriangle(
				cx + Math.cos(a0) * r, cy + Math.sin(a0) * r,
				cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
				cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
				col, ditherMode
			);
		}

		strokeEqTriangle(cx, cy, r, angleRad, col, thickness, ditherMode) {
			if (r < 0.5) return;
			const a0 = angleRad || 0;
			const a1 = a0 + (Math.PI * 2) / 3;
			const a2 = a0 + (Math.PI * 4) / 3;
			const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
			const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
			const p2 = [cx + Math.cos(a2) * r, cy + Math.sin(a2) * r];
			this.drawLine(p0[0], p0[1], p1[0], p1[1], col, thickness || 1, ditherMode);
			this.drawLine(p1[0], p1[1], p2[0], p2[1], col, thickness || 1, ditherMode);
			this.drawLine(p2[0], p2[1], p0[0], p0[1], col, thickness || 1, ditherMode);
		}

		fillIsoTriangle(cx, cy, r, angleRad, stretch, col, ditherMode, baseWidthRatio) {
			if (r < 0.5) return;
			const st = stretch || 1.5;
			const bw = baseWidthRatio || 0.65;
			const ca = Math.cos(angleRad || 0);
			const sa = Math.sin(angleRad || 0);
			const tipX = cx + ca * r * st;
			const tipY = cy + sa * r * st;
			const bx = cx - ca * r * 0.65;
			const by = cy - sa * r * 0.65;
			const px = -sa * r * bw;
			const py = ca * r * bw;
			this.fillTriangle(tipX, tipY, bx + px, by + py, bx - px, by - py, col, ditherMode);
		}

		fillTriRing(cx, cy, rOut, rIn, angleRad, col, ditherMode) {
			if (rOut <= 0.5 || rOut <= rIn) return;
			const a0 = angleRad || 0;
			const outPts = [];
			const inPts = [];
			for (let k = 0; k < 3; k++) {
				const a = a0 + (k * Math.PI * 2) / 3;
				outPts.push([cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut]);
				inPts.push([cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn]);
			}
			for (let k = 0; k < 3; k++) {
				const n = (k + 1) % 3;
				this.fillTriangle(outPts[k][0], outPts[k][1], outPts[n][0], outPts[n][1], inPts[k][0], inPts[k][1], col, ditherMode);
				this.fillTriangle(outPts[n][0], outPts[n][1], inPts[n][0], inPts[n][1], inPts[k][0], inPts[k][1], col, ditherMode);
			}
		}

		// Convex or simple polygon scanline fill (for rocks/rubble, hex barriers, claws, jaws, cracks)
		fillPolygon(points, col, ditherMode) {
			if (!points || points.length < 3) return;
			let minY = Infinity;
			let maxY = -Infinity;
			for (let i = 0; i < points.length; i++) {
				if (points[i][1] < minY) minY = points[i][1];
				if (points[i][1] > maxY) maxY = points[i][1];
			}
			const y0 = Math.max(this.minCoord, Math.floor(minY));
			const y1 = Math.min(this.maxCoord, Math.ceil(maxY));
			const n = points.length;
			const nodes = [];

			for (let y = y0; y <= y1; y++) {
				nodes.length = 0;
				const py = y + 0.001;
				let j = n - 1;
				for (let i = 0; i < n; i++) {
					const yi = points[i][1];
					const yj = points[j][1];
					if ((yi < py && yj >= py) || (yj < py && yi >= py)) {
						const x = points[i][0] + ((py - yi) / (yj - yi)) * (points[j][0] - points[i][0]);
						nodes.push(x);
					}
					j = i;
				}
				nodes.sort((a, b) => a - b);
				for (let i = 0; i + 1 < nodes.length; i += 2) {
					const xStart = Math.max(this.minCoord, Math.ceil(nodes[i]));
					const xEnd = Math.min(this.maxCoord, Math.floor(nodes[i + 1]));
					for (let x = xStart; x <= xEnd; x++) {
						this.setPixel(x, y, col, ditherMode);
					}
				}
			}
		}

		strokePolygon(points, col, thickness, ditherMode) {
			if (!points || points.length < 2) return;
			const n = points.length;
			for (let i = 0; i < n; i++) {
				const a = points[i];
				const b = points[(i + 1) % n];
				this.drawLine(a[0], a[1], b[0], b[1], col, thickness || 1, ditherMode);
			}
		}

		fillRegularPoly(cx, cy, r, sides, angleRad, col, ditherMode) {
			if (r < 0.6 || sides < 3) return;
			const pts = [];
			for (let i = 0; i < sides; i++) {
				const a = (angleRad || 0) + (i * Math.PI * 2) / sides;
				pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
			}
			this.fillPolygon(pts, col, ditherMode);
		}

		strokeRegularPoly(cx, cy, r, sides, angleRad, col, thickness, ditherMode) {
			if (r < 0.6 || sides < 3) return;
			const pts = [];
			for (let i = 0; i < sides; i++) {
				const a = (angleRad || 0) + (i * Math.PI * 2) / sides;
				pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
			}
			this.strokePolygon(pts, col, thickness || 1, ditherMode);
		}

		// Curved tapered slash / swipe / wave band between [aStart..aEnd]
		fillArcBand(cx, cy, rIn, rOut, aStart, aEnd, steps, col, ditherMode, taperEnds) {
			const segs = Math.max(3, steps || 10);
			for (let i = 0; i < segs; i++) {
				const u0 = i / segs;
				const u1 = (i + 1) / segs;
				const a0 = lerp(aStart, aEnd, u0);
				const a1 = lerp(aStart, aEnd, u1);
				const t0 = taperEnds ? Math.sin(u0 * Math.PI) : 1.0;
				const t1 = taperEnds ? Math.sin(u1 * Math.PI) : 1.0;
				const midR = (rIn + rOut) * 0.5;
				const halfW = (rOut - rIn) * 0.5;
				const rIn0 = midR - halfW * t0;
				const rOut0 = midR + halfW * t0;
				const rIn1 = midR - halfW * t1;
				const rOut1 = midR + halfW * t1;
				const p0 = [cx + Math.cos(a0) * rIn0, cy + Math.sin(a0) * rIn0];
				const p1 = [cx + Math.cos(a0) * rOut0, cy + Math.sin(a0) * rOut0];
				const p2 = [cx + Math.cos(a1) * rOut1, cy + Math.sin(a1) * rOut1];
				const p3 = [cx + Math.cos(a1) * rIn1, cy + Math.sin(a1) * rIn1];
				this.fillTriangle(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], col, ditherMode);
				this.fillTriangle(p0[0], p0[1], p2[0], p2[1], p3[0], p3[1], col, ditherMode);
			}
		}

		// Directional rotated chevron (pointing along angleRad)
		fillChevron(tipX, tipY, length, halfH, notchDepth, angleRad, col, ditherMode) {
			const ca = Math.cos(angleRad || 0);
			const sa = Math.sin(angleRad || 0);
			const bx = tipX - ca * length;
			const by = tipY - sa * length;
			const nx = tipX - ca * notchDepth;
			const ny = tipY - sa * notchDepth;
			const px = -sa * halfH;
			const py = ca * halfH;
			this.fillTriangle(tipX, tipY, bx + px, by + py, nx, ny, col, ditherMode);
			this.fillTriangle(tipX, tipY, nx, ny, bx - px, by - py, col, ditherMode);
		}

		// Sharp directional needle/spike pointing along angleRad
		fillNeedle(tipX, tipY, length, halfW, angleRad, col, ditherMode) {
			const ca = Math.cos(angleRad || 0);
			const sa = Math.sin(angleRad || 0);
			const bx = tipX - ca * length;
			const by = tipY - sa * length;
			const px = -sa * halfW;
			const py = ca * halfW;
			this.fillTriangle(tipX, tipY, bx + px, by + py, bx - px, by - py, col, ditherMode);
			if (halfW <= 2.1) {
				this.drawLine(tipX, tipY, bx, by, col, 1, ditherMode);
			}
		}

		// 4-neighbor crisp 1px pixel silhouette outline (respects safe margin & minAlpha threshold)
		addOutline(outlineCol, minAlpha) {
			const col = outlineCol || GRAY.ALPHA_CRISP.OUTLINE;
			const thresh = minAlpha === undefined ? 180 : minAlpha;
			const s = this.size;
			const src = new Uint8ClampedArray(this.data);
			const toDraw = [];

			for (let y = this.minCoord; y <= this.maxCoord; y++) {
				for (let x = this.minCoord; x <= this.maxCoord; x++) {
					const idx = (y * s + x) * 4;
					if (src[idx + 3] >= thresh) continue;
					const hasSolidNeighbor =
						(x > 0 && src[(y * s + (x - 1)) * 4 + 3] >= thresh) ||
						(x < s - 1 && src[(y * s + (x + 1)) * 4 + 3] >= thresh) ||
						(y > 0 && src[((y - 1) * s + x) * 4 + 3] >= thresh) ||
						(y < s - 1 && src[((y + 1) * s + x) * 4 + 3] >= thresh);
					if (hasSolidNeighbor) {
						toDraw.push(idx);
					}
				}
			}

			for (let i = 0; i < toDraw.length; i++) {
				const off = toDraw[i];
				if (this.data[off + 3] === 0) {
					this.data[off]     = col[0];
					this.data[off + 1] = col[1];
					this.data[off + 2] = col[2];
					this.data[off + 3] = col.length > 3 ? col[3] : 255;
				}
			}
		}

		// Carve circular/rectangular inner negative space cleanly (useful for rings/portals)
		eraseCircle(cx, cy, r) {
			const r2 = r * r;
			const minX = Math.max(this.minCoord, Math.floor(cx - r));
			const maxX = Math.min(this.maxCoord, Math.ceil(cx + r));
			const minY = Math.max(this.minCoord, Math.floor(cy - r));
			const maxY = Math.min(this.maxCoord, Math.ceil(cy + r));
			for (let y = minY; y <= maxY; y++) {
				const dy = y - cy;
				for (let x = minX; x <= maxX; x++) {
					const dx = x - cx;
					if (dx * dx + dy * dy <= r2) {
						const off = (y * this.size + x) * 4;
						this.data[off] = 0;
						this.data[off + 1] = 0;
						this.data[off + 2] = 0;
						this.data[off + 3] = 0;
					}
				}
			}
		}

		blitToContext(ctx, dx, dy, scale) {
			const sc = scale || 1;
			if (!this._offCanvas) {
				this._offCanvas = document.createElement("canvas");
				this._offCanvas.width = this.size;
				this._offCanvas.height = this.size;
			}
			const offCtx = this._offCanvas.getContext("2d");
			const imgData = offCtx.createImageData(this.size, this.size);
			imgData.data.set(this.data);
			offCtx.putImageData(imgData, 0, 0);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(this._offCanvas, dx || 0, dy || 0, this.size * sc, this.size * sc);
		}
	}

	window.PixelEngine = {
		PixelBuffer,
		GRAY,
		ELEMENTS,
		TIERS,
		CATEGORIES,
		gray,
		clamp,
		clamp01,
		lerp,
		easeOutQuad,
		easeOutCubic,
		easeInQuad,
		easeInCubic,
		easeInOutQuad,
		hash01,
	};

	window.KYBERMON_PIXEL_VFX = window.KYBERMON_PIXEL_VFX || [];
})();
