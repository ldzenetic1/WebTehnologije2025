let EditorTeksta = function (divRef) {

    if (!(divRef instanceof HTMLElement))
        throw new Error("Pogresan tip elementa!");

    if (divRef.tagName.toLowerCase() !== "div")
        throw new Error("Pogresan tip elementa!");

    const editable = divRef.getAttribute("contenteditable");
    if (editable !== "true")
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");

    let div = divRef;


    let dajBrojRijeci = function () {
        let ukupno = 0;
        let boldiranih = 0;
        let italic = 0;

        const walker = document.createTreeWalker(
            div,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        const regexRijec = /^[A-Za-zČĆŽŠĐčćžšđ]+([\'\-][A-Za-zČĆŽŠĐčćžšđ]+)*$/;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            const tekst = node.nodeValue.trim();
            if (tekst.length === 0) continue;
            const rijeci = tekst.split(/[\s,.;!?]+/);

            rijeci.forEach(r => {
                if (r.length === 0) return;
                if (!regexRijec.test(r)) return;

                ukupno++;

                let parent = node.parentNode;
                let isBold = false;
                let isItalic = false;

                while (parent && parent !== div) {
                    const tag = parent.tagName ? parent.tagName.toLowerCase() : "";
                    if (tag === "b" || tag === "strong") isBold = true;
                    if (tag === "i" || tag === "em") isItalic = true;
                    parent = parent.parentNode;
                }
                if (isBold) boldiranih++;
                if (isItalic) italic++;
            });
        }

        return { ukupno: ukupno, boldiranih: boldiranih, italic: italic };
    };

    let dajUloge = function () {
        const linije = div.innerText.split(/\r?\n/);
        const lista = [];
        const set = new Set();

        const regexUloga = /^([A-ZČĆŽŠĐ]+(?:\s+[A-ZČĆŽŠĐ]+)*)$/;

        for (let i = 0; i < linije.length; i++) {
            let linija = linije[i].trim();
            if (!linija) continue;
            if (!regexUloga.test(linija)) continue;

            let imaGovor = false;

            for (let j = i + 1; j < linije.length; j++) {
                let slj = linije[j].trim();
                if (!slj) continue;
                if (regexUloga.test(slj)) break;
                if (/^(INT\.|EXT\.)/.test(slj)) break;
                if (/^\(.*\)$/.test(slj)) continue;
                imaGovor = true;
                break;
            }

            if (!imaGovor) continue;

            if (!set.has(linija)) {
                set.add(linija);
                lista.push(linija);
            }
        }

        return lista;
    };

    function jeUloga(linija) {
        const x = linija.trim();
        if (x.length === 0) return false;
        if (!/[A-Za-zČĆŽŠĐ]/.test(x)) return false; 
        if (!/^[A-ZČĆŽŠĐ ]+$/.test(x)) return false; 
        return true;
    }

    function jeLinijaUZagradama(linija) {
        const t = linija.trim();
        return t.startsWith('(') && t.endsWith(')') && t.length >= 2;
    }
    function razlikaSlova(a, b) {
        let min = Math.min(a.length, b.length);
        let diff = 0;
        for (let i = 0; i < min; i++) {
            if (a[i] !== b[i]) diff++;
        }
        diff += Math.abs(a.length - b.length);
        return diff;
    }
    let pogresnaUloga = function() {
        const linije = div.innerText.split(/\n/);
        const mapa = new Map();

        for (let i = 0; i < linije.length; i++) {
            const l1 = linije[i].trim();
            if (!jeUloga(l1)) continue;

            let imaGovor = false;
            for (let j = i + 1; j < linije.length; j++) {
                const l2 = linije[j].trim();
                if (l2.length === 0) continue;
                if (jeUloga(l2)) break;
                if (!jeLinijaUZagradama(l2)) { imaGovor = true; break; }
            }

            if (imaGovor) mapa.set(l1, (mapa.get(l1) || 0) + 1);
        }

        const sve = Array.from(mapa.keys());
        const rezultat = new Set();

        for (let i = 0; i < sve.length; i++) {
            for (let j = 0; j < sve.length; j++) {
                if (i === j) continue;
                const A = sve[i], B = sve[j];
                const countA = mapa.get(A), countB = mapa.get(B);
                if (countB >= 4 && countB - countA >= 3) {
                    const diff = razlikaSlova(A, B);
                    if ((A.length <= 5 && B.length <= 5 && diff <= 1) ||
                        (A.length > 5 || B.length > 5) && diff <= 2) {
                        rezultat.add(A);
                    }
                }
            }
        }

        return Array.from(rezultat);
    };
    
    let brojLinijaTeksta = function (uloga) {
        const divEditor = document.getElementById('divEditor'); 
        
        if (!divEditor || typeof uloga !== "string") {
            console.error("Editor element nije pronađen ili 'uloga' nije string.");
            return 0;
        }
        
        uloga = uloga.trim().toUpperCase();
        let fullText = divEditor.innerHTML
            .replace(/<br\s*\/?>/gi, "\n") 
            .replace(/<[^>]*>/g, "") 
            .trim();

        const linije = fullText.split('\n').map(l => l.trim());

        let aktivnaUloga = null;
        let count = 0;

        for (let l of linije) {
            if (!l) continue; 

            if (/^[A-ZČĆŠĐŽ ]+$/.test(l)) {
                aktivnaUloga = l.toUpperCase();
                continue;
            }

            if (aktivnaUloga === uloga) {
                
                if (/^\(.*\)$/.test(l)) continue;
                count++;
            }
        }

        return count;
    };

 
    let scenarijUloge = function(ulogaParam) {
        if (typeof ulogaParam !== "string") return [];

        const target = ulogaParam.trim().toUpperCase();
        const tekst = div.innerText;
        const linije = tekst.split(/\r?\n/);

        const regexScena = /^(INT\.|EXT\.)/;
        const regexUloga = /^[A-ZČĆŽŠĐ]+(?:\s+[A-ZČĆŽŠĐ]+)*$/; 

        let trenutnaScena = "NEPOZNATA SCENA";
        let replike = [];
        let i = 0;

        while (i < linije.length) {
            let linija = linije[i].trim();
            if (!linija) { i++; continue; }
            if (regexScena.test(linija)) {
                trenutnaScena = linija;
                i++;
                continue;
            }
            if (regexUloga.test(linija)) {
                let imeUloge = linija;
                i++;

                let tekstReplike = "";

                while (i < linije.length) {
                    let slj = linije[i].trim();
                    if (!slj) break;
                    if (regexUloga.test(slj)) break;
                    if (regexScena.test(slj)) break;

                    if (tekstReplike.length > 0) tekstReplike += "\n";
                    tekstReplike += slj;

                    i++;
                }

                if (!tekstReplike.trim()) continue; 

                replike.push({
                    scena: trenutnaScena,
                    uloga: imeUloge,
                    tekst: tekstReplike
                });

                continue;
            }

            i++;
        }
        const rezultat = [];
        let scenaPozicija = {}; 

        for (let idx = 0; idx < replike.length; idx++) {
            const r = replike[idx];
            if (!scenaPozicija[r.scena]) scenaPozicija[r.scena] = 0;
            scenaPozicija[r.scena]++;

            if (r.uloga !== target) continue;
            let prethodni = null;
            for (let j = idx - 1; j >= 0; j--) {
                if (replike[j].scena === r.scena) {
                    prethodni = {
                        uloga: replike[j].uloga,
                        linije: replike[j].tekst
                    };
                    break;
                }
            }
            let sljedeci = null;
            for (let j = idx + 1; j < replike.length; j++) {
                if (replike[j].scena === r.scena) {
                    sljedeci = {
                        uloga: replike[j].uloga,
                        linije: replike[j].tekst
                    };
                    break;
                }
            }

            rezultat.push({
                scena: r.scena,
                pozicijaUTekstu: scenaPozicija[r.scena],
                prethodni,
                trenutni: { uloga: r.uloga, linije: r.tekst },
                sljedeci
            });
        }

        return rezultat;
    };

    let grupisiUloge = function () {
        const linije = div.innerText.split(/\r?\n/).map(l => l.trim());

        const ulogaRegex = /^[A-ZČĆŽŠĐ]+$/;
        const scenaRegex = /^(INT\.|EXT\.)/; 

        let rezultat = [];
        let trenutnaScena = null;
        let trenutniSegmentUloge = [];
        let segmentBrojac = 0;

        for (let l of linije) {
            if (!l) continue;
            if (scenaRegex.test(l)) {
                if (trenutnaScena && trenutniSegmentUloge.length > 0) {
                    rezultat.push({
                        scena: trenutnaScena,
                        segment: segmentBrojac,
                        uloge: [...new Set(trenutniSegmentUloge)]
                    });
                }
                trenutnaScena = l;
                segmentBrojac = 1;
                trenutniSegmentUloge = [];
                continue;
            }
            if (l.startsWith("AKCIJA")) {
                if (trenutniSegmentUloge.length > 0) {
                    rezultat.push({
                        scena: trenutnaScena,
                        segment: segmentBrojac,
                        uloge: [...new Set(trenutniSegmentUloge)]
                    });
                }
                segmentBrojac++;
                trenutniSegmentUloge = [];
                continue;
            }

            if (ulogaRegex.test(l)) {
                if (trenutnaScena) {
                    trenutniSegmentUloge.push(l);
                }
            }
        }
        if (trenutnaScena && trenutniSegmentUloge.length > 0) {
            rezultat.push({
                scena: trenutnaScena,
                segment: segmentBrojac,
                uloge: [...new Set(trenutniSegmentUloge)]
            });
        }

        return rezultat;
    };


    let formatirajTekst = function (komanda) {
        const dozvoljene = ["bold", "italic", "underline"];
        if (!dozvoljene.includes(komanda)) return false;

        const sel = window.getSelection();
        if (!sel.rangeCount) return false;

        const range = sel.getRangeAt(0);
        if (!div.contains(range.commonAncestorContainer)) return false;

        if (range.collapsed) return false;

        let cmd = "";
        if (komanda === "bold") cmd = "bold";
        if (komanda === "italic") cmd = "italic";
        if (komanda === "underline") cmd = "underline";

        document.execCommand(cmd, false, null);

        return true;
    };
    
    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst: formatirajTekst
    };
}
