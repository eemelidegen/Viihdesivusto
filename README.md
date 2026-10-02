# Valokeila – viihdeuutissivusto

Nopea, halpa ylläpitää ja hakukoneystävällinen viihdeuutismedia. Rakennettu [Eleventyllä](https://www.11ty.dev/): jutut ovat Markdown-tiedostoja, joista syntyy valmiit HTML-sivut. Tietokantaa tai palvelinta ei tarvita.

## Mitä sivustolla on

- Etusivu: iso pääjuttu ja juttuvirta (kaksi rinnakkain, joka kolmas leveänä); sivupalkissa välilehdet "Suositut jutut" ja "Tuoreimmat jutut", uutiskirje ja mainospaikka
- Kategoriasivut: Elokuvat, TV & sarjat, Musiikki, Julkkikset, Pelit
- Artikkelisivu: lukuaika, jakonapit, aiheeseen liittyvät jutut, Googlen NewsArticle-merkintä
- RSS-syöte (`/feed.xml`), sivukartta (`/sitemap.xml`), `robots.txt`, 404-sivu
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
category: elokuvat        # elokuvat | sarjat | musiikki | julkkikset | pelit
author: Nimi
image: /assets/img/uploads/kuva.jpg   # valinnainen
imageAlt: Kuvan kuvaus
imageCredit: Kuvaaja / lähde
nosto: true               # valinnainen: näkyy sivupalkin "Suositut jutut" -listassa
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
5. `/admin/`-kirjautuminen GitHub-tunnuksilla vaatii OAuth-sovelluksen (Netlifyssä valmiina, Cloudflaressa erillinen pieni OAuth-välityspalvelu).

## Ennen julkaisua – tarkistuslista

- [ ] Poista esimerkkiartikkelit (`src/artikkelit/2026-*.md`)
- [ ] Lisää toimituksen sähköposti `site.json`:iin (kenttä `email`) – yhteystietolinkit tulevat näkyviin automaattisesti
- [ ] Täydennä tietosuojaseloste
- [ ] Kytke uutiskirjelomake palveluun (esim. MailerLite, Brevo) – nyt lomake ei lähetä mitään
- [ ] Lisää analytiikka (esim. Plausible) ja tarvittaessa evästeilmoitus
- [ ] Rekisteröi sivusto Google Search Consoleen ja lähetä sivukartta
