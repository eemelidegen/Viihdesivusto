---
layout: layouts/base.njk
title: Tietoa meistä
description: Hulina on suomalainen viihdemedia. Julkkikset, juorut, urheilu ja uutiset Suomesta ja maailmalta.
---
<div class="prose page">

# Tietoa meistä

{{ site.name }} on suomalainen viihdemedia. Kirjoitetaan julkkiksista, juoruista, urheilusta ja kaikista muistakin uutisista, joista Suomessa ja maailmalla just nyt puhutaan.

Tehdään juttuja, joita on kiva lukea, mutta ei keksitä mitään. Jos joku on vasta huhu, sanotaan se suoraan. Ja jos meillä menee jotain pieleen, korjataan se heti ja kerrotaan korjauksesta jutun lopussa.

Tiedätkö jotain, mistä pitäisi kirjoittaa? [Vinkkaa meille](/vinkkaa/).

## Mainosyhteistyö

Kiinnostaako yhteistyö? {% if site.email %}Laita viestiä: [{{ site.email }}](mailto:{{ site.email }}).{% else %}Yhteystiedot tulee tähän pian.{% endif %} Kaupalliset jutut merkitään aina selvästi, eikä mainostaja päätä meidän sisällöistä.

## Julkaisutiedot

**Julkaisija:** {{ site.publisher }}<br>
**Verkko-osoite:** {{ site.url | replace("https://", "") }}<br>
{% if site.email %}**Toimitus:** [{{ site.email }}](mailto:{{ site.email }})<br>
{% endif %}**Juttuvinkit:** [{{ site.url | replace("https://", "") }}/vinkkaa](/vinkkaa/)<br>
**Tietosuoja:** [Tietosuojaseloste](/tietosuoja/)

</div>
