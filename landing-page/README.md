# Landing page for the rebecaesquivel.com apex

A tiny, dependency-free static page that lets someone who lands on the bare
`rebecaesquivel.com` (no subdomain) pick between the two apps:

- VerbMate → https://verbmate.rebecaesquivel.com
- English Arena → https://englisharena.rebecaesquivel.com

It's a single `index.html` with no build step, so it can be deployed as its
own Vercel project independent of the English Arena app in this repo.

## Deploy on Vercel

1. In the Vercel dashboard, click **Add New… → Project**.
2. Import this GitHub repo, but set **Root Directory** to `landing-page`.
3. Framework preset: **Other**. Leave the build command empty and the
   output directory as `.` — it's plain static HTML.
4. Deploy. You'll get a `*.vercel.app` URL to confirm it works.
5. Go to the new project's **Settings → Domains** and add the apex domain
   `rebecaesquivel.com` (and `www.rebecaesquivel.com` if you want that
   covered too).

## Point the domain at it from Hover

Vercel will show you the exact records to add once you add the domain in
step 5 above — typically:

- `A` record for the apex (`@`) → `76.76.21.21`
- `CNAME` for `www` → `cname.vercel-dns.com`

In Hover, go to the domain's **DNS** tab and add/update those records.
This only changes the root (`@`) record — leave the existing `verbmate`
and `englisharena` CNAME records alone, since those are what keep the two
subdomains working. DNS changes can take up to a few hours to propagate.
