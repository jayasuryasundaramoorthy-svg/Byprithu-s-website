const { cmd, all, isAdmin, rid } = require('./_db');
module.exports = async (req, res) => {
  try {
    const admin = isAdmin(req);
    if (req.method === 'GET') {
      if (req.query.id) { // single product with the full image gallery
        const raw = await cmd('HGET', 'products', String(req.query.id));
        if (!raw) return res.status(404).json({ error: 'Product not found' });
        const one = JSON.parse(raw);
        if (!admin) { delete one.payLink; delete one.payButtonId; }
        return res.json(one);
      }
      let list = await all('products');
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      // the list never carries the big gallery (only small thumbs); pay details stay private until an order is placed
      list = list.map(({ images, ...r }) => { if (!admin) { delete r.payLink; delete r.payButtonId; } return r; });
      return res.json(list);
    }
    if (!admin) return res.status(401).json({ error: 'Wrong admin password' });
    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.name || !b.price) return res.status(400).json({ error: 'Name and price required' });
      const id = b.id || rid();
      const p = { id, name: String(b.name), price: String(b.price), desc: String(b.desc || ''), image: String(b.image || '').length < 450000 ? String(b.image || '') : '', images: (Array.isArray(b.images) ? b.images : []).filter(x => typeof x === 'string' && x.startsWith('data:image/') && x.length < 450000).slice(0, 6), thumbs: (Array.isArray(b.thumbs) ? b.thumbs : []).filter(x => typeof x === 'string' && x.startsWith('data:image/') && x.length < 80000).slice(0, 3), allowUpload: !!b.allowUpload, allowText: !!b.allowText, imageFields: (Array.isArray(b.imageFields) ? b.imageFields : []).slice(0, 10).map(f => ({ label: String(f.label || '').slice(0, 80) })), textFields: (Array.isArray(b.textFields) ? b.textFields : []).slice(0, 10).map(f => ({ label: String(f.label || '').slice(0, 80) })), featured: !!b.featured, priceLabel: String(b.priceLabel || 'JUST'), payLink: String(b.payLink || ''), payButtonId: /^pl_[A-Za-z0-9]+$/.test(String(b.payButtonId || '')) ? String(b.payButtonId) : '', createdAt: b.createdAt || Date.now() };
      const js = JSON.stringify(p);
      if (js.length > 950000) return res.status(400).json({ error: 'Images are too large in total. Remove an image or use smaller photos.' });
      await cmd('HSET', 'products', id, js);
      return res.json(p);
    }
    if (req.method === 'DELETE') {
      await cmd('HDEL', 'products', String(req.query.id));
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
