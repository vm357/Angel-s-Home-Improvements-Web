# Admin access — setup handoff

Lets Angel add gallery photos from his phone at `angelshomeimprovementsinc.com/admin`.

## What's already built

| File | Purpose |
|---|---|
| `admin/index.html` | The admin panel (Decap CMS, loaded from CDN) |
| `admin/config.yml` | Defines what he can edit: gallery photos, reviews |
| `netlify/functions/submit-review.js` | Receives public review submissions, files them for approval |
| `site/reviews.json` | The reviews — function writes here, CMS approves, the page reads it |
| `netlify.toml` | Clean URLs (`/project-gallery`, not `/project-gallery.dc.html`) + admin noindex |
| `site/gallery.json` | The gallery contents — CMS writes here, the page reads it |
| `project-gallery.dc.html` | Now loads `site/gallery.json` on page load |

The gallery page falls back to its built-in list if `gallery.json` is missing, so nothing breaks before the CMS is connected.

## Setup steps (one time, ~20 minutes)

1. **Put the site in a GitHub repo.** Any private repo is fine. Note the branch name — `config.yml` currently says `main`; change it if yours is `master`.
2. **Deploy to Netlify.** New site → import from GitHub → pick the repo. Leave the build command empty; `netlify.toml` sets the publish directory.
3. **Enable Identity.** Netlify dashboard → Site configuration → Identity → Enable.
4. **Set registration to Invite only.** Identity → Registration preferences. Otherwise anyone can sign up as an admin.
5. **Enable Git Gateway.** Identity → Services → Git Gateway → Enable. This is what lets the CMS commit to the repo.
6. **Invite Angel.** Identity → Invite users → his email. He gets a link, sets a password, and he's in.
7. **Point the domain at Netlify** (Domain management → Add custom domain).

## Test it yourself first

At step 6, invite **your own** email instead of Angel's. Then:

1. Open `<site>.netlify.app/admin`, log in.
2. Project Gallery → Photos → Add Photo. Pick any photo, caption it, choose a category, **Publish**.
3. Watch Netlify's Deploys tab — a commit appears, site rebuilds in ~30s.
4. Reload `/project-gallery`. The new tile should be there, at the bottom.
5. Check the repo: the photo is a real file in `site/uploads/`, and `site/gallery.json` has a new row.

If all five hold, invite Angel. If the photo publishes but never appears on the page, tell me — that's `gallery.json` not being read, and it's a fix on my end, not a setup problem.

## How he uses it

Opens `angelshomeimprovementsinc.com/admin` on his phone, logs in, taps Project Gallery → Photos → Add Photo. Picks a photo from his camera roll, types a caption, picks a category, hits Publish. Live in under a minute.

Worth adding the admin URL to his phone home screen — it behaves like an app.

## Notes

- **Photo size.** Handled automatically. Netlify's image CDN resizes and re-encodes on request, so a 6 MB phone photo is served to visitors as a ~120 KB webp. Angel uploads straight from his camera roll with no thinking required. The transform only activates on the live host — in the design tool the originals are used as-is.
- **The "Add or replace photos" button** on the public gallery page only saves to the visitor's own browser. Leave it until `/admin` is confirmed working — it's the only upload path until then — but remove it before handing the site to Angel, or he'll think he's published something when he hasn't.
- **Forms.** The two lead forms (homepage "Get a Free Quote" and Contact) post to `https://formslist.com/f/WtS3YbR5Y3D8`. The reviews form does not — it goes through the approval queue below. Send a test submission from each after the domain goes live.

## Reviews approval queue

A visitor's review, photos included, lands in `/admin` with **Published** switched off. Angel reads it, ticks Published to put it on the site, or deletes the entry to deny it. Nothing appears publicly until he acts.

How it works: the form posts to a small Netlify function (`netlify/functions/submit-review.js`) that commits the review into `site/reviews.json` and the photos into `site/uploads/reviews/`. The reviews page reads `reviews.json` on load and renders only entries with `published: true`. Until the first review is approved the page shows a short invitation line instead of cards — the placeholder "Client name" samples are gone.

### One-time setup (~10 minutes)

1. **Create a GitHub token.** GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → this site's repo
   - Permissions → Repository permissions → **Contents: Read and write** (nothing else)
   - Expiration: 1 year, and set a calendar reminder — the form stops saving when it expires
   - Copy the token; GitHub shows it once
2. **Add three environment variables.** Netlify → Site configuration → Environment variables → Add a variable:
   - `ghtoken` — the token from step 1
   - `github_repo` — `owner/repository`, exactly as it appears in the GitHub URL
   - `github_branch` — `main` (or `master` if that's yours)

   Casing doesn't matter — the function looks these up case-insensitively, so `GITHUB_TOKEN` works too.
3. **Redeploy.** Netlify → Deploys → Trigger deploy → Clear cache and deploy site. Environment variables only reach the function on a fresh build.
4. **Test it.** Open `/reviews`, submit a review with a photo. Then:
   - Netlify → Functions → `submit-review` should log a call with no error
   - The repo should show a new commit and the photo in `site/uploads/reviews/`
   - `/admin` → Customer Reviews → Published Reviews should list it with Published off
   - Tick Published → Publish → the review appears on `/reviews` in about a minute

If the form returns "Review submission is not configured yet," the environment variables aren't reaching the function — recheck step 3.

### Notes on the queue

- **Spam.** A hidden honeypot field catches ordinary bots, and the function caps length, rating, and photo count (3 max, resized in the browser before sending). If spam ever does get through, it lands unpublished in `/admin` — visible to Angel, never to visitors. Turn on Netlify's bot filtering if volume becomes a nuisance.
- **The token is the sensitive piece.** It can write to the repo. It lives only in Netlify's environment variables, never in the code or the repo. If it leaks, revoke it in GitHub and generate a new one.
- **Each submission is a commit,** so each one triggers a rebuild. Fine at a contractor's volume; if reviews ever arrive in bursts, the deploys just queue.
