const { cmd, isAdmin } = require('./_db');
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const raw = await cmd('HGET', 'config', 'site');
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
      return res.json(raw ? JSON.parse(raw) : {});
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin password' });
    if (req.method === 'POST') {
      const s = JSON.stringify(req.body || {});
      if (s.length > 900000) return res.status(400).json({ error: 'Images are too large. Use a smaller logo/banner.' });
      await cmd('HSET', 'config', 'site', s);
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
