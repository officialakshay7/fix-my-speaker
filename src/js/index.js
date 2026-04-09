/* ── CACHED ACCENT — declared first so IIFE can reference it ── */
let cachedAccent = "";

function getCachedAccent() {
    if (!cachedAccent) {
        cachedAccent = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim();
    }
    return cachedAccent;
}

/* ── THEME TOGGLE ── */
(function () {
    const root = document.documentElement;
    const btn = document.getElementById("themeBtn");
    const saved = localStorage.getItem("fms-theme") || "light";
    root.setAttribute("data-theme", saved);
    btn.addEventListener("click", () => {
        const next =
            root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem("fms-theme", next);
        cachedAccent = ""; // invalidate cache on theme change
    });
})();

/* ── NAV ── */
document
    .getElementById("hamburger")
    .addEventListener("click", function () {
        const open = document
            .getElementById("navLinks")
            .classList.toggle("open");
        this.setAttribute("aria-expanded", open);
    });

/* ── YEAR ── */
document.getElementById("yr").textContent = new Date().getFullYear();

/* ── CLEANER ENGINE ── */
const ARC_LEN = Math.PI * 110;

let mode = "sound",
    running = false,
    progress = 0;
let animFrame = null,
    freqTimer = null,
    rippleTimer = null,
    partTimer = null;
let audioCtx = null,
    currentNode = null;

const FREQS = [165, 200, 250, 300, 350, 300, 220, 150, 100, 165];
let fi = 0;

