const { all } = require('./_db');
module.exports = async (req, res) => {
  try {
    const phone = String(req.query.phone || '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    const list = (await all('orders')).filter(o => o.status !== 'pending' && String(o.phone || '').replace(/\D/g, '').slice(-10) === phone);
    list.sort((a, b) => b.createdAt - a.createdAt);
    // only share tracking info, never address or uploaded images
    res.json(list.slice(0, 20).map(o => ({ ref: String(o.id).slice(0, 6).toUpperCase(), productName: o.productName, createdAt: o.createdAt, stages: o.stages || {}, payment: o.payment || null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
