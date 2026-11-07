// Razorpay redirects here (GET or POST). We normalise to a GET page on our site.
module.exports = (req, res) => {
  const src = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  const keep = ['razorpay_payment_id', 'razorpay_payment_button_id', 'razorpay_payment_link_id', 'razorpay_payment_link_status', 'razorpay_signature', 'razorpay_order_id'];
  const qs = new URLSearchParams();
  keep.forEach(k => { if (src[k]) qs.set(k, String(src[k])); });
  res.statusCode = 303;
  res.setHeader('Location', '/thank-you' + (qs.toString() ? '?' + qs.toString() : ''));
  res.end();
};
