/* =========================================================
   TP Fire & Ice terms page: "Print" buttons.
   Each button prints just one document. data-print-mode="display"
   leaves out the signature section (for the copy on the wall).
   ========================================================= */

document.querySelectorAll("[data-print]").forEach(function (button) {
  button.addEventListener("click", function () {
    var body = document.body;
    body.setAttribute("data-print-target", button.getAttribute("data-print"));
    body.setAttribute("data-print-mode", button.getAttribute("data-print-mode") || "sign");
    window.print();
  });
});

// Reset once printing finishes, so the browser's own Print command prints everything
window.addEventListener("afterprint", function () {
  document.body.removeAttribute("data-print-target");
  document.body.removeAttribute("data-print-mode");
});
