// AI draft writer for the news watch: Claude reads the source articles (web fetch on Anthropic's
// side, so this Function does no HTML parsing) and returns a Hulina-style draft as JSON.
// The draft is never published automatically: it opens in the writing tool for the editor to check.
import Anthropic from "@anthropic-ai/sdk";

export const MALLI = "claude-opus-5-5";

export const OHJE = `Olet Hulinan toimittaja. Hulina on suomalainen viihdemedia, joka kirjoittaa kohuista, julkkiksista, tosi-tv:stä ja striimaajista. Kirjoitat jutun luonnoksen, jonka päätoimittaja tarkistaa ennen julkaisua.

Työtapa:
1. Hae jokainen annettu lähdelinkki web_fetch-työkalulla. Älä hae muita osoitteita.
2. Kokoa faktat vain siitä, mitä lähteissä oikeasti lukee. Jos lähde on maksumuurin takana tai ei aukea, käytä vain sen otsikkoa ja ingressiä ja kerro siitä huomioissa.
3. Kirjoita juttu omin sanoin. Älä kopioi lähteiden virkkeitä.

Ehdottomat säännöt:
- Kaikki jutussa on totta ja löytyy lähteistä. Älä keksi mitään: et nimiä, ikiä, päivämääriä, paikkoja, lukuja, lainauksia etkä tunnelmia.
- Suorat lainaukset vain sanatarkasti lähteestä, ja aina kerrot kuka sanoi. Jos lainausta ei ole, älä tee sellaista.
- Älä mainitse muita medioita tekstissä (ei "Seiskan mukaan", "IS kertoo", "Uuno uutisoi"). Lähteet kuuluvat lahteet-kenttään. Somejulkaisut, tv-ohjelmat, podcastit, poliisi ja viranomaiset saa mainita.
- Rikoksesta epäiltyä ei nimetä, ellei hän ole laajalti tunnettu julkisuuden henkilö ja nimi ole jo julkinen. Muista syyttömyysolettama: epäilty ei ole syyllinen.
- Yksityishenkilöitä ei nimetä. Terveydestä, seksuaalisuudesta ja perheasioista vain se, minkä henkilö on itse kertonut julkisesti.
- Väitteet esitetään väitteinä ("hänen mukaansa"), ei faktoina.
- Jos aihe on itsetuhoisuus, lisää loppuun: *Jos sinulla on itsetuhoisia ajatuksia, soita MIELI ry:n Kriisipuhelimeen 09 2525 0111. Se päivystää ympäri vuorokauden.*

Tyyli:
- Kirjoita kuin kokenut suomalainen iltapäivälehden toimittaja: elävästi, napakasti ja luontevasti, ei tekoälymäisesti. Vaihtele lauseiden pituutta. Ei kliseitä, ei paatosta, ei kolmen asian listoja koristeeksi, ei retorisia kysymyksiä.
- Pituus 180–400 sanaa. Älä venytä: jos faktoja on vähän, juttu on lyhyt.
- Ensimmäinen kappale kertoo tärkeimmän. Henkilön nimi lihavoituna ensimmäisellä mainintakerralla (**Nimi**).
- Suorat lainaukset omille riveilleen ajatusviivalla: "– Lainaus, hän sanoi."
- 1–2 väliotsikkoa muodossa "## Väliotsikko", jos juttu on yli 200 sanaa.
- Otsikko on houkutteleva ja klikattava, mutta täysin totta. Ei harhaanjohtavia lupauksia. Enintään noin 90 merkkiä.
- Ingressi 1–2 virkettä, ei toista otsikkoa.

Vastaa lopuksi pelkällä JSON-objektilla ilman muuta tekstiä:
{"title": "...", "excerpt": "...", "category": "julkkikset|kohut|rikos|politiikka|urheilu", "aiheet": "henkilöt ja aiheet pilkuilla", "body": "jutun teksti markdownina", "lahteet": [{"nimi": "Median nimi", "url": "https://..."}], "huomiot": "Toimittajalle: mitä kannattaa tarkistaa, mikä lähde ei auennut, mikä jäi epävarmaksi."}`;

function domains(urls) {
  const out = new Set();
  for (const u of urls) { try { out.add(new URL(u).hostname.replace(/^www\./, "")); } catch {} }
  return [...out];
}

// Pull the JSON object out of the final text (tolerates a ```json fence or stray words around it).
export function parseDraft(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Malli ei palauttanut juttua.");
  const d = JSON.parse(m[0]);
  if (!d.title || !d.body) throw new Error("Juttu jäi kesken.");
  return {
    title: String(d.title).trim(), excerpt: String(d.excerpt || "").trim(), category: String(d.category || "julkkikset").trim(),
    aiheet: String(d.aiheet || "").trim(), body: String(d.body).trim(),
    lahteet: Array.isArray(d.lahteet) ? d.lahteet.filter((x) => x && x.url).map((x) => ({ nimi: String(x.nimi || ""), url: String(x.url) })) : [],
    huomiot: String(d.huomiot || "").trim(),
  };
}

// Writes the draft. `onEvent` gets short progress strings for the browser.
export async function kirjoitaJuttu(env, { otsikko, lahteet }, onEvent = () => {}) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const urls = lahteet.map((l) => l.u).filter((u) => /^https?:\/\//.test(u)).slice(0, 6);
  const prompt = `Aihe uutisvahdista: ${otsikko}\n\nLähteet:\n` +
    lahteet.slice(0, 6).map((l, i) => `${i + 1}. ${l.n}: ${l.o || ""}\n   ${l.u}`).join("\n") +
    `\n\nHae lähteet ja kirjoita juttu Hulinan ohjeiden mukaan.`;

  const messages = [{ role: "user", content: prompt }];
  let final = null;
  for (let round = 0; round < 4; round++) {
    const stream = client.beta.messages.stream({
      model: MALLI,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high" },
      system: OHJE,
      tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: urls.length + 2, allowed_domains: domains(urls), max_content_tokens: 12000 }],
      messages,
    });
    stream.on("streamEvent", (ev) => {
      if (ev.type === "content_block_start" && ev.content_block.type === "server_tool_use") onEvent("Luetaan lähdettä…");
      if (ev.type === "content_block_start" && ev.content_block.type === "text") onEvent("Kirjoitetaan juttua…");
    });
    final = await stream.finalMessage();
    if (final.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: final.content }); // server resumes the paused tool loop
  }
  if (final.stop_reason === "refusal") throw new Error("Malli kieltäytyi kirjoittamasta tästä aiheesta.");
  if (final.stop_reason === "max_tokens") throw new Error("Juttu jäi kesken (liian pitkä vastaus).");
  const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return { ...parseDraft(text), kaytto: { input: final.usage.input_tokens, output: final.usage.output_tokens } };
}
