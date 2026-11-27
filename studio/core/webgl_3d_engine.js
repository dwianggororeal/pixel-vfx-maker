// Kybermon Pixel VFX 3D Studio — Pure WebGL 3D Plane Renderer
// 100% zero external dependencies, zero CDN, 100% offline file:/// compatible.
// Classic IIFE attaching window.WebGL3DEngine.

(function () {
	"use strict";

	// =========================================================================
	// COMPACT 3D VECTOR & COLUMN-MAJOR MAT4 / MAT3 MATH
	// =========================================================================
	function clamp(v, lo, hi) {
		return v < lo ? lo : v > hi ? hi : v;
	}

	function clamp01(v) {
		return v < 0 ? 0 : v > 1 ? 1 : v;
	}

	function vec3Normalize(out, v) {
		const len = Math.hypot(v[0], v[1], v[2]);
		if (len > 1e-6) {
			const inv = 1.0 / len;
			out[0] = v[0] * inv;
			out[1] = v[1] * inv;
			out[2] = v[2] * inv;
		} else {
			out[0] = 0;
			out[1] = 0;
			out[2] = 0;
		}
		return out;
	}

	function vec3Cross(out, a, b) {
		const ax = a[0], ay = a[1], az = a[2];
		const bx = b[0], by = b[1], bz = b[2];
		out[0] = ay * bz - az * by;
		out[1] = az * bx - ax * bz;
		out[2] = ax * by - ay * bx;
		return out;
	}

	function vec3Dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	}

	function mat4Create() {
		const m = new Float32Array(16);
		m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
		return m;
	}

	function mat4Identity(out) {
		out.fill(0);
		out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
		return out;
	}

	function mat4Copy(out, a) {
		out.set(a);
		return out;
	}

	function mat4Multiply(out, a, b) {
		const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3];
		const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7];
		const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11];
		const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

		for (let c = 0; c < 4; c++) {
			const off = c * 4;
			const b0 = b[off];
			const b1 = b[off + 1];
			const b2 = b[off + 2];
			const b3 = b[off + 3];
			out[off]     = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
			out[off + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
			out[off + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
			out[off + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
		}
		return out;
	}

	function mat4Translate(out, a, x, y, z) {
		if (out !== a) out.set(a);
		out[12] = a[0] * x + a[4] * y + a[8]  * z + a[12];
		out[13] = a[1] * x + a[5] * y + a[9]  * z + a[13];
		out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
		out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
		return out;
	}

	function mat4Scale(out, a, x, y, z) {
		out[0]  = a[0]  * x; out[1]  = a[1]  * x; out[2]  = a[2]  * x; out[3]  = a[3]  * x;
		out[4]  = a[4]  * y; out[5]  = a[5]  * y; out[6]  = a[6]  * y; out[7]  = a[7]  * y;
		out[8]  = a[8]  * z; out[9]  = a[9]  * z; out[10] = a[10] * z; out[11] = a[11] * z;
		out[12] = a[12];     out[13] = a[13];     out[14] = a[14];     out[15] = a[15];
		return out;
	}

	function mat4RotateX(out, a, rad) {
		const s = Math.sin(rad);
		const c = Math.cos(rad);
		const a10 = a[4], a11 = a[5], a12 = a[6],  a13 = a[7];
		const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
		if (out !== a) {
			out[0]  = a[0];  out[1]  = a[1];  out[2]  = a[2];  out[3]  = a[3];
			out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
		}
		out[4]  = a10 * c + a20 * s;
		out[5]  = a11 * c + a21 * s;
		out[6]  = a12 * c + a22 * s;
		out[7]  = a13 * c + a23 * s;
		out[8]  = a20 * c - a10 * s;
		out[9]  = a21 * c - a11 * s;
		out[10] = a22 * c - a12 * s;
		out[11] = a23 * c - a13 * s;
		return out;
	}

	function mat4RotateY(out, a, rad) {
		const s = Math.sin(rad);
		const c = Math.cos(rad);
		const a00 = a[0], a01 = a[1], a02 = a[2],  a03 = a[3];
		const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
		if (out !== a) {
			out[4]  = a[4];  out[5]  = a[5];  out[6]  = a[6];  out[7]  = a[7];
			out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
		}
		out[0]  = a00 * c - a20 * s;
		out[1]  = a01 * c - a21 * s;
		out[2]  = a02 * c - a22 * s;
		out[3]  = a03 * c - a23 * s;
		out[8]  = a00 * s + a20 * c;
		out[9]  = a01 * s + a21 * c;
		out[10] = a02 * s + a22 * c;
		out[11] = a03 * s + a23 * c;
		return out;
	}

	function mat4RotateZ(out, a, rad) {
		const s = Math.sin(rad);
		const c = Math.cos(rad);
		const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
		const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
		if (out !== a) {
			out[8]  = a[8];  out[9]  = a[9];  out[10] = a[10]; out[11] = a[11];
			out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
		}
		out[0] = a00 * c + a10 * s;
		out[1] = a01 * c + a11 * s;
		out[2] = a02 * c + a12 * s;
		out[3] = a03 * c + a13 * s;
		out[4] = a10 * c - a00 * s;
		out[5] = a11 * c - a01 * s;
		out[6] = a12 * c - a02 * s;
		out[7] = a13 * c - a03 * s;
		return out;
	}

	function mat4Perspective(out, fovYRad, aspect, near, far) {
		const f = 1.0 / Math.tan(fovYRad * 0.5);
		const nf = 1.0 / (near - far);
		out.fill(0);
		out[0]  = f / Math.max(0.01, aspect);
		out[5]  = f;
		out[10] = (far + near) * nf;
		out[11] = -1.0;
		out[14] = (2.0 * far * near) * nf;
		return out;
	}

	function mat4LookAt(out, eye, target, up, basisOut) {
		const zx = eye[0] - target[0];
		const zy = eye[1] - target[1];
		const zz = eye[2] - target[2];
		const zAxis = vec3Normalize([0, 0, 1], [zx, zy, zz]);
		if (zAxis[0] === 0 && zAxis[1] === 0 && zAxis[2] === 0) {
			zAxis[2] = 1;
		}
		const xAxis = vec3Normalize([1, 0, 0], vec3Cross([0, 0, 0], up, zAxis));
		if (xAxis[0] === 0 && xAxis[1] === 0 && xAxis[2] === 0) {
			xAxis[0] = 1;
		}
		const yAxis = vec3Cross([0, 0, 0], zAxis, xAxis);

		out[0] = xAxis[0]; out[1] = yAxis[0]; out[2]  = zAxis[0]; out[3]  = 0;
		out[4] = xAxis[1]; out[5] = yAxis[1]; out[6]  = zAxis[1]; out[7]  = 0;
		out[8] = xAxis[2]; out[9] = yAxis[2]; out[10] = zAxis[2]; out[11] = 0;
		out[12] = -vec3Dot(xAxis, eye);
		out[13] = -vec3Dot(yAxis, eye);
		out[14] = -vec3Dot(zAxis, eye);
		out[15] = 1;

		if (basisOut) {
			basisOut.right[0] = xAxis[0]; basisOut.right[1] = xAxis[1]; basisOut.right[2] = xAxis[2];
			basisOut.up[0]    = yAxis[0]; basisOut.up[1]    = yAxis[1]; basisOut.up[2]    = yAxis[2];
			basisOut.forward[0] = -zAxis[0]; basisOut.forward[1] = -zAxis[1]; basisOut.forward[2] = -zAxis[2];
		}
		return out;
	}

	// Exact inverse-transpose upper-left 3x3 normal matrix from column-major mat4
	function mat3NormalFromMat4(out, m) {
		const a00 = m[0], a01 = m[1], a02 = m[2];
		const a10 = m[4], a11 = m[5], a12 = m[6];
		const a20 = m[8], a21 = m[9], a22 = m[10];

		const b00 = a11 * a22 - a12 * a21;
		const b01 = a12 * a20 - a10 * a22;
		const b02 = a10 * a21 - a11 * a20;

		const b10 = a02 * a21 - a01 * a22;
		const b11 = a00 * a22 - a02 * a20;
		const b12 = a01 * a20 - a00 * a21;

		const b20 = a01 * a12 - a02 * a11;
		const b21 = a02 * a10 - a00 * a12;
		const b22 = a00 * a11 - a01 * a10;

		const det = a00 * b00 + a01 * b01 + a02 * b02;
		if (Math.abs(det) < 1e-8) {
			out[0] = 1; out[1] = 0; out[2] = 0;
			out[3] = 0; out[4] = 1; out[5] = 0;
			out[6] = 0; out[7] = 0; out[8] = 1;
			return out;
		}
		const invDet = 1.0 / det;
		out[0] = b00 * invDet; out[1] = b01 * invDet; out[2] = b02 * invDet;
		out[3] = b10 * invDet; out[4] = b11 * invDet; out[5] = b12 * invDet;
		out[6] = b20 * invDet; out[7] = b21 * invDet; out[8] = b22 * invDet;
		return out;
	}

	// =========================================================================
	// SHADERS (Lit 3D Boxes/Arena, Unlit Color Lines, Crisp Pixel-Art VFX Planes)
	// =========================================================================
	const MESH_VS = [
		"attribute vec3 aPos;",
		"attribute vec3 aNormal;",
		"uniform mat4 uViewProj;",
		"uniform mat4 uModel;",
		"uniform mat3 uNormalMat;",
		"varying vec3 vNormal;",
		"varying vec3 vWorldPos;",
		"void main() {",
		"  vec4 wp = uModel * vec4(aPos, 1.0);",
		"  vWorldPos = wp.xyz;",
		"  vNormal = normalize(uNormalMat * aNormal);",
		"  gl_Position = uViewProj * wp;",
		"}",
	].join("\n");

	const MESH_FS = [
		"precision mediump float;",
		"varying vec3 vNormal;",
		"varying vec3 vWorldPos;",
		"uniform vec3 uColor;",
		"uniform float uAlpha;",
		"uniform float uFlashWhite;",
		"uniform float uUnlit;",
		"uniform vec3 uAmbientSky;",
		"uniform vec3 uAmbientGround;",
		"void main() {",
		"  vec3 n = normalize(vNormal);",
		"  vec3 keyDir = normalize(vec3(0.45, 0.85, 0.55));",
		"  vec3 rimDir = normalize(vec3(-0.62, 0.34, -0.52));",
		"  float keyDiff = max(dot(n, keyDir), 0.0);",
		"  float rimDiff = max(dot(n, rimDir), 0.0);",
		"  float hemi = n.y * 0.5 + 0.5;",
		"  vec3 ambient = mix(uAmbientGround, uAmbientSky, hemi);",
		"  vec3 lit = uColor * (ambient + vec3(0.76, 0.77, 0.80) * keyDiff + vec3(0.20, 0.24, 0.32) * rimDiff);",
		"  vec3 baseCol = mix(lit, uColor, uUnlit);",
		"  vec3 finalCol = mix(baseCol, vec3(1.0, 1.0, 1.0), clamp(uFlashWhite, 0.0, 1.0));",
		"  gl_FragColor = vec4(finalCol, uAlpha);",
		"}",
	].join("\n");

	// Per-vertex colored 3D lines & unlit quads (grid lines, wireframes, HP bar)
	const COLOR_VS = [
		"attribute vec3 aPos;",
		"attribute vec4 aColor;",
		"uniform mat4 uViewProj;",
		"varying vec4 vColor;",
		"void main() {",
		"  vColor = aColor;",
		"  gl_Position = uViewProj * vec4(aPos, 1.0);",
		"}",
	].join("\n");

	const COLOR_FS = [
		"precision mediump float;",
		"varying vec4 vColor;",
		"void main() {",
		"  gl_FragColor = vColor;",
		"}",
	].join("\n");

	// Crisp Nearest-Neighbor Pixel-Art Grayscale Tinting Shader (Black & White Safe!)
	const VFX_VS = [
		"attribute vec3 aPos;",
		"attribute vec2 aUv;",
		"uniform mat4 uViewProj;",
		"varying vec2 vUv;",
		"void main() {",
		"  vUv = aUv;",
		"  gl_Position = uViewProj * vec4(aPos, 1.0);",
		"}",
	].join("\n");

	const VFX_FS = [
		"precision mediump float;",
		"varying vec2 vUv;",
		"uniform sampler2D uTex;",
		"uniform vec3 uTintRgb;",
		"uniform vec3 uHotRgb;",
		"uniform vec3 uRimRgb;",
		"uniform float uIsDark;",
		"uniform float uIsSoft;",
		"uniform float uOpacity;",
		"void main() {",
		"  vec4 texel = texture2D(uTex, vUv);",
		"  float alpha = texel.a * uOpacity;",
		"  if (alpha <= 0.015) discard;",
		"  float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));",
		"  vec3 col;",
		"  if (uIsDark > 0.5) {",
		"    // Element Black: rich obsidian-violet body + luminous violet-silver rim/hot edges",
		"    vec3 darkOutline = uTintRgb * 0.22;",
		"    vec3 darkCore = uTintRgb * 1.06;",
		"    if (lum < 0.22) {",
		"      col = mix(vec3(0.03, 0.02, 0.05), darkOutline, lum / 0.22);",
		"    } else if (lum < 0.65) {",
		"      float t = (lum - 0.22) / 0.43;",
		"      col = mix(darkOutline * 1.35, darkCore, t);",
		"    } else if (lum < 0.86) {",
		"      float t = (lum - 0.65) / 0.21;",
		"      col = mix(darkCore, uRimRgb, t);",
		"    } else {",
		"      float t = clamp((lum - 0.86) / 0.14, 0.0, 1.0);",
		"      vec3 peakCol = mix(uHotRgb, vec3(0.95, 0.91, 1.0), smoothstep(0.65, 1.0, t) * 0.35);",
		"      col = mix(uRimRgb, peakCol, t);",
		"    }",
		"    // Slightly reinforce soft translucent dark aura so it never vanishes",
		"    alpha = clamp(alpha * mix(1.0, 1.16, uIsSoft), 0.0, 1.0);",
		"  } else {",
		"    // Normal Elements (Red, Green, Blue, White, Grayscale)",
		"    float effLum = mix(lum, clamp(lum * 1.08 + 0.04, 0.0, 1.0), uIsSoft);",
		"    vec3 shadowCol = mix(vec3(0.04, 0.04, 0.06), uTintRgb * 0.34, clamp(effLum / 0.22, 0.0, 1.0));",
		"    vec3 midLow = uTintRgb * 0.34;",
		"    vec3 midHigh = mix(uTintRgb, uRimRgb, 0.18) * 1.04;",
		"    if (effLum < 0.22) {",
		"      col = shadowCol;",
		"    } else if (effLum <= 0.82) {",
		"      float t = (effLum - 0.22) / 0.60;",
		"      col = mix(midLow, midHigh, t);",
		"    } else {",
		"      float t = clamp((effLum - 0.82) / 0.18, 0.0, 1.0);",
		"      vec3 coreCol = mix(uHotRgb, vec3(1.0, 1.0, 1.0), smoothstep(0.70, 1.0, t) * 0.30);",
		"      col = mix(midHigh, coreCol, smoothstep(0.0, 1.0, t));",
		"    }",
		"  }",
		"  gl_FragColor = vec4(col, alpha);",
		"}",
	].join("\n");

	// =========================================================================
	// STATIC GEOMETRY BUILDERS
	// =========================================================================
	function buildUnitCubeData() {
		// 36 vertices, interleaved [px, py, pz, nx, ny, nz]
		const faces = [
			// +X
			{ n: [1, 0, 0],  v: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
			// -X
			{ n: [-1, 0, 0], v: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
			// +Y
			{ n: [0, 1, 0],  v: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
			// -Y
			{ n: [0, -1, 0], v: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
			// +Z
			{ n: [0, 0, 1],  v: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
			// -Z
			{ n: [0, 0, -1], v: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
		];
		const arr = new Float32Array(36 * 6);
		let idx = 0;
		const order = [0, 1, 2, 0, 2, 3];
		for (let f = 0; f < faces.length; f++) {
			const face = faces[f];
			for (let k = 0; k < 6; k++) {
				const p = face.v[order[k]];
				arr[idx++] = p[0]; arr[idx++] = p[1]; arr[idx++] = p[2];
				arr[idx++] = face.n[0]; arr[idx++] = face.n[1]; arr[idx++] = face.n[2];
			}
		}
		return arr;
	}

	function buildFlatQuadXZData() {
		// 6 vertices in XZ plane centered at origin, normal +Y
		return new Float32Array([
			-0.5, 0,  0.5,  0, 1, 0,
			 0.5, 0,  0.5,  0, 1, 0,
			 0.5, 0, -0.5,  0, 1, 0,
			-0.5, 0,  0.5,  0, 1, 0,
			 0.5, 0, -0.5,  0, 1, 0,
			-0.5, 0, -0.5,  0, 1, 0,
		]);
	}

	// =========================================================================
	// ARENA COLOR THEMES & CAMERA PRESETS
	// =========================================================================
	const ARENA_THEMES = {
		dark: {
			clear:       [0.042, 0.052, 0.078, 1.0],
			ambientSky:  [0.34, 0.38, 0.48],
			ambientGnd:  [0.14, 0.16, 0.22],
			slab:        [0.065, 0.078, 0.112],
			tileA:       [0.095, 0.112, 0.155],
			tileB:       [0.076, 0.090, 0.128],
			tileCenter:  [0.105, 0.128, 0.175],
			gridLine:    [0.20, 0.26, 0.36, 0.85],
			outerLine:   [0.30, 0.40, 0.54, 0.92],
			centerAxis:  [0.36, 0.72, 0.86, 0.95],
			allyPad:     [0.24, 0.74, 0.92, 0.68],
			enemyPad:    [0.92, 0.48, 0.26, 0.68],
			shadowAlpha: 0.48,
			wireDarkBg:  true,
		},
		arena: {
			clear:       [0.088, 0.108, 0.152, 1.0],
			ambientSky:  [0.42, 0.46, 0.56],
			ambientGnd:  [0.19, 0.21, 0.28],
			slab:        [0.105, 0.126, 0.175],
			tileA:       [0.158, 0.188, 0.252],
			tileB:       [0.130, 0.156, 0.214],
			tileCenter:  [0.172, 0.208, 0.278],
			gridLine:    [0.28, 0.36, 0.48, 0.88],
			outerLine:   [0.42, 0.54, 0.70, 0.95],
			centerAxis:  [0.44, 0.84, 0.96, 0.95],
			allyPad:     [0.32, 0.84, 0.98, 0.75],
			enemyPad:    [0.98, 0.58, 0.30, 0.75],
			shadowAlpha: 0.42,
			wireDarkBg:  true,
		},
		light: {
			clear:       [0.845, 0.875, 0.915, 1.0],
			ambientSky:  [0.62, 0.65, 0.70],
			ambientGnd:  [0.36, 0.39, 0.44],
			slab:        [0.58, 0.62, 0.68],
			tileA:       [0.755, 0.790, 0.835],
			tileB:       [0.695, 0.735, 0.785],
			tileCenter:  [0.780, 0.815, 0.860],
			gridLine:    [0.46, 0.51, 0.59, 0.85],
			outerLine:   [0.32, 0.38, 0.47, 0.95],
			centerAxis:  [0.14, 0.52, 0.68, 0.95],
			allyPad:     [0.12, 0.54, 0.72, 0.80],
			enemyPad:    [0.78, 0.38, 0.14, 0.80],
			shadowAlpha: 0.28,
			wireDarkBg:  false,
		},
	};

	const CAMERA_PRESETS = {
		iso:   { yaw: 0.42, pitch: 0.46, dist: 9.2, target: [0, 0.9, 0] },
		side:  { yaw: 0.00, pitch: 0.16, dist: 8.4, target: [0, 0.9, 0] },
		top:   { yaw: 0.00, pitch: 1.38, dist: 9.8, target: [0, 0.9, 0] },
		front: { yaw: 0.88, pitch: 0.34, dist: 8.6, target: [0, 0.9, 0] },
	};

	// =========================================================================
	// WEBGL SHADER HELPER
	// =========================================================================
	function compileShader(gl, type, src) {
		const sh = gl.createShader(type);
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			const err = gl.getShaderInfoLog(sh) || "Shader compile error";
			gl.deleteShader(sh);
			throw new Error(err);
		}
		return sh;
	}

	function createProgram(gl, vsSrc, fsSrc) {
		const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
		const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			const err = gl.getProgramInfoLog(prog) || "Program link error";
			gl.deleteProgram(prog);
			throw new Error(err);
		}
		return prog;
	}

	// =========================================================================
	// PURE WEBGL 3D ENGINE
	// =========================================================================
	class WebGL3DEngine {
		constructor(canvasElement) {
			if (!canvasElement) {
				throw new Error("WebGL3DEngine requires a valid <canvas> element.");
			}
			this.canvas = canvasElement;
			this.destroyed = false;

			// Camera state (default isometric)
			this.yaw = CAMERA_PRESETS.iso.yaw;
			this.pitch = CAMERA_PRESETS.iso.pitch;
			this.dist = CAMERA_PRESETS.iso.dist;
			this.target = [CAMERA_PRESETS.iso.target[0], CAMERA_PRESETS.iso.target[1], CAMERA_PRESETS.iso.target[2]];
			this.autoOrbit = false;
			this.autoOrbitSpeed = 0.45; // rad/sec
			this._lastOrbitMs = 0;

			// Display toggles
			this.showPlanesWireframe = false;
			this.showArena = true;
			this.arenaBg = "arena";

			// Textures map: vfxId -> { texture, gridCols, gridRows, width, height, source }
			this.sheets = Object.create(null);

			// Reusable matrices & camera basis
			this._projMat = mat4Create();
			this._viewMat = mat4Create();
			this._viewProjMat = mat4Create();
			this._modelMat = mat4Create();
			this._tempMat = mat4Create();
			this._armMat = mat4Create();
			this._normalMat = new Float32Array(9);
			this._camEye = [0, 0, 10];
			this._camBasis = {
				right: [1, 0, 0],
				up: [0, 1, 0],
				forward: [0, 0, -1],
			};

			// Reusable scratch buffers for dynamic VFX quad & colored line/quad batches
			this._vfxQuadVerts = new Float32Array(6 * 5); // 6 verts * (x,y,z,u,v)
			this._colorVertsCapacity = 4096;
			this._colorVerts = new Float32Array(this._colorVertsCapacity * 7); // x,y,z,r,g,b,a
			this._colorVertsCount = 0;

			// Pointer interaction state
			this._isDragging = false;
			this._dragMode = "none"; // "orbit" | "pan"
			this._activePointerId = null;
			this._lastX = 0;
			this._lastY = 0;

			// Acquire WebGL context
			const ctxOpts = {
				alpha: false,
				antialias: true,
				depth: true,
				stencil: false,
				premultipliedAlpha: false,
				preserveDrawingBuffer: true,
			};
			this.gl =
				this.canvas.getContext("webgl", ctxOpts) ||
				this.canvas.getContext("experimental-webgl", ctxOpts);

			if (!this.gl) {
				console.error("WebGL3DEngine: Failed to initialize WebGL context.");
				return;
			}

			this._initGLResources();
			this._bindEvents();
			this.resize();
		}

		// ---------------------------------------------------------------------
		// GL INITIALIZATION & CONTEXT RECOVERY
		// ---------------------------------------------------------------------
		_initGLResources() {
			const gl = this.gl;
			if (!gl) return;

			// Compile programs
			this._meshProg = createProgram(gl, MESH_VS, MESH_FS);
			this._meshLoc = {
				aPos:          gl.getAttribLocation(this._meshProg, "aPos"),
				aNormal:       gl.getAttribLocation(this._meshProg, "aNormal"),
				uViewProj:     gl.getUniformLocation(this._meshProg, "uViewProj"),
				uModel:        gl.getUniformLocation(this._meshProg, "uModel"),
				uNormalMat:    gl.getUniformLocation(this._meshProg, "uNormalMat"),
				uColor:        gl.getUniformLocation(this._meshProg, "uColor"),
				uAlpha:        gl.getUniformLocation(this._meshProg, "uAlpha"),
				uFlashWhite:   gl.getUniformLocation(this._meshProg, "uFlashWhite"),
				uUnlit:        gl.getUniformLocation(this._meshProg, "uUnlit"),
				uAmbientSky:   gl.getUniformLocation(this._meshProg, "uAmbientSky"),
				uAmbientGround: gl.getUniformLocation(this._meshProg, "uAmbientGround"),
			};

			this._colorProg = createProgram(gl, COLOR_VS, COLOR_FS);
			this._colorLoc = {
				aPos:      gl.getAttribLocation(this._colorProg, "aPos"),
				aColor:    gl.getAttribLocation(this._colorProg, "aColor"),
				uViewProj: gl.getUniformLocation(this._colorProg, "uViewProj"),
			};

			this._vfxProg = createProgram(gl, VFX_VS, VFX_FS);
			this._vfxLoc = {
				aPos:      gl.getAttribLocation(this._vfxProg, "aPos"),
				aUv:       gl.getAttribLocation(this._vfxProg, "aUv"),
				uViewProj: gl.getUniformLocation(this._vfxProg, "uViewProj"),
				uTex:      gl.getUniformLocation(this._vfxProg, "uTex"),
				uTintRgb:  gl.getUniformLocation(this._vfxProg, "uTintRgb"),
				uHotRgb:   gl.getUniformLocation(this._vfxProg, "uHotRgb"),
				uRimRgb:   gl.getUniformLocation(this._vfxProg, "uRimRgb"),
				uIsDark:   gl.getUniformLocation(this._vfxProg, "uIsDark"),
				uIsSoft:   gl.getUniformLocation(this._vfxProg, "uIsSoft"),
				uOpacity:  gl.getUniformLocation(this._vfxProg, "uOpacity"),
			};

			// Static buffers
			this._cubeVbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._cubeVbo);
			gl.bufferData(gl.ARRAY_BUFFER, buildUnitCubeData(), gl.STATIC_DRAW);

			this._flatQuadVbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._flatQuadVbo);
			gl.bufferData(gl.ARRAY_BUFFER, buildFlatQuadXZData(), gl.STATIC_DRAW);

			// Dynamic buffers
			this._vfxQuadVbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._vfxQuadVbo);
			gl.bufferData(gl.ARRAY_BUFFER, this._vfxQuadVerts.byteLength, gl.DYNAMIC_DRAW);

			this._colorVbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this._colorVbo);
			gl.bufferData(gl.ARRAY_BUFFER, this._colorVerts.byteLength, gl.DYNAMIC_DRAW);

			// Base GL state
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		}

		// ---------------------------------------------------------------------
		// INTERACTIVE ORBIT / PAN / ZOOM CAMERA CONTROLS
		// ---------------------------------------------------------------------
		_bindEvents() {
			const c = this.canvas;
			c.style.touchAction = "none";

			this._onPointerDown = (e) => {
				if (this.destroyed) return;
				if (this._activePointerId !== null) return;
				this._activePointerId = e.pointerId;
				this._isDragging = true;
				this._lastX = e.clientX;
				this._lastY = e.clientY;
				const isPan = e.button === 2 || e.button === 1 || e.shiftKey;
				this._dragMode = isPan ? "pan" : "orbit";
				if (c.setPointerCapture) {
					try { c.setPointerCapture(e.pointerId); } catch (_) {}
				}
			};

			this._onPointerMove = (e) => {
				if (!this._isDragging || e.pointerId !== this._activePointerId) return;
				const dx = e.clientX - this._lastX;
				const dy = e.clientY - this._lastY;
				this._lastX = e.clientX;
				this._lastY = e.clientY;

				if (this._dragMode === "orbit") {
					this.yaw -= dx * 0.0075;
					this.pitch = clamp(this.pitch + dy * 0.0065, 0.08, 1.48);
				} else if (this._dragMode === "pan") {
					const panScale = this.dist * 0.0017;
					const right = this._camBasis.right;
					const up = this._camBasis.up;
					this.target[0] = clamp(this.target[0] - right[0] * dx * panScale + up[0] * dy * panScale, -8.0, 8.0);
					this.target[1] = clamp(this.target[1] - right[1] * dx * panScale + up[1] * dy * panScale, -1.0, 6.0);
					this.target[2] = clamp(this.target[2] - right[2] * dx * panScale + up[2] * dy * panScale, -8.0, 8.0);
				}
			};

			this._onPointerUp = (e) => {
				if (e.pointerId !== this._activePointerId) return;
				this._isDragging = false;
				this._dragMode = "none";
				this._activePointerId = null;
				if (c.releasePointerCapture) {
					try { c.releasePointerCapture(e.pointerId); } catch (_) {}
				}
			};

			this._onWheel = (e) => {
				if (this.destroyed) return;
				e.preventDefault();
				const delta = clamp(e.deltaY, -240, 240);
				this.dist = clamp(this.dist * Math.exp(delta * 0.0011), 3.5, 18.0);
			};

			this._onDblClick = (e) => {
				if (this.destroyed) return;
				e.preventDefault();
				this.resetCamera();
			};

			this._onContextMenu = (e) => {
				e.preventDefault();
			};

			this._onContextLost = (e) => {
				e.preventDefault();
			};

			this._onContextRestored = () => {
				if (this.destroyed || !this.gl) return;
				this._initGLResources();
				// Re-upload all cached sprite sheets
				const keys = Object.keys(this.sheets);
				for (let i = 0; i < keys.length; i++) {
					const id = keys[i];
					const entry = this.sheets[id];
					if (entry && entry.source) {
						entry.texture = null;
						this.uploadVfxSheet(id, entry.source, entry.gridCols, entry.gridRows);
					}
				}
			};

			c.addEventListener("pointerdown", this._onPointerDown);
			window.addEventListener("pointermove", this._onPointerMove);
			window.addEventListener("pointerup", this._onPointerUp);
			window.addEventListener("pointercancel", this._onPointerUp);
			c.addEventListener("wheel", this._onWheel, { passive: false });
			c.addEventListener("dblclick", this._onDblClick);
			c.addEventListener("contextmenu", this._onContextMenu);
			c.addEventListener("webglcontextlost", this._onContextLost, false);
			c.addEventListener("webglcontextrestored", this._onContextRestored, false);
		}

		// ---------------------------------------------------------------------
		// PUBLIC API
		// ---------------------------------------------------------------------
		resize() {
			if (!this.gl || this.destroyed) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const cssW = this.canvas.clientWidth || this.canvas.width || 800;
			const cssH = this.canvas.clientHeight || this.canvas.height || 500;
			const targetW = Math.max(1, Math.round(cssW * dpr));
			const targetH = Math.max(1, Math.round(cssH * dpr));
			if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
				this.canvas.width = targetW;
				this.canvas.height = targetH;
			}
			this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		}

		setCameraPreset(preset) {
			if (preset === "turntable") {
				this.pitch = 0.44;
				this.dist = 9.2;
				this.target[0] = 0;
				this.target[1] = 0.9;
				this.target[2] = 0;
				this.autoOrbit = true;
				this._lastOrbitMs = (typeof performance !== "undefined" ? performance.now() : Date.now());
				return;
			}
			const cfg = CAMERA_PRESETS[preset] || CAMERA_PRESETS.iso;
			this.yaw = cfg.yaw;
			this.pitch = cfg.pitch;
			this.dist = cfg.dist;
			this.target[0] = cfg.target[0];
			this.target[1] = cfg.target[1];
			this.target[2] = cfg.target[2];
			this.autoOrbit = false;
		}

		resetCamera() {
			this.setCameraPreset("iso");
		}

		setAutoOrbit(enabled) {
			this.autoOrbit = Boolean(enabled);
			if (this.autoOrbit) {
				this._lastOrbitMs = (typeof performance !== "undefined" ? performance.now() : Date.now());
			}
		}

		setShowPlanesWireframe(enabled) {
			this.showPlanesWireframe = Boolean(enabled);
		}

		setShowArena(enabled) {
			this.showArena = Boolean(enabled);
		}

		setArenaBg(mode) {
			if (ARENA_THEMES[mode]) {
				this.arenaBg = mode;
			}
		}

		uploadVfxSheet(vfxId, canvasEl, gridCols, gridRows) {
			if (!this.gl || this.destroyed || !vfxId || !canvasEl) return;
			const gl = this.gl;

			let entry = this.sheets[vfxId];
			let tex = entry && entry.texture ? entry.texture : gl.createTexture();

			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasEl);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.sheets[vfxId] = {
				texture: tex,
				gridCols: Math.max(1, gridCols || 4),
				gridRows: Math.max(1, gridRows || 4),
				width: canvasEl.width || 256,
				height: canvasEl.height || 256,
				source: canvasEl,
			};
		}

		// ---------------------------------------------------------------------
		// COLOR BATCH HELPERS (Lines & Unlit Quads)
		// ---------------------------------------------------------------------
		_resetColorBatch() {
			this._colorVertsCount = 0;
		}

		_ensureColorCapacity(extraVerts) {
			const needed = this._colorVertsCount + extraVerts;
			if (needed <= this._colorVertsCapacity) return;
			while (this._colorVertsCapacity < needed) {
				this._colorVertsCapacity *= 2;
			}
			const next = new Float32Array(this._colorVertsCapacity * 7);
			next.set(this._colorVerts);
			this._colorVerts = next;
			const gl = this.gl;
			gl.bindBuffer(gl.ARRAY_BUFFER, this._colorVbo);
			gl.bufferData(gl.ARRAY_BUFFER, this._colorVerts.byteLength, gl.DYNAMIC_DRAW);
		}

		_pushColorVertex(x, y, z, r, g, b, a) {
			const off = this._colorVertsCount * 7;
			const buf = this._colorVerts;
			buf[off]     = x;
			buf[off + 1] = y;
			buf[off + 2] = z;
			buf[off + 3] = r;
			buf[off + 4] = g;
			buf[off + 5] = b;
			buf[off + 6] = a;
			this._colorVertsCount++;
		}

		_pushLine(x0, y0, z0, x1, y1, z1, col) {
			this._ensureColorCapacity(2);
			const r = col[0], g = col[1], b = col[2], a = col.length > 3 ? col[3] : 1.0;
			this._pushColorVertex(x0, y0, z0, r, g, b, a);
			this._pushColorVertex(x1, y1, z1, r, g, b, a);
		}

		_pushColorQuad(pTL, pTR, pBR, pBL, col) {
			this._ensureColorCapacity(6);
			const r = col[0], g = col[1], b = col[2], a = col.length > 3 ? col[3] : 1.0;
			this._pushColorVertex(pTL[0], pTL[1], pTL[2], r, g, b, a);
			this._pushColorVertex(pBL[0], pBL[1], pBL[2], r, g, b, a);
			this._pushColorVertex(pBR[0], pBR[1], pBR[2], r, g, b, a);
			this._pushColorVertex(pTL[0], pTL[1], pTL[2], r, g, b, a);
			this._pushColorVertex(pBR[0], pBR[1], pBR[2], r, g, b, a);
			this._pushColorVertex(pTR[0], pTR[1], pTR[2], r, g, b, a);
		}

		_flushColorBatch(primitiveMode) {
			if (this._colorVertsCount <= 0) return;
			const gl = this.gl;
			const loc = this._colorLoc;
			gl.useProgram(this._colorProg);
			gl.uniformMatrix4fv(loc.uViewProj, false, this._viewProjMat);

			gl.bindBuffer(gl.ARRAY_BUFFER, this._colorVbo);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._colorVerts.subarray(0, this._colorVertsCount * 7));

			const stride = 7 * 4;
			gl.enableVertexAttribArray(loc.aPos);
			gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
			gl.enableVertexAttribArray(loc.aColor);
			gl.vertexAttribPointer(loc.aColor, 4, gl.FLOAT, false, stride, 3 * 4);

			gl.drawArrays(primitiveMode, 0, this._colorVertsCount);
			gl.disableVertexAttribArray(loc.aPos);
			gl.disableVertexAttribArray(loc.aColor);
			this._colorVertsCount = 0;
		}

		// ---------------------------------------------------------------------
		// MESH DRAWING PRIMITIVES (Boxes & Flat Quads)
		// ---------------------------------------------------------------------
		_beginMeshPass(theme) {
			const gl = this.gl;
			const loc = this._meshLoc;
			gl.useProgram(this._meshProg);
			gl.uniformMatrix4fv(loc.uViewProj, false, this._viewProjMat);
			gl.uniform3fv(loc.uAmbientSky, theme.ambientSky);
			gl.uniform3fv(loc.uAmbientGround, theme.ambientGnd);
			gl.uniform1f(loc.uAlpha, 1.0);
			gl.uniform1f(loc.uFlashWhite, 0.0);
			gl.uniform1f(loc.uUnlit, 0.0);
		}

		_bindMeshVbo(vbo) {
			const gl = this.gl;
			const loc = this._meshLoc;
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			const stride = 6 * 4;
			gl.enableVertexAttribArray(loc.aPos);
			gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
			gl.enableVertexAttribArray(loc.aNormal);
			gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);
		}

		_endMeshPass() {
			const gl = this.gl;
			const loc = this._meshLoc;
			gl.disableVertexAttribArray(loc.aPos);
			gl.disableVertexAttribArray(loc.aNormal);
		}

		_drawBox(parentMat, tx, ty, tz, sx, sy, sz, color, flashWhite, unlit, rotX, rotY, rotZ) {
			const gl = this.gl;
			const loc = this._meshLoc;
			const m = this._tempMat;
			mat4Copy(m, parentMat);
			mat4Translate(m, m, tx, ty, tz);
			if (rotY) mat4RotateY(m, m, rotY);
			if (rotX) mat4RotateX(m, m, rotX);
			if (rotZ) mat4RotateZ(m, m, rotZ);
			mat4Scale(m, m, sx, sy, sz);

			mat3NormalFromMat4(this._normalMat, m);
			gl.uniformMatrix4fv(loc.uModel, false, m);
			gl.uniformMatrix3fv(loc.uNormalMat, false, this._normalMat);
			gl.uniform3f(loc.uColor, color[0], color[1], color[2]);
			gl.uniform1f(loc.uFlashWhite, flashWhite || 0.0);
			gl.uniform1f(loc.uUnlit, unlit || 0.0);
			gl.drawArrays(gl.TRIANGLES, 0, 36);
		}

		// ---------------------------------------------------------------------
		// 3D TACTICAL ARENA FLOOR (9x5 grid, tile size 1.4)
		// ---------------------------------------------------------------------
		_renderArenaFloor(theme) {
			const gl = this.gl;
			const cols = 9;
			const rows = 5;
			const tileSize = 1.4;
			const halfW = (cols * tileSize) * 0.5; // 6.3
			const halfD = (rows * tileSize) * 0.5; // 3.5

			// Slight polygon offset on floor tiles so grid lines & ground_xz planes never Z-fight
			gl.enable(gl.POLYGON_OFFSET_FILL);
			gl.polygonOffset(1.0, 1.0);

			// Solid tactical board slab beneath tiles
			const identity = mat4Identity(this._modelMat);
			this._bindMeshVbo(this._cubeVbo);
			this._drawBox(identity, 0, -0.11, 0, cols * tileSize + 0.24, 0.20, rows * tileSize + 0.24, theme.slab, 0, 0);

			// 9x5 grid tiles at y = 0
			this._bindMeshVbo(this._flatQuadVbo);
			const loc = this._meshLoc;
			gl.uniform1f(loc.uFlashWhite, 0.0);
			gl.uniform1f(loc.uUnlit, 0.0);
			gl.uniform1f(loc.uAlpha, 1.0);

			const tileMat = this._tempMat;
			const nMat = this._normalMat;
			nMat[0] = 1; nMat[1] = 0; nMat[2] = 0;
			nMat[3] = 0; nMat[4] = 1; nMat[5] = 0;
			nMat[6] = 0; nMat[7] = 0; nMat[8] = 1;
			gl.uniformMatrix3fv(loc.uNormalMat, false, nMat);

			for (let r = 0; r < rows; r++) {
				const tz = -halfD + (r + 0.5) * tileSize;
				for (let c = 0; c < cols; c++) {
					const tx = -halfW + (c + 0.5) * tileSize;
					const isCenter = c === 4;
					const col = isCenter
						? ((r & 1) === 0 ? theme.tileCenter : theme.tileA)
						: (((c + r) & 1) === 0 ? theme.tileA : theme.tileB);

					mat4Identity(tileMat);
					mat4Translate(tileMat, tileMat, tx, 0.0, tz);
					mat4Scale(tileMat, tileMat, tileSize - 0.015, 1.0, tileSize - 0.015);
					gl.uniformMatrix4fv(loc.uModel, false, tileMat);
					gl.uniform3f(loc.uColor, col[0], col[1], col[2]);
					gl.drawArrays(gl.TRIANGLES, 0, 6);
				}
			}

			gl.disable(gl.POLYGON_OFFSET_FILL);
			this._endMeshPass();

			// Crisp Grid Lines + Center Axis Divider + Ally/Enemy Standing Pad Brackets
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(false);

			this._resetColorBatch();
			const ly = 0.004;

			// Longitudinal lines (along Z)
			for (let c = 0; c <= cols; c++) {
				const x = -halfW + c * tileSize;
				const col = (c === 0 || c === cols) ? theme.outerLine : theme.gridLine;
				this._pushLine(x, ly, -halfD, x, ly, halfD, col);
			}

			// Latitudinal lines (along X)
			for (let r = 0; r <= rows; r++) {
				const z = -halfD + r * tileSize;
				const col = (r === 0 || r === rows) ? theme.outerLine : theme.gridLine;
				this._pushLine(-halfW, ly, z, halfW, ly, z, col);
			}

			// Center Ally / Enemy Axis Divider at x = 0 (crisp double-accent line)
			this._pushLine(0, ly + 0.002, -halfD, 0, ly + 0.002, halfD, theme.centerAxis);
			this._pushLine(-0.025, ly + 0.002, -halfD, -0.025, ly + 0.002, halfD, theme.centerAxis);
			this._pushLine(0.025, ly + 0.002, -halfD, 0.025, ly + 0.002, halfD, theme.centerAxis);

			// Subtle corner tactical brackets at Ally (-2.4, 0) & Enemy (+2.4, 0) standing spots
			this._pushStandingBracket(-2.4, ly + 0.003, 0.0, 0.72, theme.allyPad);
			this._pushStandingBracket(2.4, ly + 0.003, 0.0, 0.72, theme.enemyPad);

			this._flushColorBatch(gl.LINES);
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		_pushStandingBracket(cx, y, cz, r, col) {
			const k = r * 0.36;
			// 4 corner L-brackets around (cx, cz)
			const signs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
			for (let i = 0; i < 4; i++) {
				const sx = signs[i][0];
				const sz = signs[i][1];
				const x0 = cx + sx * r;
				const z0 = cz + sz * r;
				this._pushLine(x0, y, z0, x0 - sx * k, y, z0, col);
				this._pushLine(x0, y, z0, x0, y, z0 - sz * k, col);
			}
		}

		// ---------------------------------------------------------------------
		// BLOCKY 3D ALLY & ENEMY KYBERMON DUMMIES
		// ---------------------------------------------------------------------
		_renderContactShadow(x, y, z, theme) {
			const gl = this.gl;
			const heightFactor = clamp(1.0 - Math.max(0, y) * 0.18, 0.35, 1.0);
			const rx = 0.62 * heightFactor;
			const rz = 0.50 * heightFactor;
			const sy = 0.008;
			const alpha = theme.shadowAlpha * heightFactor;

			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(false);

			this._resetColorBatch();
			const colOuter = [0.02, 0.03, 0.05, alpha * 0.55];
			const colInner = [0.01, 0.015, 0.03, alpha];
			this._pushColorQuad(
				[x - rx, sy, z - rz], [x + rx, sy, z - rz],
				[x + rx, sy, z + rz], [x - rx, sy, z + rz],
				colOuter
			);
			const irx = rx * 0.72;
			const irz = rz * 0.72;
			this._pushColorQuad(
				[x - irx, sy + 0.001, z - irz], [x + irx, sy + 0.001, z - irz],
				[x + irx, sy + 0.001, z + irz], [x - irx, sy + 0.001, z + irz],
				colInner
			);
			this._flushColorBatch(gl.TRIANGLES);

			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		_renderAllyDummy(ally, theme) {
			const x = ally.x !== undefined ? ally.x : -2.4;
			const y = ally.y !== undefined ? ally.y : 0.0;
			const z = ally.z !== undefined ? ally.z : 0.0;
			const rotY = ally.rotY || 0.0;
			const armRaise = ally.armRaise || 0.0;
			const scaleY = clamp(ally.scaleY !== undefined ? ally.scaleY : 1.0, 0.4, 2.0);
			const scaleXZ = 1.0 / Math.sqrt(scaleY);
			const flash = clamp01(ally.flashWhite || 0.0);

			this._renderContactShadow(x, y, z, theme);

			this._beginMeshPass(theme);
			this._bindMeshVbo(this._cubeVbo);

			const root = mat4Identity(this._modelMat);
			mat4Translate(root, root, x, y, z);
			mat4RotateY(root, root, rotY);
			mat4Scale(root, root, scaleXZ, scaleY, scaleXZ);

			// Palette: sleek cobalt-teal Kybermon hero silhouette
			const cBody   = [0.24, 0.44, 0.72];
			const cDark   = [0.14, 0.20, 0.32];
			const cTrim   = [0.30, 0.86, 0.94];
			const cVisor  = [0.06, 0.09, 0.14];
			const cEye    = [0.76, 0.98, 1.00];
			const cHorn   = [0.46, 0.90, 0.96];

			// Legs & Boots (local +X is forward facing Enemy, +Z is right)
			this._drawBox(root, 0.04, 0.08, -0.22, 0.36, 0.16, 0.26, cDark, flash, 0);
			this._drawBox(root, 0.04, 0.08,  0.22, 0.36, 0.16, 0.26, cDark, flash, 0);
			this._drawBox(root, 0.00, 0.36, -0.22, 0.26, 0.42, 0.22, cBody, flash, 0);
			this._drawBox(root, 0.00, 0.36,  0.22, 0.26, 0.42, 0.22, cBody, flash, 0);

			// Pelvis / Waist
			this._drawBox(root, 0.00, 0.62, 0.00, 0.42, 0.16, 0.64, cDark, flash, 0);

			// Torso & Back Ridge
			this._drawBox(root, 0.02, 0.96, 0.00, 0.54, 0.56, 0.78, cBody, flash, 0);
			this._drawBox(root, -0.28, 0.98, 0.00, 0.14, 0.38, 0.36, cDark, flash, 0);

			// Chest Emblem (facing +X)
			this._drawBox(root, 0.29, 0.98, 0.00, 0.06, 0.30, 0.34, cDark, flash, 0);
			this._drawBox(root, 0.32, 0.98, 0.00, 0.05, 0.18, 0.18, cTrim, flash, 0.35, 0.785, 0, 0);

			// Shoulder Pads
			this._drawBox(root, 0.02, 1.18, -0.49, 0.32, 0.20, 0.24, cTrim, flash, 0);
			this._drawBox(root, 0.02, 1.18,  0.49, 0.32, 0.20, 0.24, cTrim, flash, 0);

			// Left Arm (subtle counter-motion)
			const leftArm = mat4Copy(this._armMat, root);
			mat4Translate(leftArm, leftArm, 0.02, 1.12, -0.50);
			mat4RotateZ(leftArm, leftArm, -armRaise * 0.38 - 0.08);
			this._drawBox(leftArm, 0.00, -0.18, 0.00, 0.22, 0.34, 0.20, cDark, flash, 0);
			this._drawBox(leftArm, 0.02, -0.46, 0.00, 0.24, 0.26, 0.22, cBody, flash, 0);

			// Animated Right Arm (viewer-facing +Z side, rotates up/forward with armRaise)
			const rightArm = mat4Copy(this._armMat, root);
			mat4Translate(rightArm, rightArm, 0.02, 1.12, 0.50);
			mat4RotateZ(rightArm, rightArm, armRaise * 2.15);
			this._drawBox(rightArm, 0.00, -0.18, 0.00, 0.22, 0.34, 0.20, cDark, flash, 0);
			this._drawBox(rightArm, 0.02, -0.44, 0.00, 0.26, 0.26, 0.24, cBody, flash, 0);
			this._drawBox(rightArm, 0.04, -0.56, 0.00, 0.28, 0.12, 0.26, cTrim, flash, 0.2);

			// Neck & Head
			this._drawBox(root, 0.02, 1.29, 0.00, 0.24, 0.12, 0.26, cDark, flash, 0);
			this._drawBox(root, 0.04, 1.56, 0.00, 0.54, 0.50, 0.58, cBody, flash, 0);

			// Visor & Crisp Glowing Eyes (+X face)
			this._drawBox(root, 0.30, 1.58, 0.00, 0.08, 0.18, 0.48, cVisor, flash, 0);
			this._drawBox(root, 0.345, 1.59, -0.13, 0.03, 0.09, 0.12, cEye, flash, 1.0);
			this._drawBox(root, 0.345, 1.59,  0.13, 0.03, 0.09, 0.12, cEye, flash, 1.0);

			// Two Angular Blocky Horns (swept slightly up/out/forward)
			this._drawBox(root, 0.06, 1.88, -0.22, 0.15, 0.24, 0.13, cHorn, flash, 0, -0.32, 0, -0.22);
			this._drawBox(root, 0.13, 2.06, -0.30, 0.10, 0.20, 0.09, cTrim, flash, 0.15, -0.42, 0, -0.32);
			this._drawBox(root, 0.06, 1.88,  0.22, 0.15, 0.24, 0.13, cHorn, flash, 0,  0.32, 0, -0.22);
			this._drawBox(root, 0.13, 2.06,  0.30, 0.10, 0.20, 0.09, cTrim, flash, 0.15,  0.42, 0, -0.32);

			this._endMeshPass();
		}

		_renderEnemyDummy(enemy, theme) {
			const x = enemy.x !== undefined ? enemy.x : 2.4;
			const y = enemy.y !== undefined ? enemy.y : 0.0;
			const z = enemy.z !== undefined ? enemy.z : 0.0;
			const rotY = enemy.rotY || 0.0;
			const armRaise = enemy.armRaise || 0.0;
			const scaleY = clamp(enemy.scaleY !== undefined ? enemy.scaleY : 1.0, 0.4, 2.0);
			const scaleXZ = 1.0 / Math.sqrt(scaleY);
			const flash = clamp01(enemy.flashWhite || 0.0);
			const hpRatio = clamp01(enemy.hpRatio !== undefined ? enemy.hpRatio : 1.0);

			this._renderContactShadow(x, y, z, theme);

			this._beginMeshPass(theme);
			this._bindMeshVbo(this._cubeVbo);

			const root = mat4Identity(this._modelMat);
			mat4Translate(root, root, x, y, z);
			// Base Math.PI so rotY=0 faces -X (directly toward Ally!)
			mat4RotateY(root, root, Math.PI + rotY);
			mat4Scale(root, root, scaleXZ, scaleY, scaleXZ);

			// Palette: neutral armored blocky target dummy (high contrast for all 5 elements)
			const cArmor  = [0.43, 0.46, 0.52];
			const cDark   = [0.22, 0.24, 0.30];
			const cPlate  = [0.56, 0.60, 0.66];
			const cAccent = [0.86, 0.54, 0.24];
			const cVisor  = [0.08, 0.09, 0.12];
			const cEye    = [1.00, 0.78, 0.28];

			// Armored Legs & Heavy Boots
			this._drawBox(root, 0.03, 0.09, -0.24, 0.38, 0.18, 0.28, cDark, flash, 0);
			this._drawBox(root, 0.03, 0.09,  0.24, 0.38, 0.18, 0.28, cDark, flash, 0);
			this._drawBox(root, 0.00, 0.38, -0.24, 0.28, 0.42, 0.24, cArmor, flash, 0);
			this._drawBox(root, 0.00, 0.38,  0.24, 0.28, 0.42, 0.24, cArmor, flash, 0);

			// Pelvis & Heavy Armored Torso
			this._drawBox(root, 0.00, 0.64, 0.00, 0.46, 0.16, 0.68, cDark, flash, 0);
			this._drawBox(root, 0.00, 0.98, 0.00, 0.58, 0.58, 0.84, cArmor, flash, 0);
			this._drawBox(root, -0.30, 1.00, 0.00, 0.12, 0.40, 0.48, cDark, flash, 0);

			// Target Dummy Chest Plate & Bullseye Accent (facing Ally)
			this._drawBox(root, 0.30, 1.00, 0.00, 0.06, 0.38, 0.48, cPlate, flash, 0);
			this._drawBox(root, 0.335, 1.00, 0.00, 0.03, 0.24, 0.24, cDark, flash, 0);
			this._drawBox(root, 0.355, 1.00, 0.00, 0.025, 0.12, 0.12, cAccent, flash, 0.25);

			// Heavy Blocky Shoulder Armor
			this._drawBox(root, 0.00, 1.18, -0.53, 0.36, 0.24, 0.26, cPlate, flash, 0);
			this._drawBox(root, 0.00, 1.18,  0.53, 0.36, 0.24, 0.26, cPlate, flash, 0);

			// Animated Left Arm (viewer-facing +Z in world because Enemy is rotated PI!)
			const leftArm = mat4Copy(this._armMat, root);
			mat4Translate(leftArm, leftArm, 0.00, 1.10, -0.54);
			mat4RotateZ(leftArm, leftArm, armRaise * 1.95);
			this._drawBox(leftArm, 0.00, -0.18, 0.00, 0.24, 0.34, 0.22, cDark, flash, 0);
			this._drawBox(leftArm, 0.02, -0.45, 0.00, 0.26, 0.28, 0.24, cArmor, flash, 0);

			// Right Arm
			const rightArm = mat4Copy(this._armMat, root);
			mat4Translate(rightArm, rightArm, 0.00, 1.10, 0.54);
			mat4RotateZ(rightArm, rightArm, armRaise * 0.65 - 0.06);
			this._drawBox(rightArm, 0.00, -0.18, 0.00, 0.24, 0.34, 0.22, cDark, flash, 0);
			this._drawBox(rightArm, 0.02, -0.45, 0.00, 0.26, 0.28, 0.24, cArmor, flash, 0);

			// Neck & Armored Helmet Head
			this._drawBox(root, 0.00, 1.31, 0.00, 0.26, 0.12, 0.28, cDark, flash, 0);
			this._drawBox(root, 0.02, 1.57, 0.00, 0.56, 0.50, 0.60, cArmor, flash, 0);
			this._drawBox(root, 0.00, 1.84, 0.00, 0.44, 0.08, 0.48, cPlate, flash, 0);

			// Visor & Crisp Amber Eyes
			this._drawBox(root, 0.295, 1.58, 0.00, 0.08, 0.18, 0.50, cVisor, flash, 0);
			this._drawBox(root, 0.34, 1.59, -0.13, 0.03, 0.09, 0.12, cEye, flash, 1.0);
			this._drawBox(root, 0.34, 1.59,  0.13, 0.03, 0.09, 0.12, cEye, flash, 1.0);

			// Side Ear-Blocks + Twin Antenna Masts with Glowing Tips
			this._drawBox(root, 0.00, 1.60, -0.34, 0.20, 0.22, 0.10, cDark, flash, 0);
			this._drawBox(root, 0.00, 1.60,  0.34, 0.20, 0.22, 0.10, cDark, flash, 0);
			this._drawBox(root, -0.02, 1.88, -0.34, 0.07, 0.34, 0.07, cPlate, flash, 0);
			this._drawBox(root, -0.02, 2.08, -0.34, 0.11, 0.10, 0.11, cAccent, flash, 0.75);
			this._drawBox(root, -0.02, 1.88,  0.34, 0.07, 0.34, 0.07, cPlate, flash, 0);
			this._drawBox(root, -0.02, 2.08,  0.34, 0.11, 0.10, 0.11, cAccent, flash, 0.75);

			this._endMeshPass();

			// Floating 3D Billboard HP Bar above Enemy head
			this._renderBillboardHpBar(x, y + 2.42 * Math.max(0.75, scaleY), z, hpRatio, flash);
		}

		_renderBillboardHpBar(cx, cy, cz, hpRatio, flashWhite) {
			const gl = this.gl;
			const R = this._camBasis.right;
			const U = this._camBasis.up;
			const F = this._camBasis.forward;

			const outerW = 1.44;
			const outerH = 0.22;
			const innerW = 1.32;
			const innerH = 0.12;
			const ratio = clamp01(hpRatio);

			// Helper to push a camera-aligned quad with small forward layer offset
			const pushPanel = (offsetX, w, h, zBias, col) => {
				const hw = w * 0.5;
				const hh = h * 0.5;
				const px = cx + R[0] * offsetX - F[0] * zBias;
				const py = cy + R[1] * offsetX - F[1] * zBias;
				const pz = cz + R[2] * offsetX - F[2] * zBias;
				const pTL = [px - R[0] * hw + U[0] * hh, py - R[1] * hw + U[1] * hh, pz - R[2] * hw + U[2] * hh];
				const pTR = [px + R[0] * hw + U[0] * hh, py + R[1] * hw + U[1] * hh, pz + R[2] * hw + U[2] * hh];
				const pBR = [px + R[0] * hw - U[0] * hh, py + R[1] * hw - U[1] * hh, pz + R[2] * hw - U[2] * hh];
				const pBL = [px - R[0] * hw - U[0] * hh, py - R[1] * hw - U[1] * hh, pz - R[2] * hw - U[2] * hh];
				this._pushColorQuad(pTL, pTR, pBR, pBL, col);
			};

			// HP color ramp (green -> amber -> crimson)
			let fillCol;
			if (ratio > 0.55) {
				fillCol = [0.22, 0.88, 0.46, 1.0];
			} else if (ratio > 0.25) {
				fillCol = [0.96, 0.74, 0.18, 1.0];
			} else {
				fillCol = [0.96, 0.24, 0.28, 1.0];
			}
			const borderCol = flashWhite > 0.25
				? [1.0, 0.94, 0.82, 1.0]
				: [0.07, 0.08, 0.11, 0.95];

			gl.disable(gl.CULL_FACE);
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(true);

			this._resetColorBatch();
			pushPanel(0, outerW, outerH, 0.000, borderCol);
			pushPanel(0, innerW, innerH, 0.008, [0.16, 0.18, 0.23, 0.96]);
			if (ratio > 0.002) {
				const fw = innerW * ratio;
				const leftOffset = -innerW * 0.5 + fw * 0.5;
				pushPanel(leftOffset, fw, innerH, 0.016, fillCol);
			}
			this._flushColorBatch(gl.TRIANGLES);

			gl.disable(gl.BLEND);
		}

		// ---------------------------------------------------------------------
		// 5 REAL 3D PLANE GEOMETRY EXPANSION
		// ---------------------------------------------------------------------
		_expandPlanesToQuads(planes) {
			const quads = [];
			if (!planes || !planes.length) return quads;

			const camR = this._camBasis.right;
			const camU = this._camBasis.up;
			const camF = this._camBasis.forward;
			const eye = this._camEye;

			for (let i = 0; i < planes.length; i++) {
				const p = planes[i];
				if (!p || !p.vfxId) continue;
				const sheet = this.sheets[p.vfxId];
				if (!sheet || !sheet.texture) continue;

				const opacity = p.opacity !== undefined ? clamp01(p.opacity) : 1.0;
				if (opacity <= 0.004) continue;

				const size = p.size || [1.6, 1.6];
				const w = size[0] || 0;
				const h = size[1] || 0;
				if (w <= 0.001 || h <= 0.001) continue;

				const cols = Math.max(1, p.gridCols || sheet.gridCols || 4);
				const rows = Math.max(1, p.gridRows || sheet.gridRows || 4);
				const totalFrames = cols * rows;
				const frameIdx = clamp(Math.floor(p.frameIndex || 0), 0, totalFrames - 1);
				const colIdx = frameIdx % cols;
				const rowIdx = Math.floor(frameIdx / cols);

				// Tiny UV inset (0.0002) prevents edge rounding bleed on any GPU while staying inside 2px safe margin
				const inset = 0.0002;
				const u0 = colIdx / cols + inset;
				const u1 = (colIdx + 1) / cols - inset;
				const v0 = rowIdx / rows + inset;
				const v1 = (rowIdx + 1) / rows - inset;

				const pos = p.pos || [0, 1, 0];
				const rotY = p.rotY || 0;
				const rotZ = p.rotZ || 0;
				const tiltX = p.tiltX || 0;
				const planeType = p.planeType || "billboard";

				const tintRgb = p.tintRgb || [0.92, 0.94, 0.98];
				const hotRgb  = p.hotRgb  || [1.00, 1.00, 1.00];
				const rimRgb  = p.rimRgb  || [0.88, 0.90, 0.95];
				const isDark  = Boolean(p.isDarkElement);
				const isSoft  = p.materialPreset === "soft_transparent";
				// Element Black ALWAYS forces additive OFF so it stays crisp and legible!
				const additive = Boolean(p.additive) && !isDark;

				const pushQuad = (center, axisU, axisV, halfW, halfH, quadOpacity, sortBias) => {
					const cx = center[0], cy = center[1], cz = center[2];
					const ux = axisU[0] * halfW, uy = axisU[1] * halfW, uz = axisU[2] * halfW;
					const vx = axisV[0] * halfH, vy = axisV[1] * halfH, vz = axisV[2] * halfH;

					const pTL = [cx - ux + vx, cy - uy + vy, cz - uz + vz];
					const pTR = [cx + ux + vx, cy + uy + vy, cz + uz + vz];
					const pBR = [cx + ux - vx, cy + uy - vy, cz + uz - vz];
					const pBL = [cx - ux - vx, cy - uy - vy, cz - uz - vz];

					const dx = cx - eye[0];
					const dy = cy - eye[1];
					const dz = cz - eye[2];
					const depthKey = (dx * dx + dy * dy + dz * dz) + (sortBias || 0);

					quads.push({
						texture: sheet.texture,
						planeType: planeType,
						pTL, pTR, pBR, pBL,
						u0, u1, v0, v1,
						tintRgb, hotRgb, rimRgb,
						isDark, isSoft, additive,
						opacity: quadOpacity,
						depthKey,
					});
				};

				const hw = w * 0.5;
				const hh = h * 0.5;

				if (planeType === "billboard") {
					const cr = Math.cos(rotZ);
					const sr = Math.sin(rotZ);
					const axU = [
						camR[0] * cr + camU[0] * sr,
						camR[1] * cr + camU[1] * sr,
						camR[2] * cr + camU[2] * sr,
					];
					let axV = [
						-camR[0] * sr + camU[0] * cr,
						-camR[1] * sr + camU[1] * cr,
						-camR[2] * sr + camU[2] * cr,
					];
					if (tiltX) {
						const ct = Math.cos(tiltX);
						const st = Math.sin(tiltX);
						axV = vec3Normalize([0, 1, 0], [
							axV[0] * ct + camF[0] * st,
							axV[1] * ct + camF[1] * st,
							axV[2] * ct + camF[2] * st,
						]);
					}
					pushQuad(pos, axU, axV, hw, hh, opacity, 0);

				} else if (planeType === "ground_xz") {
					// Lift slightly above y=0 floor if near floor to guarantee zero Z-fighting
					const gy = pos[1] < 0.025 ? Math.max(pos[1], 0.018) : pos[1];
					const angle = rotY + rotZ;
					const ca = Math.cos(angle);
					const sa = Math.sin(angle);
					const axU = [ca, 0, -sa];
					let axV = [-sa, 0, -ca];
					if (tiltX) {
						const ct = Math.cos(tiltX);
						const st = Math.sin(tiltX);
						axV = [axV[0] * ct, st, axV[2] * ct];
					}
					pushQuad([pos[0], gy, pos[2]], axU, axV, hw, hh, opacity, 0.08);

				} else if (planeType === "crossed_x") {
					// 2 intersecting vertical quads at rotY and rotY + PI/2
					// + 3rd diagonal quad at rotY + PI/4 when tall or wide for full 360-deg 3D volume
					const angles = (h >= 2.0 || w >= 2.0)
						? [rotY, rotY + Math.PI * 0.5, rotY + Math.PI * 0.25]
						: [rotY, rotY + Math.PI * 0.5];

					for (let k = 0; k < angles.length; k++) {
						const a = angles[k];
						const ca = Math.cos(a);
						const sa = Math.sin(a);
						let axU = [ca, 0, -sa];
						let axV = [0, 1, 0];
						if (tiltX) {
							const ct = Math.cos(tiltX);
							const st = Math.sin(tiltX);
							// Tilt normal forward along perpendicular horizontal vector
							const nx = sa, nz = ca;
							axV = [nx * st, ct, nz * st];
						}
						if (rotZ) {
							const cr = Math.cos(rotZ);
							const sr = Math.sin(rotZ);
							const nu = [
								axU[0] * cr + axV[0] * sr,
								axU[1] * cr + axV[1] * sr,
								axU[2] * cr + axV[2] * sr,
							];
							const nv = [
								-axU[0] * sr + axV[0] * cr,
								-axU[1] * sr + axV[1] * cr,
								-axU[2] * sr + axV[2] * cr,
							];
							axU = nu;
							axV = nv;
						}
						const quadAlpha = k === 2 ? opacity * 0.85 : opacity;
						pushQuad(pos, axU, axV, hw, hh, quadAlpha, k * 0.001);
					}

				} else if (planeType === "ribbon") {
					const endPos = p.endPos || [pos[0] + w, pos[1], pos[2]];
					const dx = endPos[0] - pos[0];
					const dy = endPos[1] - pos[1];
					const dz = endPos[2] - pos[2];
					const len = Math.hypot(dx, dy, dz);
					if (len < 0.002) continue;

					const dir = [dx / len, dy / len, dz / len];
					const center = [
						(pos[0] + endPos[0]) * 0.5,
						(pos[1] + endPos[1]) * 0.5,
						(pos[2] + endPos[2]) * 0.5,
					];

					// Ribbon 1: Camera-aligned perpendicular quad along (endPos - pos)
					const toCam = vec3Normalize([0, 0, 1], [
						eye[0] - center[0],
						eye[1] - center[1],
						eye[2] - center[2],
					]);
					let perpCam = vec3Cross([0, 0, 0], dir, toCam);
					if (Math.hypot(perpCam[0], perpCam[1], perpCam[2]) < 1e-4) {
						perpCam = vec3Cross([0, 0, 0], dir, [0, 1, 0]);
					}
					if (Math.hypot(perpCam[0], perpCam[1], perpCam[2]) < 1e-4) {
						perpCam = [0, 0, 1];
					} else {
						vec3Normalize(perpCam, perpCam);
					}

					// Ribbon 2: Horizontal cross-ribbon (switches cleanly to orthogonal perp2 in top-down view)
					let horiz = vec3Cross([0, 0, 0], dir, [0, 1, 0]);
					if (Math.hypot(horiz[0], horiz[1], horiz[2]) < 1e-4) {
						horiz = [0, 0, 1];
					} else {
						vec3Normalize(horiz, horiz);
					}
					let crossAxis = horiz;
					if (Math.abs(vec3Dot(perpCam, horiz)) > 0.85) {
						crossAxis = vec3Normalize([0, 1, 0], vec3Cross([0, 0, 0], dir, perpCam));
					}

					const ribHalfW = len * 0.5;
					pushQuad(center, dir, perpCam, ribHalfW, hh, opacity, 0);
					pushQuad(center, dir, crossAxis, ribHalfW, hh, opacity * 0.92, 0.002);

				} else if (planeType === "orbit") {
					const count = Math.max(1, Math.round(p.orbitCount !== undefined ? p.orbitCount : 4));
					const radius = p.orbitRadius !== undefined ? p.orbitRadius : 1.2;
					const phase = p.orbitPhase || 0;

					const cr = Math.cos(rotZ);
					const sr = Math.sin(rotZ);
					const axU = [
						camR[0] * cr + camU[0] * sr,
						camR[1] * cr + camU[1] * sr,
						camR[2] * cr + camU[2] * sr,
					];
					const axV = [
						-camR[0] * sr + camU[0] * cr,
						-camR[1] * sr + camU[1] * cr,
						-camR[2] * sr + camU[2] * cr,
					];

					const cTilt = Math.cos(tiltX);
					const sTilt = Math.sin(tiltX);
					const cYaw = Math.cos(rotY);
					const sYaw = Math.sin(rotY);

					for (let k = 0; k < count; k++) {
						const ang = phase + (k * Math.PI * 2) / count;
						const lx = Math.cos(ang) * radius;
						const lz0 = Math.sin(ang) * radius;
						const ly = -lz0 * sTilt;
						const lz = lz0 * cTilt;
						const rx = lx * cYaw + lz * sYaw;
						const rz = -lx * sYaw + lz * cYaw;
						const orbPos = [pos[0] + rx, pos[1] + ly, pos[2] + rz];
						pushQuad(orbPos, axU, axV, hw, hh, opacity, 0);
					}
				}
			}

			// Back-to-front transparent sorting (farthest first)
			quads.sort((a, b) => b.depthKey - a.depthKey);
			return quads;
		}

		// ---------------------------------------------------------------------
		// RENDER VFX QUADS & OPTIONAL 3D WIREFRAME OVERLAY
		// ---------------------------------------------------------------------
		_renderVfxQuads(quads) {
			if (!quads.length) return;
			const gl = this.gl;
			const loc = this._vfxLoc;

			gl.useProgram(this._vfxProg);
			gl.uniformMatrix4fv(loc.uViewProj, false, this._viewProjMat);
			gl.uniform1i(loc.uTex, 0);

			gl.disable(gl.CULL_FACE);
			gl.enable(gl.DEPTH_TEST);
			gl.depthMask(false);
			gl.enable(gl.BLEND);

			gl.bindBuffer(gl.ARRAY_BUFFER, this._vfxQuadVbo);
			const stride = 5 * 4;
			gl.enableVertexAttribArray(loc.aPos);
			gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
			gl.enableVertexAttribArray(loc.aUv);
			gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, stride, 3 * 4);

			gl.activeTexture(gl.TEXTURE0);

			let lastTex = null;
			let lastAdditive = null;
			const v = this._vfxQuadVerts;

			for (let i = 0; i < quads.length; i++) {
				const q = quads[i];

				if (q.texture !== lastTex) {
					gl.bindTexture(gl.TEXTURE_2D, q.texture);
					lastTex = q.texture;
				}
				if (q.additive !== lastAdditive) {
					if (q.additive) {
						gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
					} else {
						gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
					}
					lastAdditive = q.additive;
				}

				gl.uniform3f(loc.uTintRgb, q.tintRgb[0], q.tintRgb[1], q.tintRgb[2]);
				gl.uniform3f(loc.uHotRgb,  q.hotRgb[0],  q.hotRgb[1],  q.hotRgb[2]);
				gl.uniform3f(loc.uRimRgb,  q.rimRgb[0],  q.rimRgb[1],  q.rimRgb[2]);
				gl.uniform1f(loc.uIsDark,  q.isDark ? 1.0 : 0.0);
				gl.uniform1f(loc.uIsSoft,  q.isSoft ? 1.0 : 0.0);
				gl.uniform1f(loc.uOpacity, q.opacity);

				// 2 triangles: TL -> BL -> BR, TL -> BR -> TR
				// Top maps to v0 (canvas top), Bottom maps to v1 (canvas bottom)
				const pTL = q.pTL, pTR = q.pTR, pBR = q.pBR, pBL = q.pBL;
				v[0]  = pTL[0]; v[1]  = pTL[1]; v[2]  = pTL[2]; v[3]  = q.u0; v[4]  = q.v0;
				v[5]  = pBL[0]; v[6]  = pBL[1]; v[7]  = pBL[2]; v[8]  = q.u0; v[9]  = q.v1;
				v[10] = pBR[0]; v[11] = pBR[1]; v[12] = pBR[2]; v[13] = q.u1; v[14] = q.v1;

				v[15] = pTL[0]; v[16] = pTL[1]; v[17] = pTL[2]; v[18] = q.u0; v[19] = q.v0;
				v[20] = pBR[0]; v[21] = pBR[1]; v[22] = pBR[2]; v[23] = q.u1; v[24] = q.v1;
				v[25] = pTR[0]; v[26] = pTR[1]; v[27] = pTR[2]; v[28] = q.u1; v[29] = q.v0;

				gl.bufferSubData(gl.ARRAY_BUFFER, 0, v);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}

			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.disableVertexAttribArray(loc.aPos);
			gl.disableVertexAttribArray(loc.aUv);
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		_renderPlaneWireframes(quads, theme) {
			if (!this.showPlanesWireframe || !quads.length) return;
			const gl = this.gl;

			const darkBg = theme.wireDarkBg;
			const colCyan  = darkBg ? [0.24, 0.90, 1.00, 0.85] : [0.04, 0.52, 0.68, 0.90];
			const colAmber = darkBg ? [1.00, 0.74, 0.24, 0.88] : [0.80, 0.42, 0.04, 0.92];
			const colMint  = darkBg ? [0.34, 0.96, 0.72, 0.85] : [0.06, 0.56, 0.38, 0.90];
			const colGold  = darkBg ? [1.00, 0.60, 0.20, 0.90] : [0.76, 0.30, 0.05, 0.92];

			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(false);

			this._resetColorBatch();
			for (let i = 0; i < quads.length; i++) {
				const q = quads[i];
				let col = colCyan;
				if (q.planeType === "ground_xz") col = colAmber;
				else if (q.planeType === "crossed_x") col = colMint;
				else if (q.planeType === "ribbon") col = colGold;

				const tl = q.pTL, tr = q.pTR, br = q.pBR, bl = q.pBL;
				this._pushLine(tl[0], tl[1], tl[2], tr[0], tr[1], tr[2], col);
				this._pushLine(tr[0], tr[1], tr[2], br[0], br[1], br[2], col);
				this._pushLine(br[0], br[1], br[2], bl[0], bl[1], bl[2], col);
				this._pushLine(bl[0], bl[1], bl[2], tl[0], tl[1], tl[2], col);
			}
			this._flushColorBatch(gl.LINES);

			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		// ---------------------------------------------------------------------
		// MAIN RENDER LOOP ENTRYPOINT
		// ---------------------------------------------------------------------
		renderScene(sceneState) {
			if (!this.gl || this.destroyed) return;
			const gl = this.gl;
			const state = sceneState || {};
			const theme = ARENA_THEMES[this.arenaBg] || ARENA_THEMES.arena;

			// Auto-orbit advances smoothly on wall-clock delta (even when combat timeline is paused!)
			const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
			if (this.autoOrbit && !this._isDragging) {
				if (this._lastOrbitMs > 0) {
					const dt = clamp((nowMs - this._lastOrbitMs) * 0.001, 0, 0.05);
					this.yaw += this.autoOrbitSpeed * dt;
				}
			}
			this._lastOrbitMs = nowMs;

			// Compute camera matrices with optional impact shake
			const shake = state.shake || [0, 0, 0];
			const sx = shake[0] || 0;
			const sy = shake[1] || 0;
			const sz = shake[2] || 0;

			const cp = Math.cos(this.pitch);
			const sp = Math.sin(this.pitch);
			const syaw = Math.sin(this.yaw);
			const cyaw = Math.cos(this.yaw);

			const targetShaken = [
				this.target[0] + sx,
				this.target[1] + sy,
				this.target[2] + sz,
			];
			this._camEye[0] = targetShaken[0] + this.dist * cp * syaw;
			this._camEye[1] = targetShaken[1] + this.dist * sp;
			this._camEye[2] = targetShaken[2] + this.dist * cp * cyaw;

			const aspect = this.canvas.width / Math.max(1, this.canvas.height);
			mat4Perspective(this._projMat, (40 * Math.PI) / 180, aspect, 0.1, 120.0);
			mat4LookAt(this._viewMat, this._camEye, targetShaken, [0, 1, 0], this._camBasis);
			mat4Multiply(this._viewProjMat, this._projMat, this._viewMat);

			// Clear frame
			gl.viewport(0, 0, this.canvas.width, this.canvas.height);
			gl.clearColor(theme.clear[0], theme.clear[1], theme.clear[2], theme.clear[3]);
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			// 1. Opaque 3D Tactical Arena & Blocky Kybermon Dummies
			if (this.showArena) {
				gl.enable(gl.CULL_FACE);
				gl.cullFace(gl.BACK);
				this._beginMeshPass(theme);
				this._renderArenaFloor(theme);

				if (state.ally !== null) {
					const allyData = state.ally || { x: -2.4, y: 0, z: 0, rotY: 0, armRaise: 0, scaleY: 1, flashWhite: 0, hpRatio: 1 };
					this._renderAllyDummy(allyData, theme);
				}
				if (state.enemy !== null) {
					const enemyData = state.enemy || { x: 2.4, y: 0, z: 0, rotY: 0, armRaise: 0, scaleY: 1, flashWhite: 0, hpRatio: 1 };
					this._renderEnemyDummy(enemyData, theme);
				}
				gl.disable(gl.CULL_FACE);
			}

			// 2. Transparent 3D VFX Planes (all 5 geometries, depth-sorted back-to-front)
			const quads = this._expandPlanesToQuads(state.planes);
			this._renderVfxQuads(quads);

			// 3. Optional 3D Plane Wireframe Outlines
			this._renderPlaneWireframes(quads, theme);
		}

		// ---------------------------------------------------------------------
		// CLEANUP
		// ---------------------------------------------------------------------
		destroy() {
			if (this.destroyed) return;
			this.destroyed = true;

			const c = this.canvas;
			if (c) {
				if (this._onPointerDown) c.removeEventListener("pointerdown", this._onPointerDown);
				if (this._onWheel) c.removeEventListener("wheel", this._onWheel);
				if (this._onDblClick) c.removeEventListener("dblclick", this._onDblClick);
				if (this._onContextMenu) c.removeEventListener("contextmenu", this._onContextMenu);
				if (this._onContextLost) c.removeEventListener("webglcontextlost", this._onContextLost);
				if (this._onContextRestored) c.removeEventListener("webglcontextrestored", this._onContextRestored);
			}
			if (this._onPointerMove) window.removeEventListener("pointermove", this._onPointerMove);
			if (this._onPointerUp) {
				window.removeEventListener("pointerup", this._onPointerUp);
				window.removeEventListener("pointercancel", this._onPointerUp);
			}

			const gl = this.gl;
			if (gl) {
				const keys = Object.keys(this.sheets);
				for (let i = 0; i < keys.length; i++) {
					const entry = this.sheets[keys[i]];
					if (entry && entry.texture) {
						gl.deleteTexture(entry.texture);
					}
				}
				this.sheets = Object.create(null);

				if (this._cubeVbo) gl.deleteBuffer(this._cubeVbo);
				if (this._flatQuadVbo) gl.deleteBuffer(this._flatQuadVbo);
				if (this._vfxQuadVbo) gl.deleteBuffer(this._vfxQuadVbo);
				if (this._colorVbo) gl.deleteBuffer(this._colorVbo);

				if (this._meshProg) gl.deleteProgram(this._meshProg);
				if (this._colorProg) gl.deleteProgram(this._colorProg);
				if (this._vfxProg) gl.deleteProgram(this._vfxProg);
			}
			this.gl = null;
		}
	}

	window.WebGL3DEngine = WebGL3DEngine;
})();
