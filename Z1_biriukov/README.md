# Z1 – Moja online vizitka

- **Autor:** Savelii Biriukov
- **Krúžok:** pondelok 11:00, C137
- **Predmet:** Webové technológie 1, ZS 2026/2027
- **Web na školskom serveri:** <https://webte1.fei.stuba.sk/~xbiriukovs/Z1_biriukov/>

## O webe

Osobná vizitka o piatich podstránkach: profil, životopis s tlačovým štýlom, interaktívny obrázok môjho pracovného stola, rozvrh na zimný semester 2026/2027 a mapa so školou a bydliskom.
Hotspoty na obrázku sú riešené len cez CSS a JavaScript v rozvrhu zvýrazňuje práve prebiehajúcu hodinu, filtruje ho a počíta priebeh semestra.
Na mape si návštevník pridá vlastné body, ktoré sa ukladajú do `localStorage`, a zistí ich vzdialenosť od školy alebo domova (Haversinov vzorec).

## Zdroje

- **Fotografie:** profilová fotografia `img/me.jpg` - vlastná. Ilustračný obrázok pracovného stola `img/workspace.jpg` bol vygenerovaný pomocou AI ([Google Gemini](https://gemini.google.com/)). Monogram SB je nakreslený v SVG podľa návrhu loga vygenerovaného v Google Gemini; z neho je odvodený aj favicon a obrázok pre Open Graph (`img/og-image.png`).
- **Mapové podklady:** © prispievatelia [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL.
- **Knižnica:** [Leaflet 1.9.4](https://leafletjs.com/), licencia BSD-2-Clause (použitá len na stránke `map.html`).
- **Písmo:** [Rubik](https://fonts.google.com/specimen/Rubik) (autori: Hubert & Fischer, Meir Sadan, Cyreal), licencia [SIL Open Font License 1.1](https://openfontlicense.org/).

## Použitie AI

Pri tvorbe mi pomáhali AI nástroje: Google Gemini pri generovaní obrázkov (návrh loga, ilustrácia pracovného stola) a Claude pri návrhu dizajnu, oprave a dopisovaní kódu a písaní textov a komentárov.