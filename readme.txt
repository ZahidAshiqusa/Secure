# Admission Form → Save to GitHub via Vercel

## What this is
A static site plus a Vercel serverless function that saves submitted form records into a JSON file (`data/data.json`) inside a GitHub repository by committing via the GitHub API.

## Files
- `index.html` — UI form
- `styles.css` — styling
- `script.js` — client logic
- `api/save.js` — Vercel serverless function to commit to GitHub

## Required environment variables (set on Vercel as Project Secrets)
- `GITHUB_TOKEN` — a GitHub Personal Access Token (PAT) with `repo` scope for that repository (do **not** paste this in public code). Alternatively name it `VERCEL_GITHUB_TOKEN`.
- `GITHUB_REPO` — the repo in `owner/repo` format, e.g. `yourusername/yourrepo`.
- `GITHUB_BRANCH` — (optional) branch to commit to; default `main`.
- `ADMIN_PASSWORD` — simple admin password to protect the API (the form includes a field; the API checks this).

Optional:
- `GITHUB_DATA_PATH` — (optional) path to data file inside repo (default `data/data.json`).

## Notes on GitHub token
- The PAT must include `repo` permission if the repo is private, or minimal `public_repo` for public repos. Better: create a repo and a token specifically for this purpose.
- Keep tokens secret. Use Vercel Dashboard → Settings → Environment Variables to add them.

## How to deploy
1. Create a new repo on GitHub and push this project (root contains `index.html`, `styles.css`, `script.js`, `api/save.js`, `README.md`).
2. On Vercel, import the GitHub repo and deploy.
3. Add the environment variables on Vercel (Project > Settings > Environment Variables).
4. Visit the deployed site, fill the form and provide the admin password. On success the function will commit to the repo.

## Security caveats
- This example uses a **simple password** check. For production, use server-only authentication flows and do not transmit secrets from the client.
- The admin password is required by the API. If you include it in the client UI, users can see it if they inspect the client. In practice:
  - Use a separate admin UI or server-only flow, or
  - Remove the `adminPassword` field from front-end and manage submissions server-side (e.g., an authenticated admin dashboard).
- Rate limits & API quotas apply for GitHub API. For high-volume forms use a proper DB (Supabase, etc.).

## Troubleshooting
- 401: check `ADMIN_PASSWORD`.
- 500/502: check `GITHUB_TOKEN`, `GITHUB_REPO` correctness and token scopes.