# Hulina – viihdeuutissivusto

Nopea, halpa ylläpitää ja hakukoneystävällinen viihdeuutismedia. Rakennettu [Eleventyllä](https://www.11ty.dev/): jutut ovat Markdown-tiedostoja, joista syntyy valmiit HTML-sivut. Tietokantaa tai palvelinta ei tarvita.

## Mitä sivustolla on

- Etusivu: iso pääjuttu ja juttuvirta (kaksi rinnakkain, joka kolmas leveänä); sivupalkissa välilehdet "Suositut jutut" ja "Tuoreimmat jutut" sekä mainospaikka
- Kategoriasivut: Julkkikset, Kohut, Rikos ja Urheilu (valikko tulee suoraan `site.js`:n kategorioista)
- Artikkelisivu: lukuaika, jakonapit, aiheeseen liittyvät jutut, Googlen NewsArticle-merkintä
- Sivukartta (`/sitemap.xml`), `robots.txt`, 404-sivu
- Tietoa meistä / julkaisutiedot ja tietosuojaselosteen pohja
- Toimitustyökalu selaimessa: `/admin/` (oma kirjoitustyökalu, somekuvatyökalu; Decap CMS varalla)
- Vaalea ja tumma teema (valinta oikean yläkulman valikosta, muistetaan selaimessa) ja mobiilinäkymä

## Käynnistys omalla koneella

```
npm install
npm start        # avaa http://localhost:8080
npm run build    # valmis sivusto kansioon _site/
```

## Uuden jutun kirjoittaminen

**Selaimessa (suositus):** avaa `/admin/` (ohjautuu osoitteeseen `/admin/kirjoita/`) ja kirjaudu GitHubilla. Kirjoita otsikko, ingressi ja teksti, valitse kategoria, lisää kuva ja paina **Julkaise** tai **Tallenna luonnos**. Kuvat pienennetään automaattisesti. Jutut-välilehdellä voit muokata ja poistaa juttuja. Keskeneräinen teksti tallentuu selaimeen automaattisesti.

Työkalu tallentaa jutun suoraan GitHubiin (`functions/api/toimitus/`, `lib/articles.js`), ja sivu päivittyy noin minuutissa. Vanha Decap CMS on varalla osoitteessa `/admin/decap/`.

**Tiedostona:** lisää `src/artikkelit/`-kansioon tiedosto, esim. `2026-10-05-otsikko.md`:

```markdown
---
title: Otsikko
excerpt: Ingressi, 1–2 lausetta.
date: 2026-10-05T09:00:00+03:00
category: julkkikset      # julkkikset | kohut | rikos | urheilu
author: Nimi
image: /assets/img/uploads/kuva.jpg   # valinnainen
imageAlt: Kuvan kuvaus
imageCredit: Kuvaaja / lähde
nosto: true               # valinnainen: näkyy "Suositut jutut" -listassa ja Luetuimmat-sivulla
draft: true               # valinnainen: ei julkaista
---
Jutun teksti tähän.
```

Kategoriat, sivuston nimi ja yhteystiedot muutetaan tiedostossa `src/_data/site.js`, värit `src/assets/css/style.css`:n alussa.

## Ilme

- Värit: valkoinen pohja ja musta teksti (tumma teema: musta pohja ja valkoinen teksti), korostusvärinä pinkki `#FF8FB1`
- Fontti: League Spartan (kaikki otsikot ja valikko), leipäteksti järjestelmäfontilla; tiedostot `src/assets/fonts/`. Logon kirjaimet ovat valmiina vektoreina, joten logo ei tarvitse fonttia.
- Logo: `src/_includes/partials/logo.njk` (SVG, väri tulee CSS:stä), `src/assets/img/hulina-logo-*.svg` ja `favicon.svg`
- Somekäyttöön tarkoitetut logot, profiilikuva ja kansikuva: `brand/`

## Julkaiseminen verkkoon

1. Vie koodi GitHubiin.
2. Liitä repo ilmaiseen hostingiin: **Netlify** tai **Cloudflare Pages** (build-komento `npm run build`, julkaisukansio `_site`). Jokainen muutos julkaistaan automaattisesti.
3. Osta oma verkkotunnus (esim. `.fi` n. 10–20 €/v) ja liitä se hostingiin.
4. Päivitä `url` tiedostoon `src/_data/site.js`.
5. Ota `/admin/`-kirjautuminen käyttöön (alla).

## Jakokuvat

Jokaiselle jutulle luodaan julkaisun yhteydessä automaattisesti 1200×630-jakokuva (`/og/<jutun-osoite>.png`): jutun kuva, kategoria ja otsikko Hulinan tyylillä (logo, pinkki kategoriatarra). Ilman kuvaa käytetään violettia taustaa, ja muilla sivuilla on yleinen kuva (`/og/default.png`). Koodi: `lib/og-image.js`. Jutun kuvan pitää olla JPG tai PNG, jotta se näkyy jakokuvassa.

## Somekuvat (/admin/somekuva/)

Työkalu tekee juttujen mainoskuvat someen: valitse kuva, kirjoita otsikko (korosta sanoja tähdillä, `*näin*`), valitse koko ja lataa. Toimii myös puhelimella, jossa kuvan voi tallentaa suoraan kuviin.

Työkalu vaatii kirjautumisen GitHub-tunnuksella, jolla on kirjoitusoikeus tähän repoon (tarkistus `functions/admin/_middleware.js`, istunto 30 päivää, uloskirjautuminen `/api/ulos`). Asetuksia ei tarvita: se käyttää samaa OAuth-sovellusta ja `GITHUB_CLIENT_SECRET`-arvoa kuin julkaisutyökalu.

Ominaisuudet: yksi tai kaksi kuvaa (rinnakkain/päällekkäin), kuvan siirto vetämällä ja zoomaus nipistämällä tai hiiren rullalla, kirkkaus/kontrasti/mustavalko, peilaus, yläotsikkotarra, neljä fonttia, isot kirjaimet, tekstin koko, sijainti ja tasaus, korostus värinä/laatikkona/alleviivauksena, oma väri, kehys, tummennuksen tyyli, logo kolmeen paikkaan, kuvaajan merkintä, JPG/PNG sekä viisi kokoa. Asetukset muistetaan selaimessa.

## Kirjautuminen toimitukseen (/admin/)

Kirjautuminen tapahtuu GitHub-tunnuksilla. Koodi on kansiossa `functions/api/` ja toimii Cloudflare Pagesissa. Kertaluontoiset asetukset:

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   - Application name: esim. `Hulina CMS` (nykyinen sovellus on nimeltään `Valokeila CMS`, nimellä ei ole merkitystä)
   - Homepage URL: `https://hulina.net`
   - Redirect URI: `https://hulina.net/api/callback` (ja `https://hulina.pages.dev/api/callback`)
   - Paina *Register application*, kopioi **Client ID**, paina *Generate a new client secret* ja kopioi **Client secret**.
2. **Cloudflare → Workers & Pages → hulina** **→ Settings → Variables and Secrets** (Production):
   - `GITHUB_CLIENT_ID` = Client ID
   - `GITHUB_CLIENT_SECRET` = Client secret (tyypiksi *Secret*)
3. Tee uusi julkaisu (Deployments → Retry deployment), jotta asetukset tulevat voimaan.
4. Avaa `https://hulina.net/admin/` ja kirjaudu GitHubilla. Koko `/admin/` vaatii kirjautumisen (`functions/admin/_middleware.js`).

Vain käyttäjät, joilla on kirjoitusoikeus GitHub-repoon, voivat julkaista. Julkaisutyökalu kirjautuu sen osoitteen kautta, jossa se on auki (esim. `hulina.net` tai `hulina.pages.dev`). Jokaisen käytetyn osoitteen `/api/callback` pitää olla lisättynä OAuth-sovelluksen Redirect URI -listaan.

## Verkkotunnus

Sivuston osoite on `hulina.net` (`url` tiedostossa `src/_data/site.js`). Vanhaa `valokeila.net`-osoitetta ei enää käytetä. Jos osoite vaihtuu joskus taas:

1. Cloudflare → Workers & Pages → hulina → **Custom domains → Set up a custom domain** ja lisää uusi osoite.
2. GitHub → OAuth App → lisää Redirect URI `https://<uusi-osoite>/api/callback`.
3. Vaihda `url` tiedostossa `src/_data/site.js`.

## Ennen julkaisua – tarkistuslista

- [ ] Lisää toimituksen sähköposti `site.js`:iin (kenttä `email`) – yhteystietolinkit tulevat näkyviin automaattisesti
- [ ] Lisää sähköposti, jotta tietosuojaselosteessa on yhteystieto. Päivitä seloste (`src/tietosuoja.md`), jos otat käyttöön analytiikan, mainokset tai upotukset.
- [ ] Lisää analytiikka (esim. Plausible) ja tarvittaessa evästeilmoitus
- [ ] Rekisteröi sivusto Google Search Consoleen ja lähetä sivukartta
