# Valokeila – viihdeuutissivusto

Nopea, halpa ylläpitää ja hakukoneystävällinen viihdeuutismedia. Rakennettu [Eleventyllä](https://www.11ty.dev/): jutut ovat Markdown-tiedostoja, joista syntyy valmiit HTML-sivut. Tietokantaa tai palvelinta ei tarvita.

## Mitä sivustolla on

- Etusivu: iso pääjuttu ja juttuvirta (kaksi rinnakkain, joka kolmas leveänä); sivupalkissa välilehdet "Suositut jutut" ja "Tuoreimmat jutut", uutiskirje ja mainospaikka
- Kategoriasivut: Julkkikset ja Kohut
- Artikkelisivu: lukuaika, jakonapit, aiheeseen liittyvät jutut, Googlen NewsArticle-merkintä
- Sivukartta (`/sitemap.xml`), `robots.txt`, 404-sivu
- Tietoa meistä / julkaisutiedot ja tietosuojaselosteen pohja
- Toimitustyökalu selaimessa: `/admin/` (Decap CMS)
- Tumma tila ja mobiilinäkymä

## Käynnistys omalla koneella

```
npm install
npm start        # avaa http://localhost:8080
npm run build    # valmis sivusto kansioon _site/
```

## Uuden jutun kirjoittaminen

**Selaimessa:** avaa `/admin/`, kirjaudu ja paina "Uusi artikkeli".

**Tiedostona:** lisää `src/artikkelit/`-kansioon tiedosto, esim. `2026-10-05-otsikko.md`:

```markdown
---
title: Otsikko
excerpt: Ingressi, 1–2 lausetta.
date: 2026-10-05T09:00:00+03:00
category: julkkikset      # julkkikset | kohut
author: Nimi
image: /assets/img/uploads/kuva.jpg   # valinnainen
imageAlt: Kuvan kuvaus
imageCredit: Kuvaaja / lähde
nosto: true               # valinnainen: näkyy "Suositut jutut" -listassa ja Luetuimmat-sivulla
draft: true               # valinnainen: ei julkaista
---
Jutun teksti tähän.
```

Kategoriat, sivuston nimi ja yhteystiedot muutetaan tiedostossa `src/_data/site.json`, värit `src/assets/css/style.css`:n alussa.

## Julkaiseminen verkkoon

1. Vie koodi GitHubiin.
2. Liitä repo ilmaiseen hostingiin: **Netlify** tai **Cloudflare Pages** (build-komento `npm run build`, julkaisukansio `_site`). Jokainen muutos julkaistaan automaattisesti.
3. Osta oma verkkotunnus (esim. `.fi` n. 10–20 €/v) ja liitä se hostingiin.
4. Päivitä `url` tiedostoon `src/_data/site.json`.
5. Ota `/admin/`-kirjautuminen käyttöön (alla).

## Somekuvat (/admin/somekuva/)

Työkalu tekee juttujen mainoskuvat someen: valitse kuva, kirjoita otsikko (korosta sanoja tähdillä, `*näin*`), valitse koko ja lataa. Toimii myös puhelimella, jossa kuvan voi tallentaa suoraan kuviin.

Ominaisuudet: yksi tai kaksi kuvaa (rinnakkain/päällekkäin), kuvan siirto vetämällä ja zoomaus nipistämällä tai hiiren rullalla, kirkkaus/kontrasti/mustavalko, peilaus, yläotsikkotarra, kolme fonttia, isot kirjaimet, tekstin koko, sijainti ja tasaus, korostus värinä/laatikkona/alleviivauksena, oma väri, kehys, tummennuksen tyyli, logo kolmeen paikkaan, kuvaajan merkintä, JPG/PNG sekä viisi kokoa. Asetukset muistetaan selaimessa.

## Kirjautuminen julkaisutyökaluun (/admin/)

Kirjautuminen tapahtuu GitHub-tunnuksilla. Koodi on kansiossa `functions/api/` ja toimii Cloudflare Pagesissa. Kertaluontoiset asetukset:

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   - Application name: `Valokeila CMS`
   - Homepage URL: `https://valokeila.net`
   - Redirect URI: `https://valokeila.net/api/callback` (ja tarvittaessa `https://valokeila.pages.dev/api/callback`)
   - Paina *Register application*, kopioi **Client ID**, paina *Generate a new client secret* ja kopioi **Client secret**.
2. **Cloudflare → Workers & Pages → valokeila → Settings → Variables and Secrets** (Production):
   - `GITHUB_CLIENT_ID` = Client ID
   - `GITHUB_CLIENT_SECRET` = Client secret (tyypiksi *Secret*)
3. Tee uusi julkaisu (Deployments → Retry deployment), jotta asetukset tulevat voimaan.
4. Avaa `https://valokeila.net/admin/` ja kirjaudu GitHubilla.

Vain käyttäjät, joilla on kirjoitusoikeus GitHub-repoon, voivat julkaista. Julkaisutyökalu kirjautuu sen osoitteen kautta, jossa se on auki (esim. `valokeila.net` tai `valokeila.pages.dev`). Jokaisen käytetyn osoitteen `/api/callback` pitää olla lisättynä OAuth-sovelluksen Redirect URI -listaan.

## Uutiskirje (MailerLite)

Tilauslomake (sivupalkki ja `/uutiskirje/`) lähettää osoitteen funktiolle `functions/api/uutiskirje.js`, joka lisää sen MailerLiteen.

1. Luo tili osoitteessa mailerlite.com.
2. **Subscribers → Groups → Create group**, esim. `Valokeila-uutiskirje`. Avaa ryhmä ja kopioi sen ID osoiteriviltä (numero).
3. **Integrations → API → Generate new token**, kopioi avain.
4. **Account settings → Subscribe settings:** ota käyttöön *Double opt-in for API and integrations* (tilaaja vahvistaa osoitteensa sähköpostista).
5. Cloudflare → valokeila → Settings → Variables and Secrets:
   - `MAILERLITE_API_KEY` = API-avain (tyypiksi *Secret*)
   - `MAILERLITE_GROUP_ID` = ryhmän ID
6. Julkaise uudelleen (Deployments → ⋯ → Retry deployment).

Ennen kuin avain on asetettu, lomake kertoo, ettei tilaus ole vielä käytössä.

## Ennen julkaisua – tarkistuslista

- [ ] Lisää toimituksen sähköposti `site.json`:iin (kenttä `email`) – yhteystietolinkit tulevat näkyviin automaattisesti
- [ ] Lisää sähköposti, jotta tietosuojaselosteessa on yhteystieto. Päivitä seloste (`src/tietosuoja.md`), jos otat käyttöön analytiikan, mainokset tai upotukset.
- [ ] Ota uutiskirje käyttöön (alla)
- [ ] Lisää analytiikka (esim. Plausible) ja tarvittaessa evästeilmoitus
- [ ] Rekisteröi sivusto Google Search Consoleen ja lähetä sivukartta
