# Landing page for rebeccaesquivel.com

A tiny, dependency-free static page that lets someone who typos the domain
(or lands on the bare `rebeccaesquivel.com` / `rebecaesquivel.com`) pick
between the two apps:

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
5. Go to the new project's **Settings → Domains** and add
   `rebeccaesquivel.com` (and `www.rebeccaesquivel.com` if you want that
   covered too).

## Point the domain at it from Hover

Vercel will show you the exact records to add once you add the domain in
step 5 above — typically:

- `A` record for the apex (`@`) → `76.76.21.21`
- `CNAME` for `www` → `cname.vercel-dns.com`

In Hover, go to the domain's **DNS** tab and add/update those records to
match what Vercel shows. DNS changes can take up to a few hours to
propagate.

If `rebecaesquivel.com` (single c) is the same domain you already use for
`verbmate.` and `englisharena.` subdomains, you can add this landing page
to the apex/root of that domain the same way, alongside the existing
subdomain records — just don't touch the existing `verbmate` and
`englisharena` CNAME records.
