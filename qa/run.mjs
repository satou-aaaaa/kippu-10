// きっぷで10の検査。データ（全部解き直して合うか）・5枚の組み方（3年分）・通しで遊ぶ・戻す・ヒント・続きから・上級・切符帳・別解・記録・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const T = createRequire(import.meta.url)(path.join(root, "ten.js"));

// 1. データ（ブラウザを使わない）：715通りを全部解き直し、data.js と合うか
const sb = { window: {} }; vm.runInNewContext(readFileSync(path.join(root, "data.js"), "utf8"), sb);
const D = sb.window.TEN_DATA, ALL = [...D.T[0], ...D.T[1], ...D.T[2]];
{
  // 解き方を手で確かめる：分数で全部の組み合わせを試す（ten.js とは別に書いた単純な数え方）
  const ops = [(a, b) => a + b, (a, b) => a - b, (a, b) => a * b, (a, b) => (b === 0 ? NaN : a / b)];
  const can = (xs) => xs.length === 1 ? Math.abs(xs[0] - 10) < 1e-9 : xs.some((_, i) => xs.some((__, j) => i !== j && ops.some((f) => { const v = f(xs[i], xs[j]); return Number.isFinite(v) && can([...xs.filter((___, k) => k !== i && k !== j), v]); })));
  const keys = T.allKeys(), solvable = keys.filter((k) => can(k.split("").map(Number)));
  check("4つの数字の組は715通り・解ける組がちょうど data.js に入っている", keys.length === 715 && solvable.length === ALL.length && solvable.every((k) => D.S[k]) && new Set(ALL).size === ALL.length, `${solvable.length}組`);
  const fresh = T.TIERS();
  check("data.js は tools/make-data.cjs で作り直したものと同じ（手で直していない）", JSON.stringify(fresh) === JSON.stringify(D.T) && ALL.every((k) => { const r = T.solve(k.split("").map(Number)); return JSON.stringify([r.ways, r.int ? 1 : 0, r.sol.steps, r.forms]) === JSON.stringify(D.S[k]); }));
  // ヒントの手順をたどると本当に10になる
  const fr = (s) => { const [n, d] = s.split("/").map(Number); return T.fr(n, d || 1); };
  const hintOk = ALL.every((k) => { const steps = D.S[k][2]; let hand = k.split(""); for (const [a, op, b, c] of steps) { const ia = hand.indexOf(a); if (ia < 0) return false; hand.splice(ia, 1); const ib = hand.indexOf(b); if (ib < 0) return false; hand.splice(ib, 1); const v = T.calc(fr(a), op, fr(b)); if (!v || T.fstr(v) !== c) return false; hand.push(c); } return hand.length === 1 && hand[0] === "10"; });
  check("ヒントの手順（3つの計算）は切符の数字から始まり、たどると10になる", hintOk);
  check("式の一覧は重ならず、どの式も計算すると10（数字は切符の4つを1回ずつ）", ALL.every((k) => { const f = D.S[k][3]; return f.length === D.S[k][0] && new Set(f).size === f.length && f.every((e) => { const ds = e.match(/\d/g).sort().join(""); return ds === k && Math.abs(Function(`return ${e.replace(/×/g, "*").replace(/÷/g, "/")}`)() - 10) < 1e-9; }); }));
  check("難しさ：むずかしいは式が1通りか分数が要る組だけ・ふつうは2〜4通り・やさしいは5通り以上", D.T[2].every((k) => D.S[k][0] <= 1 || !D.S[k][1]) && D.T[1].every((k) => D.S[k][0] >= 2 && D.S[k][0] <= 4 && D.S[k][1]) && D.T[0].every((k) => D.S[k][0] >= 5 && D.S[k][1]), D.T.map((t) => t.length).join("・"));
  check("有名な難問（1158・1199・3478）は「むずかしい」に入り、分数が要る", ["1158", "1199", "3478"].every((k) => D.T[2].includes(k) && !D.S[k][1]));
  check("解けない組（1111・0000）は入っていない", !D.S["1111"] && !D.S["0000"]);
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
check("終えた回を消すのは同じ回のときだけ・0時を過ぎたホームの「今日」のボタンは描き直す（2026-11-04 CodeRabbit）", /c\.date === run\.date && c\.id === run\.id\) s2\.runs\[MODE\] = null/.test(html) && /\$\("go-d"\)\.onclick = \(\) => \(k !== todayKey\(\) \? home\(\)/.test(html));
check("別のタブで今日の分を終えたあと、古い画面から今日・上級をもう一度始めない（2026-11-04 CodeRabbit）", /\(mode === "d" && s\.days\[k\]\) \|\| \(mode === "h" && s\.hdays\[k\]\)\) return;/.test(html));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習の切符選びと練習の番号の種だけ（今日の5枚・上級・番号の並びは日付の乱数）", (html.match(/Math\.random/g) || []).length === 2);
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
check("実在の鉄道会社の名前を使わない", !/JR|国鉄|東急|西武|東武|小田急|京王|京急|京成|阪急|阪神|近鉄|名鉄|南海|京阪|メトロ|都営/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/kippu-10/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./data.js", "./ten.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*Promise\.race\(\[caches\.open[^\n]*wait\(15000\)\]\); \}, \(\) => \{\}\)\.catch\(\(\) => \{\}\), wait\(60000\)\]\)\);/.test(sw) && !/\.then\([^\n]*e\.waitUntil/.test(sw));
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", need.every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "きっぷで10" && mf.icons.length >= 2 && mf.start_url === "./"); }
{ const src = ["index.html", "ten.js"].filter((f) => existsSync(path.join(root, f))).map((f) => readFileSync(path.join(root, f), "utf8")).join("\n");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }

