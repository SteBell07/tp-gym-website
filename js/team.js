/* =========================================================
   Builds the team cards from js/team-data.js.
   Photos come from images/team/ via js/photos-data.js
   (run scripts/process-photos.sh after adding one).
   ========================================================= */
(function () {
  var grid = document.querySelector("[data-team]");
  if (!grid) return;

  var team = window.TEAM || [];
  var photos = (window.PHOTOS && window.PHOTOS.team) || [];

  // Same naming rule as the photo script: "Stephen Bell.HEIC" -> "stephen-bell"
  function slug(file) {
    return file.replace(/\.[^.]+$/, "").toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function findPhoto(file) {
    if (!file) return null;
    var s = slug(file);
    for (var i = 0; i < photos.length; i++) {
      if (photos[i].name === s) return photos[i];
    }
    return null;
  }

  function isPlaceholder(text) {
    return !text || text.charAt(0) === "[";
  }

  function initials(name) {
    if (isPlaceholder(name)) return "";
    return name.trim().split(/\s+/).map(function (w) { return w.charAt(0); })
      .slice(0, 2).join("").toUpperCase();
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text) e.textContent = text;
    return e;
  }

  // Cards still showing [PLACEHOLDER] text aren't shown on the site
  team = team.filter(function (person) { return !isPlaceholder(person.name); });

  grid.innerHTML = "";
  if (!team.length) {
    grid.appendChild(el("p", "photos-empty", "Team profiles coming soon."));
    return;
  }
  team.forEach(function (person) {
    var card = el("article", "team-card");

    // Photo, or a charcoal placeholder with initials / silhouette
    var frame = el("div", "team-photo");
    var photo = findPhoto(person.photo);
    if (photo) {
      var img = document.createElement("img");
      img.src = photo.thumb;
      img.srcset = photo.thumb + " 600w, " + photo.full + " 1600w";
      img.sizes = "(min-width: 1100px) 280px, (min-width: 720px) 50vw, 100vw";
      img.alt = isPlaceholder(person.name) ? "Team member" : person.name;
      img.loading = "lazy";
      img.decoding = "async";
      frame.appendChild(img);
    } else {
      frame.classList.add("is-empty");
      var letters = initials(person.name);
      if (letters) {
        frame.appendChild(el("span", "team-initials", letters));
      } else {
        frame.innerHTML =
          '<svg class="team-silhouette" viewBox="0 0 64 64" aria-hidden="true">' +
          '<circle cx="32" cy="23" r="12" fill="currentColor"/>' +
          '<path d="M10 60c0-13 10-21 22-21s22 8 22 21z" fill="currentColor"/></svg>';
      }
    }
    card.appendChild(frame);

    var body = el("div", "team-body");
    body.appendChild(el("h3", "team-name", person.name));
    body.appendChild(el("p", "team-role", person.role));
    if (person.bio) body.appendChild(el("p", "team-bio", person.bio));
    if (person.specialises) {
      var spec = el("p", "team-spec");
      spec.appendChild(el("strong", "", "Specialises in: "));
      spec.appendChild(document.createTextNode(person.specialises));
      body.appendChild(spec);
    }
    card.appendChild(body);
    grid.appendChild(card);
  });
})();
