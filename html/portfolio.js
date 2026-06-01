/* ============================================================
   Portfolio interactions
   - Draggable sticky notes
   - Sparkle cursor
   - Tweaks panel (palette, playfulness, texture)
   ============================================================ */

(() => {
  // ---------- Tweak defaults (host can overwrite this JSON) ---
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "palette": "warm",
    "playfulness": "high",
    "texture": "paper",
    "sparkleCursor": true
  }/*EDITMODE-END*/;

  let state = { ...TWEAK_DEFAULTS };

  // ---------- Apply state to DOM ------------------------------
  function apply() {
    document.documentElement.setAttribute("data-palette", state.palette);
    document.body.setAttribute("data-palette", state.palette);
    document.body.setAttribute("data-playfulness", state.playfulness);
    document.body.setAttribute("data-texture", state.texture);
  }

  // ---------- Tweaks panel + host protocol --------------------
  function buildTweaksPanel() {
    const panel = document.createElement("div");
    panel.className = "tweaks";
    panel.innerHTML = `
      <div class="tweaks-head">
        <h4>Tweaks</h4>
        <button class="tweaks-close" aria-label="Close">✕</button>
      </div>
      <div class="tweak-section">
        <div class="tweak-label">Palette</div>
        <div class="tweak-radio" data-tweak="palette">
          <button data-value="warm">warm</button>
          <button data-value="cool">cool</button>
          <button data-value="mono">mono</button>
        </div>
      </div>
      <div class="tweak-section">
        <div class="tweak-label">Playfulness</div>
        <div class="tweak-radio" data-tweak="playfulness">
          <button data-value="low">low</button>
          <button data-value="mid">mid</button>
          <button data-value="high">high</button>
        </div>
      </div>
      <div class="tweak-section">
        <div class="tweak-label">Background texture</div>
        <div class="tweak-radio" data-tweak="texture">
          <button data-value="paper">paper</button>
          <button data-value="grid">grid</button>
          <button data-value="none">none</button>
        </div>
      </div>
      <div class="tweak-section">
        <div class="tweak-label">Sparkle cursor</div>
        <div class="tweak-radio" data-tweak="sparkleCursor">
          <button data-value="true">on</button>
          <button data-value="false">off</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    function refreshActive() {
      panel.querySelectorAll("[data-tweak]").forEach(group => {
        const key = group.getAttribute("data-tweak");
        group.querySelectorAll("button").forEach(b => {
          const v = b.getAttribute("data-value");
          const cur = String(state[key]);
          b.classList.toggle("active", v === cur);
        });
      });
    }

    panel.addEventListener("click", e => {
      const btn = e.target.closest("[data-tweak] button");
      if (btn) {
        const group = btn.closest("[data-tweak]");
        const key = group.getAttribute("data-tweak");
        let val = btn.getAttribute("data-value");
        if (val === "true") val = true;
        else if (val === "false") val = false;
        state[key] = val;
        apply();
        refreshActive();
        try {
          window.parent.postMessage(
            { type: "__edit_mode_set_keys", edits: { [key]: val } },
            "*"
          );
        } catch (_) {}
      }
      if (e.target.closest(".tweaks-close")) {
        panel.classList.remove("open");
        try {
          window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*");
        } catch (_) {}
      }
    });

    refreshActive();
    return panel;
  }

  function initTweaks() {
    const panel = buildTweaksPanel();
    window.addEventListener("message", e => {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === "__activate_edit_mode") panel.classList.add("open");
      if (d.type === "__deactivate_edit_mode") panel.classList.remove("open");
    });
    try {
      window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    } catch (_) {}
  }

  // ---------- Draggable sticky notes --------------------------
  function initDraggable() {
    document.querySelectorAll(".note").forEach(note => {
      let startX, startY, origX, origY, dragging = false;
      const onDown = e => {
        dragging = true;
        note.classList.add("dragging");
        const pt = e.touches ? e.touches[0] : e;
        startX = pt.clientX;
        startY = pt.clientY;
        const rect = note.getBoundingClientRect();
        const parentRect = note.parentElement.getBoundingClientRect();
        origX = rect.left - parentRect.left;
        origY = rect.top - parentRect.top;
        note.style.left = origX + "px";
        note.style.top = origY + "px";
        e.preventDefault();
      };
      const onMove = e => {
        if (!dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - startX;
        const dy = pt.clientY - startY;
        note.style.left = origX + dx + "px";
        note.style.top = origY + dy + "px";
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        note.classList.remove("dragging");
      };
      note.addEventListener("mousedown", onDown);
      note.addEventListener("touchstart", onDown, { passive: false });
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);
    });
  }

  // ---------- Sparkle cursor ----------------------------------
  let lastSparkle = 0;
  function initSparkles() {
    const SPARKLE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0 L13.5 9 L24 12 L13.5 15 L12 24 L10.5 15 L0 12 L10.5 9 Z"/></svg>`;
    window.addEventListener("mousemove", e => {
      if (!state.sparkleCursor) return;
      if (state.playfulness === "low") return;
      const now = performance.now();
      if (now - lastSparkle < 60) return;
      lastSparkle = now;
      const s = document.createElement("div");
      s.className = "sparkle";
      s.style.left = e.clientX + "px";
      s.style.top = e.clientY + "px";
      s.style.width = (8 + Math.random() * 8) + "px";
      s.style.height = s.style.width;
      // random color from palette
      const colors = ["var(--accent)", "var(--accent-2)", "var(--emerald)", "var(--pink)"];
      s.style.color = colors[Math.floor(Math.random() * colors.length)];
      s.innerHTML = SPARKLE_SVG;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    });
  }

  // ---------- Folder hover (CSS-driven, here as no-op hook) ---
  // ---------- Marquee duplication ----------------------------
  function initMarquee() {
    document.querySelectorAll(".marquee-track").forEach(t => {
      t.innerHTML = t.innerHTML + t.innerHTML;
    });
  }

  // ---------- Folder navigation (Finder) ----------------------
  const FOLDER_DATA = {
    projects: {
      label: "Projects",
      meta: "24 items · 1.4 GB · modified 2 days ago",
      files: [
        { name: "neobank-onboarding.fig",    ext: "fig", t: "t1", size: "84 MB" },
        { name: "reading-app-personal.fig",  ext: "fig", t: "t3", size: "62 MB" },
        { name: "ai-canvas-mvp.fig",         ext: "fig", t: "t2", size: "118 MB" },
        { name: "type-foundry-id.fig",       ext: "fig", t: "t4", size: "44 MB" },
        { name: "design-system-v3.fig",      ext: "fig", t: "t5", size: "92 MB" },
        { name: "case-study-deck.pdf",       ext: "pdf", t: "t6", size: "12 MB" },
        { name: "client-archive-2025.zip",   ext: "zip", t: "t1", size: "642 MB" },
        { name: "wireframes-q1.fig",         ext: "fig", t: "t3", size: "28 MB" },
      ],
    },
    social: {
      label: "Social Media",
      meta: "112 items · 880 MB · updated yesterday",
      files: [
        { name: "instagram-grid-may.png",    ext: "png", t: "t1", size: "8 MB" },
        { name: "twitter-headers.fig",       ext: "fig", t: "t3", size: "14 MB" },
        { name: "50-emoji-set.fig",          ext: "fig", t: "t4", size: "6 MB" },
        { name: "linkedin-banner.png",       ext: "png", t: "t2", size: "3 MB" },
        { name: "carousel-template.fig",     ext: "fig", t: "t5", size: "22 MB" },
        { name: "story-templates-v2.fig",    ext: "fig", t: "t4", size: "18 MB" },
        { name: "thread-illustrations.ai",   ext: "ai",  t: "t1", size: "44 MB" },
        { name: "press-kit-2026.zip",        ext: "zip", t: "t6", size: "118 MB" },
      ],
    },
    video: {
      label: "Video / Animation",
      meta: "18 items · 3.2 GB · updated last week",
      files: [
        { name: "loader-microinteraction.mp4", ext: "mp4", t: "t1", size: "62 MB" },
        { name: "onboarding-motion.mp4",       ext: "mp4", t: "t3", size: "184 MB" },
        { name: "product-demo-cut3.mp4",       ext: "mp4", t: "t2", size: "412 MB" },
        { name: "logo-reveal.aep",             ext: "aep", t: "t4", size: "94 MB" },
        { name: "icon-animations.json",        ext: "json",t: "t5", size: "1.4 MB" },
        { name: "after-effects-tpl.aep",       ext: "aep", t: "t6", size: "210 MB" },
        { name: "scrubber-prototype.mp4",      ext: "mp4", t: "t1", size: "38 MB" },
        { name: "title-sequence.mp4",          ext: "mp4", t: "t2", size: "248 MB" },
      ],
    },
    ai: {
      label: "Design with AI",
      meta: "31 items · 620 MB · updated today",
      files: [
        { name: "prompt-explorer-v2.fig",     ext: "fig", t: "t3", size: "44 MB" },
        { name: "claude-workflows.md",        ext: "md",  t: "t6", size: "120 KB" },
        { name: "ai-canvas-research.pdf",     ext: "pdf", t: "t2", size: "18 MB" },
        { name: "model-card-templates.fig",   ext: "fig", t: "t4", size: "12 MB" },
        { name: "system-prompt-library.txt",  ext: "txt", t: "t5", size: "44 KB" },
        { name: "image-gen-tests.png",        ext: "png", t: "t1", size: "92 MB" },
        { name: "voice-ui-flows.fig",         ext: "fig", t: "t3", size: "28 MB" },
        { name: "agent-traces.json",          ext: "json",t: "t6", size: "8 MB" },
      ],
    },
  };

  function initFinder() {
    const grid = document.getElementById("folders-grid");
    const detail = document.getElementById("folder-detail");
    const crumbCurrent = document.getElementById("crumb-current");
    const crumbBack = document.getElementById("crumb-back");
    if (!grid || !detail || !crumbCurrent || !crumbBack) return;

    const sidebarFolderItems = document.querySelectorAll("[data-folder-nav]");
    const sidebarAllProjects = document.querySelector('[data-nav="projects"]');

    function openFolder(key) {
      const data = FOLDER_DATA[key];
      if (!data) return;
      grid.hidden = true;
      detail.hidden = false;
      crumbCurrent.textContent = data.label.toLowerCase();
      crumbBack.hidden = false;

      // sidebar state
      if (sidebarAllProjects) sidebarAllProjects.classList.remove("active");
      sidebarFolderItems.forEach(el => {
        el.classList.toggle("active", el.getAttribute("data-folder-nav") === key);
      });

      detail.innerHTML = `
        <div class="folder-detail-head">
          <h3 class="folder-detail-title">
            <span class="glyph"></span>
            ${data.label}
          </h3>
          <div class="folder-detail-meta">${data.meta}</div>
        </div>
        <div class="file-grid">
          ${data.files.map(f => `
            <div class="file" tabindex="0">
              <div class="file-thumb">
                <div class="file-thumb-preview ${f.t}"></div>
                <div class="file-thumb-ext ${f.ext}">.${f.ext}</div>
              </div>
              <div class="file-name">${f.name}</div>
              <div class="file-meta">${f.size}</div>
            </div>
          `).join("")}
        </div>
      `;

      // file click selection
      detail.querySelectorAll(".file").forEach(f => {
        f.addEventListener("click", () => {
          detail.querySelectorAll(".file.selected").forEach(s => s.classList.remove("selected"));
          f.classList.add("selected");
        });
      });
    }

    function closeFolder() {
      grid.hidden = false;
      detail.hidden = true;
      detail.innerHTML = "";
      crumbCurrent.textContent = "projects";
      crumbBack.hidden = true;
      sidebarFolderItems.forEach(el => el.classList.remove("active"));
      if (sidebarAllProjects) sidebarAllProjects.classList.add("active");
    }

    // Folder card clicks
    grid.querySelectorAll(".folder").forEach(f => {
      f.addEventListener("click", () => {
        const key = f.getAttribute("data-folder");
        openFolder(key);
      });
    });

    // Sidebar folder clicks
    sidebarFolderItems.forEach(el => {
      el.addEventListener("click", () => {
        openFolder(el.getAttribute("data-folder-nav"));
      });
    });

    // Sidebar "All projects" / Home → back to grid
    document.querySelectorAll('[data-nav="projects"], [data-nav="home"]').forEach(el => {
      el.addEventListener("click", closeFolder);
    });

    // Back button
    crumbBack.addEventListener("click", closeFolder);
  }

  // ---------- Boot --------------------------------------------
  function boot() {
    apply();
    initTweaks();
    initDraggable();
    initSparkles();
    initMarquee();
    initFinder();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

(function () {
  var section = document.querySelector('.tb-section');
  if (!section) return;
  var tiles = section.querySelectorAll('.tb-tile');
  if (!tiles.length) return;

  var raf = 0;
  var tx = 0, ty = 0;

  function apply() {
    raf = 0;
    for (var i = 0; i < tiles.length; i++) {
      var inner = tiles[i].querySelector('.tb-inner');
      if (!inner) continue;
      var depth = 6 + (i % 4) * 3; // px — back rows lean farther
      inner.style.translate =
        (-tx * depth).toFixed(2) + 'px ' +
        (-ty * depth).toFixed(2) + 'px';
    }
  }

  section.addEventListener('pointermove', function (e) {
    var r = section.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width  - 0.5; // -0.5 .. 0.5
    ty = (e.clientY - r.top)  / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(apply);
  });

  section.addEventListener('pointerleave', function () {
    tx = 0;
    ty = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  });
})();