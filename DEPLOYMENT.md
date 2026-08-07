# Deployment

English Arena is a Vite + React single-page app hosted on **Vercel**, with a
**Firebase Realtime Database** backing the live multiplayer rooms. There is no
server of our own and no Firebase Auth — the client talks straight to the
Realtime Database.

## Build

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # production build → dist/
npm run preview  # serve the built dist/ locally
```

Vercel runs `npm run build` and serves `dist/` automatically on every push;
`main` is the Production deployment.

## Environment variables (Vercel → Settings → Environment Variables)

Firebase config is read from env vars at build time (see `src/lib/firebase.js`):

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (project's) |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL (required) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |

These live on the Vercel project, so they are independent of the site's domain.

## Custom domain (subdomain)

We serve English Arena from its own **subdomain** rather than a subpath, so it
stays a self-contained Vercel project. Example: `englisharena.rebecaesquivel.com`.

**No application code changes are needed to move domains** because:

- There is **no Firebase Auth**, so no "authorized domains" list to update.
- The join **QR code / link is built from `window.location.origin`**
  (`src/components/HostView.jsx`), so it automatically reflects whatever domain
  the app is served from; joining reads `?join=<code>` (`src/App.jsx`).
- No domains or absolute URLs are hardcoded in `src/`.

### 1. Vercel (English Arena project → Settings → Domains)

1. In the **"Search any domain"** field at the top, type the subdomain
   (e.g. `englisharena.rebecaesquivel.com`) and press **Enter**, then click
   **Add** on the result. (The newer UI has no separate "Add" button — the
   search field is the entry point. "Add Existing" is only for domains already
   in the Vercel account; "Buy" purchases a new one.)
2. Set **Connect to an environment → Production** and **Save**.
3. Vercel shows the DNS record to create — for a subdomain this is a **CNAME**
   with value `cname.vercel-dns.com` (use the exact value Vercel displays).

### 2. DNS at the registrar (example: Hover)

1. Sign in at hover.com → open the domain → **DNS** tab → **Add a Record**:
   - **Type:** `CNAME`
   - **Hostname:** `englisharena`  ← just the label, not the full domain
     (Hover appends the base domain automatically)
   - **Target host / Value:** `cname.vercel-dns.com`
   - **TTL:** default
2. **Save.**

Notes:
- Don't put the full `englisharena.rebecaesquivel.com` in Hostname, or you get
  `englisharena.rebecaesquivel.com.rebecaesquivel.com`.
- Hover (and DNS generally) can't `CNAME` the root/apex `@`; subdomains are
  fine, so leave the apex domain untouched.

### 3. Verify

- Vercel flips the domain from **Invalid** to **Valid Configuration** once DNS
  propagates (usually minutes) and issues HTTPS automatically.
- Open `https://englisharena.rebecaesquivel.com`, host a game, and scan the join
  QR with a phone — landing in the lobby confirms Firebase works under the new
  host.

Repeat the same process on any other project (e.g. a `verbmate` subdomain); each
Vercel project owns its own subdomain independently.
