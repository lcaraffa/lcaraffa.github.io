# lcaraffa.github.io

Personal site 
## Run locally

```sh
./run.sh            # serves the repo root on http://127.0.0.1:8000
./run.sh 8011       # custom port
```

The local server is needed (rather than opening `index.html` via `file://`) because
project pages use ES modules, which require HTTP.

## Add a project

1. `cp -r belief-cost-geometry new-project/` and edit its `index.html` / assets.
2. Add an entry to the `PROJECTS` array in `projects.js` with `links.page: "new-project/"`.
3. Commit and push.

## Deploy

GitHub Pages, **Deploy from a branch** (`main` / root). The `.nojekyll` file keeps
GitHub from running the site through Jekyll. No Actions workflow needed.

## Layout

```
index.html          portal (about + project list)
style.css           monospace theme, dark/light via CSS variables
theme.js            dark/light toggle (persisted in localStorage)
projects.js         the data: array of projects rendered into the portal
assets/favicon.svg  crimson "~"
belief-cost-geometry/   first project page (restyled monospace, interactive figures)
```
