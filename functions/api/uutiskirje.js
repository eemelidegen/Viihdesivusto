// Newsletter sign-up: adds the address to MailerLite.
// Needs MAILERLITE_API_KEY (Secret) and optionally MAILERLITE_GROUP_ID in Cloudflare Pages settings.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const fields = await readFields(request);
  const email = String(fields.email || "").trim().toLowerCase();

  // Bots fill the hidden "website" field; pretend success and drop it.
  if (fields.website) return done(wantsJson, true);
  if (!EMAIL.test(email) || email.length > 254) {
    return done(wantsJson, false, "Tarkista sähköpostiosoite.", 400);
  }
  if (!env.MAILERLITE_API_KEY) {
    return done(wantsJson, false, "Uutiskirjeen tilaus ei ole vielä käytössä.", 503);
  }

  const body = { email };
  if (env.MAILERLITE_GROUP_ID) body.groups = [env.MAILERLITE_GROUP_ID];
  const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return done(wantsJson, true);
  console.log("MailerLite error", res.status, await res.text().catch(() => ""));
  if (res.status === 422) return done(wantsJson, false, "Tarkista sähköpostiosoite.", 400);
  return done(wantsJson, false, "Tilaus ei onnistunut juuri nyt. Yritä hetken päästä uudelleen.", 502);
}

async function readFields(request) {
  const type = request.headers.get("Content-Type") || "";
  try {
    if (type.includes("application/json")) return await request.json();
    return Object.fromEntries(await request.formData());
  } catch {
    return {};
  }
}

// JSON for the in-page form; a redirect when the browser posted the form without JavaScript.
function done(wantsJson, ok, message = "", status = 200) {
  if (wantsJson) {
    return Response.json({ ok, message }, { status: ok ? 200 : status });
  }
  return new Response(null, { status: 303, headers: { Location: ok ? "/uutiskirje/kiitos/" : "/uutiskirje/?virhe=1" } });
}
