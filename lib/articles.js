// Reading and writing articles in the GitHub repository for the writing tool
// (/admin/kirjoita/). Each publish or delete is a single commit, so the site
// rebuilds once with the story and its image together.
export const ARTICLE_DIR = "src/artikkelit";
export const UPLOAD_DIR = "src/assets/img/uploads";
const FIELDS = ["title", "excerpt", "date", "category", "aiheet", "author", "image", "imageAlt", "imageCredit", "nosto", "kiire", "draft"];

// --- Front matter ------------------------------------------------------------

// Strings are written JSON-quoted, which is valid YAML and round-trips safely.
export function toMarkdown(fields, body) {
  const lines = ["---"];
  for (const key of FIELDS) {
    const v = fields[key];
    if (v === undefined || v === null || v === "" || v === false) continue;
    lines.push(`${key}: ${typeof v === "boolean" ? v : JSON.stringify(String(v))}`);
  }
  lines.push("---", "", String(body || "").replace(/\r\n/g, "\n").trim(), "");
  return lines.join("\n");
}

// Reads the simple "key: value" front matter this site uses (also Decap's output).
export function fromMarkdown(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fields: {}, body: text };
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === "true" || v === "false") v = v === "true";
    else if (v.startsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
    else if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
    fields[kv[1]] = v;
  }
  return { fields, body: m[2].replace(/^\n+/, "") };
}

export function slugify(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "") || "juttu";
}

// Only plain article file names inside the article folder.
export const validFile = (name) => typeof name === "string" && /^[a-z0-9-]+\.md$/.test(name);

// --- GitHub ------------------------------------------------------------------

export function github(token) {
  const call = async (method, path, body) => {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "hulina-cms", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${method} ${path}: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  };
  return { get: (p) => call("GET", p), post: (p, b) => call("POST", p, b), patch: (p, b) => call("PATCH", p, b) };
}

const b64decodeUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

export async function listArticles(gh, repo, branch, limit = 25) {
  let dir;
  try { dir = await gh.get(`/repos/${repo}/contents/${ARTICLE_DIR}?ref=${branch}`); }
  catch (e) { if (e.status === 404) return []; throw e; }
  const files = dir.filter((f) => f.type === "file" && validFile(f.name)).map((f) => f.name).sort().reverse().slice(0, limit);
  return Promise.all(files.map(async (name) => {
    const { fields } = await readArticle(gh, repo, branch, name);
    return { file: name, title: fields.title || name, date: fields.date || "", category: fields.category || "", draft: !!fields.draft, image: fields.image || "" };
  }));
}

export async function readArticle(gh, repo, branch, name) {
  const file = await gh.get(`/repos/${repo}/contents/${ARTICLE_DIR}/${name}?ref=${branch}`);
  return fromMarkdown(b64decodeUtf8(file.content));
}

// One commit with any number of changes: {path, content (utf-8) | base64 | delete}.
export async function commit(gh, repo, branch, message, changes) {
  for (let attempt = 0; ; attempt++) {
    const ref = await gh.get(`/repos/${repo}/git/ref/heads/${branch}`);
    const parent = await gh.get(`/repos/${repo}/git/commits/${ref.object.sha}`);
    const tree = [];
    for (const c of changes) {
      if (c.delete) tree.push({ path: c.path, mode: "100644", type: "blob", sha: null });
      else if (c.base64) {
        const blob = await gh.post(`/repos/${repo}/git/blobs`, { content: c.base64, encoding: "base64" });
        tree.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
      } else tree.push({ path: c.path, mode: "100644", type: "blob", content: c.content });
    }
    const newTree = await gh.post(`/repos/${repo}/git/trees`, { base_tree: parent.tree.sha, tree });
    const created = await gh.post(`/repos/${repo}/git/commits`, { message, tree: newTree.sha, parents: [ref.object.sha] });
    try {
      await gh.patch(`/repos/${repo}/git/refs/heads/${branch}`, { sha: created.sha });
      return created.sha;
    } catch (e) {
      // Someone else pushed in between: rebuild the commit on top of theirs once.
      if (e.status === 422 && attempt === 0) continue;
      throw e;
    }
  }
}
