
window.addEventListener("DOMContentLoaded", function () {

    const div = document.getElementById("divEditor"); 
    const poruke = document.getElementById("poruke"); 
    const inputUloga = document.getElementById("ulogaInput"); 

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

});