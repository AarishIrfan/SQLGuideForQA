
# SQL Playground — Learn & Practice

A static web app that teaches SQL and lets users run queries directly in the browser using sql.js (SQLite compiled to WebAssembly). No backend required.

## Local usage

- Open `site/index.html` in a browser, or serve the `site/` folder with any static server.

## Deploy to Netlify

- The site is already configured for Netlify. Publish directory is `site/` via `netlify.toml`.
- Easiest: use Netlify Drop — zip the `site/` folder and upload at `https://app.netlify.com/drop`.
- Quick deploy via connected repo:
  1. Push this repo to GitHub/GitLab/Bitbucket
  2. Create a new site on Netlify, connect the repo, and set the publish directory to `site` (build command optional).
  3. Or use Netlify CLI:

```bash
npm i -g netlify-cli
netlify deploy --dir=site           # draft deploy
netlify deploy --prod --dir=site    # production deploy
```

## Tech

- UI: Vanilla HTML/CSS/JS
- SQL engine: sql.js `1.10.2` (SQLite in WebAssembly)

## Notes

- This demo uses a small sample database (departments, employees, customers, orders). Use Reset DB anytime to restore it.
- SQLite syntax is used; some SQL features vary across database systems.

