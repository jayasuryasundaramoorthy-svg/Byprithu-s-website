const { cmd, all, isAdmin, rid } = require('./_db');
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const raw = await cmd('HGET', 'products', String(b.productId));
      if (!raw) return res.status(404).json({ error: 'Product not found' });
      const p = JSON.parse(raw);
      const need = ['name', 'address', 'city', 'state', 'pincode', 'phone'];
      if (need.some(k => !String(b[k] || '').trim())) return res.status(400).json({ error: 'Please fill all required fields' });
      if (!/^\d{6}$/.test(b.pincode)) return res.status(400).json({ error: 'Invalid pincode' });
      if (p.allowUpload && !b.image) return res.status(400).json({ error: 'Please upload your image' });
      if (String(b.image || '').length > 700000) return res.status(400).json({ error: 'Image too large' });
      const id = rid() + Date.now().toString(36);
      const o = { id, productId: p.id, productName: p.name, price: p.price, createdAt: Date.now(), image: String(b.image || '') };
      need.concat('notes').forEach(k => (o[k] = String(b[k] || '').trim()));
      await cmd('HSET', 'orders', id, JSON.stringify(o));
      return res.json({ ok: true, payLink: p.payLink });
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin password' });
    if (req.method === 'GET') {
      const list = await all('orders');
      list.sort((a, b) => b.createdAt - a.createdAt);
      return res.json(list);
    }
    if (req.method === 'DELETE') {
      await cmd('HDEL', 'orders', String(req.query.id));
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
