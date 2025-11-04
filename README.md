# Ali Institute — Vercel deploy (GitHub-backed storage)

This project saves admission form entries into a `data/data.json` file inside a GitHub repository by committing via the GitHub REST API.

## Files in this repo
- `index.html` — Registration form (captures device, IP, location)
- `view.html` — Table to view submitted records
- `styles.css` — Shared styles
- `api/save.js` — Serverless function (POST) to save a new entry to GitHub
- `api/data.js` — Serverless function (GET) to read saved entries from GitHub

## Required Environment Variables (set in Vercel Project Settings)
- `GITHUB_TOKEN` — Personal Access Token with `repo` (or `public_repo`) scope.
- `GITHUB_REPO` — Repo in `owner/repo` format, e.g. `yourusername/ali-institute`.
- `GITHUB_BRANCH` — (optional) branch name. Default `main`.
- `CLIENT_PASSWORD` — a shared client password required for form submissions (server-validated).

## How it works
1. User fills the form in `index.html`. Client-side JS augments the submission with device info and calls `https://ipapi.co/json/` to add approximate location/ip data.
2. The form posts to `/api/save.js`, which verifies `CLIENT_PASSWORD`, then reads `data/data.json` from your GitHub repo (creates if missing), appends the new record, and commits the updated file back to the repo.
3. `view.html` fetches `/api/data.js` to read the saved entries and display them.

## Deploy on Vercel
1. Create a new GitHub repo and push this project, or upload the ZIP to a new repo.
2. In Vercel, import the GitHub repo and deploy.
3. In Vercel Project Settings → Environment Variables, add `GITHUB_TOKEN`, `GITHUB_REPO`, `CLIENT_PASSWORD` (and `GITHUB_BRANCH` if different).
4. Visit the deployed site. Submit a form (use the CLIENT_PASSWORD you provided). Then click "View Data" (or visit `/view.html`) to see entries.

## Notes & security
- Keep `GITHUB_TOKEN` and `CLIENT_PASSWORD` secret. Do not commit tokens to public repos.
- IP geolocation uses a 3rd-party free API (`ipapi.co`). Consider replacing with a paid/whitelisted provider for production.
- Anyone with `CLIENT_PASSWORD` can submit; the server enforces this password. `view.html` is public — protect it if necessary.
