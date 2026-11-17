/*
 * Shepard-Metzler style cube figures, drawn on a <canvas>.
 * Each figure is 10 unit cubes joined face-to-face in 4 straight arms.
 * Figures are rotated about the vertical axis (rotation in depth) and seen
 * from slightly above, with an orthographic (parallel) projection.
 * Works in the browser (window.FIGURES) and in Node (module.exports) for tests.
 */
(function (root) {
  "use strict";

  // Arms: [axis, direction, length]. Lengths add up to 9, + the start cube = 10 cubes.
  // Every shape uses all three axes, so it is chiral: its mirror image cannot be
  // rotated into it. This is checked by tools/check_shapes.js.
  const SHAPE_DEFS = {
    A: [["x", 1, 3], ["y", 1, 2], ["z", 1, 2], ["y", 1, 2]],
    B: [["x", 1, 3], ["y", 1, 2], ["z", 1, 2], ["x", 1, 2]],
    C: [["x", 1, 2], ["z", 1, 3], ["y", 1, 2], ["x", -1, 2]],
    D: [["y", 1, 3], ["x", 1, 2], ["z", 1, 3], ["y", 1, 1]],
    E: [["x", 1, 3], ["z", 1, 2], ["y", 1, 3], ["z", -1, 1]],
    F: [["z", 1, 2], ["y", 1, 3], ["x", 1, 2], ["z", 1, 2]],
    G: [["x", 1, 2], ["y", 1, 3], ["z", 1, 2], ["y", -1, 2]],
    H: [["x", 1, 3], ["y", 1, 3], ["z", 1, 2], ["x", 1, 1]],
    // practice only
    P1: [["x", 1, 3], ["y", 1, 3], ["z", 1, 3]],
    P2: [["x", 1, 2], ["y", 1, 3], ["x", 1, 2], ["z", 1, 2]],
  };
  const TEST_SHAPES = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const PRACTICE_SHAPES = ["P1", "P2"];

  const AX = { x: 0, y: 1, z: 2 };

  function buildCubes(def) {
    const cubes = [[0, 0, 0]];
    let p = [0, 0, 0];
    def.forEach(([axis, dir, len]) => {
      for (let i = 0; i < len; i++) {
        p = p.slice();
        p[AX[axis]] += dir;
        cubes.push(p);
      }
    });
    // centre on the centroid
    const c = [0, 1, 2].map((k) => cubes.reduce((s, q) => s + q[k], 0) / cubes.length);
    return cubes.map((q) => q.map((v, k) => v - c[k]));
  }

  const mirror = (cubes) => cubes.map(([x, y, z]) => [-x, y, z]);

  // Rotate about the vertical (y) axis by az degrees, then tilt toward the viewer by el degrees.
  function viewTransform(azDeg, elDeg) {
    const a = (azDeg * Math.PI) / 180;
    const e = (elDeg * Math.PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
    return ([x, y, z]) => {
      const x1 = ca * x + sa * z;
      const z1 = -sa * x + ca * z;
      // tilt about the x axis: camera looks slightly down at the figure
      const y2 = ce * y - se * z1;
      const z2 = se * y + ce * z1; // larger z2 = closer to the viewer
      return [x1, y2, z2];
    };
  }

  const FACES = [
    // [normal, 4 corner offsets]
    [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]],
    [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
    [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]],
    [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
    [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
    [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]],
  ];

  // Largest distance of any cube corner from the centre: used so that both
  // figures in a pair (and all trials) are drawn at the same scale.
  function radius(cubes) {
    let r = 0;
    cubes.forEach((q) => {
      for (let i = 0; i < 8; i++) {
        const v = [q[0] - 0.5 + (i & 1), q[1] - 0.5 + ((i >> 1) & 1), q[2] - 0.5 + ((i >> 2) & 1)];
        r = Math.max(r, Math.hypot(v[0], v[1], v[2]));
      }
    });
    return r;
  }

  // Paint the visible faces back-to-front. fill(cubeIndex, shade) returns a CSS colour.
  function paint(ctx, size, opts, fill, stroke) {
    const base = opts.mirror ? mirror(opts.cubes) : opts.cubes;
    const T = viewTransform(opts.az, opts.el == null ? 30 : opts.el);
    const scale = (size * 0.46) / radius(opts.cubes);
    const key = (q) => q.map(Math.round).join(",");
    const occupied = new Set(base.map(key));
    const o = T([0, 0, 0]);
    const light = [-0.35, 0.8, 0.5];
    const ln = Math.hypot(...light);

    // back-to-front by cube centre depth (correct for equal cubes on a grid, orthographic view)
    base
      .map((q, i) => ({ q: q, i: i, depth: T(q)[2] }))
      .sort((a, b) => a.depth - b.depth)
      .forEach(({ q, i }) => {
        FACES.forEach(([n, corners]) => {
          if (occupied.has(key([q[0] + n[0], q[1] + n[1], q[2] + n[2]]))) return; // glued face
          const tn = T(n);
          const nz = tn[2] - o[2];
          if (nz <= 1e-6) return; // facing away
          const shade = Math.max(0, ((tn[0] - o[0]) * light[0] + (tn[1] - o[1]) * light[1] + nz * light[2]) / ln);
          ctx.fillStyle = fill(i, shade);
          ctx.beginPath();
          corners.forEach((c, k) => {
            const p = T([q[0] - 0.5 + c[0], q[1] - 0.5 + c[1], q[2] - 0.5 + c[2]]);
            const X = size / 2 + p[0] * scale;
            const Y = size / 2 - p[1] * scale;
            k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          });
          ctx.closePath();
          ctx.fill();
          if (stroke) ctx.stroke();
        });
      });
  }

  /**
   * Draw a figure into a canvas.
   * opts: { cubes, az, el, size (CSS px), mirror (bool) }
   */
  function draw(canvas, opts) {
    const size = opts.size;
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1.2, size / 260);
    ctx.strokeStyle = "#1b1d20";
    paint(ctx, size, opts, (i, shade) => {
      const g = Math.round(105 + 145 * shade);
      return `rgb(${g},${g},${Math.min(255, g + 4)})`;
    }, true);
  }

  /**
   * How well can every cube be seen from this view? Draws each cube in its own
   * colour on a small offscreen canvas and returns the visible pixel count of the
   * least visible cube divided by the median count (1 = all equally visible,
   * near 0 = some cube is hidden behind another arm). Browser only.
   */
  let probe = null;
  function visibility(cubes, az, el, isMirror) {
    const S = 96;
    if (!probe) {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      probe = c.getContext("2d", { willReadFrequently: true });
      probe.imageSmoothingEnabled = false;
    }
    probe.clearRect(0, 0, S, S);
    paint(probe, S, { cubes: cubes, az: az, el: el, mirror: isMirror }, (i) => `rgb(${(i + 1) * 20},0,0)`, false);
    const px = probe.getImageData(0, 0, S, S).data;
    const counts = new Array(cubes.length).fill(0);
    for (let k = 0; k < px.length; k += 4) {
      if (px[k + 1] !== 0 || px[k + 2] !== 0 || px[k + 3] !== 255) continue; // skip background and blended edges
      const i = px[k] / 20 - 1;
      if (Number.isInteger(i) && i >= 0 && i < counts.length) counts[i]++;
    }
    const sorted = counts.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 1;
    return sorted[0] / median;
  }

  const SHAPES = {};
  Object.keys(SHAPE_DEFS).forEach((k) => (SHAPES[k] = buildCubes(SHAPE_DEFS[k])));

  const api = { SHAPE_DEFS, SHAPES, TEST_SHAPES, PRACTICE_SHAPES, buildCubes, mirror, viewTransform, radius, draw, visibility };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FIGURES = api;
})(typeof window !== "undefined" ? window : globalThis);
