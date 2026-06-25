// Notes expo (ni projet ni publi). Ajouter une note = ajouter un objet + une page sous notes/.
const NOTES = [
  {
    title: "Quadratic Pseudo-Boolean Optimization",
    year: 2014,
    blurb: "Submodularity and graph cuts, non-submodularity and roof duality — an introduction.",
    image: "notes/qpbo/assets/mincut.svg",
    tags: ["optimization", "graph-cut", "QPBO"],
    links: { page: "notes/qpbo/" },
  },
  {
    title: "Graduated Non-Convexity for Robust Fitting",
    year: 2014,
    blurb: "Reaching a useful minimum of a non-convex robust estimator, one step at a time.",
    image: "notes/gnc/assets/gnc-ellipse.gif",
    tags: ["optimization", "robust", "GNC"],
    links: { page: "notes/gnc/" },
  },
];

const noteHost = document.getElementById("note-list");
if (noteHost) {
  NOTES
    .sort((a, b) => b.year - a.year)
    .forEach(n => {
      const href = n.links.page || "#";
      const thumb = n.image
        ? `<a class="proj-thumb" href="${href}"><img src="${n.image}" alt="${n.title}" loading="lazy"></a>`
        : "";
      noteHost.insertAdjacentHTML("beforeend", `
        <li class="proj">
          ${thumb}
          <div class="proj-body">
            <div class="proj-head">
              <a class="proj-title" href="${href}">${n.title}</a>
              <span class="proj-year">${n.year}</span>
            </div>
            <p class="proj-blurb">${n.blurb}</p>
            <div class="proj-meta">
              <span class="proj-links"><a href="${href}">read</a></span>
            </div>
          </div>
        </li>`);
    });
}
