export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { catalogData } = req.body;
  if (!catalogData) {
    return res.status(400).json({ message: 'Missing catalog data' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "yourusername/dastkari-website"
  const path = 'catalog_data.json';

  if (!token || !repo) {
    return res.status(500).json({ message: 'Server configuration missing GITHUB_TOKEN or GITHUB_REPO' });
  }

  try {
    // 1. Fetch current file SHA from GitHub
    const getFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!getFileRes.ok) {
      throw new Error('Could not find catalog_data.json in repository');
    }

    const fileData = await getFileRes.json();
    const sha = fileData.sha;

    // 2. Encode updated JSON into base64
    const newContent = Buffer.from(JSON.stringify(catalogData, null, 2)).toString('base64');

    // 3. Commit update directly to GitHub
    const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Auto-update catalog_data.json via Staff Portal',
        content: newContent,
        sha: sha
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.json();
      return res.status(updateRes.status).json({ message: err.message || 'Failed to update GitHub' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
