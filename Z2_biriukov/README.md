# Z2 — Obed pri fakulte

- **Autor:** Savelii Biriukov
- **Krúžok:** pondelok 11:00, C137
- **Predmet:** Webové technológie 1, ZS 2026/2027
- **Web na školskom serveri:** <https://webte1.fei.stuba.sk/~xbiriukovs/Z2_biriukov/>

Stránka zobrazuje obedové menu FIIT Food, Eat & Meet a Machnáč v okolí FEI STU. Umožňuje vybrať deň alebo celý týždeň, filtrovať reštaurácie a aktualizovať ponuku. HTML sa načíta cez Fetch API, spracuje pomocou DOMParser a výsledky sa ukladajú do localStorage.

Menu sa predvolene načítava z lokálnych kópií v data/.

## Zdroje a licencie

- **Menu:** [FIIT Food](https://faynfood.sk/menu/#fiit-food), [Eat & Meet](https://eatandmeet.sk/), [Machnáč](https://machnac.sk/denneMenu.html).
- **Knižnice:** [Bootstrap Grid 5.3.8](https://getbootstrap.com/docs/5.3/layout/grid/) a [Day.js 1.11.13](https://day.js.org/) — MIT; texty licencií sú v `vendor/`.
- **Font:** [Manrope](https://fonts.google.com/specimen/Manrope), Mikhail Sharanda a Mirko Velimirovic — SIL Open Font License 1.1; lokálne súbory a licencia sú v `fonts/`.
- **Grafika:** vlastná SVG ikona.

OpenAI Codex pomáhal pri návrhu dizajnu, oprave a dopisovaní kódu a písaní textov a komentárov.
