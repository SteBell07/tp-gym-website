/* =========================================================
   Photo grids, transformations and the full-screen viewer
   (no libraries). The photo lists come from js/photos-data.js,
   which scripts/process-photos.sh writes automatically.

   In the HTML:
     <div data-photos="gallery"></div>          photo grid for a folder
     data-empty-message="..."                   shown while the folder is empty
     data-hide-when-empty="#section-id"         hide that section while empty
     <div data-transformations></div>           before/after pairs
     <span data-photo-count="gallery"></span>   "58 photos"
   ========================================================= */
(function () {
  var ALL = window.PHOTOS || {};

  /* ---------- Viewer ---------- */
  var box, lbImg, counter, closeBtn;
  var list = [], current = 0, lastFocus = null;

  function buildViewer() {
    box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Photo viewer");
    box.hidden = true;
    box.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lb-arrow lb-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
      '<figure class="lb-stage"><img class="lb-img" alt=""></figure>' +
      '<button class="lb-arrow lb-next" type="button" aria-label="Next photo">&#8250;</button>' +
      '<div class="lb-counter" aria-live="polite"></div>';
    document.body.appendChild(box);

    lbImg = box.querySelector(".lb-img");
    counter = box.querySelector(".lb-counter");
    closeBtn = box.querySelector(".lb-close");

    closeBtn.addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });

    // Tap the dark backdrop (not the photo or buttons) to close
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lb-stage")) close();
    });

    // Keyboard: arrows to move, Esc to close, Tab stays inside the viewer
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") {
        var focusable = box.querySelectorAll("button");
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Swipe left/right on phones, swipe down to close
    var startX = 0, startY = 0, tracking = false;
    box.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    box.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        show(current + (dx < 0 ? 1 : -1));
      } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
        close();
      }
    });
  }

  function preload(i) {
    var p = list[(i + list.length) % list.length];
    if (p) new Image().src = p.full;
  }

  function show(i) {
    current = (i + list.length) % list.length;
    var p = list[current];
    box.classList.add("loading");
    lbImg.onload = function () { box.classList.remove("loading"); };
    lbImg.src = p.full;
    lbImg.alt = p.alt;
    counter.textContent = (p.label ? p.label + "  ·  " : "") + (current + 1) + " / " + list.length;
    preload(current + 1);
    preload(current - 1);
  }

  function open(photos, i) {
    if (!box) buildViewer();
    list = photos;
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    show(i);
    // let the browser paint before fading in
    requestAnimationFrame(function () { box.classList.add("open"); });
    closeBtn.focus();
  }

  function close() {
    box.classList.remove("open");
    document.body.classList.remove("lightbox-open");
    box.hidden = true;
    lbImg.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- Helpers ---------- */

  // A clickable thumbnail that opens the viewer at `index` of `viewList`
  function thumbButton(photo, viewList, index, className) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.setAttribute("aria-label", "Open " + photo.alt.charAt(0).toLowerCase() + photo.alt.slice(1));

    var img = document.createElement("img");
    img.src = photo.thumb;
    img.alt = photo.alt;
    img.width = photo.w;
    img.height = photo.h;
    img.decoding = "async";
    // Only the first row loads straight away; the rest load as you scroll
    img.loading = index < 4 ? "eager" : "lazy";
    img.addEventListener("load", function () { btn.classList.add("loaded"); });

    btn.appendChild(img);
    btn.addEventListener("click", function () { open(viewList, index); });
    return btn;
  }

  // Empty folder: hide a whole section, or show a short message instead
  function handleEmpty(el) {
    var hide = el.getAttribute("data-hide-when-empty");
    if (hide) {
      var section = document.querySelector(hide);
      if (section) section.hidden = true;
    }
    var msg = el.getAttribute("data-empty-message");
    if (msg) {
      el.classList.add("photos-empty");
      el.textContent = msg;
    }
  }

  /* ---------- Photo grids ---------- */
  document.querySelectorAll("[data-photos]").forEach(function (grid) {
    var set = grid.getAttribute("data-photos");
    var alt = grid.getAttribute("data-alt") || "Photo at TP Gym";
    var photos = (ALL[set] || []).map(function (p, i) {
      return { full: p.full, thumb: p.thumb, w: p.w, h: p.h, alt: alt + ", photo " + (i + 1) };
    });

    grid.innerHTML = "";
    if (!photos.length) { handleEmpty(grid); return; }

    grid.classList.add("gallery-grid");
    photos.forEach(function (p, i) {
      grid.appendChild(thumbButton(p, photos, i, "gallery-item"));
    });
  });

  /* ---------- Transformations ----------
     "name-before" + "name-after" files are shown as a side-by-side pair.
     Anything else is shown on its own (e.g. a single before/after image). */
  document.querySelectorAll("[data-transformations]").forEach(function (wrap) {
    var photos = ALL[wrap.getAttribute("data-transformations") || "transformations"] || [];
    wrap.innerHTML = "";
    if (!photos.length) { handleEmpty(wrap); return; }

    var items = [];   // in display order: {single} or {before, after}
    var pairs = {};
    photos.forEach(function (p) {
      var m = p.name.match(/^(.*?)[-_]*(before|after)$/);
      if (m) {
        var key = m[1] || "_";
        if (!pairs[key]) { pairs[key] = {}; items.push({ pairKey: key }); }
        pairs[key][m[2]] = p;
      } else {
        items.push({ single: p });
      }
    });

    // Flatten into one list for the viewer, in the order shown on the page
    var viewList = [];
    function add(p, label, alt) {
      viewList.push({ full: p.full, thumb: p.thumb, w: p.w, h: p.h, label: label, alt: alt });
      return viewList.length - 1;
    }

    var n = 0;
    items.forEach(function (item) {
      var card = document.createElement("div");
      n++;

      var pair = item.pairKey && pairs[item.pairKey];
      if (pair && pair.before && pair.after) {
        card.className = "transform-card transform-pair";
        [["before", "Before"], ["after", "After"]].forEach(function (side) {
          var idx = add(pair[side[0]], side[1], "Transformation " + n + ", " + side[0]);
          var cell = document.createElement("div");
          cell.className = "transform-side";
          cell.appendChild(thumbButton(viewList[idx], viewList, idx, "transform-photo"));
          var tag = document.createElement("span");
          tag.className = "transform-label" + (side[0] === "after" ? " is-after" : "");
          tag.textContent = side[1];
          cell.appendChild(tag);
          card.appendChild(cell);
        });
      } else {
        // A single image, or half of a pair whose partner is missing
        var p = item.single || pair.before || pair.after;
        var idx = add(p, "", "Transformation " + n);
        card.className = "transform-card transform-single";
        card.appendChild(thumbButton(viewList[idx], viewList, idx, "transform-photo"));
      }
      wrap.appendChild(card);
    });
  });

  /* ---------- Photo counts ---------- */
  document.querySelectorAll("[data-photo-count]").forEach(function (el) {
    var n = (ALL[el.getAttribute("data-photo-count")] || []).length;
    el.textContent = n ? n + " photos" : "";
  });
})();
