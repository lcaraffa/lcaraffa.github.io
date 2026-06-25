// Toggle dark/light, persiste le choix, respecte prefers-color-scheme par défaut.
// Même origine que le portail → le choix fait sur la page d'accueil est repris ici.
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.setAttribute("data-theme", saved);

document.getElementById("theme-toggle").addEventListener("click", () => {
  const current = root.getAttribute("data-theme");
  const isDark = current === "dark" ||
    (current === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const next = isDark ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});
