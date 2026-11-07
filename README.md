# Deploy on Vercel
1. Upload this folder to a GitHub repo (or run `vercel` in this folder).
2. Vercel dashboard > your project > Storage / Marketplace > add **Upstash Redis** and connect it to the project
   (this adds KV_REST_API_URL and KV_REST_API_TOKEN automatically).
3. Settings > Environment Variables > add ADMIN_PASSWORD = your secret password.
4. Redeploy. Admin: https://YOUR-SITE.vercel.app/admin  Product links: https://YOUR-SITE.vercel.app/p/xxxxxx

# Razorpay setup (Payment Button)
1. Razorpay Dashboard > Payment Buttons > create a button per product. Copy its HTML code into the product in Admin.
2. On the button: Custom Message and Redirect to a URL > tick Redirect URL > paste https://YOUR-SITE.vercel.app/thanks > Save.
3. OPTIONAL but recommended (stops fake confirmations): add env vars RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel, then redeploy.
Orders are counted only after the customer is redirected back after paying. Others appear under "Unpaid / not redirected" in Admin > Orders.
