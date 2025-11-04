// Vercel Serverless Function — saves incoming entry to GitHub repo (data/data.json)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await (async () => {
      try { return typeof req.body === 'object' ? req.body : JSON.parse(await new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(d)); })); }
      catch (e) { return req.body; }
    })();

    const entry = body?.entry;
    if (!entry || !entry.name || !entry.father) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
    const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD;

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub configuration missing in env (GITHUB_TOKEN or GITHUB_REPO)' });
    }
    if (!CLIENT_PASSWORD) {
      return res.status(500).json({ error: 'Server requires CLIENT_PASSWORD env variable' });
    }

    // Validate client password
    if (String(entry.clientpass || '') !== String(CLIENT_PASSWORD)) {
      return res.status(401).json({ error: 'Invalid client password' });
    }

    // Clean clientpass before saving
    delete entry.clientpass;

    const [owner, repo] = GITHUB_REPO.split('/');
    if (!owner || !repo) return res.status(500).json({ error: 'GITHUB_REPO must be owner/repo' });

    const path = 'data/data.json';
    const apiBase = 'https://api.github.com';

    // Try to GET existing file
    let existing = [];
    let sha = null;
    const getUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
    const getResp = await fetch(getUrl, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
    });

    if (getResp.status === 200) {
      const jf = await getResp.json();
      sha = jf.sha;
      const content = jf.content ? Buffer.from(jf.content, 'base64').toString('utf8') : '';
      try { existing = JSON.parse(content); if (!Array.isArray(existing)) existing = []; } catch (e) { existing = []; }
    } else if (getResp.status === 404) {
      existing = [];
    } else {
      const txt = await getResp.text();
      return res.status(502).json({ error: 'Failed reading file from GitHub', detail: txt });
    }

    const timestamp = new Date().toISOString();
    const record = { ...entry, timestamp };
    existing.push(record);

    const newContent = Buffer.from(JSON.stringify(existing, null, 2)).toString('base64');

    // Create or update file
    const putUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const putBody = { message: `Add admission: ${entry.name || 'unknown'} at ${timestamp}`, content: newContent, branch: GITHUB_BRANCH };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putResp.ok) {
      const txt = await putResp.text();
      return res.status(502).json({ error: 'Failed writing file to GitHub', detail: txt });
    }

    const putJson = await putResp.json();
    return new Promise(resolver => resolver(res.status(200).json({ ok: true, path: putJson.content?.path || path })));

  } catch (err) {
    console.error('save error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
