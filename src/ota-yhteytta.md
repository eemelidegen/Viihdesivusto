---
layout: layouts/base.njk
title: Ota yhteyttä
description: Ota yhteyttä Hulinan toimitukseen, ilmoita virheestä tai kysy mainonnasta.
permalink: /ota-yhteytta/
---
<div class="contact">
  <h1>Ota yhteyttä</h1>
  <p class="contact__lead">Toimitus lukee kaikki viestit. Jos jätät yhteystietosi, vastaamme yleensä parin päivän sisällä.</p>
  <div class="contact__grid">
    <form class="contact__form" id="tipForm" novalidate>
      <label>Aihe
        <select name="aihe">
          <option>Palaute</option>
          <option>Virhe jutussa</option>
          <option>Mainonta ja yhteistyö</option>
          <option>Arvonta</option>
          <option>Muu asia</option>
        </select>
      </label>
      <label>Viesti<textarea name="teksti" rows="7" maxlength="4000" required></textarea></label>
      <label>Juttu, jota viesti koskee<input name="juttu" maxlength="300" placeholder="Otsikko tai linkki"><small>Ei pakollinen.</small></label>
      <label>Sähköposti tai puhelinnumero<input name="yhteys" maxlength="200" autocomplete="email"><small>Ei pakollinen. Tarvitsemme sen, jos haluat vastauksen.</small></label>
      <label class="tip__hp" aria-hidden="true">Sivusto<input name="sivusto" tabindex="-1" autocomplete="off"></label>
      <p class="tip__err" role="alert"></p>
      <button type="submit" class="btn-ink">Lähetä</button>
    </form>
    <div class="contact__done" id="tipDone" hidden>
      <p class="contact__big">Kiitos, viesti on lähetetty.</p>
      <p>Jos jätit yhteystietosi, vastaamme mahdollisimman pian.</p>
      <p><a href="/">Siirry etusivulle</a></p>
    </div>
    <aside class="contact__info">
      <h2>Virheet</h2>
      <p>Korjaamme virheet heti, kun saamme niistä tiedon. Kerro, mikä jutussa on väärin ja mistä oikea tieto löytyy.</p>
      <h2>Mainonta ja yhteistyö</h2>
      <p>Valitse aiheeksi Mainonta ja yhteistyö, niin viesti ohjautuu oikeaan paikkaan.</p>
      <h2>Somessa</h2>
      <p>TikTok ja Instagram: <a href="https://www.tiktok.com/@hulinanet" target="_blank" rel="noopener">@hulinanet</a></p>
      <p class="contact__small">Käsittelemme viestit luottamuksellisesti. Lue lisää <a href="/tietosuoja/">tietosuojaselosteesta</a>.{% if site.email %} Sähköposti: <a href="mailto:{{ site.email }}">{{ site.email }}</a>{% endif %}</p>
    </aside>
  </div>
</div>
