// Checks the cube figures: run with `node tools/check_shapes.js`.
// 1. 10 cubes, no two cubes in the same place.
// 2. Chiral: the mirror image can't be rotated into the original
//    (otherwise "same" and "mirror" trials would be identical).
// 3. All figures differ from each other (and from each other's mirror images).
const F = require("../js/figures.js");

const norm = (cubes) => {
  const r = cubes.map((q) => q.map((v) => Math.round(v * 2)));
  const min = [0, 1, 2].map((k) => Math.min(...r.map((q) => q[k])));
  return r.map((q) => q.map((v, k) => v - min[k]).join(",")).sort().join("|");
};
// all 24 proper rotations of the cube = signed permutation matrices with det +1
const rotations = [];
const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const parity = (p) => (p[0] > p[1]) + (p[0] > p[2]) + (p[1] > p[2]);
perms.forEach((p) => {
  for (let s = 0; s < 8; s++) {
    const sign = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
    const det = sign[0] * sign[1] * sign[2] * (parity(p) % 2 ? -1 : 1);
    if (det === 1) rotations.push((q) => [0, 1, 2].map((k) => sign[k] * q[p[k]]));
  }
});
const forms = (cubes) => new Set(rotations.map((R) => norm(cubes.map(R))));

let ok = true;
const fail = (m) => { ok = false; console.log("FAIL", m); };
const names = Object.keys(F.SHAPES);
console.log("rotations:", rotations.length);
names.forEach((n) => {
  const c = F.SHAPES[n];
  const uniq = new Set(c.map((q) => q.map((v) => Math.round(v * 2)).join(",")));
  if (n.startsWith("P") ? c.length !== 10 : c.length !== 10) fail(`${n} has ${c.length} cubes`);
  if (uniq.size !== c.length) fail(`${n} overlaps itself`);
  if (forms(c).has(norm(F.mirror(c)))) fail(`${n} is not chiral`);
});
for (let i = 0; i < names.length; i++)
  for (let j = i + 1; j < names.length; j++) {
    const a = forms(F.SHAPES[names[i]]);
    if (a.has(norm(F.SHAPES[names[j]])) || a.has(norm(F.mirror(F.SHAPES[names[j]]))))
      fail(`${names[i]} and ${names[j]} are the same figure`);
  }
console.log(ok ? `OK: ${names.length} figures, all chiral and distinct` : "PROBLEMS FOUND");
process.exit(ok ? 0 : 1);
