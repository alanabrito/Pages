/* alanabas — site behaviour
   Sticky header state, mobile nav, scroll reveal, section visibility config.
   Deliberately small: no dependencies, no build step. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. Section visibility (driven by /admin) ---- */

  var STORAGE_KEY = "alanabas-portal-config";

  try {
    var config = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    var visibility = config.visibility || {};
    document.querySelectorAll("[data-section-key]").forEach(function (section) {
      if (visibility[section.dataset.sectionKey] === false) {
        section.hidden = true;
      }
    });
  } catch (e) {
    /* storage unavailable — show everything */
  }

  /* ---- 2. Sticky header hairline ---- */

  var header = document.querySelector(".site-header");

  if (header) {
    var setStuck = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  /* ---- 3. Mobile navigation ---- */

  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    var closeNav = function () {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 800) closeNav();
    });
  }

  /* ---- 4. Scroll reveal ---- */

  var items = document.querySelectorAll(".reveal");

  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach(function (item) { item.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });

    items.forEach(function (item) {
      var delay = parseInt(item.dataset.delay || "0", 10);
      if (delay) item.style.transitionDelay = Math.min(delay, 320) + "ms";
      observer.observe(item);
    });
  }

  /* ---- 5. Current year ---- */

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });
})();
