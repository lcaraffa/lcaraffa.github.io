// Relevé des publications (atomique). Ajouter un papier = ajouter un objet.
// Règle : un effort GLOBAL que tu portes devient un "project" (projects.js) ; ici on
// liste les publis principales avec collaboration, vraiment publiées (conf + journaux +
// actes ISPRS). Exclus : théorie solo (BEDS…), préprints non publiés, rapports, thèse.
// Marqueurs d'auteurs : *  contribution égale  ·  ** encadrement égal.
const PUBLICATIONS = [
  // ---- 2026 ----
  {
    title: "A Transport-Based Geometry of Belief-Cost: an axiomatic characterization",
    authors: "L. Caraffa",
    venue: "Preprint · arXiv:2606.21585",
    year: 2026,
    image: "assets/cost-geometry.png",
    links: { page: "belief-cost-geometry/", arxiv: "https://arxiv.org/abs/2606.21585", pdf: "https://arxiv.org/pdf/2606.21585" },
  },
  {
    title: "Fused-Planes: Why Train a Thousand Tri-Planes When You Can Share?",
    authors: "K. Kassab*, A. Schnepf*, J-Y. Franceschi, L. Caraffa, F. Vasile, J. Mary, A. Comport**, V. Gouet-Brunet**",
    venue: "ICLR",
    year: 2026,
    image: "assets/pub/fused-planes.jpg",
    links: { page: "https://fused-planes.github.io", arxiv: "https://arxiv.org/abs/2410.23742", code: "https://github.com/k-kassab/fused-planes", openreview: "https://openreview.net/forum?id=bAG7lS1AUL" },
  },
  {
    title: "Pointmap-Conditioned Diffusion for Consistent Novel View Synthesis",
    authors: "T-A-Q. Nguyen, L. Caraffa, J-P. Tarel, R. Brémond",
    venue: "WACV",
    year: 2026,
    image: "assets/pub/pointmap.jpg",
    links: { arxiv: "https://arxiv.org/abs/2501.02913" },
  },

  // ---- 2025 ----
  {
    title: "RefinedFields: Radiance Fields Refinement for Planar Scene Representations",
    authors: "K. Kassab, A. Schnepf, J-Y. Franceschi, L. Caraffa, J. Mary, V. Gouet-Brunet",
    venue: "TMLR",
    year: 2025,
    image: "assets/pub/refinedfields.jpg",
    links: { page: "https://refinedfields.github.io", arxiv: "https://arxiv.org/abs/2312.00639", code: "https://github.com/k-kassab/refinedfields" },
  },
  {
    title: "Bringing NeRFs to the Latent Space: Inverse Graphics Autoencoder",
    authors: "A. Schnepf*, K. Kassab*, J-Y. Franceschi, L. Caraffa, F. Vasile, J. Mary, A. Comport**, V. Gouet-Brunet**",
    venue: "ICLR",
    year: 2025,
    image: "assets/pub/igae.jpg",
    links: { page: "https://ig-ae.github.io", arxiv: "https://arxiv.org/abs/2410.22936", code: "https://github.com/k-kassab/igae" },
  },
  {
    title: "DSI-3D: Differentiable Search Index for Point Cloud Retrieval",
    authors: "C-N. Zede, L. Caraffa, V. Gouet-Brunet",
    venue: "CBMI",
    year: 2025,
    links: { hal: "https://hal.science/hal-05345963", pdf: "https://hal.science/hal-05345963/document" },
  },

  // ---- 2024 ----
  {
    title: "Exploring 3D-aware Latent Spaces for Efficiently Learning Numerous Scenes",
    authors: "A. Schnepf*, K. Kassab*, J-Y. Franceschi, L. Caraffa, F. Vasile, J. Mary, A. Comport, V. Gouet-Brunet",
    venue: "CVPR — 3DMV workshop",
    year: 2024,
    image: "assets/pub/3da-ae.jpg",
    links: { page: "https://3da-ae.github.io", arxiv: "https://arxiv.org/abs/2403.11678", code: "https://github.com/AntoineSchnepf/3da-ae" },
  },

  // ---- 2023 ----
  {
    title: "Evaluating Surface Mesh Reconstruction Using Real Data",
    authors: "Y. Marchand, L. Caraffa, R. Sulzer, E. Cledat, B. Vallet",
    venue: "Photogrammetric Engineering & Remote Sensing",
    year: 2023,
    links: { hal: "https://hal.science/hal-04428121", doi: "https://doi.org/10.14358/PERS.23-00007R3" },
  },

  // ---- 2021 ----
  {
    title: "Efficiently Distributed Watertight Surface Reconstruction",
    authors: "L. Caraffa, Y. Marchand, M. Brédif, B. Vallet",
    venue: "International Conference on 3D Vision (3DV)",
    year: 2021,
    image: "assets/sparkling-wasure.jpg",
    links: { page: "sparkling-wasure/", pdf: "https://hal.science/hal-03380593/document" },
  },
  {
    title: "Evaluating surface mesh reconstruction of open scenes",
    authors: "Y. Marchand, B. Vallet, L. Caraffa",
    venue: "ISPRS Archives",
    year: 2021,
    links: {},
  },

  // ---- 2020 ----
  {
    title: "Provably Consistent Distributed Delaunay Triangulation",
    authors: "M. Brédif, L. Caraffa, M. Yirci, P. Memari",
    venue: "ISPRS Annals",
    year: 2020,
    links: { hal: "https://hal.science/hal-02551509", doi: "https://doi.org/10.5194/isprs-annals-V-2-2020-195-2020" },
  },

  // ---- 2019 ----
  {
    title: "Tile & Merge: Distributed Delaunay Triangulations for Cloud Computing",
    authors: "L. Caraffa, P. Memari, M. Yirci, M. Brédif",
    venue: "IEEE Big Data",
    year: 2019,
    links: { pdf: "https://hal.science/hal-02535021/document", doi: "https://doi.org/10.1109/BigData47090.2019.9006534" },
  },
  {
    title: "Piecewise-planar approximation of large 3D data as graph-structured optimization",
    authors: "S. Guinard, L. Landrieu, L. Caraffa, B. Vallet",
    venue: "ISPRS Annals",
    year: 2019,
    links: {},
  },

  // ---- 2016 ----
  {
    title: "3D watertight mesh generation with uncertainties from ubiquitous data",
    authors: "L. Caraffa, M. Brédif, B. Vallet",
    venue: "ACCV",
    year: 2016,
    links: { hal: "https://hal.science/hal-01882625", doi: "https://doi.org/10.1007/978-3-319-54190-7_23" },
  },

  // ---- 2015 ----
  {
    title: "The Guided Bilateral Filter: When the Joint/Cross Bilateral Filter Becomes Robust",
    authors: "L. Caraffa, J-P. Tarel, P. Charbonnier",
    venue: "IEEE Transactions on Image Processing",
    year: 2015,
    links: { hal: "https://hal.science/hal-01215837", doi: "https://doi.org/10.1109/TIP.2015.2389617" },
  },
  {
    title: "Extending α-expansion to a larger set of regularization functions",
    authors: "M. Paget, J-P. Tarel, L. Caraffa",
    venue: "IEEE International Conference on Image Processing (ICIP)",
    year: 2015,
    links: { hal: "https://hal.science/hal-01215838" },
  },

  // ---- 2014 ----
  {
    title: "Combining Stereo and Atmospheric Veil Depth Cues for 3D Reconstruction",
    authors: "L. Caraffa, J-P. Tarel",
    venue: "IPSJ Transactions on Computer Vision and Applications",
    year: 2014,
    links: { hal: "https://hal.science/hal-01051487", doi: "https://doi.org/10.2197/ipsjtcva.6.1" },
  },
  {
    title: "Daytime Fog Detection and Density Estimation with Entropy Minimisation",
    authors: "L. Caraffa, J-P. Tarel",
    venue: "ISPRS Annals",
    year: 2014,
    links: { hal: "https://hal.science/hal-01068534" },
  },

  // ---- 2013 ----
  {
    title: "Markov Random Field Model for Single Image Defogging",
    authors: "L. Caraffa, J-P. Tarel",
    venue: "IEEE Intelligent Vehicles Symposium (IV)",
    year: 2013,
    links: { hal: "https://hal.science/hal-00852870" },
  },

  // ---- 2012 ----
  {
    title: "Stereo Reconstruction and Contrast Restoration in Daytime Fog",
    authors: "L. Caraffa, J-P. Tarel",
    venue: "ACCV",
    year: 2012,
    links: { hal: "https://hal.science/hal-00852835" },
  },
  {
    title: "Vision Enhancement in Homogeneous and Heterogeneous Fog",
    authors: "J-P. Tarel, N. Hautière, L. Caraffa, A. Cord, H. Halmaoui, D. Gruyer",
    venue: "IEEE Intelligent Transportation Systems Magazine",
    year: 2012,
    links: { hal: "https://hal.science/hal-00707039", doi: "https://doi.org/10.1109/MITS.2012.2189969" },
  },
];

