import { config } from "../config.js";

const STYLE = `
:root{--bg:#11131a;--card:#1b1f2a;--line:#2a3040;--text:#e8eaf0;--muted:#8b93a7;
--new:#ff8a3d;--cooking:#ffd23d;--way:#4da3ff;--done:#3ecf8e;--cancel:#6b7280}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);
padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
h1{font-size:18px;margin:0;font-weight:650}
.muted{color:var(--muted);font-size:13px}
main{padding:18px;display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-left-width:4px;border-radius:12px;padding:14px}
.card[data-status=new]{border-left-color:var(--new)}
.card[data-status=cooking]{border-left-color:var(--cooking)}
.card[data-status=on_way]{border-left-color:var(--way)}
.card[data-status=done]{border-left-color:var(--done);opacity:.6}
.card[data-status=cancelled]{border-left-color:var(--cancel);opacity:.5}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.num{font-size:19px;font-weight:700}
.items{margin:10px 0;padding:0;list-style:none}
.items li{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
.total{border-top:1px solid var(--line);margin-top:8px;padding-top:8px;
display:flex;justify-content:space-between;font-weight:650}
.who{margin-top:8px;font-size:13px;color:var(--muted);white-space:pre-line}
.note{margin-top:6px;font-size:13px;color:var(--new)}
.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
button{background:#232837;color:var(--text);border:1px solid var(--line);border-radius:8px;
padding:7px 11px;font-size:13px;cursor:pointer}
button:hover{background:#2c3244}
.empty{grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0}
form.login{max-width:320px;margin:14vh auto;padding:22px;background:var(--card);
border:1px solid var(--line);border-radius:12px;display:grid;gap:12px}
input{background:#141821;border:1px solid var(--line);color:var(--text);
border-radius:8px;padding:10px;font-size:15px;width:100%}
.err{color:#ff6b6b;font-size:13px}
`;

export function loginPage(error?: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.restaurant.name} — заказы</title><style>${STYLE}</style></head><body>
<form class="login" method="post" action="/login">
<h1>${config.restaurant.name} · заказы</h1>
${error ? `<div class="err">${error}</div>` : ""}
<input type="password" name="password" placeholder="Пароль" autofocus required>
<button type="submit">Войти</button>
</form></body></html>`;
}

export function ordersPage(): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.restaurant.name} — заказы</title><style>${STYLE}</style></head><body>
<header>
  <h1>${config.restaurant.name} · заказы</h1>
  <span class="muted" id="stamp">загрузка…</span>
  <label class="muted"><input type="checkbox" id="sound" style="width:auto" checked> звук нового заказа</label>
  <label class="muted"><input type="checkbox" id="hideDone" style="width:auto" checked> прятать закрытые</label>
</header>
<main id="list"></main>
<script>
const STATUS = {new:"Новый",cooking:"Готовится",on_way:"В пути",done:"Выдан",cancelled:"Отменён"};
const NEXT = {new:["cooking","cancelled"],cooking:["on_way","cancelled"],on_way:["done"],done:[],cancelled:[]};
const LABEL = {cooking:"🔥 Готовим",on_way:"🛵 Отдали",done:"✅ Выдан",cancelled:"✖️ Отменить"};
let seen = new Set();
let first = true;

function money(gr){
  const sign = gr < 0 ? "-" : "";
  const a = Math.abs(gr);
  return sign + Math.floor(a/100) + "," + String(a%100).padStart(2,"0") + " zł";
}
function ago(iso){
  const m = Math.round((Date.now() - new Date(iso).getTime())/60000);
  if (m < 1) return "только что";
  if (m < 60) return m + " мин назад";
  return Math.floor(m/60) + " ч " + (m%60) + " мин назад";
}
// Короткий сигнал через WebAudio: на кухне экран стоит сбоку и на него не смотрят.
function beep(){
  if (!document.getElementById("sound").checked) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; gain.gain.value = 0.08;
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }catch(e){}
}
function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]));
}
function card(o){
  const items = o.items.map(i =>
    "<li><span>" + esc(i.nameSnapshot) + " × " + i.quantity + "</span><span>" + money(i.priceGr*i.quantity) + "</span></li>"
  ).join("");
  const who = [
    esc(o.customerName) + ", " + esc(o.phone),
    o.deliveryMode === "delivery" ? "Доставка: " + esc(o.address) : "Самовывоз",
  ].join("\\n");
  const acts = NEXT[o.status].map(s =>
    '<button onclick="setStatus(' + o.number + ',\\'' + s + '\\')">' + LABEL[s] + "</button>"
  ).join("");
  return '<div class="card" data-status="' + o.status + '">' +
    '<div class="top"><span class="num">№' + o.number + '</span>' +
    '<span class="muted">' + STATUS[o.status] + " · " + ago(o.createdAt) + "</span></div>" +
    '<ul class="items">' + items + "</ul>" +
    (o.deliveryGr > 0 ? '<div class="items"><li><span>Доставка</span><span>' + money(o.deliveryGr) + "</span></li></div>" : "") +
    '<div class="total"><span>При получении</span><span>' + money(o.totalGr) + "</span></div>" +
    '<div class="who">' + who + "</div>" +
    (o.note ? '<div class="note">⚠ ' + esc(o.note) + "</div>" : "") +
    '<div class="acts">' + acts + "</div></div>";
}
async function setStatus(number, status){
  await fetch("/api/orders/" + number + "/status", {
    method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({status})
  });
  await tick();
}
async function tick(){
  let res;
  try { res = await fetch("/api/orders"); } catch(e){ return; }
  if (res.status === 401) { location.href = "/"; return; }
  const orders = await res.json();
  const hide = document.getElementById("hideDone").checked;
  const visible = orders.filter(o => !hide || (o.status !== "done" && o.status !== "cancelled"));

  for (const o of orders){
    if (o.status === "new" && !seen.has(o.number) && !first) beep();
    seen.add(o.number);
  }
  first = false;

  document.getElementById("list").innerHTML =
    visible.length ? visible.map(card).join("") : '<div class="empty">Заказов пока нет</div>';
  document.getElementById("stamp").textContent = "обновлено " + new Date().toLocaleTimeString("ru-RU");
}
tick();
setInterval(tick, 3000);
</script></body></html>`;
}
