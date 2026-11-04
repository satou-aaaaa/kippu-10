// アプリのアイコン（icon-192.png・icon-512.png）を作る。うす緑の切符に赤い「10」。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#efe9dc"/>
      <rect x="12" y="26" width="76" height="48" rx="4" fill="#dfeadb" stroke="#7fa07a" stroke-width="2"/>
      <circle cx="12" cy="50" r="6" fill="#efe9dc" stroke="#7fa07a" stroke-width="2"/><circle cx="88" cy="50" r="6" fill="#efe9dc" stroke="#7fa07a" stroke-width="2"/>
      <rect x="4" y="40" width="7" height="20" fill="#efe9dc"/><rect x="89" y="40" width="7" height="20" fill="#efe9dc"/>
      <text x="50" y="63" font-size="34" text-anchor="middle" fill="#c23b2e" font-family="monospace" font-weight="900">10</text></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