const PUB_LABELS = { page: "page", arxiv: "arXiv", hal: "hal", pdf: "pdf", code: "code", openreview: "openreview", doi: "doi" };
const ME = /(L\.\s*Caraffa)/g;

const pubHost = document.getElementById("publication-list");
if (pubHost) {
  const byYear = {};
  PUBLICATIONS.forEach(p => (byYear[p.year] = byYear[p.year] || []).push(p));

  Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
    const items = byYear[year].map(p => {
      const L = p.links || {};
      const href = L.page || L.arxiv || L.hal || L.pdf || L.doi || L.code || null;
      const title = href
        ? `<a class="pub-title" href="${href}">${p.title}</a>`
        : `<span class="pub-title">${p.title}</span>`;
      const authors = p.authors.replace(ME, '<span class="me">$1</span>');
      const links = Object.entries(L)
        .filter(([, url]) => url)
        .map(([k, url]) => `<a href="${url}">${PUB_LABELS[k] || k}</a>`)
        .join(" · ");
      const thumb = p.image
        ? `<a class="pub-thumb" href="${href || "#"}"><img src="${p.image}" alt="" loading="lazy"></a>`
        : "";
      return `
        <li class="pub">
          ${thumb}
          <div class="pub-main">
            <div>${title}</div>
            <p class="pub-authors">${authors}</p>
            <p class="pub-venue">${p.venue}</p>
            ${links ? `<p class="pub-links">${links}</p>` : ""}
          </div>
        </li>`;
    }).join("");
    pubHost.insertAdjacentHTML("beforeend",
      `<div class="pub-group"><div class="pub-year">${year}</div><ul class="pubs">${items}</ul></div>`);
  });

  pubHost.insertAdjacentHTML("beforeend",
    `<p class="pub-note">* equal contribution &nbsp;·&nbsp; ** equal supervision</p>`);

  // "more" : n'afficher que les LIMIT premières, déplier/replier le reste.
  const LIMIT = 5;
  const allPubs = Array.from(pubHost.querySelectorAll(".pub"));
  if (allPubs.length > LIMIT) {
    const extra = allPubs.slice(LIMIT);
    const groups = Array.from(pubHost.querySelectorAll(".pub-group"));
    const apply = expanded => {
      extra.forEach(el => el.classList.toggle("is-hidden", !expanded));
      groups.forEach(g => {
        const anyVisible = Array.from(g.querySelectorAll(".pub")).some(p => !p.classList.contains("is-hidden"));
        g.classList.toggle("is-hidden", !anyVisible);
      });
    };
    const btn = document.createElement("button");
    btn.className = "more-btn";
    let expanded = false;
    const sync = () => { apply(expanded); btn.textContent = expanded ? "less" : `more (${extra.length})`; };
    btn.addEventListener("click", () => { expanded = !expanded; sync(); });
    pubHost.insertBefore(btn, pubHost.querySelector(".pub-note"));
    sync();
  }
}
