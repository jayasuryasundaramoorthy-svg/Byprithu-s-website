# Deploy on Vercel
1. Upload this folder to a GitHub repo (or run `vercel` in this folder).
2. Vercel dashboard > your project > Storage / Marketplace > add **Upstash Redis** and connect it to the project
   (this adds KV_REST_API_URL and KV_REST_API_TOKEN automatically).
3. Settings > Environment Variables > add ADMIN_PASSWORD = your secret password.
4. Redeploy. Admin: https://YOUR-SITE.vercel.app/admin  Product links: https://YOUR-SITE.vercel.app/p/xxxxxx
