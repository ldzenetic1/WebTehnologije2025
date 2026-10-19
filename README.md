# Kolaborativni Editor Scenarija

Kratak opis
- Jednostavna web aplikacija za kolaborativno uređivanje scenarija: frontend editor (HTML/JS) i REST API koji čuva scenarije, linije i promjene u bazi.

Najbitnije (glavne funkcionalnosti)
- Kreiranje i učitavanje scenarija.
- Zaključavanje i ažuriranje linija (za kolaboraciju).
- Zaključavanje i promjena imena likova kroz scenarij.
- Evidencija promjena (deltas) i periodično dohvaćanje novih promjena.
- Alati u editoru: broj riječi, detekcija uloga, formatiranje teksta.

Korištene tehnologije
- JavaScript (Node.js) - backend i frontend
- Express (REST API)
- Sequelize (ORM) + MySQL (baza podataka)
- HTML, CSS, Vanilla JS (frontend)
- Docker / docker-compose (lokalni razvoj)
