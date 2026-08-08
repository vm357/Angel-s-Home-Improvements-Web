# Admin access — setup handoff

Lets Angel add gallery photos from his phone at `angelshomeimprovementsinc.com/admin`.

## What's already built

| File | Purpose |
|---|---|
| `admin/index.html` | The admin panel (Decap CMS, loaded from CDN) |
| `admin/config.yml` | Defines what he can edit: gallery photos, reviews |
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

## How he uses it

Opens `angelshomeimprovementsinc.com/admin` on his phone, logs in, taps Project Gallery → Photos → Add Photo. Picks a photo from his camera roll, types a caption, picks a category, hits Publish. Live in under a minute.

Worth adding the admin URL to his phone home screen — it behaves like an app.

## Notes

- **Photo size.** Handled automatically. Netlify's image CDN resizes and re-encodes on request, so a 6 MB phone photo is served to visitors as a ~120 KB webp. Angel uploads straight from his camera roll with no thinking required. The transform only activates on the live host — in the design tool the originals are used as-is.
- **The "Add or replace photos" button** on the public gallery page only saves to the visitor's own browser. Leave it until `/admin` is confirmed working — it's the only upload path until then — but remove it before handing the site to Angel, or he'll think he's published something when he hasn't.
- **Reviews** are defined in `config.yml` but the reviews page still has its cards hardcoded. Second step, once the CMS is confirmed working.
- **Forms are not wired.** The homepage and Contact forms point at `formspree.io/f/YOUR_ID`; the reviews form has no endpoint. Submissions go nowhere and fail silently. Set these before taking the site live.
