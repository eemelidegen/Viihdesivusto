---
layout: layouts/base.njk
title: Tietosuojaseloste
---
<div class="prose page">

# Tietosuojaseloste

*Tämä on pohja – täydennä se ennen julkaisua omilla tiedoillasi ja käyttämiesi palveluiden (analytiikka, mainosverkosto, uutiskirjepalvelu) tiedoilla.*

## Rekisterinpitäjä

{{ site.publisher }}{% if site.email %}, {{ site.email }}{% endif %}

## Mitä tietoja käsittelemme

- **Uutiskirjeen tilaajat:** sähköpostiosoite, jota käytetään vain uutiskirjeen lähettämiseen. Käsittelyn peruste on suostumuksesi, jonka voit perua milloin tahansa uutiskirjeen lopussa olevasta linkistä. Osoitteet säilytetään uutiskirjepalvelu MailerLitessa (UAB MailerLite, Liettua, EU).
- **Kävijätilastot:** anonymisoitu tieto sivujen käytöstä (esim. Plausible tai Google Analytics).
- **Evästeet:** mainonnan ja analytiikan evästeet asetetaan vain suostumuksellasi.

## Oikeutesi

Sinulla on oikeus tarkastaa, korjata ja poistaa tietosi sekä peruuttaa suostumuksesi. {% if site.email %}Ota yhteyttä: {{ site.email }}.{% endif %}

</div>
