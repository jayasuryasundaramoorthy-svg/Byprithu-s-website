const U = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function cmd(...a) {
  const r = await fetch(U, { method: 'POST', headers: { Authorization: 'Bearer ' + T }, body: JSON.stringify(a) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function all(key) {
  const a = (await cmd('HGETALL', key)) || [];
  const out = [];
  for (let i = 0; i < a.length; i += 2) out.push(JSON.parse(a[i + 1]));
  return out;
}
const isAdmin = req => !!process.env.ADMIN_PASSWORD && req.headers['x-admin-password'] === process.env.ADMIN_PASSWORD;
const rid = () => Math.random().toString(36).slice(2, 8);
module.exports = { cmd, all, isAdmin, rid };
