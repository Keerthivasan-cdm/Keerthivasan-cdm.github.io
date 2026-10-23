const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---------- boot screen ----------
(function boot() {
  const box = $("#boot"), log = $("#bootlog"), bar = $(".boot-bar i");
  const lines = [
    "> rst:0x1 (POWERON_RESET), boot:0x13",
    "> loading portfolio firmware v2026.10 ...",
    "> i2c bus scan ........ <span class='ok'>8 devices</span>",
    "> esp-now link ........ <span class='ok'>OK</span>",
    "> mounting projects ... <span class='ok'>6 found</span>",
    "> hello, world_",
  ];
  const finish = () => {
    box.classList.add("done");
    document.body.classList.remove("loading");
    setTimeout(() => box.remove(), 900);
  };
  if (reduceMotion || sessionStorageGet("booted")) return finish();
  let i = 0;
  const next = () => {
    log.innerHTML += (i ? "\n" : "") + lines[i];
    bar.style.width = ((i + 1) / lines.length) * 100 + "%";
    if (++i < lines.length) setTimeout(next, 180);
    else setTimeout(finish, 350);
  };
  next();
  sessionStorageSet("booted", "1");
})();
function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }

// ---------- split big headings into letters ----------
$$(".split").forEach((el) => {
  const text = el.textContent;
  el.setAttribute("aria-label", text);
  el.innerHTML = [...text].map((c, i) =>
    c === " " ? " " : `<span class="ch" aria-hidden="true" style="transition-delay:${i * 35}ms">${c}</span>`
  ).join("");
});

// ---------- reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
$$(".reveal, .split").forEach((el) => io.observe(el));

function countUp(el) {
  const target = +el.dataset.count;
  let n = 0;
  const step = () => {
    el.textContent = ++n;
    if (n < target) setTimeout(step, 900 / target);
  };
  step();
}

