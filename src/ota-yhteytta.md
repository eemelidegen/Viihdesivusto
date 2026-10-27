---
layout: layouts/base.njk
title: Ota yhteyttä
description: Ota yhteyttä Hulinan toimitukseen tai ilmoita virheestä jutussa.
permalink: /ota-yhteytta/
---
<div class="prose page">

# Ota yhteyttä

Voit lähettää viestin Hulinan toimitukselle tällä lomakkeella. Jos huomasit jutussa virheen, kerro mikä on väärin ja mistä oikea tieto löytyy, niin korjaamme sen.

<form class="tip" id="tipForm" novalidate>
  <label>Viesti<textarea name="teksti" rows="7" maxlength="4000" required></textarea></label>
  <label>Juttu, jota viesti koskee <small>valinnainen</small><input name="juttu" maxlength="300" placeholder="Jutun otsikko tai osoite"></label>
  <label>Yhteystietosi <small>valinnainen, jos haluat vastauksen</small><input name="yhteys" maxlength="200" autocomplete="email" placeholder="Sähköposti tai puhelinnumero"></label>
  <label class="tip__hp" aria-hidden="true">Sivusto<input name="sivusto" tabindex="-1" autocomplete="off"></label>
  <p class="tip__err" role="alert"></p>
  <button type="submit" class="btn-ink">Lähetä viesti</button>
</form>
<p class="tip__done" id="tipDone" hidden><b>Kiitos viestistä!</b> Toimitus lukee jokaisen viestin. Jos jätit yhteystietosi, vastaamme mahdollisimman pian.</p>

Käsittelemme viestit luottamuksellisesti. Yhteystietoja käytetään vain viestin käsittelyyn.{% if site.email %} Toimitukseen saa yhteyden myös sähköpostilla: [{{ site.email }}](mailto:{{ site.email }}).{% endif %}

</div>
