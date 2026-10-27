---
layout: layouts/base.njk
title: Vinkkaa
description: Lähetä juttuvinkki tai ilmoita virheestä Hulinan toimitukselle.
---
<div class="prose page">

# Lähetä juttuvinkki

Näitkö tai kuulitko jotain, mistä meidän pitäisi kirjoittaa? Otamme vastaan vinkkejä julkkiksista, tv-ohjelmista, tapahtumista, urheilusta ja muista puheenaiheista. Samalla lomakkeella voit ilmoittaa virheestä jutussa.

Kerro mahdollisimman tarkasti, mitä tapahtui, missä ja milloin. Jos sinulla on kuvia tai videoita, mainitse, oletko ottanut ne itse. Julkaisemme kuvia vain, jos meillä on niihin lupa.

<form class="tip" id="tipForm" novalidate>
  <label>Vinkki tai korjauspyyntö<textarea name="teksti" rows="7" maxlength="4000" required></textarea></label>
  <label>Juttu, jota korjaus koskee <small>valinnainen</small><input name="juttu" maxlength="300" placeholder="Jutun otsikko tai osoite"></label>
  <label>Yhteystietosi <small>valinnainen, jos haluat että otamme yhteyttä</small><input name="yhteys" maxlength="200" autocomplete="email" placeholder="Sähköposti tai puhelinnumero"></label>
  <label class="tip__hp" aria-hidden="true">Sivusto<input name="sivusto" tabindex="-1" autocomplete="off"></label>
  <p class="tip__err" role="alert"></p>
  <button type="submit" class="btn-ink">Lähetä vinkki</button>
</form>
<p class="tip__done" id="tipDone" hidden><b>Kiitos vinkistä!</b> Toimitus lukee jokaisen vinkin. Jos jätit yhteystietosi, saatamme olla yhteydessä.</p>

Voit vinkata nimettömänä. Käsittelemme vinkit luottamuksellisesti, eikä vinkin lähettäjän henkilöllisyyttä kerrota kenellekään ilman lupaa. Yhteystietoja käytetään vain vinkin käsittelyyn.{% if site.email %} Vinkin voi lähettää myös sähköpostilla: [{{ site.email }}](mailto:{{ site.email }}).{% endif %}

</div>
