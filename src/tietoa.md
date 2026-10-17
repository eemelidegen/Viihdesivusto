---
layout: layouts/base.njk
title: Tietoa meistä
description: Hulina on suomalainen viihdemedia. Julkkisuutiset, tv-ohjelmat, kohut ja urheilu.
---
<div class="prose page">

# Tietoa meistä

{{ site.name }} on suomalainen viihdemedia. Kirjoitamme julkkiksista, tv-ohjelmista, kohuista, rikoksista ja urheilusta Suomesta ja maailmalta.

Jutut perustuvat haastatteluihin, julkisiin somepäivityksiin, tv-ohjelmiin, tiedotteisiin ja muiden medioiden uutisiin. Kerromme jokaisessa jutussa, mistä tieto on peräisin. Virheet korjataan, ja olennaisesta korjauksesta kerrotaan jutussa. Lue lisää [toimituksen periaatteista](/periaatteet/).

Juttuvinkin voi lähettää [vinkkisivulla](/vinkkaa/).

## Mainonta ja yhteistyö

{% if site.email %}Mainonnasta ja yhteistyöstä voi kysyä osoitteesta [{{ site.email }}](mailto:{{ site.email }}).{% else %}Mainonnan ja yhteistyön yhteystiedot julkaistaan tällä sivulla.{% endif %} Kaupalliset yhteistyöt merkitään aina selvästi, eikä mainostaja vaikuta juttujen sisältöön.

## Julkaisutiedot

**Julkaisija:** {{ site.publisher }}<br>
**Verkko-osoite:** {{ site.url | replace("https://", "") }}<br>
{% if site.email %}**Toimitus:** [{{ site.email }}](mailto:{{ site.email }})<br>
{% endif %}**Juttuvinkit:** [{{ site.url | replace("https://", "") }}/vinkkaa](/vinkkaa/)<br>
**Toimituksen periaatteet:** [{{ site.url | replace("https://", "") }}/periaatteet](/periaatteet/)<br>
**Tietosuoja:** [Tietosuojaseloste](/tietosuoja/)

</div>
