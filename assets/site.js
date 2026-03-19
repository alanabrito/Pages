const STORAGE_KEY = "alanabas-portal-config";

const defaultConfig = {
  visibility: {},
  galleries: {},
};

const loadConfig = () => {
  try {
    return {
      ...defaultConfig,
      ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")),
    };
  } catch {
    return { ...defaultConfig };
  }
};

const saveConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

const config = loadConfig();

document.querySelectorAll("[data-section-key]").forEach((section) => {
  const key = section.dataset.sectionKey;
  if (config.visibility[key] === false) {
    section.hidden = true;
  }
});

const revealItems = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
  observer.observe(item);
});

document.querySelectorAll(".interactive-card, .app-card, .button, .gallery-item").forEach((item) => {
  item.addEventListener("mousemove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 4;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -4;
    item.style.transform = `translateY(-3px) rotateX(${y}deg) rotateY(${x}deg)`;
  });

  item.addEventListener("mouseleave", () => {
    item.style.transform = "";
  });
});

const lightboxNode = document.querySelector("[data-lightbox]");
const lightboxBody = lightboxNode?.querySelector("[data-lightbox-body]");
const lightboxClose = lightboxNode?.querySelector("[data-lightbox-close]");

lightboxClose?.addEventListener("click", () => {
  lightboxNode.hidden = true;
  document.body.classList.remove("no-scroll");
});

lightboxNode?.addEventListener("click", (event) => {
  if (event.target === lightboxNode) {
    lightboxNode.hidden = true;
    document.body.classList.remove("no-scroll");
  }
});

document.querySelectorAll("[data-gallery-root]").forEach((galleryRoot) => {
  const galleryDataNode = galleryRoot.querySelector(".gallery-data") || document.getElementById("gallery-data");
  if (!galleryDataNode) {
    return;
  }

  const galleryKey = galleryRoot.dataset.galleryKey || "default";
  const savedItems = config.galleries[galleryKey];

  const galleryState = {
    items: Array.isArray(savedItems) ? savedItems : JSON.parse(galleryDataNode.textContent),
    filter: "all",
  };

  const filtersNode = galleryRoot.querySelector("[data-gallery-filters]");
  const gridNode = galleryRoot.querySelector("[data-gallery-grid]");
  if (!gridNode) {
    return;
  }

  const renderGallery = () => {
    const filteredItems = galleryState.filter === "all"
      ? galleryState.items
      : galleryState.items.filter((item) => item.kind === galleryState.filter);

    gridNode.innerHTML = filteredItems.map((item) => {
      const media = item.kind === "embed"
        ? `<div class="gallery-embed"><iframe src="${item.src}" title="${item.title}" loading="lazy" allowfullscreen></iframe></div>`
        : `<img src="${item.src}" alt="${item.title}" loading="lazy">`;

      const tags = (item.tags || []).map((tag) => `<span>${tag}</span>`).join("");

      return `
        <article class="gallery-item card" data-kind="${item.kind}">
          <button class="gallery-open" type="button" data-gallery-open="${item.id}">
            ${media}
            <span class="gallery-meta">
              <strong>${item.title}</strong>
              <em>${item.note || ""}</em>
            </span>
          </button>
          <div class="gallery-tags">${tags}</div>
        </article>
      `;
    }).join("") || `<div class="gallery-empty card">No items are visible for this filter yet.</div>`;

    gridNode.querySelectorAll("[data-gallery-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = galleryState.items.find((entry) => entry.id === button.dataset.galleryOpen);
        if (!item || !lightboxNode || !lightboxBody) {
          return;
        }

        lightboxBody.innerHTML = item.kind === "embed"
          ? `<iframe src="${item.src}" title="${item.title}" loading="lazy" allowfullscreen></iframe><div class="lightbox-copy"><h3>${item.title}</h3><p>${item.note || ""}</p></div>`
          : `<img src="${item.src}" alt="${item.title}"><div class="lightbox-copy"><h3>${item.title}</h3><p>${item.note || ""}</p></div>`;

        lightboxNode.hidden = false;
        document.body.classList.add("no-scroll");
      });
    });
  };

  if (filtersNode) {
    filtersNode.addEventListener("click", (event) => {
      const target = event.target.closest("[data-filter]");
      if (!target) {
        return;
      }

      galleryState.filter = target.dataset.filter;
      filtersNode.querySelectorAll("[data-filter]").forEach((button) => {
        button.classList.toggle("is-active", button === target);
      });
      renderGallery();
    });
  }

  renderGallery();
});

const adminForm = document.querySelector("[data-admin-form]");
if (adminForm) {
  const visibilityMap = config.visibility || {};
  const galleryName = adminForm.dataset.galleryName || "";
  const gallerySource = document.getElementById("admin-gallery-json");
  const status = document.querySelector("[data-admin-status]");

  adminForm.querySelectorAll("[data-visibility-name]").forEach((input) => {
    input.checked = visibilityMap[input.dataset.visibilityName] !== false;
  });

  if (gallerySource && galleryName) {
    const seedNode = document.getElementById("gallery-seed");
    const currentGallery = config.galleries[galleryName] || JSON.parse(seedNode?.textContent || "[]");
    gallerySource.value = JSON.stringify(currentGallery, null, 2);
  }

  adminForm.querySelectorAll("[data-extra-gallery]").forEach((field) => {
    const name = field.dataset.extraGallery;
    const suffix = name.replace("homes-", "");
    const seedNode = document.getElementById(`gallery-seed-${suffix}`);
    const currentGallery = config.galleries[name] || JSON.parse(seedNode?.textContent || "[]");
    field.value = JSON.stringify(currentGallery, null, 2);
  });

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextConfig = loadConfig();
    nextConfig.visibility = nextConfig.visibility || {};
    nextConfig.galleries = nextConfig.galleries || {};

    adminForm.querySelectorAll("[data-visibility-name]").forEach((input) => {
      nextConfig.visibility[input.dataset.visibilityName] = input.checked;
    });

    if (gallerySource && galleryName) {
      try {
        nextConfig.galleries[galleryName] = JSON.parse(gallerySource.value);
      } catch {
        status.textContent = "Gallery JSON is not valid yet.";
        return;
      }
    }

    for (const field of adminForm.querySelectorAll("[data-extra-gallery]")) {
      try {
        nextConfig.galleries[field.dataset.extraGallery] = JSON.parse(field.value);
      } catch {
        status.textContent = `Gallery JSON is not valid for ${field.dataset.extraGallery}.`;
        return;
      }
    }

    saveConfig(nextConfig);
    status.textContent = "Saved to this browser. Refresh the site to see the changes everywhere.";
  });

  document.querySelector("[data-admin-reset]")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    status.textContent = "Local admin overrides cleared. Refresh the page.";
  });
}
