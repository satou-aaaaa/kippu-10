// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の切符（答え）は入れず、遊び方の例（1234）だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#efe9dc;color:#1d2320;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#8e2a20;letter-spacing:.1em">だれでも同じ 1日5枚・3分</div>
    <div style="font-size:110px;font-weight:900;margin-top:16px;letter-spacing:.08em">きっぷで<span style="color:#c23b2e">10</span></div>
    <div style="font-size:40px;margin-top:18px;line-height:1.5">切符の4つの数字と ＋−×÷ で<br>10を作れる？</div>
    <div style="position:absolute;left:700px;top:330px;width:440px;height:200px;background:#dfeadb;background-image:repeating-linear-gradient(45deg,transparent 0 10px,#ffffff66 10px 12px);border:3px solid #7fa07a;border-radius:10px;box-shadow:0 8px 0 #1d232022;transform:rotate(-4deg)">
      <div style="display:flex;justify-content:space-between;padding:16px 26px 0;font-size:24px;color:#3d5a3a;font-weight:700"><span>第1日</span><span>乗車券</span></div>
      <div style="text-align:center;font-family:monospace;font-size:100px;letter-spacing:.2em;font-weight:700;margin-top:6px">1234</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
