/* Parth Rastogi — site interactions (vanilla JS, no dependencies) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Escape helper ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Publications (rendered from publications-data.js) ---------- */
  function renderPublications() {
    var pubs = window.PUBLICATIONS || [];
    var targets = document.querySelectorAll("#pub-preview, #pub-all");
    targets.forEach(function (el) {
      var limit = parseInt(el.getAttribute("data-pub-limit"), 10);
      var list = isNaN(limit) ? pubs : pubs.slice(0, limit);
      el.innerHTML = list.map(function (p, i) {
        var num = String(i + 1).padStart(2, "0");
        return (
          '<article class="pub-card" tabindex="0" aria-label="' + esc(p.title) + ' — press Enter to show summary">' +
            '<div class="pub-flip">' +
              '<div class="pub-face pub-front">' +
                '<div class="pub-num">' + num + '</div>' +
                '<h3>' + esc(p.title) + '</h3>' +
                '<div class="pub-journal">' + esc(p.journal) + '</div>' +
                (p.issue ? '<div class="pub-issue">' + esc(p.issue) + '</div>' : '') +
                '<div class="pub-hint">Hover or tap to view summary ↻</div>' +
              '</div>' +
              '<div class="pub-face pub-back">' +
                '<h4>Summary</h4>' +
                '<p>' + esc(p.summary) + '</p>' +
                '<a class="btn btn-gold" href="' + esc(p.url) + '" target="_blank" rel="noopener">Read Publication ↗</a>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join("");
    });

    var allLink = document.getElementById("pub-all-link");
    if (allLink) allLink.textContent = "View All " + pubs.length + " Publications →";
    var count = document.getElementById("pub-count");
    if (count) count.textContent = "All " + pubs.length;
  }

  /* Flip on click/tap (touch) — but let the real link navigate */
  function initFlips() {
    document.addEventListener("click", function (e) {
      if (e.target.closest(".pub-back a")) return; // let link navigate
      var card = e.target.closest(".pub-card");
      if (card) card.classList.toggle("flipped");
    });
    document.addEventListener("keydown", function (e) {
      var card = e.target.closest && e.target.closest(".pub-card");
      if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        card.classList.toggle("flipped");
      }
    });
  }

  /* ---------- 3D tilt (generic) ---------- */
  function addTilt(selector, maxDeg) {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll(selector).forEach(function (el) {
      el.classList.add("tilt");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add("tilting");
        el.style.transform =
          "perspective(900px) rotateX(" + (-py * maxDeg * 2).toFixed(2) + "deg) rotateY(" +
          (px * maxDeg * 2).toFixed(2) + "deg) translateY(-3px)";
      });
      el.addEventListener("mouseleave", function () {
        el.classList.remove("tilting");
        el.style.transform = "";
      });
    });
  }

  /* ---------- Scroll reveal + stagger ---------- */
  function initReveal() {
    var singles = document.querySelectorAll(".reveal-up, .section-head");
    var groups = document.querySelectorAll("[data-stagger]");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      singles.forEach(function (el) { el.classList.add("reveal"); });
      groups.forEach(function (g) { Array.prototype.forEach.call(g.children, function (c) { c.classList.add("in"); }); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("reveal");
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    singles.forEach(function (el) { io.observe(el); });

    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(en.target.children, function (child, i) {
          child.style.transitionDelay = (i * 90) + "ms";
          child.classList.add("in");
          // clear delay after entrance so hover/tilt stay snappy
          setTimeout(function () { child.style.transitionDelay = ""; }, i * 90 + 800);
        });
        gio.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    groups.forEach(function (g) { gio.observe(g); });
  }

  /* ---------- Animated counters ---------- */
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }
      var dur = 1200, start = null;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        el.textContent = Math.round(eased * target) + (t === 1 ? suffix : "");
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.getElementById("nav-links");
    var backdrop = document.querySelector(".nav-backdrop");
    if (!toggle || !links) return;
    function setOpen(open) {
      links.classList.toggle("open", open);
      if (backdrop) backdrop.classList.toggle("show", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    }
    toggle.addEventListener("click", function () { setOpen(!links.classList.contains("open")); });
    links.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 900) setOpen(false); });
  }

  /* Active nav link on scroll (index page) */
  function initActiveLink() {
    var anchors = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!anchors.length || !("IntersectionObserver" in window)) return;
    var map = {};
    anchors.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          anchors.forEach(function (a) { a.classList.remove("active"); });
          map[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Consultation form → mailto ---------- */
  function initForm() {
    var form = document.getElementById("consult-form");
    if (!form) return;
    var status = document.getElementById("form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var firm = form.firm.value.trim();
      var msg = form.message.value.trim();
      if (!name || !email || !msg) { status.textContent = "Please fill in your name, email, and message."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = "Please enter a valid email address."; return; }
      var subject = "Consultation Request — " + name + (firm ? " (" + firm + ")" : "");
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Firm / Organization: " + (firm || "—") + "\n\n" +
        "Message:\n" + msg + "\n";
      status.textContent = "Opening your email app…";
      window.location.href = "mailto:parthrastogi05@gmail.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderPublications();
    initFlips();
    initNav();
    initActiveLink();
    initReveal();
    initCounters();
    initForm();
    addTilt(".practice-card", 6);
    addTilt(".stat-card", 6);
    addTilt(".skill-card", 5);
    addTilt(".edu-card", 6);
    addTilt(".contact-card", 5);
    document.querySelectorAll(".year").forEach(function (y) { y.textContent = new Date().getFullYear(); });
  });
})();
