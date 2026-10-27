---
layout: layouts/base.njk
title: Tietoa meistä
description: Hulina on suomalainen viihdemedia. Julkkikset, tv-ohjelmat, kohut, politiikka ja urheilu.
---
<div class="prose page">

# Tietoa meistä

Hulina on suomalainen viihdemedia. Kerromme, mistä Suomi puhuu: julkkiksista, tv-ohjelmista, kohuista, politiikasta ja urheilusta.

Teemme juttuja nopeasti, mutta emme oikopolkuja pitkin. Jokainen juttu perustuu lähteisiin, ja virheet korjataan. Työtämme ohjaavat [toimituksen periaatteet](/periaatteet/).

Onko sinulla juttuvinkki? [Kerro meille](/vinkkaa/). Kaikki vinkit luetaan.

## Mainonta ja yhteistyö

{% if site.email %}Mainonnasta ja yhteistyöstä voi kysyä osoitteesta [{{ site.email }}](mailto:{{ site.email }}).{% else %}Mainonnasta ja yhteistyöstä voi kysyä [yhteydenottolomakkeella](/vinkkaa/).{% endif %}

## Julkaisutiedot

**Julkaisija:** {{ site.publisher }}<br>
**Verkko-osoite:** {{ site.url | replace("https://", "") }}<br>
{% if site.email %}**Sähköposti:** [{{ site.email }}](mailto:{{ site.email }})<br>
{% endif %}**Some:** @hulinanet (TikTok ja Instagram)<br>
**Tietosuoja:** [Tietosuojaseloste](/tietosuoja/)

</div>
