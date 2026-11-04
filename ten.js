// きっぷで10：4つの数字（0〜9）と + − × ÷ で10を作る。全部の式を数えて、解けるか・何通りか・分数が要るかを調べる
(function (root) {
  "use strict";
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  // 分数 { n, d }（d は正）
  const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const OPS = ["+", "-", "×", "÷"];
  function calc(a, op, b) {
    if (op === "+") return fr(a.n * b.d + b.n * a.d, a.d * b.d);
    if (op === "-") return fr(a.n * b.d - b.n * a.d, a.d * b.d);
    if (op === "×") return fr(a.n * b.n, a.d * b.d);
    if (b.n === 0) return null;
    return fr(a.n * b.d, a.d * b.n);
  }
  const fstr = (f) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
  const isInt = (f) => f.d === 1;
  // 式は「足し算の列」「かけ算の列」にならして持つ（順番やかっこの付け方だけちがう式は同じ式として数える）
  // node：{ t:"n", s:"5" } / { t:"+", k:[[符号, node]] } / { t:"×", k:[[±1, node]] }
  const leaf = (d) => ({ t: "n", s: String(d) });
  const parts = (x, t) => (x.t === t ? x.k : [[1, x]]);
  function exprOf(x, op, y) {
    const t = op === "+" || op === "-" ? "+" : "×", sg = op === "-" || op === "÷" ? -1 : 1;
    return { t, k: [...parts(x, t), ...parts(y, t).map(([g, n]) => [g * sg, n])] };
  }
  function show(x) {
    if (x.t === "n") return x.s;
    const sub = (n) => (x.t === "×" && n.t === "+" ? `(${show(n)})` : show(n));
    const pos = x.k.filter((p) => p[0] > 0).map((p) => sub(p[1])).sort(), neg = x.k.filter((p) => p[0] < 0).map((p) => sub(p[1])).sort();
    const [o1, o2] = x.t === "+" ? ["+", "-"] : ["×", "÷"];
    return (pos.length ? pos.join(o1) : x.t === "+" ? "0" : "1") + neg.map((n) => o2 + n).join("");
  }
  // 解き方を全部さがす。cards：[{ v:分数, e:{s,op} }]、steps：[[a, op, b, c]]
  function search(cards, steps, intOnly, out) {
    if (cards.length === 1) { const c = cards[0]; if (c.v.n === 10 && c.v.d === 1) out.push({ s: show(c.e), steps: steps.slice(), int: intOnly }); return; }
    for (let i = 0; i < cards.length; i++) for (let j = 0; j < cards.length; j++) {
      if (i === j) continue;
      const a = cards[i], b = cards[j], rest = cards.filter((_, k) => k !== i && k !== j);
      for (const op of OPS) {
        if ((op === "+" || op === "×") && i > j) continue; // 入れかえても同じ
        const v = calc(a.v, op, b.v); if (!v) continue;
        steps.push([fstr(a.v), op, fstr(b.v), fstr(v)]);
        search([...rest, { v, e: exprOf(a.e, op, b.e) }], steps, intOnly && isInt(v), out);
        steps.pop();
      }
    }
  }
  const cache = new Map();
  // digits：[4つの数字] → { ok, ways:式の数, int:分数なしで解けるか, sol:ヒント用の解き方 }
  function solve(digits) {
    const key = digits.slice().sort().join("");
    if (cache.has(key)) return cache.get(key);
    const out = [];
    search(digits.map((d) => ({ v: fr(d), e: leaf(d) })), [], true, out);
    const forms = new Set(out.map((o) => o.s));
    const ints = out.filter((o) => o.int);
    const best = (ints.length ? ints : out).slice().sort((x, y) => x.s.length - y.s.length || (x.s < y.s ? -1 : 1))[0] || null;
    const r = { key, ok: out.length > 0, ways: forms.size, int: ints.length > 0, sol: best, forms: [...forms].sort((x, y) => x.length - y.length || (x < y ? -1 : 1)) };
    cache.set(key, r);
    return r;
  }
  // 4つの数字の組（並びを問わない）715通りのうち、解けるものを難しさで3つに分ける
  function allKeys() { const ks = []; for (let a = 0; a <= 9; a++) for (let b = a; b <= 9; b++) for (let c = b; c <= 9; c++) for (let d = c; d <= 9; d++) ks.push(`${a}${b}${c}${d}`); return ks; }
  // 難しさ：0 やさしい（式が5通り以上）・1 ふつう（2〜4通り）・2 むずかしい（1通りだけ、または分数が要る）
  function tierOf(r) { if (!r.int || r.ways <= 1) return 2; if (r.ways <= 4) return 1; return 0; }
  let tiers = null;
  function TIERS() {
    if (tiers) return tiers;
    tiers = [[], [], []];
    for (const k of allKeys()) { const r = solve(k.split("").map(Number)); if (r.ok) tiers[tierOf(r)].push(k); }
    return tiers;
  }
  const api = { exprOf, show, leaf, fr, calc, fstr, solve, allKeys, tierOf, TIERS, OPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TEN = api;
})(typeof self !== "undefined" ? self : this);
