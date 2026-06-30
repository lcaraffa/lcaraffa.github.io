// LA source de vérité. Ajouter un projet = ajouter un objet ici.
const PROJECTS = [
  {
    title: "DALEAS",
    year: 2026,
    blurb: "An ANR ASTRID project: a scalable, multimodal tool to detect anomalies in large " +
           "streaming data — from disinformation to digital twins and the sky. Coordinator.",
    image: "assets/daleas.png",   // logo DALEAS
    tags: ["anomaly detection", "multimodal", "spark"],
    links: {
      page: "https://daleas-anr.github.io/",                  // site du projet
      code: "https://github.com/daleas-anr/daleas-anr.github.io",
      demo: null,
    },
  },
  {
    title: "A Transport-Based Geometry of Belief-Cost",
    year: 2026,
    blurb: "The geometry of what it costs a finite agent to change its mind. " +
           "Two postulates give a hyperbolic space of beliefs whose cusp — certainty — is infinitely far.",
    image: "assets/cost-geometry.png",   // vignette = pseudosphère gaussienne (fig. b)
    tags: ["geometry", "information", "paper"],
    links: {
      page: "belief-cost-geometry/",                 // sous-dossier interne
      paper: "https://arxiv.org/abs/2606.21585",
      code: "https://github.com/lcaraffa/belief-cost-geometry",
      demo: null,                                     // null = lien masqué
    },
  },
  {
    title: "Sparkling Wasure",
    year: 2021,
    blurb: "Out-of-core watertight surface reconstruction from large LiDAR point clouds, " +
           "tiled and distributed with Apache Spark. Tuned for the LiDAR HD dataset.",
    image: "assets/sparkling-wasure.jpg",   // vignette = mesh tuilé (château de Versailles)
    tags: ["lidar", "surface reconstruction", "spark"],
    links: {
      page: "sparkling-wasure/",
      paper: "https://hal.archives-ouvertes.fr/hal-03380593/file/2021216131.pdf",
      code: "https://github.com/lcaraffa/sparkling-wasure",
      demo: null,
    },
  },
  // { title: "...", year: 2025, blurb: "...", image: "assets/...", tags: [...], links: {...} },
];

const LABELS = { page: "page", paper: "paper", code: "code", demo: "demo" };

const ul = document.getElementById("project-list");
PROJECTS
  .sort((a, b) => b.year - a.year)              // plus récent d'abord
  .forEach(p => {
    const href = p.links.page || p.links.paper || p.links.code || "#";
    const links = Object.entries(p.links)
      .filter(([, url]) => url)
      .map(([k, url]) => `<a href="${url}">${LABELS[k]}</a>`)
      .join(" · ");
    const thumb = p.image
      ? `<a class="proj-thumb" href="${href}"><img src="${p.image}" alt="${p.title}" loading="lazy"></a>`
      : "";
    ul.insertAdjacentHTML("beforeend", `
      <li class="proj">
        ${thumb}
        <div class="proj-body">
          <div class="proj-head">
            <a class="proj-title" href="${href}">${p.title}</a>
            <span class="proj-year">${p.year}</span>
          </div>
          <p class="proj-blurb">${p.blurb}</p>
          <div class="proj-meta">
            <span class="proj-links">${links}</span>
          </div>
        </div>
      </li>`);
  });

document.getElementById("year").textContent = new Date().getFullYear();
