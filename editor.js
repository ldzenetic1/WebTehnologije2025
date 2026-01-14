window.addEventListener("DOMContentLoaded", function () {

    const div = document.getElementById("divEditor"); 
    const poruke = document.getElementById("poruke"); 
    const inputUloga = document.getElementById("ulogaInput"); 

    const API = typeof PoziviAjax !== 'undefined' ? PoziviAjax : PoziviAjaxFetch;

    const userId = Math.floor(Math.random() * 10000);
    let currentScenarioId = null;
    let currentLineId = null;
    let lastTimestamp = 0;

    let editor = null;
    try {
        editor = EditorTeksta(div);
    } catch (err) {
        poruke.textContent = "Greška: " + err;
        return;
    }

    function ispisi(x) {
        if (typeof x === "object") {
            poruke.textContent = JSON.stringify(x, null, 2);
        } else {
            poruke.textContent = x;
        }
    }

    const btnBold = document.getElementById("btnBold");
    const btnItalic = document.getElementById("btnItalic");
    const btnUnderline = document.getElementById("btnUnderline");

    if (btnBold) btnBold.onclick = () => ispisi(editor.formatirajTekst("bold"));
    if (btnItalic) btnItalic.onclick = () => ispisi(editor.formatirajTekst("italic"));
    if (btnUnderline) btnUnderline.onclick = () => ispisi(editor.formatirajTekst("underline"));

    const btnBrojRijeci = document.getElementById("btnBrojRijeci");
    const btnUloge = document.getElementById("btnUloge");
    const btnPogresna = document.getElementById("btnPogresna");
    const btnBrojLinija = document.getElementById("btnBrojLinija");
    const btnScenarij = document.getElementById("btnScenarij");
    const btnGrupisi = document.getElementById("btnGrupisi");

    if (btnBrojRijeci) btnBrojRijeci.onclick = () => ispisi(editor.dajBrojRijeci());
    if (btnUloge) btnUloge.onclick = () => ispisi(editor.dajUloge());
    if (btnPogresna) btnPogresna.onclick = () => ispisi(editor.pogresnaUloga());
    if (btnBrojLinija) btnBrojLinija.onclick = () => {
        let u = inputUloga.value.trim();
        if (!u) return ispisi("⚠️ Unesi ulogu!");
        ispisi(editor.brojLinijaTeksta(u));
    };

    if (btnScenarij) btnScenarij.onclick = () => {
        let u = inputUloga.value.trim();
        if (!u) return ispisi("⚠️ Unesi ulogu!");
        ispisi(editor.scenarijUloge(u));
    };

    if (btnGrupisi) btnGrupisi.onclick = () => {
        ispisi(editor.grupisiUloge());
    };

    const btnKreirajScenarij = document.getElementById("btnKreirajNovi");
    if (btnKreirajScenarij) {
        btnKreirajScenarij.onclick = () => {
            const naslov = prompt("Unesite naslov scenarija:");
            API.postScenario(naslov || "", (status, data) => {
                if (status === 200) {
                    currentScenarioId = data.id;
                    currentLineId = data.content[0].lineId;
                    ispisi(`✅ Scenarij kreiran! ID: ${data.id}`);
                } else {
                    ispisi(`❌ Greška: ${data.message}`);
                }
            });
        };
    }

    const btnUcitajScenarij = document.getElementById("btnUcitajScenario");
    if (btnUcitajScenarij) {
        btnUcitajScenarij.onclick = () => {
            const scenarioId = parseInt(prompt("Unesite ID scenarija:"));
            if (!scenarioId) return;
            
            API.getScenario(scenarioId, (status, data) => {
                if (status === 200) {
                    currentScenarioId = data.id;
                    div.innerHTML = '';
                    data.content.forEach(line => {
                        const p = document.createElement('p');
                        p.textContent = line.text || '(prazna linija)';
                        p.dataset.lineId = line.lineId;
                        div.appendChild(p);
                    });
                    ispisi(`✅ Scenarij učitan: ${data.title}`);
                } else {
                    ispisi(`❌ Greška: ${data.message}`);
                }
            });
        };
    }

    const btnZakljucajLiniju = document.getElementById("btnZakljucajLiniju");
    if (btnZakljucajLiniju) {
        btnZakljucajLiniju.onclick = () => {
            if (!currentScenarioId) {
                return ispisi("⚠️ Prvo učitajte scenarij!");
            }
            const lineId = parseInt(prompt("Unesite ID linije za zaključavanje:"));
            if (!lineId) return;

            API.lockLine(currentScenarioId, lineId, userId, (status, data) => {
                if (status === 200) {
                    currentLineId = lineId;
                    ispisi(`🔒 ${data.message}`);
                } else {
                    ispisi(`❌ ${data.message}`);
                }
            });
        };
    }

    const btnAzurirajLiniju = document.getElementById("btnAzurirajLiniju");
    if (btnAzurirajLiniju) {
        btnAzurirajLiniju.onclick = () => {
            if (!currentScenarioId || !currentLineId) {
                return ispisi("⚠️ Prvo zaključajte liniju!");
            }
            const noviTekst = prompt("Unesite novi tekst:");
            if (noviTekst === null) return;

            API.updateLine(currentScenarioId, currentLineId, userId, [noviTekst], (status, data) => {
                if (status === 200) {
                    ispisi(`✅ ${data.message}`);
                    currentLineId = null; 
                } else {
                    ispisi(`❌ ${data.message}`);
                }
            });
        };
    }

    const btnPreimenujLika = document.getElementById("btnPromijeniIme");
    if (btnPreimenujLika) {
        btnPreimenujLika.onclick = () => {
            if (!currentScenarioId) {
                return ispisi("⚠️ Prvo učitajte scenarij!");
            }
            const staroIme = prompt("Unesite staro ime lika:");
            if (!staroIme) return;

            API.lockCharacter(currentScenarioId, staroIme, userId, (status, data) => {
                if (status === 200) {
                    const novoIme = prompt("Unesite novo ime lika:");
                    if (!novoIme) return;

                    API.updateCharacter(currentScenarioId, userId, staroIme, novoIme, (status2, data2) => {
                        if (status2 === 200) {
                            ispisi(`✅ Lik preimenovan: ${staroIme} → ${novoIme}`);
                        } else {
                            ispisi(`❌ ${data2.message}`);
                        }
                    });
                } else {
                    ispisi(`❌ ${data.message}`);
                }
            });
        };
    }

    const btnProveriPromene = document.getElementById("btnUcitajPromjene");
    if (btnProveriPromene) {
        btnProveriPromene.onclick = () => {
            if (!currentScenarioId) {
                return ispisi("⚠️ Prvo učitajte scenarij!");
            }

            API.getDeltas(currentScenarioId, lastTimestamp, (status, data) => {
                if (status === 200) {
                    if (data.deltas.length === 0) {
                        ispisi("Nema novih promjena.");
                    } else {
                        ispisi(data.deltas);
                        if (data.deltas.length > 0) {
                            lastTimestamp = data.deltas[data.deltas.length - 1].timestamp;
                        }
                    }
                } else {
                    ispisi(`❌ ${data.message}`);
                }
            });
        };
    }

    function autoCheckDeltas() {
        if (currentScenarioId) {
            API.getDeltas(currentScenarioId, lastTimestamp, (status, data) => {
                if (status === 200 && data.deltas.length > 0) {
                    console.log("Nove promjene:", data.deltas);
                    lastTimestamp = data.deltas[data.deltas.length - 1].timestamp;
                }
            });
        }
    }

    setInterval(autoCheckDeltas, 5000);

    ispisi(`Sistem pokrenut. User ID: ${userId}`);
});