---
layout: layouts/base.njk
title: Tietoa meistä
description: Hulina on suomalainen viihdemedia, joka kertoo julkkisten kuulumiset, kohut, someilmiöt ja arjen puheenaiheet.
---
<div class="prose page">

# Tietoa meistä

{{ site.name }} on suomalainen viihdemedia kaikille, jotka haluavat tietää, mistä juuri nyt puhutaan. Meiltä luet, kuka erosi, kuka löysi uuden rakkauden, mitä tosi-tv:n kulisseissa tapahtui ja mikä ilmiö somessa leviää. Kirjoitamme myös ihan tavallisista asioista, jotka saavat ihmiset hymyilemään, ihmettelemään tai tarttumaan puhelimeen.

Teemme viihdeuutisia, joita on hauska lukea, mutta joihin voi myös luottaa. Kirjoitamme nopeasti, mutta emme keksi mitään. Jos jokin on vasta huhu, kerromme sen suoraan.

## Mistä kirjoitamme

**Julkkikset.** Kotimaiset tähdet, tosi-tv-kasvot, artistit, urheilijat ja somevaikuttajat. Suhteet, erot, häät, vauvauutiset ja uudet käänteet.

**Kohut.** Somemyrskyt, riidat, paljastukset ja puheenaiheet, joista kaikki keskustelevat. Selvitämme, mitä oikeasti tapahtui.

**Ilmiöt ja arki.** Somehitit, trendit, hauskat sattumukset ja tarinat tavallisista ihmisistä. Kaikki, mistä kahvipöydässä puhutaan.

## Vinkkaa meille

Moni hyvä juttu alkaa lukijan vinkistä. Bongasitko tunnetun ihmisen yllättävästä paikasta tai kuulitko jotain, mikä pitäisi saada päivänvaloon? [Lähetä meille vinkki](/vinkkaa/).

Emme paljasta vinkkaajan henkilöllisyyttä ilman lupaa.

## Mainosta {{ site.name }}ssa

Haluatko tavoittaa viihteestä kiinnostuneet lukijat? Teemme mielellämme yhteistyötä brändien, tapahtumien ja tuotantoyhtiöiden kanssa. {% if site.email %}Ota yhteyttä: [{{ site.email }}](mailto:{{ site.email }}).{% else %}Yhteystiedot mainosyhteistyöhön lisätään tälle sivulle pian.{% endif %}

Kaupallinen yhteistyö merkitään aina selvästi, eikä mainostaja vaikuta toimituksen juttuihin.

## Huomasitko virheen?

Teemme parhaamme, mutta joskus virheitä sattuu. Jos huomaat jutussa virheen, kerro siitä meille. Korjaamme sen mahdollisimman pian ja lisäämme korjauksesta maininnan jutun loppuun.

## Julkaisutiedot

**Julkaisija:** {{ site.publisher }}<br>
**Verkko-osoite:** {{ site.url | replace("https://", "") }}<br>
{% if site.email %}**Toimitus:** [{{ site.email }}](mailto:{{ site.email }})<br>
{% endif %}**Juttuvinkit:** [{{ site.url | replace("https://", "") }}/vinkkaa](/vinkkaa/)<br>
**Tietosuoja:** [Tietosuojaseloste](/tietosuoja/)

</div>