// 切符の番号（並び）から、押す順番（手もとの何番目どうし）を探す
function stepsFor(no) {
  const start = no.split("").map((d) => T.fr(+d));
  const go = (hand, acc) => {
    const idx = hand.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 1) return hand[idx[0]].n === 10 && hand[idx[0]].d === 1 ? acc : null;
    for (const a of idx) for (const b of idx) { if (a === b) continue; for (const op of T.OPS) { const v = T.calc(hand[a], op, hand[b]); if (!v) continue; const nx = hand.slice(); nx[b] = v; nx[a] = null; const r = go(nx, [...acc, [a, op, b]]); if (r) return r; } }
    return null;
  };
  return go(start, []);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const curT = (page) => page.evaluate(() => window.__kp.cur());
async function solveNow(page, wrongFirst = false) {
  const c = await curT(page), st = stepsFor(c.no);
  for (const [a, op, b] of st) { await page.click(`.cardn[data-j="${a}"]`); await page.click(`.op[data-op="${op}"]`); await page.click(`.cardn[data-j="${b}"]`); }
  return st;
}
const KEY = "kippu-v1";
try {
  const page = await newPage();
  // 2. 5枚の組み方（日付の乱数）。3年分
  const sel = await page.evaluate(() => {
    const g = window.__kp, out = { bad: [], dup: 0, hardHit: 0, sameDay: 0 };
    const seen = { 0: [], 1: [], 2: [] };
    for (let n = 0; n < 1100; n++) {
      const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10);
      const d = g.dailyList(k), h = g.hardList(k);
      if (d.map((x) => g.info(x).t).join() !== "0,0,1,1,2" || new Set(d).size !== 5) out.bad.push(k);
      if (h.some((x) => g.info(x).t !== 2) || new Set(h).size !== 3) out.bad.push(k + "h");
      if (h.includes(d[4])) out.hardHit++;
      seen[0].push(d[0], d[1]); seen[1].push(d[2], d[3]); seen[2].push(d[4], ...h);
    }
    [0, 1, 2].forEach((t) => { const L = g.D.T[t].length; for (let i = 0; i + L <= seen[t].length; i += L) if (new Set(seen[t].slice(i, i + L)).size !== L) out.dup++; });
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01")) + g.numberOf(g.dailyList("2026-12-01")[0], "2026-12-01:d:0");
    out.nums = g.ALL.every((k) => { const a = g.numberOf(k, "x"); return a.split("").sort().join("") === k && a === g.numberOf(k, "x"); });
    return out;
  });
  check("今日の5枚は毎日「やさしい2・ふつう2・むずかしい1」、上級はむずかしい3枚（3年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("上級の3つはどの日も重ならない（周の切れ目をまたぐ日も。55年分）", await page.evaluate(() => { const g = window.__kp; for (let n = 0; n < 20000; n++) { const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10), h = g.hardList(k); if (h.length !== 3 || new Set(h).size !== 3 || h.includes(g.dailyList(k).slice(-1)[0])) return false; } return true; }));
  check("1周するまで同じ組は出ない（難しさごと）", sel.dup === 0);
  check("上級は今日の5枚目と重ならない（3年分）", sel.hardHit === 0, `${sel.hardHit}日`);
  check("切符の番号は組の数字の並べかえで、同じ種なら同じ並び", sel.nums);
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => { const g = window.__kp; return JSON.stringify(g.dailyList("2026-12-01")) + g.numberOf(g.dailyList("2026-12-01")[0], "2026-12-01:d:0"); });
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ5枚・同じ番号", sel.d1201 === d2); }

  // 3. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  check("ホームの例の切符は遊び方と同じ（1234）", (await page.textContent(".ticket .no")) === "1234");
  await page.click("#go-d");
  let c = await curT(page);
  check("1枚目は「やさしい」・数字のカード4枚・切符の番号と同じ", (await page.evaluate((k) => window.__kp.info(k).t, c.key)) === 0 && (await page.locator(".cardn[data-j]").count()) === 4 && (await page.textContent(".ticket .no")) === c.no);
  // 先に演算を押すと案内
  await page.click('.op[data-op="+"]');
  check("数字より先に＋−×÷を押すと、先に数字を押すよう案内する（何も起きない）", (await page.locator(".toast").last().textContent()).includes("先に数字") && (await page.locator(".cardn[data-j]").count()) === 4);
  // 1回計算して、戻す
  await page.click('.cardn[data-j="0"]'); await page.click('.op[data-op="+"]'); await page.click('.cardn[data-j="1"]');
  const d0 = +c.no[0], d1 = +c.no[1];
  check("数字→＋→数字で2つが1つになり、計算が記録に出る", (await page.locator(".cardn[data-j]").count()) === 3 && (await page.textContent('.cardn[data-j="1"]')) === String(d0 + d1) && (await page.textContent("#log")).includes(`＝ ${d0 + d1}`));
  await page.click("#hint");
  check("ヒントで最初の計算が出る", (await page.textContent("#hintbox")).includes("まず"));
  await page.reload(); await page.click("#go-d");
  check("途中で閉じても、計算した手順とヒントはそのまま（続きから）", (await page.locator(".cardn[data-j]").count()) === 3 && (await page.textContent("#hintbox")).includes("まず"));
  await page.click("#undo");
  check("「1つ戻す」で前の手もとに戻る", (await page.locator(".cardn[data-j]").count()) === 4);
  // 0で割る
  const zeroAt = c.no.indexOf("0");
  if (zeroAt >= 0) { const other = zeroAt === 0 ? 1 : 0; await page.click(`.cardn[data-j="${other}"]`); await page.click('.op[data-op="÷"]'); await page.click(`.cardn[data-j="${zeroAt}"]`); check("0で割ろうとすると止め、手もとは変わらない", (await page.locator(".cardn[data-j]").count()) === 4); await page.click(`.cardn[data-j="${other}"]`).catch(() => {}); }
  // 10にならない式
  await page.click('.cardn[data-j="0"]'); await page.click('.op[data-op="×"]'); await page.click('.cardn[data-j="1"]');
  await page.click('.cardn[data-j="1"]'); await page.click('.op[data-op="×"]'); await page.click('.cardn[data-j="2"]');
  await page.click('.cardn[data-j="2"]'); await page.click('.op[data-op="×"]'); await page.click('.cardn[data-j="3"]');
  const prod = c.no.split("").reduce((a, b) => a * +b, 1);
  if (prod !== 10) check("最後が10でないと「10になりませんでした」と出て、戻せる", (await page.textContent("#after")).includes("10になりませんでした") && !(await page.isDisabled("#undo")));
  await page.click("#reset");
  check("「最初から」で4枚に戻り、10にならない知らせも消える", (await page.locator(".cardn[data-j]").count()) === 4 && !(await page.textContent("#after")).includes("10になりませんでした"));
  // 練習を始めても今日の途中は消えない
  await page.click('.cardn[data-j="0"]'); await page.click('.op[data-op="+"]'); await page.click('.cardn[data-j="1"]');
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", (await page.locator(".cardn[data-j]").count()) === 3 && (await page.evaluate(() => window.__kp.mode())) === "d");
  await page.click("#reset");
  await solveNow(page);
  check("10になると改札の判子が押され、式と★2（ヒント1）が出る", (await page.locator(".stamp").count()) === 1 && (await page.textContent(".formula")).includes("＝ 10") && (await page.locator(".verdict .stars .off").textContent()).length === 1);
  check("通ったあとは＋−×÷を押せない", await page.isDisabled('.op[data-op="+"]'));
  await page.click("#next");
  // 別のタブで先に進んでいたら、古い画面の答えは足さない
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ h: 0, f: "x" }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await solveNow(page);
  check("別のタブで先に進んでいたら、古い画面の答えは足さず今の切符を出し直す", (await page.evaluate(() => window.__kp.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/5"));
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 4; j++) { await solveNow(page); await page.click("#next"); }
  const share = await page.textContent(".share");
  const daily = await page.evaluate(() => { const g = window.__kp; return g.dailyList(g.todayKey()); });
  check("5枚で結果・シェアの文は番号と色だけ（切符の数字・式は出さない）", /きっぷで10 #\d+/.test(share) && /🎫🟨🟩🟩🟩🟩/.test(share) && !daily.some((k) => share.includes(k)) && !/[×÷]/.test(share));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("ヒントを使った日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・切符帳に5枚", (await page.textContent(".stats")).includes("1連続の日") && (await page.textContent("#go-d")).includes("今日の結果") && (await page.textContent("#go-dex")).includes("5/"));
  // 上級：ヒントなし・全部ヒントなしなら Ko-fi
  await page.click("#go-h");
  check("上級はヒントのボタンが無い・むずかしい", (await page.locator("#hint").count()) === 0 && (await page.evaluate(() => { const g = window.__kp; return g.info(g.cur().key).t; })) === 2);
  for (let j = 0; j < 3; j++) { await solveNow(page); await page.click("#next"); }
  check("上級を全部ヒントなしで初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("ヒントなし"));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  // 練習：記録の日を増やさず、切符帳には載る
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  const played = [];
  for (let j = 0; j < 3; j++) { played.push((await curT(page)).key); await solveNow(page); await page.click("#next"); }
  const after = await page.evaluate(() => { const s = window.__kp.load(); return { days: Object.keys(s.days).length, dex: s.dex }; });
  check("練習は今日の記録を増やさず、切符帳には載る", after.days === 1 && played.every((k) => after.dex[k] >= 1) && (await page.locator(".share").count()) === 0, played.join(","));
  await page.click("#go-dex");
  check("切符帳に集めた切符が並ぶ", (await page.locator(".dex button").count()) === Object.keys(after.dex).length);
  // 別解さがし：やさしい切符を選び、見つけた式が増える
  const easy = await page.evaluate(() => { const g = window.__kp, s = g.load(); return Object.keys(s.dex).find((k) => g.info(k).t === 0); });
  await page.click(`.dex button[data-k="${easy}"]`);
  const before = await page.locator(".forms span.got").count();
  check("切符帳の切符を押すと、見つけた式と残りの数（？）が見られる", before >= 1 && (await page.locator(".forms span").count()) === (await page.evaluate((k) => window.__kp.info(k).ways, easy)));
  await page.click("#again");
  check("別解さがしは、その切符の練習になる", (await curT(page)).key === easy && (await page.evaluate(() => window.__kp.mode())) === "p");
  await page.close();

  // 4. スマホ幅：はみ出さない・押せる所は44px以上
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); const fb2 = await p3.evaluate(() => { const a = document.querySelector("#howto #fb2"); return a ? a.getBoundingClientRect().height : 0; }); check(`幅${w}px：遊び方の「感想を送る」も高さ44px以上`, fb2 >= 44, `${fb2}px`); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) }));
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上`, homeOk && !r.over && r.small.length === 0, r.small.join(","));
    await p3.close();
  }
  { // 分数の途中経過もカードに出る（1158 を 1÷5 → 1−1/5 → 8÷4/5）
    const pf = await newPage(); await pf.click("#howto-ok");
    await pf.evaluate(() => { window.__kp.load(); });
    await pf.evaluate((k) => { const g = window.__kp; localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, found: {}, kofi: {}, runs: { p: { mode: "p", date: g.todayKey(), list: ["1158"], res: [], cur: null, id: "qa" } } })); g.play("p"); }, KEY);
    const no = (await curT(pf)).no, i1 = no.indexOf("1"), i1b = no.indexOf("1", i1 + 1), i5 = no.indexOf("5"), i8 = no.indexOf("8");
    await pf.click(`.cardn[data-j="${i1}"]`); await pf.click('.op[data-op="÷"]'); await pf.click(`.cardn[data-j="${i5}"]`);
    const f1 = await pf.textContent(`.cardn[data-j="${i5}"]`);
    await pf.click(`.cardn[data-j="${i1b}"]`); await pf.click('.op[data-op="-"]'); await pf.click(`.cardn[data-j="${i5}"]`);
    const f2 = await pf.textContent(`.cardn[data-j="${i5}"]`);
    await pf.click(`.cardn[data-j="${i8}"]`); await pf.click('.op[data-op="÷"]'); await pf.click(`.cardn[data-j="${i5}"]`);
    check("分数を通る式（1158）：1/5・4/5 がカードに出て、10で通れる", f1 === "1/5" && f2 === "4/5" && (await pf.locator(".stamp").count()) === 1 && (await pf.textContent(".verdict")).includes("分数"));
    await pf.close(); }
  { // 保存できないブラウザでも遊べる
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    await pb.click('.cardn[data-j="0"]'); await pb.click('.op[data-op="+"]'); await pb.click('.cardn[data-j="1"]');
    check("保存できないブラウザでも、今日の1枚目を計算できる", (await pb.textContent("header")).includes("1/5") && (await pb.locator(".cardn[data-j]").count()) === 3);
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗するときも、メモリの新しい進み具合を使う
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "kippu-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, found: {}, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1枚目が始まる", (await pq.textContent("header")).includes("1/5"));
    await pq.close(); }
  { // 最後の1枚を通して「結果を見る」を押す前に閉じた日は、開き直すと結果へ進み記録がつく
    const pc = await newPage();
    await pc.evaluate((k) => { const g = window.__kp, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, found: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ h: 0, f: "" })), id: "a" } } })); }, KEY);
    await pc.reload();
    check("最後の1枚のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__kp; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { // 今日の結果を開いたまま0時を過ぎてから「上級」を押しても、翌日の上級は始めない
    const pm = await newPage();
    await pm.evaluate((k) => { const g = window.__kp, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, found: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ h: 0, f: "" })), id: "a" } } })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__kp.mode())) !== "h");
    await pm.close(); }
  { const pn = await newPage();
    await pn.evaluate((k) => { const g = window.__kp, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, dex: {}, found: {}, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2, 3, 4].map(() => ({ h: 0, f: "" })), id: "a" } } })); }, KEY);
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__kp; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, KEY));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果・見つけた式）を残す", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": 1 }, found: { "1234|a": 1 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 }, found: { "1234|b": 1 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.found["1234|a"] && r.found["1234|b"]; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: ["1234"], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [{ h: 0, f: "" }] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("保存に失敗したタブにだけある途中経過は、別のタブが保存しても消さない（終えた回の null は戻さない）", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (a, b) => { mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: a })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: b }))); const r = g.load(); mem = null; return r; }; const r1 = put({ d: base }, {}), r2 = put({ d: base }, { d: null }); return !!r1.runs.d && r1.runs.d.date === "2000-01-01" && r2.runs.d === null; }, KEY));
    check("同じ進み具合なら、新しく保存したほうの途中経過を使う", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (ta, tb) => { mem = JSON.stringify(Object.assign({}, s0, { t: ta, runs: { d: Object.assign({}, base, { zz: "a" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: tb, runs: { d: Object.assign({}, base, { zz: "b" }) } }))); const r = g.load(); mem = null; return r.runs.d.zz; }; return put(9, 5) === "a" && put(5, 9) === "b"; }, KEY));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: done } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, KEY));
    check("同じ手順の数なら、ヒントを多く使ったほうの途中経過を残す（ヒントが消えて★が増えない）", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: ["1234"], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: Object.assign({}, base, { cur: { i: 0, key: "1234", steps: [], hints: 1 } }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { cur: { i: 0, key: "1234", steps: [], hints: 0 } }) } }))); const r = g.load(); mem = null; return r.runs.d.cur.hints === 1; }, KEY));
    check("同じ問題の練習をやり直したら、前の回（終えたもの）と取り違えず新しい回を使う", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(), base = { mode: "p", date: "2000-01-01", list: [1], tags: [1], res: [], i: 0, hints: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { p: Object.assign({}, base, { id: "new" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { p: Object.assign({}, base, { id: "old", res: [{}], i: 1 }) } }))); const r = g.load(); mem = null; return r.runs.p.id === "new"; }, KEY));
    check("保存に失敗したあと別のタブが保存しても、切符帳の★は高いほうを残す", await pn.evaluate((K) => { const g = window.__kp, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, dex: { "1234": 3 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, dex: { "1234": 1 } }))); const r = g.load(); mem = null; return r.dex["1234"] === 3; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    await pn.close(); }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# きっぷで10 QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
