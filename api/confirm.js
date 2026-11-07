const { cmd } = require('./_db');
const last10 = s => String(s || '').replace(/\D/g, '').slice(-10);
// Marks a pending order as confirmed ONLY when the customer is redirected back after paying.
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    const { orderId, pid } = req.body || {};
    const raw = await cmd('HGET', 'orders', String(orderId || ''));
    if (!raw) return res.status(404).json({ error: 'Order not found (it may have been deleted).' });
    const o = JSON.parse(raw);
    const ref = String(o.id).slice(0, 6).toUpperCase();
    if (o.status !== 'pending') return res.json({ ok: true, ref });
    const KID = process.env.RAZORPAY_KEY_ID, KSEC = process.env.RAZORPAY_KEY_SECRET;
    const auth = KID && KSEC ? { Authorization: 'Basic ' + Buffer.from(KID + ':' + KSEC).toString('base64') } : null;
    let payId = /^pay_[A-Za-z0-9]+$/.test(String(pid || '')) ? String(pid) : '';
    let verified = false;
    if (auth) { // strict mode: ask Razorpay if the payment really succeeded
      const okStatus = p => ['captured', 'authorized'].includes(p.status);
      if (!payId) {
        // Razorpay did not send a payment id back: find the customer's recent payment by phone number
        const from = Math.floor(o.createdAt / 1000) - 120;
        const r = await fetch('https://api.razorpay.com/v1/payments?count=50&from=' + from, { headers: auth });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(400).json({ error: 'Razorpay rejected the API keys: ' + ((j.error && j.error.description) || r.status) + '. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test vs live must match your button).' });
        for (const p of (j.items || [])) {
          if (okStatus(p) && last10(p.contact) === last10(o.phone) && !(await cmd('HGET', 'paidids', p.id))) { payId = p.id; break; }
        }
        if (!payId) return res.status(400).json({ error: 'We could not find your payment yet. If money was deducted, we will match it shortly.' });
      }
      const used = await cmd('HGET', 'paidids', payId);
      if (used && used !== o.id) return res.status(409).json({ error: 'This payment is already linked to another order.' });
      const r = await fetch('https://api.razorpay.com/v1/payments/' + payId, { headers: auth });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(400).json({ error: 'Razorpay could not find this payment: ' + ((p.error && p.error.description) || r.status) + '. Check that your API keys are the same mode (test/live) as your payment button.' });
      if (!okStatus(p)) return res.status(400).json({ error: 'Payment status is "' + p.status + '", not successful.' });
      verified = true;
    } else if (payId) {
      const used = await cmd('HGET', 'paidids', payId);
      if (used && used !== o.id) return res.status(409).json({ error: 'This payment is already linked to another order.' });
    }
    o.status = 'confirmed';
    o.paid = { pid: payId, at: Date.now(), verified };
    await cmd('HSET', 'orders', o.id, JSON.stringify(o));
    if (payId) await cmd('HSET', 'paidids', payId, o.id);
    res.json({ ok: true, ref, pid: payId });
  } catch (e) { res.status(500).json({ error: 'Server error: ' + e.message }); }
};