// ---------- scroll progress, active nav, timeline draw, gears ----------
const progress = $("#progress");
const navLinks = $$("#nav a");
const sections = navLinks.map((a) => $(a.getAttribute("href")));
const timeline = $("#timeline");
const gears = $$(".gear");
function onScroll() {
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${h ? y / h : 0})`;

  let current = -1;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === current));

  const r = timeline.getBoundingClientRect();
  const draw = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3)));
  timeline.style.setProperty("--draw", draw.toFixed(3));

  gears.forEach((g, i) => (g.style.transform = `rotate(${(i % 2 ? -1 : 1) * y * (0.15 + i * 0.05)}deg)`));
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- typing roles ----------
(function typer() {
  const el = $("#typer");
  const roles = ["Firmware Developer", "PCB Designer", "IoT Builder", "Hardware Debugger", "ESP32 Enthusiast"];
  if (reduceMotion) return;
  let r = 0, c = roles[0].length, deleting = true;
  const tick = () => {
    const word = roles[r];
    c += deleting ? -1 : 1;
    el.textContent = word.slice(0, c);
    let delay = deleting ? 45 : 85;
    if (!deleting && c === word.length) { deleting = true; delay = 1600; }
    else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 300; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 2200);
})();

// ---------- circuit board background with signal pulses ----------
(function circuit() {
  const cv = $("#circuit"), ctx = cv.getContext("2d");
  let W, H, traces = [], pulses = [], mouse = { x: -999, y: -999 };
  const G = 34;
  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    traces = [];
    const n = Math.round((W * H) / 26000);
    for (let i = 0; i < n; i++) {
      let x = Math.round((Math.random() * W) / G) * G, y = Math.round((Math.random() * H) / G) * G;
      const pts = [[x, y]];
      let dir = Math.floor(Math.random() * 4);
      for (let s = 0; s < 2 + Math.random() * 4; s++) {
        const len = G * (1 + Math.floor(Math.random() * 4));
        const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
        x += d[0] * len; y += d[1] * len;
        pts.push([x, y]);
        dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
      }
      let total = 0;
      for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      traces.push({ pts, total });
    }
  }
  function pointAt(t, d) {
    for (let k = 1; k < t.pts.length; k++) {
      const [ax, ay] = t.pts[k - 1], [bx, by] = t.pts[k];
      const seg = Math.hypot(bx - ax, by - ay);
      if (d <= seg) return [ax + ((bx - ax) * d) / seg, ay + ((by - ay) * d) / seg];
      d -= seg;
    }
    return t.pts[t.pts.length - 1];
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.2;
    traces.forEach((t) => {
      const [sx, sy] = t.pts[0];
      const near = Math.hypot(sx - mouse.x, sy - mouse.y) < 160;
      ctx.strokeStyle = near ? "rgba(255,138,31,.45)" : "rgba(255,255,255,.06)";
      ctx.beginPath();
      t.pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      [t.pts[0], t.pts[t.pts.length - 1]].forEach(([x, y]) => {
        ctx.fillStyle = near ? "rgba(255,138,31,.8)" : "rgba(255,255,255,.12)";
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
      });
      if (near && Math.random() < 0.04) pulses.push({ t, d: 0 });
    });
    if (Math.random() < 0.08 && traces.length) pulses.push({ t: traces[(Math.random() * traces.length) | 0], d: 0 });
    pulses = pulses.filter((p) => (p.d += 3) < p.t.total);
    pulses.forEach((p) => {
      const [x, y] = pointAt(p.t, p.d);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, "rgba(255,170,80,1)"); g.addColorStop(1, "rgba(255,138,31,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
    });
    if (visible) requestAnimationFrame(frame);
  }
  let visible = true;
  new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) frame(); }).observe(cv);
  cv.parentElement.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  cv.parentElement.addEventListener("pointerleave", () => (mouse = { x: -999, y: -999 }));
  addEventListener("resize", build);
  build();
  if (reduceMotion) { visible = false; } frame();
})();

// ---------- spinning chip follows the mouse ----------
(function chipTilt() {
  const stage = $("#chipStage");
  if (!finePointer || reduceMotion) return;
  $("#home").addEventListener("pointermove", (e) => {
    const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
    stage.style.transform = `translate(${dx * -30}px, ${dy * -30}px) rotateY(${dx * 25}deg) rotateX(${-dy * 25}deg)`;
  });
})();

// ---------- custom cursor + magnetic buttons + 3D tilt ----------
if (finePointer && !reduceMotion) {
  const ring = $("#cursor"), dot = $("#cursorDot");
  let rx = 0, ry = 0, mx = 0, my = 0;
  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
    document.body.classList.add("has-mouse");
  });
  (function loop() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener("pointerover", (e) => {
    ring.classList.toggle("hover", !!e.target.closest("a, button, img.lb, .arm-widget, input"));
  });

  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });

  $$(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

// ---------- heat jacket: bang-bang control simulation ----------
(function heatSim() {
  const cv = $("#tempChart"), ctx = cv.getContext("2d");
  const slider = $("#setpoint"), setVal = $("#setVal"), now = $("#tempNow"), state = $("#heaterState");
  const HYST = 1.5, CUTOFF = 60;
  let T = 30, heater = true, data = [];
  slider.addEventListener("input", () => (setVal.textContent = slider.value + " °C"));
  function step() {
    const sp = +slider.value;
    if (T >= sp + HYST || T >= CUTOFF) heater = false;
    else if (T <= sp - HYST) heater = true;
    T += heater ? 0.35 + Math.random() * 0.1 : -(0.22 + Math.random() * 0.08);
    data.push({ T, sp, heater });
    if (data.length > 160) data.shift();
    now.textContent = T.toFixed(1) + " °C";
    state.textContent = heater ? "ON" : "OFF";
    state.classList.toggle("on", heater);
  }
  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = 150;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const y = (t) => H - 10 - ((t - 38) / 26) * (H - 20);
    ctx.fillStyle = "rgba(74,222,128,.07)"; ctx.fillRect(0, y(60), W, y(45) - y(60));
    ctx.strokeStyle = "rgba(255,75,31,.6)"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, y(CUTOFF)); ctx.lineTo(W, y(CUTOFF)); ctx.stroke();
    ctx.fillStyle = "#a39b92"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("60 °C cutoff", 6, y(CUTOFF) - 4); ctx.fillText("safe 45–60 °C", 6, y(45) - 4);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); data.forEach((d, i) => { const x = (i / 159) * W; i ? ctx.lineTo(x, y(d.sp)) : ctx.moveTo(x, y(d.sp)); }); ctx.stroke();
    ctx.setLineDash([]);
    data.forEach((d, i) => { if (d.heater) { ctx.fillStyle = "rgba(255,138,31,.12)"; ctx.fillRect((i / 159) * W, H - 6, W / 159 + 1, 6); } });
    ctx.strokeStyle = "#ff8a1f"; ctx.lineWidth = 2.2;
    ctx.beginPath(); data.forEach((d, i) => { const x = (i / 159) * W; i ? ctx.lineTo(x, y(d.T)) : ctx.moveTo(x, y(d.T)); }); ctx.stroke();
    ctx.lineWidth = 1;
  }
  for (let i = 0; i < 160; i++) step();
  let on = false;
  new IntersectionObserver(([e]) => (on = e.isIntersecting)).observe(cv);
  setInterval(() => { if (on) { step(); draw(); } }, 120);
  draw();
})();

// ---------- VAMOS: interactive arm ----------
(function arm() {
  const box = $("#armWidget"), upper = $("#upperArm"), fore = $("#foreArm");
  const aS = $("#angS"), aE = $("#angE"), pk = $("#pkts");
  let s = 20, e = 40, packets = 0, auto = true, t = 0;
  function apply() {
    upper.setAttribute("transform", `rotate(${-s} 90 40)`);
    fore.setAttribute("transform", `rotate(${-e} 90 110)`);
    aS.textContent = Math.round(s) + "°"; aE.textContent = Math.round(e) + "°";
  }
  box.addEventListener("pointermove", (ev) => {
    auto = false;
    const r = box.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    s = Math.max(0, Math.min(150, x * 170));
    e = Math.max(0, Math.min(140, (1 - y) * 160));
    apply();
  });
  box.addEventListener("pointerleave", () => (auto = true));
  setInterval(() => {
    packets += 1; pk.textContent = packets;
    if (auto && !reduceMotion) { t += 0.05; s = 40 + Math.sin(t) * 35; e = 60 + Math.sin(t * 1.7) * 50; apply(); }
  }, 50);
  apply();
})();

// ---------- Smart Bin simulator ----------
(function bin() {
  const text = $("#p10text"), waste = $("#waste");
  const bins = [$("#binBio"), $("#binNon")];
  const btns = $$(".bin-btns button");
  const say = (msg, scroll) => { text.textContent = msg; text.classList.toggle("still", !scroll); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  btns.forEach((b) => b.addEventListener("click", async () => {
    const kind = +b.dataset.w, target = bins[kind];
    btns.forEach((x) => (x.disabled = true));
    say("HI, VISITOR"); await wait(900);
    say("SHOW THE WASTE"); await wait(900);
    say(kind ? "NON-BIO" : "BIO");
    target.classList.add("open"); await wait(450);
    const box = waste.parentElement.getBoundingClientRect(), tb = target.getBoundingClientRect();
    waste.textContent = b.textContent.trim().split(" ")[0];
    waste.animate([
      { opacity: 1, transform: "translate(-50%, -40px) rotate(0)" },
      { opacity: 1, transform: `translate(calc(-50% + ${tb.left + tb.width / 2 - (box.left + box.width / 2)}px), 20px) rotate(200deg)`, offset: .6 },
      { opacity: 0, transform: `translate(calc(-50% + ${tb.left + tb.width / 2 - (box.left + box.width / 2)}px), 90px) rotate(260deg)` },
    ], { duration: 900, easing: "cubic-bezier(.3,.1,.6,1)" });
    await wait(900);
    target.classList.remove("open"); target.classList.add("flash");
    say("DONE ✓"); await wait(800);
    say("+10 CREDITS"); await wait(1000);
    target.classList.remove("flash");
    say("SMART BIN", true);
    btns.forEach((x) => (x.disabled = false));
  }));
})();

// ---------- gallery reels: duplicate for a seamless loop ----------
$$(".reel-track").forEach((t) => t.append(...[...t.children].map((n) => { const c = n.cloneNode(true); c.alt = ""; return c; })));

// ---------- play project videos only while visible ----------
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause()));
}, { threshold: 0.5 });
$$("video").forEach((v) => vio.observe(v));

// ---------- lightbox ----------
const lb = $("#lightbox"), lbImg = $("img", lb);
document.addEventListener("click", (e) => {
  const img = e.target.closest("img.lb");
  if (!img) return;
  lbImg.src = img.src; lbImg.alt = img.alt; lb.hidden = false;
});
lb.addEventListener("click", () => (lb.hidden = true));
document.addEventListener("keydown", (e) => e.key === "Escape" && (lb.hidden = true));

// ---------- sparks on the contact button ----------
$("#sparkBtn").addEventListener("pointerenter", (e) => burst(e.clientX, e.clientY));
function burst(x, y) {
  if (reduceMotion) return;
  for (let i = 0; i < 18; i++) {
    const s = document.createElement("i");
    s.className = "spark";
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.background = ["#ff8a1f", "#ffb347", "#f4efe9", "#e2580b"][i % 4];
    document.body.append(s);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
    s.animate([
      { transform: "translate(0,0) rotate(0)", opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.1,.7,.3,1)" }).onfinish = () => s.remove();
  }
}

// ---------- show every slide fully when saving as PDF ----------
addEventListener("beforeprint", () => {
  $$(".reveal, .split").forEach((el) => el.classList.add("in"));
  $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count));
});
