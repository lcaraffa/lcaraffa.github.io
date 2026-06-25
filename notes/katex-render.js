// Render every [data-tex] element with KaTeX (display if data-display="1").
function renderMath() {
  if (typeof katex === "undefined") return;
  document.querySelectorAll("[data-tex]").forEach(el => {
    if (el.dataset.rendered) return;
    try {
      katex.render(el.getAttribute("data-tex"), el, {
        displayMode: el.dataset.display === "1", throwOnError: false,
      });
      el.dataset.rendered = "1";
    } catch (e) { el.textContent = el.getAttribute("data-tex"); }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderMath);
else renderMath();
window.addEventListener("load", renderMath);
