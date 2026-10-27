// Image search helper: fetches a freely licensed photo from Wikimedia Commons, Flickr or Finna
// so the writing and social-image tools can use it (browsers can't read these across origins).
const HOSTS = /^(upload\.wikimedia\.org|thumb\.wikimedia\.org|live\.staticflickr\.com|farm\d+\.staticflickr\.com|api\.finna\.fi|www\.finna\.fi|cdn\.stocksnap\.io|images\.rawpixel\.com|pd\.w\.org|images\.nappy\.co)$/;
const MAX_BYTES = 15 * 1024 * 1024;
const fail = (virhe, status) => Response.json({ virhe }, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet({ request }) {
  let url;
  try { url = new URL(new URL(request.url).searchParams.get("url") || ""); } catch { return fail("Virheellinen osoite.", 400); }
  if (url.protocol !== "https:" || !HOSTS.test(url.hostname)) return fail("Kuvaa voi hakea vain kuvahaun lähteistä.", 400);

  const res = await fetch(url, { headers: { "User-Agent": "HulinaKuvahaku/1.0 (https://hulina.net)" } });
  const type = res.headers.get("Content-Type") || "";
  if (!res.ok || !type.startsWith("image/")) return fail("Kuvaa ei saatu haettua. Kokeile hetken päästä uudelleen.", 502);
  if (Number(res.headers.get("Content-Length") || 0) > MAX_BYTES) return fail("Kuva on liian suuri.", 413);
  const body = await res.arrayBuffer();
  if (body.byteLength > MAX_BYTES) return fail("Kuva on liian suuri.", 413);
  return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}
