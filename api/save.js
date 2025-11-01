// api/save.js
// Vercel Serverless Function (Node). No external deps required.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    // expect: { entry: { name, father, class, gender, address, phone, interest, adminPassword } }
    const entry = body?.entry;
    if (!entry) return res.status(400).json({ error: 'Missing entry' });

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
    if (!ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Server not configured (ADMIN_PASSWORD missing)' });
    }

    // Validate admin password
    if (String(entry.adminPassword || '') !== String(ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // remove adminPassword from stored object
    delete entry.adminPassword;

    // augment entry with metadata
    const timestamp = new Date().toISOString();
    const record = {
      ...entry,
      _savedAt: timestamp
    };

    // GitHub config from env:
    // GITHUB_TOKEN (personal access token, put as Vercel Secret),
    // GITHUB_REPO (format: owner/repo),
    // GITHUB_BRANCH (branch name; default: main)
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VERCEL_GITHUB_TOKEN || '';
    const GITHUB_REPO = process.env.GITHUB_REPO || '';
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const FILE_PATH = (process.env.GITHUB_DATA_PATH || 'data/data.json');

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub integration not configured (GITHUB_TOKEN or GITHUB_REPO missing)' });
    }

    const [owner, repo] = GITHUB_REPO.split('/');
    if (!owner || !repo) return res.status(500).json({ error: 'GITHUB_REPO must be "owner/repo"' });

    const apiBase = 'https://api.github.com';

    // 1) Try to fetch existing file to get SHA and current content
    const getUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(FILE_PATH)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const getResp = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vercel-serverless'
      }
    });

    let existingArray = [];
    let sha = null;
    if (getResp.status === 200) {
      const fileJson = await getResp.json();
      // fileJson.content is base64
      const content = Buffer.from(fileJson.content || '', 'base64').toString('utf8');
      try {
        existingArray = JSON.parse(content);
        if (!Array.isArray(existingArray)) existingArray = [];
      } catch (e) {
        existingArray = [];
      }
      sha = fileJson.sha;
    } else if (getResp.status === 404) {
      // file not found -> will create new
      existingArray = [];
    } else {
      // other error
      const msg = await getResp.text();
      return res.status(502).json({ error: 'Failed to read file from GitHub', detail: msg });
    }

    // append
    existingArray.push(record);

    // prepare content
    const newContent = JSON.stringify(existingArray, null, 2);
    const b64 = Buffer.from(newContent, 'utf8').toString('base64');

    // commit (create or update)
    const putUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(FILE_PATH)}`;
    const commitMessage = `Add form entry at ${timestamp}`;

    const putBody = {
      message: commitMessage,
      content: b64,
      branch: GITHUB_BRANCH
    };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vercel-serverless',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      return res.status(502).json({ error: 'Failed to write file to GitHub', detail: errText });
    }

    const putJson = await putResp.json();
    const filePath = putJson.content?.path || FILE_PATH;

    return res.status(200).json({ ok: true, filePath });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error', message: String(err?.message || err) });
  }
  }
