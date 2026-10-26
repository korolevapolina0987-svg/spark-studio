/* Spark — интерактив: расписание, запись, анимации при прокрутке. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- данные ---------- */
  const DIRS = {
    reformer: { name: "Пилатес на реформере", c: "#D8344E", cap: 8, len: 55 },
    stretch: { name: "Растяжка", c: "#F7A15E", cap: 10, len: 60 },
    yoga: { name: "Йога", c: "#EF6F6C", cap: 12, len: 75 },
    aero: { name: "Аэройога", c: "#B35C8A", cap: 6, len: 60 }
  };
  const COACH = {
    alina: { name: "Алина", img: "assets/img/coach-1.webp" },
    vera: { name: "Вера", img: "assets/img/coach-2.webp" },
    darya: { name: "Дарья", img: "assets/img/coach-3.webp" },
    ksenia: { name: "Ксения", img: "assets/img/coach-4.webp" }
  };
  // шаблон недели: [время, направление, тренер, уровень]
  const WEEK = [
    [["08:00", "reformer", "vera", "Все уровни"], ["10:00", "stretch", "alina", "Новичкам"], ["18:30", "reformer", "ksenia", "Все уровни"], ["19:30", "yoga", "darya", "Хатха"], ["20:30", "stretch", "alina", "Шпагаты"]],
    [["07:30", "yoga", "darya", "Утренняя"], ["12:00", "reformer", "vera", "Здоровая спина"], ["19:00", "aero", "darya", "Новичкам"], ["20:00", "reformer", "ksenia", "Интенсив"]],
    [["08:00", "reformer", "ksenia", "Все уровни"], ["11:00", "stretch", "alina", "Мягкая"], ["18:30", "stretch", "alina", "Шпагаты"], ["19:30", "reformer", "vera", "Продолжающим"], ["20:30", "yoga", "darya", "Виньяса"]],
    [["07:30", "reformer", "vera", "Все уровни"], ["12:00", "yoga", "darya", "Хатха"], ["19:00", "aero", "darya", "Все уровни"], ["20:00", "stretch", "ksenia", "Новичкам"]],
    [["08:00", "stretch", "alina", "Утренняя"], ["10:00", "reformer", "vera", "Здоровая спина"], ["18:30", "reformer", "ksenia", "Интенсив"], ["19:30", "yoga", "darya", "Виньяса"]],
    [["10:00", "reformer", "vera", "Все уровни"], ["11:30", "aero", "darya", "Все уровни"], ["13:00", "stretch", "alina", "Шпагаты"], ["15:00", "yoga", "darya", "Йога-нидра"]],
    [["10:30", "yoga", "darya", "Мягкая"], ["12:00", "reformer", "ksenia", "Все уровни"], ["13:30", "stretch", "alina", "Новичкам"]]
  ];
  const DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const MONTH = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - todayIdx); monday.setHours(0, 0, 0, 0);
  const dateOf = (i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; };
  // занятость: стабильная псевдослучайная для каждого занятия недели
  const seed = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); };
  const booked = {};
  const takenOf = (day, slot) => {
    const key = day + "-" + slot[0];
    const cap = DIRS[slot[1]].cap;
    const base = seed(monday.toDateString() + key) % (cap + 1);
    return Math.min(cap, base + (booked[key] ? 1 : 0));
  };

  /* ---------- шапка и меню ---------- */
  const header = $("#header");
  const burger = $("#burger"); const menu = $("#mobile-menu");
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open); menu.hidden = !open; document.body.style.overflow = open ? "hidden" : "";
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) { burger.setAttribute("aria-expanded", "false"); menu.hidden = true; document.body.style.overflow = ""; } });

  /* ---------- заголовок: слова проявляются ---------- */
  const h1 = $("#hero-title");
  h1.innerHTML = h1.textContent.split(" ").map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");

  /* ---------- прокрутка: солнце, облака, проявление текста, карточка ---------- */
  const sun = $("#sun"), clouds = $("#clouds");
  const reveals = $$("[data-reveal]");
  const card = $("#contact-card"), word = $("#contact-word");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY; const vh = window.innerHeight;
    header.classList.toggle("scrolled", y > 20);
    if (reduce) return;
    const k = Math.min(1, y / (vh * 0.9));
    sun.style.setProperty("--sun-y", (30 - k * 75) + "%");
    clouds.style.setProperty("--cloud-y", (k * 60) + "px");
    reveals.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.45)));
      el.style.setProperty("--p", (p * 100).toFixed(1) + "%");
    });
    if (card && word) {
      const r = word.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.7)));
      card.style.setProperty("--cy", ((1 - p) * 140) + "px");
      card.style.setProperty("--cr", ((1 - p) * -14 + 4) + "deg");
      card.style.opacity = (0.15 + p * 0.85).toFixed(2);
    }
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- мини-расписание в бенто ---------- */
  function renderMini() {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let list = WEEK[todayIdx].filter((s) => { const [h, m] = s[0].split(":").map(Number); return h * 60 + m > nowMin; });
    let label = "";
    if (!list.length) { list = WEEK[(todayIdx + 1) % 7]; label = "Завтра в студии"; }
    if (label) $(".t7 p").textContent = label;
    $("#mini-sched").innerHTML = list.slice(0, 3).map((s) => `<div><b>${s[0]}</b><span>${esc(DIRS[s[1]].name)}</span></div>`).join("");
  }
  renderMini();

  /* ---------- расписание ---------- */
  let curDay = todayIdx; let curFilter = "all";
  function renderDays() {
    $("#days").innerHTML = DAY_SHORT.map((d, i) => {
      const dt = dateOf(i);
      return `<button class="day" role="tab" type="button" data-day="${i}" aria-selected="${i === curDay}" aria-label="${d}, ${dt.getDate()} ${MONTH[dt.getMonth()]}"><small>${i === todayIdx ? "Сегодня" : d}</small><b class="num">${dt.getDate()}</b></button>`;
    }).join("");
    $$("#days .day").forEach((b) => b.addEventListener("click", () => { curDay = +b.dataset.day; renderDays(); renderClasses(); }));
  }
  function renderFilters() {
    const items = [["all", "Все", "#2B171D"], ...Object.entries(DIRS).map(([k, v]) => [k, v.name, v.c])];
    $("#filters").innerHTML = items.map(([k, n, c]) => `<button class="filter" type="button" data-f="${k}" aria-pressed="${curFilter === k}" style="--c:${c}">${k === "all" ? "" : "<i></i>"}${esc(n)}</button>`).join("");
    $$("#filters .filter").forEach((b) => b.addEventListener("click", () => { curFilter = b.dataset.f; renderFilters(); renderClasses(); }));
  }
  function renderClasses() {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slots = WEEK[curDay].filter((s) => curFilter === "all" || s[1] === curFilter);
    if (!slots.length) { $("#classes").innerHTML = `<div class="empty-day">В этот день нет занятий по выбранному направлению. Попробуйте другой день.</div>`; return; }
    $("#classes").innerHTML = slots.map((s) => {
      const D = DIRS[s[1]], C = COACH[s[2]];
      const taken = takenOf(curDay, s); const left = D.cap - taken;
      const [h, m] = s[0].split(":").map(Number);
      const past = curDay < todayIdx || (curDay === todayIdx && h * 60 + m <= nowMin);
      const end = new Date(0, 0, 0, h, m + D.len); const endStr = `${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;
      const dots = Array.from({ length: D.cap }, (_, i) => `<span class="${i < taken ? "on" : ""}"></span>`).join("");
      const key = curDay + "-" + s[0];
      const btn = past ? `<button class="btn btn-sm" type="button" disabled>Прошло</button>`
        : booked[key] ? `<button class="btn btn-sm" type="button" disabled>Вы записаны</button>`
        : left <= 0 ? `<button class="btn btn-sm" type="button" disabled>Мест нет</button>`
        : `<button class="btn btn-dark btn-sm" type="button" data-book="${esc(key)}" data-slot="${esc(JSON.stringify(s))}">Записаться</button>`;
      return `<div class="cls">
        <div class="cls-time num">${s[0]}<small>до ${endStr}</small></div>
        <div class="cls-name" style="--c:${D.c}"><i></i><div>${esc(D.name)}<small>${esc(s[3])} · ${D.len} мин</small></div></div>
        <div class="cls-coach"><img src="${C.img}" alt="" width="36" height="36" loading="lazy">${esc(C.name)}</div>
        <div class="spots" aria-label="Свободно мест: ${Math.max(0, left)} из ${D.cap}">${dots}<b class="num">${left > 0 ? left + " " + (left === 1 ? "место" : left < 5 ? "места" : "мест") : "нет мест"}</b></div>
        ${btn}</div>`;
    }).join("");
    $$("[data-book]").forEach((b) => b.addEventListener("click", () => openBooking(curDay, JSON.parse(b.dataset.slot))));
  }
  renderDays(); renderFilters(); renderClasses();

  // карточки направлений открывают расписание с нужным фильтром
  $$(".dir[data-filter]").forEach((a) => a.addEventListener("click", () => { curFilter = a.dataset.filter; renderFilters(); renderClasses(); }));

  /* ---------- лента фото ---------- */
  const strip = $("#strip");
  const step = () => (strip.querySelector("figure")?.offsetWidth || 400) + 14;
  $("#strip-prev").addEventListener("click", () => strip.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }));
  $("#strip-next").addEventListener("click", () => strip.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }));

  /* ---------- модальные окна ---------- */
  let lastFocus = null;
  function modal(html, wide) {
    lastFocus = document.activeElement;
    const bg = document.createElement("div"); bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true"><button class="modal-x" type="button" aria-label="Закрыть">×</button>${html}</div>`;
    const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
    bg.querySelector(".modal-x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(bg); document.body.style.overflow = "hidden";
    const first = bg.querySelector("input, select, .btn"); (first || bg.querySelector(".modal-x")).focus();
    return { el: bg.querySelector(".modal"), close };
  }

  const phoneOk = (v) => v.replace(/\D/g, "").length >= 10;
  function maskPhone(inp) {
    inp.addEventListener("input", () => {
      let d = inp.value.replace(/\D/g, ""); if (d.startsWith("8")) d = "7" + d.slice(1); if (!d.startsWith("7")) d = "7" + d; d = d.slice(0, 11);
      const p = d.slice(1); let out = "+7";
      if (p.length) out += " " + p.slice(0, 3); if (p.length > 3) out += " " + p.slice(3, 6); if (p.length > 6) out += "-" + p.slice(6, 8); if (p.length > 8) out += "-" + p.slice(8, 10);
      inp.value = out;
    });
  }

  function successHtml(title, text) {
    return `<div class="success"><svg class="spark-big"><use href="#star"/></svg><h3 style="padding:0">${esc(title)}</h3><p class="lead" style="text-align:center">${esc(text)}</p><p class="form-note">Это демо-версия сайта: заявка никуда не отправлена.</p></div>`;
  }

  function openBooking(day, s) {
    const D = DIRS[s[1]], C = COACH[s[2]]; const dt = dateOf(day);
    const when = `${DAY_SHORT[day]}, ${dt.getDate()} ${MONTH[dt.getMonth()]}, ${s[0]}`;
    const m = modal(`<h3>Запись на занятие</h3>
      <div class="modal-cls"><img src="${C.img}" alt=""><div><b style="font-weight:500">${esc(D.name)}</b><br><span style="color:var(--muted)">${esc(when)} · ${esc(C.name)}</span></div></div>
      <form id="book-form" novalidate style="display:grid;gap:12px">
        <div class="field"><label for="b-name">Имя</label><input class="input" id="b-name" autocomplete="given-name" required></div>
        <div class="field"><label for="b-phone">Телефон</label><input class="input" id="b-phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7 ___ ___-__-__" required></div>
        <label class="check"><input type="checkbox" id="b-consent"><span>Даю согласие на обработку персональных данных по <button class="linkish" type="button" data-policy>политике конфиденциальности</button></span></label>
        <button class="btn btn-crimson" type="submit">Записаться</button>
        <p class="form-note">Первое занятие — 500 ₽, оплата в студии.</p>
      </form>`);
    maskPhone(m.el.querySelector("#b-phone"));
    m.el.querySelector("#book-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = m.el.querySelector("#b-name"), p = m.el.querySelector("#b-phone"), c = m.el.querySelector("#b-consent");
      n.classList.toggle("bad", !n.value.trim()); p.classList.toggle("bad", !phoneOk(p.value));
      if (!n.value.trim() || !phoneOk(p.value)) return;
      if (!c.checked) { c.focus(); c.closest(".check").style.color = "var(--crimson)"; return; }
      booked[day + "-" + s[0]] = true; renderClasses();
      m.el.innerHTML = `<button class="modal-x" type="button" aria-label="Закрыть">×</button>` + successHtml("Вы записаны!", `${D.name}, ${when}. Мы напомним о занятии за 3 часа.`);
      m.el.querySelector(".modal-x").addEventListener("click", m.close);
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-policy]")) { e.preventDefault(); openPolicy(); }
    const plan = e.target.closest("[data-plan]");
    if (plan) { const sel = $("#f-dir"); const v = plan.dataset.plan; const opt = [...sel.options].find((o) => o.text === v || (v === "Пробное занятие" && o.index === 0)); if (opt) sel.value = opt.value; }
  });

  function openPolicy() {
    modal(`<div class="policy"><h3>Политика конфиденциальности</h3>
      <p>Это образец для концепта сайта. Для настоящей студии текст составляется под её данные и проверяется юристом.</p>
      <h4>Какие данные мы собираем</h4><p>Имя и номер телефона, которые вы указываете в форме записи.</p>
      <h4>Зачем</h4><p>Чтобы связаться с вами, подтвердить запись и напомнить о занятии.</p>
      <h4>Где хранятся</h4><p>На серверах в России. Мы не передаём данные третьим лицам, кроме случаев, предусмотренных законом.</p>
      <h4>Ваши права</h4><p>Вы можете в любой момент отозвать согласие и попросить удалить ваши данные, написав на почту студии.</p></div>`, true);
  }

  /* ---------- форма внизу ---------- */
  const form = $("#signup-form");
  maskPhone($("#f-phone"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $("#f-name"), p = $("#f-phone"), c = $("#f-consent");
    n.classList.toggle("bad", !n.value.trim()); p.classList.toggle("bad", !phoneOk(p.value));
    if (!n.value.trim()) { n.focus(); return; }
    if (!phoneOk(p.value)) { p.focus(); return; }
    if (!c.checked) { c.focus(); c.closest(".check").style.color = "var(--crimson)"; return; }
    $("#form-body").outerHTML = successHtml("Заявка принята", `${n.value.trim()}, администратор позвонит в течение 15 минут и подберёт время для занятия «${$("#f-dir").value}».`);
  });
})();
