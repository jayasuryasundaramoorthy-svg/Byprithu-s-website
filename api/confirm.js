const { cmd } = require('./_db');
// Marks a pending order as confirmed ONLY when the customer is redirected back after paying.
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { orderId, pid } = req.body || {};
    const raw = await cmd('HGET', 'orders', String(orderId || ''));
    if (!raw) return res.status(404).json({ error: 'Order not found.' });
    const o = JSON.parse(raw);
    const ref = String(o.id).slice(0, 6).toUpperCase();
    if (o.status !== 'pending') return res.json({ ok: true, ref });
    const KID = process.env.RAZORPAY_KEY_ID, KSEC = process.env.RAZORPAY_KEY_SECRET;
    const payId = /^pay_[A-Za-z0-9]+$/.test(String(pid || '')) ? String(pid) : '';
    let verified = false;
    if (payId) {
      const used = await cmd('HGET', 'paidids', payId);
      if (used && used !== o.id) return res.status(409).json({ error: 'This payment is already linked to another order.' });
    }
    if (KID && KSEC) { // strict mode: ask Razorpay if the payment really succeeded
      if (!payId) return res.status(400).json({ error: 'Payment could not be verified.' });
      const r = await fetch('https://api.razorpay.com/v1/payments/' + payId, { headers: { Authorization: 'Basic ' + Buffer.from(KID + ':' + KSEC).toString('base64') } });
      const p = await r.json().catch(() => ({}));
      if (!r.ok || !['captured', 'authorized'].includes(p.status)) return res.status(400).json({ error: 'Payment could not be verified.' });
      verified = true;
    }
    o.status = 'confirmed';
    o.paid = { pid: payId, at: Date.now(), verified };
    await cmd('HSET', 'orders', o.id, JSON.stringify(o));
    if (payId) await cmd('HSET', 'paidids', payId, o.id);
    res.json({ ok: true, ref });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
