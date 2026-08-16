// Receives a review from the public form and commits it into site/reviews.json
// marked published:false, so it appears in /admin as an unapproved entry.
// Photos are committed alongside into site/uploads/reviews/.
//
// Required environment variables (set in Netlify → Site configuration → Environment variables).
// Either casing works — the names below are read case-insensitively:
//   ghtoken / GITHUB_TOKEN  — fine-grained personal access token with Contents: read & write
//   github_repo             — "owner/repository", e.g. "angellogan/angels-home-improvements"
//   github_branch           — optional, defaults to "main"

// Netlify keeps environment variable names exactly as typed, and process.env is
// case-sensitive, so look the value up under any spelling of the name.
function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
    const hit = Object.keys(process.env).find(k => k.toLowerCase() === name.toLowerCase());
    if (hit && process.env[hit]) return process.env[hit];
  }
  return "";
}

const TOKEN = () => env("ghtoken", "GITHUB_TOKEN", "gh_token");
const REPO = () => env("github_repo", "GITHUB_REPO", "ghrepo");
const BRANCH = () => env("github_branch", "GITHUB_BRANCH", "ghbranch") || "main";

const API = "https://api.github.com";
const REVIEWS_PATH = "site/reviews.json";
const PHOTO_DIR = "site/uploads/reviews";
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

function gh(token) {
  const repo = REPO();
  const branch = BRANCH();
  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
  return {
    branch,
    async get(path) {
      const res = await fetch(
        `${API}/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
        { headers }
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status} ${await res.text()}`);
      return res.json();
    },
    async put(path, base64Content, message, sha) {
      const res = await fetch(`${API}/repos/${repo}/contents/${encodeURI(path)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ message, content: base64Content, branch, ...(sha ? { sha } : {}) })
      });
      if (!res.ok) throw new Error(`GitHub PUT ${path} → ${res.status} ${await res.text()}`);
      return res.json();
    }
  };
}

const encode = (str) => Buffer.from(str, "utf8").toString("base64");

function slug(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "review";
}

function clean(str, max) {
  return String(str == null ? "" : str).replace(/\s+/g, " ").trim().slice(0, max);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { Allow: "POST" } };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const token = TOKEN();
  if (!token || !REPO()) {
    console.error("submit-review: token or repo environment variable is not set");
    return json(500, { error: "Review submission is not configured yet." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Malformed request." });
  }

  // Honeypot: real people never fill a hidden field. Accept silently so bots
  // see success and do not retry, but write nothing.
  if (clean(payload.website, 200)) return json(200, { ok: true });

  const name = clean(payload.name, 80);
  const town = clean(payload.town, 80);
  const text = clean(payload.review, 2000);
  const rating = Math.max(1, Math.min(5, parseInt(payload.rating, 10) || 5));

  if (!name || !text) return json(400, { error: "Please include your name and a few words about the work." });
  if (text.length < 15) return json(400, { error: "Please add a little more detail to your review." });

  const photos = Array.isArray(payload.photos) ? payload.photos.slice(0, MAX_PHOTOS) : [];
  for (const p of photos) {
    if (!p || typeof p.data !== "string") return json(400, { error: "A photo could not be read. Please try again." });
    if (Buffer.byteLength(p.data, "base64") > MAX_PHOTO_BYTES) {
      return json(413, { error: "One of those photos is too large. Please choose a smaller image." });
    }
  }

  const client = gh(token);
  const stamp = new Date().toISOString();
  const base = `${stamp.slice(0, 10)}-${slug(name)}`;

  try {
    // Commit photos first so reviews.json never points at a file that isn't there.
    const paths = [];
    for (let i = 0; i < photos.length; i++) {
      const ext = /png/i.test(photos[i].type) ? "png" : "jpg";
      const path = `${PHOTO_DIR}/${base}-${i + 1}-${Date.now().toString(36)}.${ext}`;
      await client.put(path, photos[i].data, `Review photo from ${name}`);
      paths.push("/" + path);
    }

    const file = await client.get(REVIEWS_PATH);
    let data = { reviews: [] };
    if (file && file.content) {
      try {
        data = JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) || data;
      } catch {
        console.error("submit-review: reviews.json is not valid JSON — starting a fresh list");
      }
    }
    if (!Array.isArray(data.reviews)) data.reviews = [];

    data.reviews.unshift({
      published: false,
      name,
      town,
      rating,
      text,
      image: paths[0] || "",
      extraImages: paths.slice(1),
      submitted: stamp
    });

    await client.put(
      REVIEWS_PATH,
      encode(JSON.stringify(data, null, 2) + "\n"),
      `New review from ${name} (awaiting approval)`,
      file && file.sha
    );

    return json(200, { ok: true });
  } catch (err) {
    console.error("submit-review failed:", err);
    return json(502, { error: "We could not save your review just now. Please try again in a moment." });
  }
};
