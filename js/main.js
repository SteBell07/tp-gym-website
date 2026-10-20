/* =========================================================
   SITE LINKS — change them here and every button and link
   on the site updates automatically.
   ========================================================= */

// "Join now" buttons
var JOIN_URL = "https://transformphysiquesgym.clubright.co.uk/register?utm_source=website";

// Instagram: footer link and "Enquire about coaching" buttons
var INSTAGRAM_URL = "https://www.instagram.com/transformphysiques_gym/";

// Footer address: opens Google Maps
var MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Transform+Physiques+Gym+Walney+Rd+Barrow-in-Furness+LA14+5UT";

// "Read our Google reviews" button on the homepage
var GOOGLE_REVIEWS_URL = "https://www.google.com/maps/search/?api=1&query=Transform+Physiques+Gym";

function linkTo(selector, url) {
  document.querySelectorAll(selector).forEach(function (link) {
    // While a link is still a [PLACEHOLDER], leave it inert rather than broken
    if (url.charAt(0) === "[") {
      link.href = "#";
      link.addEventListener("click", function (e) { e.preventDefault(); });
      return;
    }
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
  });
}

linkTo("[data-join]", JOIN_URL);
linkTo("[data-instagram]", INSTAGRAM_URL);
linkTo("[data-google-reviews]", GOOGLE_REVIEWS_URL);
linkTo("[data-maps]", MAPS_URL);

// Faded section background photos (data-bg="..."): only load each one as
// its section scrolls near the screen, so the page opens quickly
var bgSections = document.querySelectorAll("[data-bg]");
function loadBg(el) {
  // Full address, otherwise the browser looks for it relative to the css/ folder
  var src = new URL(el.getAttribute("data-bg"), document.baseURI).href;
  el.style.setProperty("--bg-photo", 'url("' + src + '")');
  el.classList.add("bg-loaded");
}
if ("IntersectionObserver" in window) {
  var bgObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        loadBg(entry.target);
        bgObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "400px 0px" });
  bgSections.forEach(function (el) { bgObserver.observe(el); });
} else {
  bgSections.forEach(loadBg);
}

// Mobile menu toggle
var toggle = document.querySelector(".nav-toggle");
var header = document.querySelector(".site-header");
if (toggle && header) {
  toggle.addEventListener("click", function () {
    var open = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// Darken the header once the page is scrolled
function updateHeader() {
  if (header) header.classList.toggle("scrolled", window.scrollY > 20);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// Keep the footer year current
var year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
