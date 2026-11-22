# Deploying FIREFLY (P1 Production Edition) to Vercel

FIREFLY P1 is built to run entirely client-side with zero external database dependencies (using IndexedDB/localStorage, direct UPI deep-linking, and local camera QR gate scanning).

---

## Method 1: One-Command Terminal Deployment (Fastest)

Open your terminal, navigate to the `FIREFLY` directory, and run:

```bash
cd FIREFLY
npx vercel
```

1. **Log in / Authorize:** Follow the quick browser login prompt.
2. **Project Setup Prompts:**
   - **Set up and deploy?** `yes` (hit Enter)
   - **Which scope?** Choose your Vercel account
   - **Link to existing project?** `no`
   - **Project name:** `firefly` (or your preferred name)
   - **Directory:** `./` (hit Enter)
   - **Want to modify settings?** `no` (root `npm run build` is pre-configured for `@firefly/p1`)
3. **Deploy to Production:**
   ```bash
   npx vercel --prod
   ```

---

## Method 2: GitHub / Vercel Web Dashboard

If your repository is on GitHub:

1. Push your latest code:
   ```bash
   git push origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)** and click **Import** next to your repository.
3. Configure Project Settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./` (or `apps/p1`)
   - **Build Command:** `npm run build`
   - **Output Directory:** Default (`.next`)
4. Add Environment Variables (**Settings → Environment Variables**):
   - `NEXT_PUBLIC_ADMIN_PIN`: `CF2026`
5. Click **Deploy**.

---

## Production URLs & Features
- **Public Events Dashboard:** `https://your-app.vercel.app/`
- **Secret Organiser Admin Panel:** Triple-tap the FIREFLY logo on the top navbar (Passcode: `CF2026`)
- **Direct UPI Mobile Deep Links:** Works natively on iOS & Android devices.
- **Offline Camera Gate Scanner:** Works over HTTPS in all mobile browsers.

