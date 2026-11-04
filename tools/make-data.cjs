// data.js を作る：node tools/make-data.cjs（手で直さない）
// 4つの数字の組 715通りを全部解き、解ける組を難しさで3つに分け、解き方（ヒント）と式の一覧を書く
const fs = require("fs"), path = require("path");
const T = require("../ten.js");
const tiers = T.TIERS(), S = {};
for (const ti of tiers) for (const k of ti) { const r = T.solve(k.split("").map(Number)); S[k] = [r.ways, r.int ? 1 : 0, r.sol.steps, r.forms]; }
const out = `// node tools/make-data.cjs で作る（手で直さない）。T：難しさごとの組（やさしい・ふつう・むずかしい）、S：組 → [式の数, 分数なしで解けるか, ヒントの手順, 式の一覧]\nwindow.TEN_DATA = ${JSON.stringify({ T: tiers, S })};\n`;
fs.writeFileSync(path.join(__dirname, "..", "data.js"), out);
console.log("data.js:", tiers.map((t) => t.length).join("・"), "組,", (out.length / 1024).toFixed(0), "KB");
