/* alanabas — site behaviour
   Sticky header state, mobile nav, scroll reveal, section visibility config.
   Deliberately small: no dependencies, no build step. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. Content + section visibility (driven by /admin) ----
     Strings, category lists and images are editable from the admin portal
     (~/CodingProjects/admin, module M11) and fetched from there at runtime. The HTML here is
     always the fallback: if the fetch fails, is slow, or a field was never edited, whatever is
     hardcoded in the markup stands untouched. */

  var STORAGE_KEY = "alanabas-portal-config";
  var CONTENT_API = "https://admin.alanabas.com/api/public/content/";
  var PAGE_KEY = document.body.dataset.page;

  function applyVisibility(visibility) {
    document.querySelectorAll("[data-section-key]").forEach(function (section) {
      section.hidden = !!(visibility && visibility[section.dataset.sectionKey] === false);
    });
  }

  function applyStrings(content) {
    document.querySelectorAll("[data-content-key]").forEach(function (el) {
      var field = content[el.dataset.contentKey];
      if (!field) return; // never edited — leave the hardcoded fallback in place
      if (field.type === "string") {
        el.textContent = field.value;
      } else if (field.type === "image" && el.tagName === "IMG") {
        el.src = field.value.url;
        if (field.value.alt) el.alt = field.value.alt;
      }
    });
  }

  function applyLists(content) {
    document.querySelectorAll("[data-content-list]").forEach(function (container) {
      var field = content[container.dataset.contentList];
      if (!field || field.type !== "list" || !field.value.length) return;
      if (container.dataset.contentListMode === "positional") {
        /* Only the label and link are editable here — each row's own icon, description and
           tag markup stays exactly as authored, patched in place by position. */
        var rows = container.children;
        field.value.forEach(function (item, i) {
          var row = rows[i];
          if (!row) return;
          if (item.href) row.setAttribute("href", item.href);
          var title = row.querySelector(".row-item__title");
          if (title) title.textContent = item.label;
        });
      } else {
        container.innerHTML = "";
        field.value.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item.label;
          container.appendChild(li);
        });
      }
    });
  }

  var cachedVisibility;
  try {
    cachedVisibility = (JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")).visibility;
  } catch (e) {
    /* storage unavailable */
  }
  applyVisibility(cachedVisibility);

  if (PAGE_KEY && "fetch" in window) {
    var controller = "AbortController" in window ? new AbortController() : null;
    var timeout = controller && setTimeout(function () { controller.abort(); }, 4000);
    fetch(CONTENT_API + PAGE_KEY, { signal: controller ? controller.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (content) {
        if (!content) return;
        applyStrings(content);
        applyLists(content);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility: cachedVisibility, content: content }));
        } catch (e) {
          /* private window — nothing to cache into, fetched content still applied above */
        }
      })
      .catch(function () {
        /* offline or the admin API is down — the hardcoded HTML already on the page stands */
      })
      .then(function () { if (timeout) clearTimeout(timeout); });
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