function getCtx() {
    if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function stopAudio() {
    if (currentNode) {
        try {
            currentNode.stop();
        } catch (e) { }
        currentNode = null;
    }
}

function playTone(f) {
    stopAudio();
    const ctx = getCtx(),
        osc = ctx.createOscillator(),
        g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    g.gain.setValueAtTime(0.42, ctx.currentTime);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    currentNode = osc;
}

function playVibration() {
    stopAudio();
    const ctx = getCtx(),
        g = ctx.createGain();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * 0.75;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    g.gain.setValueAtTime(0.28, ctx.currentTime);
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
    currentNode = src;
}

function updateRing(pct) {
    const off = ARC_LEN * (1 - pct / 100);
    requestAnimationFrame(() => {
        document.getElementById("arcFg").style.strokeDashoffset = off;
        document.getElementById("pctLabel").textContent = Math.round(pct) + "%";
    });
}

function startProgress() {
    progress = 0;
    const step = 100 / (15 * 60);
    function tick() {
        progress += step;
        if (progress >= 100) {
            updateRing(100);
            stopCleaner(true);
            return;
        }
        updateRing(progress);
        animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
}

function spawnRipple() {
    const o = document.getElementById("rippleOverlay");
    const el = document.createElement("div");
    el.className = "ripple-circle";
    const s = 50 + Math.random() * 70;
    el.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 90 + 5}%;top:${Math.random() * 90 + 5}%;border-color:${getCachedAccent()}`;
    o.appendChild(el);
    setTimeout(() => el.remove(), 1600);
}

function spawnParticle() {
    const o = document.getElementById("rippleOverlay");
    const el = document.createElement("div");
    el.className = "particle";
    const s = 4 + Math.random() * 5;
    el.style.cssText = `width:${s}px;height:${s}px;left:${20 + Math.random() * 60}%;bottom:${8 + Math.random() * 18}%;animation-duration:${0.8 + Math.random() * 0.8}s;background:${getCachedAccent()}`;
    o.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}

function setMode(m) {
    mode = m;
    ["sound", "vibrate"].forEach((k) => {
        const t = document.getElementById(
            "tab" + k.charAt(0).toUpperCase() + k.slice(1),
        );
        t.classList.toggle("active", k === m);
        t.setAttribute("aria-selected", k === m);
    });
    if (running) {
        stopCleaner(false);
        startCleaner();
    }
}

function toggleCleaner() {
    running ? stopCleaner(false) : startCleaner();
}

function startCleaner() {
    running = true;
    const btn = document.getElementById("ejectBtn");
    document.getElementById("ejectIcon").textContent = "⏹";
    document.getElementById("ejectLabel").textContent = "TAP TO STOP";
    btn.classList.add("running");
    btn.setAttribute("aria-label", "Press to stop cleaning");
    startProgress();
    if (mode === "sound") {
        fi = 0;
        playTone(FREQS[fi]);
        freqTimer = setInterval(() => {
            fi = (fi + 1) % FREQS.length;
            playTone(FREQS[fi]);
        }, 2000);
        rippleTimer = setInterval(spawnRipple, 520);
        partTimer = setInterval(spawnParticle, 330);
    } else {
        playVibration();
        rippleTimer = setInterval(spawnRipple, 200);
        partTimer = setInterval(spawnParticle, 160);
    }
}

function stopCleaner(done) {
    running = false;
    cancelAnimationFrame(animFrame);
    clearInterval(freqTimer);
    clearInterval(rippleTimer);
    clearInterval(partTimer);
    stopAudio();
    const btn = document.getElementById("ejectBtn");
    btn.classList.remove("running");
    if (done) {
        document.getElementById("ejectIcon").textContent = "✔";
        document.getElementById("ejectLabel").textContent = "CLEANING DONE!";
        btn.setAttribute("aria-label", "Cleaning complete. Press to run again.");
        setTimeout(() => {
            document.getElementById("ejectIcon").textContent = "▶";
            document.getElementById("ejectLabel").textContent = "PRESS TO EJECT WATER";
            updateRing(0);
            progress = 0;
        }, 2500);
    } else {
        document.getElementById("ejectIcon").textContent = "▶";
        document.getElementById("ejectLabel").textContent = "PRESS TO EJECT WATER";
        btn.setAttribute("aria-label", "Press to start ejecting water from speaker");
        updateRing(0);
        progress = 0;
    }
}

/* ── FAQ ── */
const faqs = [
    {
        q: "Is it safe to use Fix My Speaker to remove water and dust?",
        a: "Yes, completely safe. The tool uses sound waves that cause water and dust to vibrate out without needing to open your device, eliminating the risk of physical damage.",
    },
    {
        q: "How long should I run the tool to fully eject water?",
        a: "Each cycle runs for 15 seconds. For heavy water exposure, run both Sound Wave and Vibration modes 2-3 times consecutively for the best results.",
    },
    {
        q: "Can I use it if my speaker is already water-damaged?",
        a: "Yes. The tool can assist speakers that have been exposed to water. For severe damage such as saltwater submersion or visible corrosion, professional repair is recommended alongside this tool.",
    },
    {
        q: "Is Fix My Speaker free to use?",
        a: "Completely free with no download or account required. Open the site, press the button, and let the sound waves do the work. No hidden costs.",
    },
    {
        q: "What should I do if my speaker is still muffled after cleaning?",
        a: "Turn off your device, gently shake it to remove excess moisture, and let it air dry for 24-48 hours. Then run both modes again. If problems continue, seek professional repair.",
    },
    {
        q: "How often should I use Fix My Speaker?",
        a: "Monthly use is ideal for routine maintenance, especially if your device frequently encounters dust or moisture. Regular cleaning prevents long-term buildup.",
    },
    {
        q: "Will using this tool affect my device warranty?",
        a: "Generally no - it is completely non-invasive and operates through your device's own speaker. No modifications are made. Check your specific warranty terms to be safe.",
    },
    {
        q: "What devices does Fix My Speaker work on?",
        a: "Any device with a speaker that can play audio at volume - iPhones, Android phones, tablets, laptops, earbuds, and smartwatches. If it has a speaker, this tool can help.",
    },
];

const faqList = document.getElementById("faqList");
faqs.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "faq-item";
    item.setAttribute("role", "listitem");
    item.innerHTML = `
<button class="faq-q" onclick="toggleFaq(${i})" aria-expanded="false" aria-controls="fa${i}">
${f.q}
<span class="faq-arrow" aria-hidden="true">▾</span>
</button>
<div class="faq-a" id="fa${i}"><p>${f.a}</p></div>
`;
    faqList.appendChild(item);
});

function toggleFaq(i) {
    const items = document.querySelectorAll(".faq-item");
    const item = items[i];
    const open = item.classList.toggle("open");
    item.querySelector(".faq-q").setAttribute("aria-expanded", open);
}