// Vercel Serverless Function — reads data/data.json from GitHub and returns parsed JSON
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Only GET allowed' });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).json({ error: 'GitHub configuration missing in env (GITHUB_TOKEN or GITHUB_REPO)' });
    }

    const [owner, repo] = GITHUB_REPO.split('/');
    if (!owner || !repo) return res.status(500).json({ error: 'GITHUB_REPO must be owner/repo' });

    const path = 'data/data.json';
    const apiBase = 'https://api.github.com';
    const getUrl = `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

    const getResp = await fetch(getUrl, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
    });

    if (getResp.status === 200) {
      const jf = await getResp.json();
      const content = jf.content ? Buffer.from(jf.content, 'base64').toString('utf8') : '[]';
      try {
        const parsed = JSON.parse(content || '[]');
        return res.status(200).json(parsed);
      } catch (e) {
        return res.status(500).json({ error: 'Failed to parse JSON from GitHub' });
      }
    } else if (getResp.status === 404) {
      return res.status(200).json([]);
    } else {
      const txt = await getResp.text();
      return res.status(502).json({ error: 'Failed reading file from GitHub', detail: txt });
    }
  } catch (err) {
    console.error('data error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
