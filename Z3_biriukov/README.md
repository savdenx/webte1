# Z3 — Môj TODO List

- **Autor:** Savelii Biriukov · pondelok 11:00, C137
- **Predmet:** WEBTE1, ZS 2026/2027
- **Adresa na školskom serveri:** <https://webte1.fei.stuba.sk/~xbiriukovs/Z3_biriukov/>

Vue spravuje stav aplikácie a zobrazuje úlohy v zozname a kalendári FullCalendar. Modul `js/api.js` cez Fetch API načítava a mení úlohy na školskom REST API podľa identifikátora študenta; údaje sa prenášajú vo formáte JSON. Po úspešnej odpovedi servera sa aktualizujú spoločné údaje zoznamu aj kalendára. Rozhranie je rozdelené na komponenty v `js/components/`, pomocné funkcie sú v `js/tasks.js` a štýly v `css/styles.css`.

## Spustenie

Statická stránka sa spúšťa cez HTTP(S) server, napríklad Live Server, otvorením `index.html`. Identifikátor autora je `xbiriukovs`. Knižnice sú priložené vo `vendor/`; inštalácia ani zostavenie nie sú potrebné. REST API vyžaduje internetové pripojenie.

## Technológie a zdroje

HTML, CSS, JavaScript, Fetch API, [Vue 3.5.42](https://vuejs.org/), [FullCalendar 6.1.19](https://fullcalendar.io/) a [školské REST API](https://wt1zadanie.iolab.sk/docs). Licencie knižníc sú vo `vendor/`.

OpenAI Codex pomáhal pri návrhu dizajnu, oprave a dopisovaní kódu a písaní textov a komentárov.