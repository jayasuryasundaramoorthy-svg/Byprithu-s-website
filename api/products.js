const { cmd, all, isAdmin, rid } = require('./_db');
module.exports = async (req, res) => {
  try {
    const admin = isAdmin(req);
    if (req.method === 'GET') {
      let list = await all('products');
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (!admin) list = list.map(({ payLink, payButtonId, ...p }) => p); // pay link stays private until an order is placed
      return res.json(list);
    }
    if (!admin) return res.status(401).json({ error: 'Wrong admin password' });
    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.name || !b.price) return res.status(400).json({ error: 'Name and price required' });
      const id = b.id || rid();
      const p = { id, name: String(b.name), price: String(b.price), desc: String(b.desc || ''), image: String(b.image || ''), allowUpload: !!b.allowUpload, allowText: !!b.allowText, imageFields: (Array.isArray(b.imageFields) ? b.imageFields : []).slice(0, 10).map(f => ({ label: String(f.label || '').slice(0, 80) })), textFields: (Array.isArray(b.textFields) ? b.textFields : []).slice(0, 10).map(f => ({ label: String(f.label || '').slice(0, 80) })), featured: !!b.featured, priceLabel: String(b.priceLabel || 'JUST'), payLink: String(b.payLink || ''), payButtonId: /^pl_[A-Za-z0-9]+$/.test(String(b.payButtonId || '')) ? String(b.payButtonId) : '', createdAt: b.createdAt || Date.now() };
      await cmd('HSET', 'products', id, JSON.stringify(p));
      return res.json(p);
    }
    if (req.method === 'DELETE') {
      await cmd('HDEL', 'products', String(req.query.id));
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
