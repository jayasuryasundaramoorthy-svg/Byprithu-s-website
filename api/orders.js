const { cmd, all, isAdmin, rid } = require('./_db');
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const id = rid() + Date.now().toString(36);
      // Admin: add an order manually (phone + item) so it can be tracked
      if (req.query.manual) {
        if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin password' });
        const phone = String(b.phone || '').replace(/\D/g, '').slice(-10);
        if (phone.length !== 10) return res.status(400).json({ error: 'Enter a 10-digit phone number' });
        const o = { id, productId: '', productName: String(b.productName || 'Order'), price: '', name: String(b.name || ''), phone, address: '', city: '', state: '', pincode: '', notes: '', images: [], texts: [], createdAt: Date.now(), status: 'confirmed', stages: { ordered: { date: today() } } };
        await cmd('HSET', 'orders', id, JSON.stringify(o));
        return res.json(o);
      }
      const raw = await cmd('HGET', 'products', String(b.productId));
      if (!raw) return res.status(404).json({ error: 'Product not found' });
      const p = JSON.parse(raw);
      const need = ['name', 'address', 'city', 'state', 'pincode', 'phone'];
      if (need.some(k => !String(b[k] || '').trim())) return res.status(400).json({ error: 'Please fill all required fields' });
      if (!/^\d{6}$/.test(b.pincode)) return res.status(400).json({ error: 'Invalid pincode' });
      const images = (Array.isArray(b.images) ? b.images : []).slice(0, 10).map(i => ({ label: String(i.label || ''), data: String(i.data || '') }));
      const texts = (Array.isArray(b.texts) ? b.texts : []).slice(0, 10).map(t => ({ label: String(t.label || ''), value: String(t.value || '').slice(0, 500) }));
      const imgReq = p.allowUpload ? ((p.imageFields && p.imageFields.length) || 1) : 0;
      const txtReq = p.allowText ? (p.textFields || []).length : 0;
      if (images.length < imgReq || images.slice(0, imgReq).some(i => !i.data)) return res.status(400).json({ error: 'Please upload all required images' });
      if (texts.length < txtReq || texts.slice(0, txtReq).some(t => !t.value.trim())) return res.status(400).json({ error: 'Please fill all required text fields' });
      if (images.reduce((n, i) => n + i.data.length, 0) > 800000) return res.status(400).json({ error: 'Images are too large. Please use smaller images.' });
      const o = { id, productId: p.id, productName: p.name, price: p.price, createdAt: Date.now(), status: 'pending', images: images.slice(0, imgReq), texts: texts.slice(0, txtReq), stages: { ordered: { date: today() } } };
      need.concat('notes').forEach(k => (o[k] = String(b[k] || '').trim()));
      await cmd('HSET', 'orders', id, JSON.stringify(o));
      return res.json({ ok: true, id, ref: id.slice(0, 6).toUpperCase(), payLink: p.payLink || '', payButtonId: p.payButtonId || '' });
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin password' });
    if (req.method === 'GET') {
      const list = await all('orders');
      list.sort((a, b) => b.createdAt - a.createdAt);
      return res.json(list);
    }
    if (req.method === 'PUT') { // update tracking stages
      const { id, stages, payment, confirm } = req.body || {};
      const raw = await cmd('HGET', 'orders', String(id));
      if (!raw) return res.status(404).json({ error: 'Order not found' });
      const o = JSON.parse(raw);
      if (confirm) { o.status = 'confirmed'; o.paid = { manual: true, at: Date.now() }; }
      if (stages !== undefined) {
        const ok = ['ordered', 'shipped', 'intransit', 'delivered', 'reattempt', 'return'];
        o.stages = {};
        ok.forEach(k => { const s = (stages || {})[k]; if (s && /^\d{4}-\d{2}-\d{2}$/.test(s.date || '')) o.stages[k] = { date: s.date, note: String(s.note || '').slice(0, 300) }; });
      }
      if (payment !== undefined) {
        const mode = ['prepaid', 'cod'].includes(payment.mode) ? payment.mode : '';
        const total = Math.max(0, Number(payment.total) || 0);
        if (!mode) o.payment = null;
        else if (mode === 'prepaid') o.payment = { mode, total, advance: total, cod: 0 };
        else {
          const advance = Math.min(total, Math.max(0, Number(payment.advance) || 0));
          o.payment = { mode, total, advance, cod: total - advance };
        }
      }
      await cmd('HSET', 'orders', o.id, JSON.stringify(o));
      return res.json(o);
    }
    if (req.method === 'DELETE') {
      await cmd('HDEL', 'orders', String(req.query.id));
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: e.message }); }
};
