// Die Firebase-Zugangsdaten liegen in firebase-config.js (nicht im Repository, siehe firebase-config.example.js)
if (!window.FIREBASE_CONFIG) {
    document.body.insertAdjacentHTML('afterbegin',
        '<p style="padding:16px;color:#B02A3F;font-family:system-ui">firebase-config.js fehlt. ' +
        'Kopiere firebase-config.example.js nach firebase-config.js und trage deine Firebase-Daten ein.</p>');
    throw new Error('firebase-config.js fehlt');
}

firebase.initializeApp(window.FIREBASE_CONFIG);
const database = firebase.database();
const auth = firebase.auth();

let cloudData = {};
let pendingUpdates = {};
let saveTimeout = null;
let vermoegenChartInstance = null;

// UI: Beträge im deutschen Format anzeigen (1.234,56) – reine Anzeige, keine Datenänderung
function formatEuro(num) {
    return (Number(num) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== Login-Statistik =====
// Speicherort: loginStats/<uid> = { email, besuche, logins, letzterBesuch, letzterBesuchText, letzterLogin, letzterLoginText }
//   besuche = wie oft die App geöffnet wurde (eine Zählung pro Sitzung, Neuladen zählt nicht doppelt)
//   logins  = wie oft sich jemand aktiv mit E-Mail und Passwort angemeldet hat
function statistikErfassen(user, art) {
    if (!user) return;
    try {
        const ref = database.ref('loginStats/' + user.uid);
        const jetzt = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

        ref.child(art).transaction(
            (n) => (n || 0) + 1,
            (fehler) => { if (fehler) console.warn('Login-Zähler konnte nicht gespeichert werden:', fehler.message); }
        );

        const daten = { email: user.email || '' };
        if (art === 'besuche') {
            daten.letzterBesuch = firebase.database.ServerValue.TIMESTAMP;
            daten.letzterBesuchText = jetzt;
        } else {
            daten.letzterLogin = firebase.database.ServerValue.TIMESTAMP;
            daten.letzterLoginText = jetzt;
        }
        ref.update(daten).catch((fehler) => console.warn('Login-Statistik konnte nicht gespeichert werden:', fehler.message));
    } catch (fehler) {
        console.warn('Login-Statistik übersprungen:', fehler);
    }
}

// Zählt pro Sitzung nur einmal (Neuladen der Seite zählt nicht erneut)
function besuchZaehlen(user) {
    try {
        if (sessionStorage.getItem('besuchGezaehlt') === user.uid) return;
        sessionStorage.setItem('besuchGezaehlt', user.uid);
    } catch (e) {
        // sessionStorage nicht verfügbar: dann lieber einmal zu oft als gar nicht zählen
    }
    statistikErfassen(user, 'besuche');
}

// Login Event Handler
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    auth.signInWithEmailAndPassword(email, password)
        .then(cred => statistikErfassen(cred.user, 'logins'))
        .catch(error => {
            errorDiv.innerText = "Anmeldung fehlgeschlagen: " + error.message;
        });
}

// Logout Handler
function handleLogout() {
    auth.signOut();
}

// Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initApp();
        besuchZaehlen(user);
    } else {
        try { sessionStorage.removeItem('besuchGezaehlt'); } catch (e) {}
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
    }
});

function setCloudItem(key, value) {
    cloudData[key] = value;
    if (!auth.currentUser) return;
    pendingUpdates[key] = value;
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (Object.keys(pendingUpdates).length > 0) {
            database.ref('haushalt').update(pendingUpdates);
            pendingUpdates = {};
        }
    }, 500);
}

function getCloudItem(key) {
    return cloudData[key] !== undefined ? cloudData[key] : null;
}

const inputKontostand = document.getElementById('kontostand');
const monatSelect = document.getElementById('monatSelect');
const jahrSelect = document.getElementById('jahrSelect');

function openTab(tabName, btn) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    btn.classList.add('active');

    if (tabName === 'vermoegenTab' && document.getElementById('chartContainer').style.display === 'block') {
        updateAssetChart();
    }
}
window.openTab = openTab;

// ===== Monatsrechner: beliebig viele Ausgaben =====
// Speicherformat (kompatibel zum bisherigen):
//   Ausgaben:  <prefix>ausgabeName{i}, <prefix>ausgabe{i}, <prefix>status{i}  (wie bisher)
//   Anzahl:    <prefix>ausgabeAnzahl                                          (neu)
//   Vorlage:   template_ausgabeName{i} / template_ausgabe{i} / template_ausgabeAnzahl
// Fehlt die Anzahl (alte Daten), gelten wie früher 16 Ausgaben.
const ALTE_ANZAHL_AUSGABEN = 16;

const LISTEN = {
    ausgabe: {
        nameKey: 'ausgabeName', betragKey: 'ausgabe', statusKey: 'status', countKey: 'ausgabeAnzahl',
        bodyId: 'ausgabenBody', leerId: 'ausgabenLeer', offenId: 'ausgabenOffen',
        label: 'Ausgabe', statusLabel: 'Abgebucht', vorzeichen: -1, alteAnzahl: ALTE_ANZAHL_AUSGABEN
    }
};

const monat = { ausgabe: [] };

function istWahr(v) {
    return v === true || v === 'true';
}

function getPrefix() {
    return `haushalt_${jahrSelect.value}_${monatSelect.value}_`;
}

// Wie viele Einträge liegen aktuell unter diesem Prefix in der Datenbank?
function gespeicherteAnzahl(prefix, typ) {
    const cfg = LISTEN[typ];
    const anzahl = getCloudItem(prefix + cfg.countKey);
    return anzahl === null ? cfg.alteAnzahl : (parseInt(anzahl, 10) || 0);
}

function leseListe(prefix, typ) {
    const cfg = LISTEN[typ];
    const altesFormat = getCloudItem(prefix + cfg.countKey) === null;
    const anzahl = gespeicherteAnzahl(prefix, typ);
    const eintraege = [];
    for (let i = 1; i <= anzahl; i++) {
        const name = getCloudItem(prefix + cfg.nameKey + i);
        const betrag = getCloudItem(prefix + cfg.betragKey + i);
        eintraege.push({
            name: name !== null ? String(name) : '',
            betrag: betrag !== null ? String(betrag) : '',
            status: istWahr(getCloudItem(prefix + cfg.statusKey + i))
        });
    }
    // Alte, fest angelegte 16 Zeilen: leere Zeilen am Ende ausblenden
    if (altesFormat) {
        while (eintraege.length > 0) {
            const letzter = eintraege[eintraege.length - 1];
            if (letzter.name.trim() === '' && (parseFloat(letzter.betrag) || 0) === 0) eintraege.pop();
            else break;
        }
    }
    return eintraege;
}

function speichereListe(prefix, typ, alsVorlage) {
    const cfg = LISTEN[typ];
    const eintraege = monat[typ];
    const vorher = gespeicherteAnzahl(prefix, typ);

    eintraege.forEach((e, idx) => {
        const i = idx + 1;
        setCloudItem(prefix + cfg.nameKey + i, e.name);
        setCloudItem(prefix + cfg.betragKey + i, e.betrag);
        if (!alsVorlage) setCloudItem(prefix + cfg.statusKey + i, e.status);
    });

    // Gelöschte Einträge auch in der Datenbank entfernen (null = löschen)
    for (let i = eintraege.length + 1; i <= vorher; i++) {
        setCloudItem(prefix + cfg.nameKey + i, null);
        setCloudItem(prefix + cfg.betragKey + i, null);
        if (!alsVorlage) setCloudItem(prefix + cfg.statusKey + i, null);
    }

    setCloudItem(prefix + cfg.countKey, eintraege.length);
}

function erstelleEintragZeile(typ, idx) {
    const cfg = LISTEN[typ];
    const e = monat[typ][idx];
    const zeile = document.createElement('div');
    zeile.className = 'entry' + (e.status ? ' abgebucht' : '');
    zeile.dataset.index = idx;
    zeile.innerHTML = `
            <input type="text" class="fix-name-input entry-name" placeholder="${cfg.label} benennen" aria-label="Bezeichnung">
            <input type="number" class="entry-betrag" step="0.01" placeholder="0" aria-label="Betrag in Euro">
            <label class="switch" title="${cfg.statusLabel}">
                <input type="checkbox" class="entry-status" aria-label="${cfg.statusLabel}">
                <span class="slider"></span>
            </label>
            <button type="button" class="entry-delete" aria-label="${cfg.label} löschen" title="${cfg.label} löschen">×</button>
        `;
    // Werte als Eigenschaften setzen (nicht ins HTML), damit Sonderzeichen in Namen nichts kaputt machen
    zeile.querySelector('.entry-name').value = e.name;
    zeile.querySelector('.entry-betrag').value = e.betrag;
    zeile.querySelector('.entry-status').checked = e.status;
    return zeile;
}

function zeichneListe(typ) {
    const cfg = LISTEN[typ];
    const body = document.getElementById(cfg.bodyId);
    body.innerHTML = '';
    monat[typ].forEach((_, idx) => body.appendChild(erstelleEintragZeile(typ, idx)));
    document.getElementById(cfg.leerId).hidden = monat[typ].length > 0;
}

function addEntry(typ) {
    monat[typ].push({ name: '', betrag: '', status: false });
    zeichneListe(typ);
    calcSum();
    const body = document.getElementById(LISTEN[typ].bodyId);
    const neu = body.lastElementChild && body.lastElementChild.querySelector('.entry-name');
    if (neu) neu.focus();
}
window.addEntry = addEntry;

function richteListeEin(typ) {
    const cfg = LISTEN[typ];
    const body = document.getElementById(cfg.bodyId);

    body.addEventListener('input', (ev) => {
        const zeile = ev.target.closest('.entry');
        if (!zeile) return;
        const e = monat[typ][Number(zeile.dataset.index)];
        if (ev.target.classList.contains('entry-name')) e.name = ev.target.value;
        if (ev.target.classList.contains('entry-betrag')) e.betrag = ev.target.value;
        calcSum();
    });

    // Abhaken: Ausgabe -> vom Kontostand abziehen, Haken entfernen -> wieder aufrechnen
    body.addEventListener('change', (ev) => {
        if (!ev.target.classList.contains('entry-status')) return;
        const zeile = ev.target.closest('.entry');
        const e = monat[typ][Number(zeile.dataset.index)];
        const betrag = parseFloat(e.betrag) || 0;
        let aktuellerKontostand = parseFloat(inputKontostand.value) || 0;

        e.status = ev.target.checked;
        aktuellerKontostand += (e.status ? 1 : -1) * cfg.vorzeichen * betrag;

        inputKontostand.value = (Math.round(aktuellerKontostand * 100) / 100).toFixed(2);
        zeile.classList.toggle('abgebucht', e.status);
        calcSum();
    });

    body.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.entry-delete');
        if (!btn) return;
        const idx = Number(btn.closest('.entry').dataset.index);
        const e = monat[typ][idx];
        const hatInhalt = e.name.trim() !== '' || (parseFloat(e.betrag) || 0) !== 0;
        if (hatInhalt && !confirm(`${cfg.label} „${e.name || 'ohne Namen'}“ löschen?`)) return;
        monat[typ].splice(idx, 1);
        zeichneListe(typ);
        calcSum();
    });
}

function loadData() {
    const prefix = getPrefix();

    // Hat dieser Monat schon eigene Daten? (neues Format: Anzahl vorhanden, altes Format: ein Name vorhanden)
    let hatDaten = getCloudItem(prefix + 'ausgabeAnzahl') !== null;
    if (!hatDaten) {
        for (let i = 1; i <= ALTE_ANZAHL_AUSGABEN; i++) {
            const savedName = getCloudItem(prefix + 'ausgabeName' + i);
            if (savedName && String(savedName).trim() !== '') { hatDaten = true; break; }
        }
    }

    inputKontostand.value = getCloudItem(prefix + 'kontostand') || 0;

    // Neuer Monat: Einträge aus der Vorlage (zuletzt bearbeiteter Monat) übernehmen, alle offen
    const quelle = hatDaten ? prefix : 'template_';
    Object.keys(LISTEN).forEach(typ => {
        monat[typ] = leseListe(quelle, typ);
        if (!hatDaten) monat[typ].forEach(e => { e.status = false; });
        zeichneListe(typ);
    });

    calcSum();
}

function calcSum() {
    const prefix = getPrefix();
    const aktuellerKontostand = parseFloat(inputKontostand.value) || 0;

    const offen = { ausgabe: 0 };
    Object.keys(LISTEN).forEach(typ => {
        monat[typ].forEach(e => {
            if (!e.status) offen[typ] += parseFloat(e.betrag) || 0;
        });
        document.getElementById(LISTEN[typ].offenId).innerText = formatEuro(offen[typ]);
    });

    // Speichern
    speichereListe(prefix, 'ausgabe', false);

    const hasContent = monat.ausgabe.some(e => e.name.trim() !== '');
    if (hasContent) {
        speichereListe('template_', 'ausgabe', true);
    }

    const verfuegbaresGeld = aktuellerKontostand - offen.ausgabe;
    setCloudItem(prefix + 'kontostand', inputKontostand.value);
    setCloudItem('letzterMonat', monatSelect.value);
    setCloudItem('letztesJahr', jahrSelect.value);

    document.getElementById('result').innerText = formatEuro(verfuegbaresGeld);

    const resultRow = document.getElementById('monatResultRow');
    if (verfuegbaresGeld < 0) {
        resultRow.classList.add('minus');
    } else {
        resultRow.classList.remove('minus');
    }
}

function initDate() {
    const heute = new Date();
    const aktuellerMonat = String(heute.getMonth() + 1).padStart(2, '0');
    const aktuellesJahr = String(heute.getFullYear());

    monatSelect.value = getCloudItem('letzterMonat') || aktuellerMonat;
    jahrSelect.value = getCloudItem('letztesJahr') || aktuellesJahr;
}

const standardFixkosten = [
    "Miete / Hypothek", "Strom", "Gas / Heizung", "Internet & Festnetz",
    "Rundfunkbeitrag (GEZ)", "Handyvertrag", "Fitnessstudio", "Streaming-Dienste",
    "Haftpflichtversicherung", "KFZ-Versicherung", "Sparen / Depot", "Sonstiges"
];

function createFixkostenRows() {
    const fixkostenBody = document.getElementById('fixkostenBody');
    fixkostenBody.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td>
                    <input type="text" class="fix-name-input" id="fixName${i}" value="${standardFixkosten[i] || 'Fixkosten ' + (i+1)}">
                </td>
                <td>
                    <input type="number" id="fixBetrag${i}" value="0" step="0.01" aria-label="Betrag">
                </td>
                <td style="text-align: center;">
                    <select id="fixTurnus${i}" aria-label="Turnus">
                        <option value="monatlich">Monatlich</option>
                        <option value="quartal">Quartal</option>
                        <option value="jaehrlich">Jährlich</option>
                    </select>
                </td>
            `;
        fixkostenBody.appendChild(tr);
        document.getElementById(`fixName${i}`).addEventListener('input', calcFixkostenSum);
        document.getElementById(`fixBetrag${i}`).addEventListener('input', calcFixkostenSum);
        document.getElementById(`fixTurnus${i}`).addEventListener('change', calcFixkostenSum);
    }
}

function loadFixkostenData() {
    for (let i = 0; i < 16; i++) {
        const nameEl = document.getElementById(`fixName${i}`);
        const betragEl = document.getElementById(`fixBetrag${i}`);
        const turnusEl = document.getElementById(`fixTurnus${i}`);

        const savedName = getCloudItem(`fix_name_${i}`);
        const savedBetrag = getCloudItem(`fix_betrag_${i}`);
        const savedTurnus = getCloudItem(`fix_turnus_${i}`);

        if (savedName !== null) nameEl.value = savedName;
        if (savedBetrag !== null) betragEl.value = savedBetrag;
        if (savedTurnus !== null) turnusEl.value = savedTurnus;

    }
    calcFixkostenSum();
}

// Monatliche Fixkosten (Summe und Einzelposten) – wird vom Bereich "Einnahmen & Fixkosten" genutzt
let fixkostenMonatlich = 0;
let fixkostenPosten = [];

function calcFixkostenSum() {
    let monatlicheGesamtsumme = 0;
    const posten = [];

    for (let i = 0; i < 16; i++) {
        const nameEl = document.getElementById(`fixName${i}`);
        const betragEl = document.getElementById(`fixBetrag${i}`);
        const turnusEl = document.getElementById(`fixTurnus${i}`);

        let betrag = parseFloat(betragEl.value) || 0;
        let turnus = turnusEl.value;
        let monatlich;

        if (turnus === 'jaehrlich') {
            monatlich = betrag / 12;
        } else if (turnus === 'quartal') {
            monatlich = betrag / 3;
        } else {
            monatlich = betrag;
        }
        monatlicheGesamtsumme += monatlich;
        posten.push({ index: i, name: nameEl.value || `Fixkosten ${i + 1}`, monatlich, turnus });

        setCloudItem(`fix_name_${i}`, nameEl.value);
        setCloudItem(`fix_betrag_${i}`, betragEl.value);
        setCloudItem(`fix_turnus_${i}`, turnus);
    }

    document.getElementById('fixResult').innerText = formatEuro(monatlicheGesamtsumme);

    fixkostenMonatlich = monatlicheGesamtsumme;
    fixkostenPosten = posten;
    if (budgetGeladen) {
        zeichneBudgetFix();
        updateBudget(false);
    }
}

const standardAssets = [
    "Girokonto / Cash", "Tagesgeld / Notgroschen", "ETF & Aktiendepot",
    "Kryptowährungen", "Edelmetalle (Gold/Silber)", "Bausparer / Altersvorsorge",
    "Immobilien / Sachwerte", "Sonstiges Vermögen"
];

function createVermoegenRows() {
    const assetBody = document.getElementById('assetBody');
    assetBody.innerHTML = '';
    for (let i = 0; i < standardAssets.length; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td><input type="text" class="fix-name-input" id="assetName${i}" value="${standardAssets[i]}"></td>
                <td><input type="number" id="assetWert${i}" value="0" step="0.01" aria-label="Wert"></td>
            `;
        assetBody.appendChild(tr);
        document.getElementById(`assetName${i}`).addEventListener('input', () => calcVermoegenSum(true));
        document.getElementById(`assetWert${i}`).addEventListener('input', () => calcVermoegenSum(true));
    }
}

function loadVermoegenData() {
    for (let i = 0; i < standardAssets.length; i++) {
        const nameEl = document.getElementById(`assetName${i}`);
        const wertEl = document.getElementById(`assetWert${i}`);

        const savedName = getCloudItem(`asset_name_${i}`);
        const savedWert = getCloudItem(`asset_wert_${i}`);

        if (savedName !== null) nameEl.value = savedName;
        if (savedWert !== null) wertEl.value = savedWert;

    }

    calcVermoegenSum(false); // nur anzeigen – beim Öffnen wird KEIN Datenpunkt angelegt
}

function calcVermoegenSum(ausEingabe) {
    let gesamtAsset = 0;

    for (let i = 0; i < standardAssets.length; i++) {
        const nameEl = document.getElementById(`assetName${i}`);
        const wertEl = document.getElementById(`assetWert${i}`);
        let wert = parseFloat(wertEl.value) || 0;
        gesamtAsset += wert;

        setCloudItem(`asset_name_${i}`, nameEl.value);
        setCloudItem(`asset_wert_${i}`, wertEl.value);
    }

    document.getElementById('totalAssetResult').innerText = formatEuro(gesamtAsset);

    if (ausEingabe === true) {
        speichereVermoegensPunkt(gesamtAsset);
    }

    if (document.getElementById('chartContainer').style.display === 'block') {
        updateAssetChart();
    }

    aktualisiereDepotHinweis();
    if (einkGeladen) updateEinkommen(false);
}

// Lokales Datum (YYYY-MM-DD), damit der Tageswechsel um Mitternacht deutscher Zeit passiert
function heutigesDatum() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Legt pro Tag höchstens einen Punkt an – und nur, wenn sich der Gesamtwert
// gegenüber dem letzten gespeicherten Punkt tatsächlich geändert hat.
function speichereVermoegensPunkt(gesamt) {
    const heute = heutigesDatum();
    const heuteKey = `asset_history_${heute}`;
    const wert = Math.round(gesamt * 100) / 100;

    // letzten Punkt VOR heute suchen
    let letztesDatum = null;
    let letzterWert = null;
    for (const key in cloudData) {
        if (!key.startsWith('asset_history_') || cloudData[key] === null) continue;
        const datum = key.replace('asset_history_', '');
        if (datum >= heute) continue;
        if (letztesDatum === null || datum > letztesDatum) {
            letztesDatum = datum;
            letzterWert = parseFloat(cloudData[key]);
        }
    }

    const unveraendert = letzterWert !== null && Math.abs(letzterWert - wert) < 0.005;

    if (unveraendert) {
        // Wert wieder auf Stand des letzten Punkts -> heutigen Punkt entfernen (falls vorhanden)
        if (getCloudItem(heuteKey) !== null) setCloudItem(heuteKey, null);
        return;
    }

    const heuteGespeichert = getCloudItem(heuteKey);
    if (heuteGespeichert === null || parseFloat(heuteGespeichert) !== wert) {
        setCloudItem(heuteKey, wert);
    }
}

// --- Chart Funktionen ---
function toggleAssetChart() {
    const container = document.getElementById('chartContainer');
    const toggleBtn = document.getElementById('chartToggleBtn');
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        updateAssetChart();
        if (toggleBtn) { toggleBtn.textContent = 'Vermögensentwicklung ausblenden'; toggleBtn.setAttribute('aria-expanded', 'true'); }
    } else {
        container.style.display = 'none';
        if (toggleBtn) { toggleBtn.textContent = 'Vermögensentwicklung anzeigen'; toggleBtn.setAttribute('aria-expanded', 'false'); }
    }
}

let clickedChartPoints = [];

function handleChartClick(date, value) {
    const outputEl = document.getElementById('chartDiffOutput');
    outputEl.style.display = 'block';

    // Wenn bereits 2 Punkte ausgewählt waren, starte wieder bei 1
    if (clickedChartPoints.length >= 2) {
        clickedChartPoints = [];
    }

    clickedChartPoints.push({ date, value });

    // Hilfsfunktion für die Formatierung (10.000,00)
    const formatCurrency = (num) => formatEuro(num);

    const resetBtn = `<button type="button" class="text-btn" onclick="resetChartSelection()">Auswahl zurücksetzen</button>`;

    if (clickedChartPoints.length === 1) {
        outputEl.innerHTML = `
            <div class="diff-row"><span>${clickedChartPoints[0].date}</span><span>${formatCurrency(clickedChartPoints[0].value)} €</span></div>
            <p class="diff-hint">Tippe einen zweiten Punkt an, um die Differenz zu sehen.</p>
            ${resetBtn}
        `;
    } else if (clickedChartPoints.length === 2) {
        const p1 = clickedChartPoints[0];
        const p2 = clickedChartPoints[1];

        const diff = p2.value - p1.value;

        // Farben: Grün für positiv, Rot für negativ
        let diffClass = '';
        if (diff > 0) diffClass = 'diff-pos';
        else if (diff < 0) diffClass = 'diff-neg';

        const sign = diff > 0 ? '+' : '';

        outputEl.innerHTML = `
            <div class="diff-row"><span>${p1.date}</span><span>${formatCurrency(p1.value)} €</span></div>
            <div class="diff-row"><span>${p2.date}</span><span>${formatCurrency(p2.value)} €</span></div>
            <div class="diff-row diff-total"><span>Differenz</span><span class="${diffClass}">${sign}${formatCurrency(diff)} €</span></div>
            ${resetBtn}
        `;
    }
}

function updateAssetChart() {
    const historyData = [];

    for (let key in cloudData) {
        if (key.startsWith('asset_history_') && cloudData[key] !== null) {
            const dateString = key.replace('asset_history_', '');
            historyData.push({
                date: dateString,
                value: parseFloat(cloudData[key])
            });
        }
    }

    historyData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = historyData.map(item => {
        const d = new Date(item.date);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    });
    const dataPoints = historyData.map(item => item.value);

    const ctx = document.getElementById('assetChart').getContext('2d');

    if (vermoegenChartInstance) {
        vermoegenChartInstance.data.labels = labels;
        vermoegenChartInstance.data.datasets[0].data = dataPoints;
        vermoegenChartInstance.update();
    } else {
        const css = getComputedStyle(document.documentElement);
        const cLine = css.getPropertyValue('--spruce').trim() || '#1F5C4E';
        const cFill = css.getPropertyValue('--spruce-soft').trim() || 'rgba(31, 92, 78, 0.12)';
        const cGrid = css.getPropertyValue('--line').trim() || '#DCE3DE';
        const cText = css.getPropertyValue('--muted').trim() || '#5F6E69';
        Chart.defaults.font.family = css.getPropertyValue('--font').trim() || 'system-ui, sans-serif';
        Chart.defaults.color = cText;

        vermoegenChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gesamtvermögen (€)',
                    data: dataPoints,
                    borderColor: cLine,
                    backgroundColor: cFill,
                    borderWidth: 2.5,
                    pointBackgroundColor: cLine,
                    pointRadius: 3.5,
                    pointHoverRadius: 6,
                    pointHitRadius: 14,
                    fill: true,
                    tension: 0.3 // Leicht gebogene Linie
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxRotation: 0, autoSkipPadding: 12 }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: cGrid },
                        border: { display: false },
                        ticks: { callback: (v) => Number(v).toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €' }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        displayColors: false,
                        callbacks: { label: (item) => formatEuro(item.parsed.y) + ' €' }
                    }
                },
                // NEU: Klick auf Datenpunkte abfangen
                onClick: (event, elements, chart) => {
                    if (elements.length > 0) {
                        const dataIndex = elements[0].index;
                        const date = chart.data.labels[dataIndex];
                        const value = chart.data.datasets[0].data[dataIndex];

                        handleChartClick(date, value);
                    }
                }
            }
        });
    }
}

// ===== Einnahmen & Fixkosten (Monatsbudget mit Szenarien) =====
// Speicherort (in "haushalt"):
//   budget_szenarien = JSON-Text: [{ name, einnahmen: [{name, betrag}], sparen: [{name, betrag, einheit: 'eur'|'proz'}],
//                                    fix: { "<Zeile im Fixkosten-Tab>": "Betrag pro Monat" }, fixExtra: [{name, betrag}] }, …]
//   fix      = Abweichungen vom Fixkosten-Tab nur in diesem Szenario (der Tab selbst bleibt unverändert)
//   fixExtra = zusätzliche Fixkosten, die es nur in diesem Szenario gibt
//   budget_aktiv     = Index des zuletzt geöffneten Szenarios
// Ältere Daten (budget_anzahl, budget_name_i, budget_betrag_i) werden beim ersten Laden als Szenario 1 übernommen.
// Die Fixkosten kommen live aus dem Fixkosten-Tab (fixkostenMonatlich / fixkostenPosten) und gelten für alle Szenarien.
let budgetSzenarien = [];
let budgetAktiv = 0;
let budgetGeladen = false;

const BUDGET_LISTEN = {
    einnahmen: { bodyId: 'budgetBody', leerId: 'budgetLeer', label: 'Einnahme' },
    sparen: { bodyId: 'sparBody', leerId: 'sparLeer', label: 'Sparrate' }
};

function budgetSzenario() {
    return budgetSzenarien[budgetAktiv];
}

function budgetSzenarioName(sz, idx) {
    return (sz.name || '').trim() || `Szenario ${idx + 1}`;
}

function normalisiereSzenario(sz) {
    const text = (v) => (v === null || v === undefined ? '' : String(v));
    return {
        name: text(sz && sz.name),
        einnahmen: (Array.isArray(sz && sz.einnahmen) ? sz.einnahmen : []).map(e => ({ name: text(e.name), betrag: text(e.betrag) })),
        sparen: (Array.isArray(sz && sz.sparen) ? sz.sparen : []).map(e => ({
            name: text(e.name), betrag: text(e.betrag), einheit: e.einheit === 'proz' ? 'proz' : 'eur'
        })),
        fix: Object.fromEntries(Object.entries((sz && typeof sz.fix === 'object' && sz.fix) || {})
            .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
            .map(([k, v]) => [String(k), String(v)])),
        fixExtra: (Array.isArray(sz && sz.fixExtra) ? sz.fixExtra : []).map(e => ({ name: text(e.name), betrag: text(e.betrag) }))
    };
}

function loadBudgetData() {
    budgetSzenarien = [];
    const gespeichert = getCloudItem('budget_szenarien');
    if (gespeichert !== null) {
        try {
            const liste = JSON.parse(gespeichert);
            if (Array.isArray(liste)) budgetSzenarien = liste.map(normalisiereSzenario);
        } catch (e) {
            console.warn('Szenarien konnten nicht gelesen werden:', e);
        }
    }

    if (budgetSzenarien.length === 0) {
        // Übernahme aus der Version ohne Szenarien
        const einnahmen = [];
        const anzahl = getCloudItem('budget_anzahl');
        if (anzahl === null) {
            einnahmen.push({ name: 'Nettogehalt', betrag: '' });
        } else {
            const n = parseInt(anzahl, 10) || 0;
            for (let i = 1; i <= n; i++) {
                const name = getCloudItem('budget_name_' + i);
                const betrag = getCloudItem('budget_betrag_' + i);
                einnahmen.push({ name: name !== null ? String(name) : '', betrag: betrag !== null ? String(betrag) : '' });
            }
        }
        budgetSzenarien.push({ name: 'Aktuell', einnahmen, sparen: [], fix: {}, fixExtra: [] });
    }

    budgetAktiv = Math.min(budgetSzenarien.length - 1, Math.max(0, parseInt(getCloudItem('budget_aktiv'), 10) || 0));
    budgetGeladen = true;
    zeichneBudgetSzenario();
    updateBudget(false);
}

function speichereBudget() {
    setCloudItem('budget_szenarien', JSON.stringify(budgetSzenarien));
    setCloudItem('budget_aktiv', budgetAktiv);
}

// --- Szenario-Tabs ---
function zeichneBudgetTabs() {
    const bar = document.getElementById('budgetTabs');
    bar.innerHTML = '';
    budgetSzenarien.forEach((sz, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'budget-tab' + (idx === budgetAktiv ? ' active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', String(idx === budgetAktiv));
        btn.textContent = budgetSzenarioName(sz, idx);
        btn.title = btn.textContent;
        btn.addEventListener('click', () => budgetSzenarioWechseln(idx));
        bar.appendChild(btn);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'budget-tab budget-tab--add';
    add.textContent = '+ Szenario';
    add.title = 'Neues Szenario als Kopie des aktuellen anlegen';
    add.addEventListener('click', budgetSzenarioHinzufuegen);
    bar.appendChild(add);

    const aktiv = bar.children[budgetAktiv];
    if (aktiv && aktiv.scrollIntoView) aktiv.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function zeichneBudgetSzenario() {
    zeichneBudgetTabs();
    document.getElementById('budgetSzenarioName').value = budgetSzenario().name;
    document.getElementById('budgetSzenarioLoeschen').hidden = budgetSzenarien.length < 2;
    document.getElementById('budgetUebernahmeInfo').hidden = true;
    zeichneBudgetListe('einnahmen');
    zeichneBudgetListe('sparen');
    zeichneBudgetFix();
}

function budgetSzenarioWechseln(idx) {
    if (idx === budgetAktiv) return;
    budgetAktiv = idx;
    setCloudItem('budget_aktiv', budgetAktiv);
    zeichneBudgetSzenario();
    updateBudget(false);
}

// Neues Szenario startet als Kopie des aktuellen – meist ändern sich nur einzelne Einnahmen
function budgetSzenarioHinzufuegen() {
    const kopie = JSON.parse(JSON.stringify(budgetSzenario()));
    kopie.name = `Szenario ${budgetSzenarien.length + 1}`;
    budgetSzenarien.push(kopie);
    budgetAktiv = budgetSzenarien.length - 1;
    zeichneBudgetSzenario();
    updateBudget(true);
    const nameEl = document.getElementById('budgetSzenarioName');
    nameEl.focus();
    nameEl.select();
}

function budgetSzenarioLoeschen() {
    if (budgetSzenarien.length < 2) return;
    const name = budgetSzenarioName(budgetSzenario(), budgetAktiv);
    if (!confirm(`Szenario „${name}“ mit allen Einnahmen und Sparraten löschen?`)) return;
    budgetSzenarien.splice(budgetAktiv, 1);
    budgetAktiv = Math.max(0, budgetAktiv - 1);
    zeichneBudgetSzenario();
    updateBudget(true);
}

// --- Listen (Einnahmen / Sparraten) ---
function zeichneBudgetListe(typ) {
    const cfg = BUDGET_LISTEN[typ];
    const body = document.getElementById(cfg.bodyId);
    const eintraege = budgetSzenario()[typ];
    body.innerHTML = '';
    eintraege.forEach((e, idx) => {
        const zeile = document.createElement('div');
        zeile.className = 'budget-row' + (typ === 'sparen' ? ' budget-row--spar' : '');
        zeile.dataset.index = idx;
        zeile.innerHTML = `
            <input type="text" class="fix-name-input budget-name" placeholder="${cfg.label} benennen" aria-label="Bezeichnung">
            <input type="number" class="budget-betrag" step="0.01" inputmode="decimal" placeholder="0" aria-label="Betrag">
            ${typ === 'sparen' ? `<select class="budget-einheit" aria-label="Einheit">
                <option value="eur">€</option>
                <option value="proz">%</option>
            </select>` : ''}
            <button type="button" class="entry-delete" aria-label="${cfg.label} löschen" title="${cfg.label} löschen">×</button>
        `;
        zeile.querySelector('.budget-name').value = e.name;
        zeile.querySelector('.budget-betrag').value = e.betrag;
        if (typ === 'sparen') zeile.querySelector('.budget-einheit').value = e.einheit;
        body.appendChild(zeile);
    });
    document.getElementById(cfg.leerId).hidden = eintraege.length > 0;
}

function addBudgetZeile(typ) {
    const neu = typ === 'sparen' ? { name: '', betrag: '', einheit: 'eur' } : { name: '', betrag: '' };
    budgetSzenario()[typ].push(neu);
    zeichneBudgetListe(typ);
    updateBudget(true);
    const zeile = document.getElementById(BUDGET_LISTEN[typ].bodyId).lastElementChild;
    if (zeile) zeile.querySelector('.budget-name').focus();
}

// Übernimmt die Sparrate aus dem Zinseszins-Rechner und die Eigenbeiträge der Altersvorsorgedepots
function sparratenUebernehmen() {
    const quellen = [{ name: 'ETF-Sparplan', betrag: Math.max(0, zinsZahl('zinsSparrate')) }];
    for (let nr = 1; nr <= avdAnzahl(); nr++) {
        const p = avdParameter(nr);
        quellen.push({ name: `AVD ${p.name}`, betrag: p.beitrag });
    }

    const sparen = budgetSzenario().sparen;
    let neu = 0, aktualisiert = 0;
    quellen.forEach(q => {
        if (!(q.betrag > 0)) return;
        const vorhanden = sparen.find(s => s.name.trim().toLowerCase() === q.name.toLowerCase());
        if (vorhanden) {
            if (vorhanden.einheit !== 'eur' || parseFloat(vorhanden.betrag) !== q.betrag) aktualisiert++;
            vorhanden.betrag = String(q.betrag);
            vorhanden.einheit = 'eur';
        } else {
            sparen.push({ name: q.name, betrag: String(q.betrag), einheit: 'eur' });
            neu++;
        }
    });
    zeichneBudgetListe('sparen');
    updateBudget(true);
    const info = document.getElementById('budgetUebernahmeInfo');
    info.hidden = false;
    if (!quellen.some(q => q.betrag > 0)) info.textContent = 'In den Rechnern sind noch keine Sparraten eingetragen.';
    else if (neu === 0 && aktualisiert === 0) info.textContent = 'Die Sparraten aus den Rechnern sind schon übernommen.';
    else info.textContent = `${neu} neu übernommen${aktualisiert ? `, ${aktualisiert} aktualisiert` : ''}.`;
}

function richteBudgetEin() {
    const nameEl = document.getElementById('budgetSzenarioName');
    nameEl.addEventListener('input', () => {
        budgetSzenario().name = nameEl.value;
        const tab = document.getElementById('budgetTabs').children[budgetAktiv];
        if (tab) { tab.textContent = budgetSzenarioName(budgetSzenario(), budgetAktiv); tab.title = tab.textContent; }
        updateBudget(true);
    });

    Object.entries(BUDGET_LISTEN).forEach(([typ, cfg]) => {
        const body = document.getElementById(cfg.bodyId);
        const eintrag = (ev) => {
            const zeile = ev.target.closest('.budget-row');
            return zeile ? budgetSzenario()[typ][Number(zeile.dataset.index)] : null;
        };

        body.addEventListener('input', (ev) => {
            const e = eintrag(ev);
            if (!e) return;
            if (ev.target.classList.contains('budget-name')) e.name = ev.target.value;
            if (ev.target.classList.contains('budget-betrag')) e.betrag = ev.target.value;
            updateBudget(true);
        });

        body.addEventListener('change', (ev) => {
            if (!ev.target.classList.contains('budget-einheit')) return;
            const e = eintrag(ev);
            if (!e) return;
            e.einheit = ev.target.value;
            updateBudget(true);
        });

        body.addEventListener('click', (ev) => {
            const btn = ev.target.closest('.entry-delete');
            if (!btn) return;
            const liste = budgetSzenario()[typ];
            const idx = Number(btn.closest('.budget-row').dataset.index);
            const e = liste[idx];
            const hatInhalt = e.name.trim() !== '' || (parseFloat(e.betrag) || 0) !== 0;
            if (hatInhalt && !confirm(`${cfg.label} „${e.name || 'ohne Namen'}“ löschen?`)) return;
            liste.splice(idx, 1);
            zeichneBudgetListe(typ);
            updateBudget(true);
        });
    });
}

// --- Fixkosten im Szenario ---
// Wirksame Fixkosten eines Szenarios: Werte aus dem Tab, ggf. überschrieben, plus zusätzliche Posten
function fixFuerSzenario(sz) {
    let summe = 0;
    const posten = [];
    fixkostenPosten.forEach(f => {
        const eigen = sz.fix[String(f.index)];
        const angepasst = eigen !== undefined;
        const wert = angepasst ? (parseFloat(eigen) || 0) : f.monatlich;
        summe += wert;
        posten.push({ name: f.name, wert, angepasst });
    });
    sz.fixExtra.forEach(e => {
        const wert = parseFloat(e.betrag) || 0;
        summe += wert;
        posten.push({ name: e.name || 'Zusätzliche Fixkosten', wert, angepasst: true });
    });
    const anzahlAnpassungen = Object.keys(sz.fix).length + sz.fixExtra.length;
    return { summe, posten, angepasst: anzahlAnpassungen > 0, anzahlAnpassungen };
}

function rund2(v) {
    return Math.round(v * 100) / 100;
}

function zeichneBudgetFix() {
    const sz = budgetSzenario();
    const liste = document.getElementById('budgetFixListe');
    liste.innerHTML = '';
    const turnusText = { quartal: 'Quartal', jaehrlich: 'jährlich' };
    const sichtbar = fixkostenPosten.filter(f => f.monatlich !== 0 || sz.fix[String(f.index)] !== undefined);

    if (sichtbar.length === 0) {
        const p = document.createElement('p');
        p.className = 'diff-hint';
        p.textContent = 'Im Fixkosten-Tab sind noch keine Beträge eingetragen.';
        liste.appendChild(p);
    }

    sichtbar.forEach(f => {
        const eigen = sz.fix[String(f.index)];
        const row = document.createElement('div');
        row.className = 'budget-fixrow' + (eigen !== undefined ? ' angepasst' : '');
        row.dataset.index = f.index;
        row.innerHTML = `
            <span class="budget-fixname"><span class="budget-fixtitel"></span><span class="eink-quelle-sub"></span></span>
            <input type="number" class="budget-fixbetrag" step="0.01" inputmode="decimal" aria-label="Betrag pro Monat in diesem Szenario">
            <button type="button" class="budget-fixreset" title="Auf den Wert aus dem Fixkosten-Tab zurücksetzen" aria-label="Zurücksetzen">↺</button>
        `;
        row.querySelector('.budget-fixtitel').textContent = f.name + (turnusText[f.turnus] ? ` (${turnusText[f.turnus]})` : '');
        row.querySelector('.eink-quelle-sub').textContent = `Tab: ${formatEuro(f.monatlich)} €`;
        const input = row.querySelector('.budget-fixbetrag');
        input.placeholder = String(rund2(f.monatlich));
        input.value = eigen !== undefined ? eigen : String(rund2(f.monatlich));
        liste.appendChild(row);
    });

    const extra = document.getElementById('budgetFixExtra');
    extra.innerHTML = '';
    sz.fixExtra.forEach((e, idx) => {
        const row = document.createElement('div');
        row.className = 'budget-fixrow extra';
        row.dataset.extra = idx;
        row.innerHTML = `
            <input type="text" class="fix-name-input budget-fixextraname" placeholder="Fixkosten benennen" aria-label="Bezeichnung">
            <input type="number" class="budget-fixbetrag" step="0.01" inputmode="decimal" placeholder="0" aria-label="Betrag pro Monat">
            <button type="button" class="entry-delete" title="Löschen" aria-label="Zusätzliche Fixkosten löschen">×</button>
        `;
        row.querySelector('.budget-fixextraname').value = e.name;
        row.querySelector('.budget-fixbetrag').value = e.betrag;
        extra.appendChild(row);
    });

    const details = document.getElementById('budgetFixDetails');
    if (fixFuerSzenario(sz).angepasst) details.open = true;
}

function addBudgetFixExtra() {
    budgetSzenario().fixExtra.push({ name: '', betrag: '' });
    zeichneBudgetFix();
    updateBudget(true);
    const row = document.getElementById('budgetFixExtra').lastElementChild;
    if (row) row.querySelector('.budget-fixextraname').focus();
}

function budgetFixZuruecksetzen() {
    const sz = budgetSzenario();
    if (!fixFuerSzenario(sz).angepasst) return;
    if (!confirm('Alle Fixkosten-Anpassungen in diesem Szenario zurücksetzen? Zusätzliche Posten werden gelöscht.')) return;
    sz.fix = {};
    sz.fixExtra = [];
    zeichneBudgetFix();
    updateBudget(true);
}

function richteBudgetFixEin() {
    const liste = document.getElementById('budgetFixListe');
    const tabWert = (index) => {
        const f = fixkostenPosten.find(p => p.index === index);
        return f ? f.monatlich : 0;
    };

    liste.addEventListener('input', (ev) => {
        if (!ev.target.classList.contains('budget-fixbetrag')) return;
        const row = ev.target.closest('.budget-fixrow');
        const index = Number(row.dataset.index);
        const sz = budgetSzenario();
        const text = ev.target.value;
        // Leer oder gleich dem Tab-Wert = keine Anpassung
        if (text === '' || Math.abs((parseFloat(text) || 0) - tabWert(index)) < 0.005) delete sz.fix[String(index)];
        else sz.fix[String(index)] = text;
        row.classList.toggle('angepasst', sz.fix[String(index)] !== undefined);
        updateBudget(true);
    });

    // Leeres Feld nach dem Verlassen wieder mit dem Tab-Wert füllen
    liste.addEventListener('focusout', (ev) => {
        if (!ev.target.classList.contains('budget-fixbetrag') || ev.target.value !== '') return;
        ev.target.value = String(rund2(tabWert(Number(ev.target.closest('.budget-fixrow').dataset.index))));
    });

    liste.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.budget-fixreset');
        if (!btn) return;
        const row = btn.closest('.budget-fixrow');
        const index = Number(row.dataset.index);
        delete budgetSzenario().fix[String(index)];
        zeichneBudgetFix();
        updateBudget(true);
    });

    const extra = document.getElementById('budgetFixExtra');
    extra.addEventListener('input', (ev) => {
        const row = ev.target.closest('.budget-fixrow');
        if (!row) return;
        const e = budgetSzenario().fixExtra[Number(row.dataset.extra)];
        if (ev.target.classList.contains('budget-fixextraname')) e.name = ev.target.value;
        if (ev.target.classList.contains('budget-fixbetrag')) e.betrag = ev.target.value;
        updateBudget(true);
    });

    extra.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.entry-delete');
        if (!btn) return;
        const liste = budgetSzenario().fixExtra;
        const idx = Number(btn.closest('.budget-fixrow').dataset.extra);
        const e = liste[idx];
        const hatInhalt = e.name.trim() !== '' || (parseFloat(e.betrag) || 0) !== 0;
        if (hatInhalt && !confirm(`Fixkosten „${e.name || 'ohne Namen'}“ aus diesem Szenario löschen?`)) return;
        liste.splice(idx, 1);
        zeichneBudgetFix();
        updateBudget(true);
    });
}

// --- Berechnung ---
function berechneSzenario(sz) {
    const einnahmen = sz.einnahmen.reduce((s, e) => s + (parseFloat(e.betrag) || 0), 0);
    const fix = fixFuerSzenario(sz).summe;
    const nachFix = einnahmen - fix;
    const basisProzent = Math.max(0, nachFix);
    const sparen = sz.sparen.reduce((s, e) => {
        const wert = parseFloat(e.betrag) || 0;
        return s + (e.einheit === 'proz' ? basisProzent * wert / 100 : wert);
    }, 0);
    return { einnahmen, fix, nachFix, sparen, frei: nachFix - sparen };
}

function updateBudget(speichern) {
    if (!budgetGeladen) return;
    if (speichern) speichereBudget();

    const sz = budgetSzenario();
    const r = berechneSzenario(sz);
    const fixInfo = fixFuerSzenario(sz);
    const fix = r.fix;
    const prozent = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });

    document.getElementById('budgetEinnahmenSumme').textContent = formatEuro(r.einnahmen);
    document.getElementById('budgetFixSumme').textContent = '−' + formatEuro(fix) + ' €';
    const diffTab = fix - fixkostenMonatlich;
    document.getElementById('budgetFixHerkunft').textContent = fixInfo.angepasst
        ? `in diesem Szenario angepasst · Fixkosten-Tab: ${formatEuro(fixkostenMonatlich)} € (${mitVorzeichen(diffTab)})`
        : 'aus dem Fixkosten-Tab (Quartal und Jahr auf den Monat umgerechnet)';
    document.getElementById('budgetFixBox').classList.toggle('angepasst', fixInfo.angepasst);
    document.getElementById('budgetFixReset').hidden = !fixInfo.angepasst;
    const nachFixEl = document.getElementById('budgetNachFix');
    nachFixEl.textContent = formatEuro(r.nachFix) + ' €';
    nachFixEl.className = r.nachFix < 0 ? 'diff-neg' : '';
    document.getElementById('budgetSparSumme').textContent = formatEuro(r.sparen);

    document.getElementById('budgetResultLabel').textContent =
        `${budgetSzenarioName(budgetSzenario(), budgetAktiv)}: frei verfügbar nach Fixkosten und Sparen`;
    document.getElementById('budgetSaldo').textContent = formatEuro(r.frei);
    document.getElementById('budgetResultBox').classList.toggle('minus', r.frei < 0);

    let sub = `${formatEuro(r.einnahmen)} € − ${formatEuro(fix)} € Fixkosten − ${formatEuro(r.sparen)} € Sparen`;
    if (r.einnahmen > 0) {
        sub += ` · Sparquote ${prozent(r.sparen / r.einnahmen * 100)} % der Einnahmen`;
        if (r.frei < 0) sub += ' · mehr verplant als vorhanden';
    }
    document.getElementById('budgetSaldoSub').textContent = sub;

    // Balken: Fixkosten / Sparen / frei im Verhältnis zu den Einnahmen
    const basis = Math.max(r.einnahmen, fix + r.sparen);
    const breite = (v) => (basis > 0 ? Math.max(0, v) / basis * 100 : 0) + '%';
    document.getElementById('budgetBarFix').style.width = breite(fix);
    document.getElementById('budgetBarSpar').style.width = breite(r.sparen);
    document.getElementById('budgetBarFrei').style.width = breite(r.frei);

    // Hinweis, falls Sparen bereits als Fixkosten eingetragen ist
    const hinweis = document.getElementById('budgetDoppeltHinweis');
    const sparFix = fixInfo.posten.filter(f => f.wert > 0 && /spar|depot|etf/i.test(f.name)).map(f => ({ name: f.name, monatlich: f.wert }));
    hinweis.hidden = !(r.sparen > 0 && sparFix.length > 0);
    if (!hinweis.hidden) {
        hinweis.textContent = `Hinweis: Unter den Fixkosten steht schon ${sparFix.map(f => `„${f.name}“ (${formatEuro(f.monatlich)} €)`).join(', ')}. ` +
            'Wenn das dieselben Sparraten sind, werden sie doppelt abgezogen.';
    }

    // Vergleich aller Szenarien
    const vgl = document.getElementById('budgetVergleich');
    vgl.hidden = budgetSzenarien.length < 2;
    const vglBody = document.getElementById('budgetVergleichBody');
    vglBody.innerHTML = '';
    if (budgetSzenarien.length >= 2) {
        const kurz = (v) => Math.round(v).toLocaleString('de-DE') + ' €';
        budgetSzenarien.forEach((sz, idx) => {
            const e = berechneSzenario(sz);
            const row = document.createElement('div');
            row.className = 'budget-vgl-row' + (idx === budgetAktiv ? ' active' : '');
            row.innerHTML = '<span class="budget-vgl-name"></span><span></span><span></span><span></span><span></span>';
            const zellen = row.children;
            zellen[0].textContent = budgetSzenarioName(sz, idx) + (fixFuerSzenario(sz).angepasst ? ' · Fixkosten angepasst' : '');
            zellen[1].textContent = kurz(e.einnahmen);
            zellen[2].textContent = kurz(e.fix);
            zellen[3].textContent = kurz(e.sparen);
            zellen[4].textContent = kurz(e.frei);
            zellen[4].className = e.frei < 0 ? 'diff-neg' : 'diff-pos';
            row.title = 'Szenario öffnen';
            row.addEventListener('click', () => budgetSzenarioWechseln(idx));
            vglBody.appendChild(row);
        });
    }
}

function toggleBudget() {
    const container = document.getElementById('budgetContainer');
    const btn = document.getElementById('budgetToggleBtn');
    const oeffnen = container.style.display !== 'block';
    container.style.display = oeffnen ? 'block' : 'none';
    btn.textContent = oeffnen ? 'Einnahmen & Fixkosten ausblenden' : 'Einnahmen & Fixkosten anzeigen';
    btn.setAttribute('aria-expanded', String(oeffnen));
    if (oeffnen) {
        zeichneBudgetTabs();
        updateBudget(false);
    }
}

function resetChartSelection() {
    // 1. Array leeren
    clickedChartPoints = [];

    // 2. Anzeige zurücksetzen und ausblenden
    const outputEl = document.getElementById('chartDiffOutput');
    outputEl.style.display = 'none';
    outputEl.innerHTML = '';
}

// ===== Zinseszins-Rechner =====
// Speicherort (in "haushalt"): zins_start, zins_sparrate, zins_rendite, zins_jahre, zins_inflation, zins_ansicht
// Solange kein eigenes Startkapital gespeichert ist, folgt das Startkapital automatisch dem Depotwert aus der Vermögensliste.
const ZINS_FELDER = {
    zinsStart: 'zins_start',
    zinsSparrate: 'zins_sparrate',
    zinsRendite: 'zins_rendite',
    zinsJahre: 'zins_jahre',
    zinsInflation: 'zins_inflation'
};
const ZINS_STANDARD = { zinsSparrate: '', zinsRendite: '5', zinsJahre: '20', zinsInflation: '2' };

let zinsChartInstance = null;
let zinsAnsicht = 'nominal';
let zinsGeladen = false;

function zinsZahl(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

// Depot-Zeile in der Vermögensliste finden (nach Name, sonst die Standard-Zeile "ETF & Aktiendepot")
function depotwertFinden() {
    let idx = -1;
    for (let i = 0; i < standardAssets.length; i++) {
        const nameEl = document.getElementById(`assetName${i}`);
        if (nameEl && /depot|etf|aktie/i.test(nameEl.value)) { idx = i; break; }
    }
    if (idx < 0) idx = 2;
    const nameEl = document.getElementById(`assetName${idx}`);
    const wertEl = document.getElementById(`assetWert${idx}`);
    return {
        index: idx,
        name: nameEl ? nameEl.value : 'Depot',
        wert: wertEl ? (parseFloat(wertEl.value) || 0) : 0
    };
}

function aktualisiereDepotHinweis() {
    const btn = document.getElementById('zinsDepotBtn');
    if (!btn) return;
    const depot = depotwertFinden();
    const startEl = document.getElementById('zinsStart');

    // Noch kein eigenes Startkapital gespeichert -> Depotwert automatisch übernehmen
    if (getCloudItem('zins_start') === null) {
        startEl.value = depot.wert || '';
    }

    const gleich = Math.abs((parseFloat(startEl.value) || 0) - depot.wert) < 0.005;
    btn.textContent = gleich ? '' : `Depotwert übernehmen (${depot.name}: ${formatEuro(depot.wert)} €)`;

    if (zinsGeladen) updateZinsRechner(false);
}

function depotwertUebernehmen() {
    document.getElementById('zinsStart').value = depotwertFinden().wert;
    updateZinsRechner(true);
}

// Monatliche Verzinsung mit dem zum Jahreszins passenden Monatszins, Sparrate jeweils am Monatsende
function berechneZinseszins(start, sparrate, renditeProzent, jahre, inflationProzent) {
    const rMonat = Math.pow(1 + renditeProzent / 100, 1 / 12) - 1;
    const inflation = inflationProzent / 100;
    let wert = start;
    let eingezahlt = start;
    const verlauf = [{ jahr: 0, nominal: wert, real: wert, eingezahlt }];

    for (let j = 1; j <= jahre; j++) {
        for (let m = 0; m < 12; m++) {
            wert = wert * (1 + rMonat) + sparrate;
            eingezahlt += sparrate;
        }
        verlauf.push({ jahr: j, nominal: wert, real: wert / Math.pow(1 + inflation, j), eingezahlt });
    }
    return verlauf;
}

function updateZinsRechner(speichern) {
    const start = Math.max(0, zinsZahl('zinsStart'));
    const sparrate = Math.max(0, zinsZahl('zinsSparrate'));
    const rendite = Math.max(-99, zinsZahl('zinsRendite'));
    const jahre = Math.min(80, Math.max(1, Math.round(zinsZahl('zinsJahre')) || 1));
    const inflation = Math.max(-99, zinsZahl('zinsInflation'));

    if (speichern) {
        Object.entries(ZINS_FELDER).forEach(([id, key]) => setCloudItem(key, document.getElementById(id).value));
        const btn = document.getElementById('zinsDepotBtn');
        const depot = depotwertFinden();
        btn.textContent = Math.abs(start - depot.wert) < 0.005 ? '' : `Depotwert übernehmen (${depot.name}: ${formatEuro(depot.wert)} €)`;
    }

    const verlauf = berechneZinseszins(start, sparrate, rendite, jahre, inflation);
    const ende = verlauf[verlauf.length - 1];
    const sparSumme = ende.eingezahlt - start;
    const ertraege = ende.nominal - ende.eingezahlt;
    const istReal = zinsAnsicht === 'real';
    const jahreText = `${jahre} ${jahre === 1 ? 'Jahr' : 'Jahren'}`;
    const inflText = inflation.toLocaleString('de-DE', { maximumFractionDigits: 2 });

    document.getElementById('zinsResultLabel').textContent = istReal
        ? `Endwert nach ${jahreText} – in heutiger Kaufkraft`
        : `Endwert nach ${jahreText}`;
    document.getElementById('zinsEndwert').textContent = formatEuro(istReal ? ende.real : ende.nominal);
    document.getElementById('zinsResultSub').textContent = istReal
        ? `nominal ${formatEuro(ende.nominal)} € · bei ${inflText} % Inflation p. a.`
        : `inflationsbereinigt ${formatEuro(ende.real)} € (${inflText} % Inflation p. a.)`;
    document.getElementById('zinsResultBox').classList.toggle('real', istReal);

    document.getElementById('zinsAusStart').textContent = formatEuro(start) + ' €';
    document.getElementById('zinsAusSpar').textContent = formatEuro(sparSumme) + ' €';
    const ertragEl = document.getElementById('zinsAusErtrag');
    ertragEl.textContent = (ertraege > 0 ? '+' : '') + formatEuro(ertraege) + ' €';
    ertragEl.className = ertraege > 0 ? 'diff-pos' : (ertraege < 0 ? 'diff-neg' : '');
    document.getElementById('zinsAusNominal').textContent = formatEuro(ende.nominal) + ' €';
    document.getElementById('zinsAusVerlust').textContent = '−' + formatEuro(ende.nominal - ende.real) + ' €';
    document.getElementById('zinsAusReal').textContent = formatEuro(ende.real) + ' €';

    if (document.getElementById('zinsContainer').style.display === 'block') {
        zeichneZinsChart(verlauf);
    }

    if (einkGeladen) updateEinkommen(false);
}

function zeichneZinsChart(verlauf) {
    const labels = verlauf.map(p => p.jahr === 0 ? 'Heute' : `${p.jahr} J.`);
    const nominal = verlauf.map(p => Math.round(p.nominal * 100) / 100);
    const real = verlauf.map(p => Math.round(p.real * 100) / 100);
    const eingezahlt = verlauf.map(p => Math.round(p.eingezahlt * 100) / 100);

    if (!zinsChartInstance) {
        const css = getComputedStyle(document.documentElement);
        const cSpruce = css.getPropertyValue('--spruce').trim() || '#1F5C4E';
        const cSpruceSoft = css.getPropertyValue('--spruce-soft').trim() || 'rgba(31, 92, 78, 0.12)';
        const cOchre = css.getPropertyValue('--ochre').trim() || '#A86A12';
        const cOchreSoft = css.getPropertyValue('--ochre-soft').trim() || 'rgba(168, 106, 18, 0.12)';
        const cMuted = css.getPropertyValue('--muted').trim() || '#5F6E69';
        const cGrid = css.getPropertyValue('--line').trim() || '#DCE3DE';
        Chart.defaults.font.family = css.getPropertyValue('--font').trim() || 'system-ui, sans-serif';
        Chart.defaults.color = cMuted;

        const linie = { pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 10, tension: 0.25 };

        zinsChartInstance = new Chart(document.getElementById('zinsChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { ...linie, label: 'Nominal', data: nominal, borderColor: cSpruce, backgroundColor: cSpruceSoft, pointBackgroundColor: cSpruce },
                    { ...linie, label: 'Inflationsbereinigt', data: real, borderColor: cOchre, backgroundColor: cOchreSoft, pointBackgroundColor: cOchre },
                    { ...linie, label: 'Eingezahlt', data: eingezahlt, borderColor: cMuted, backgroundColor: 'transparent', pointBackgroundColor: cMuted, borderWidth: 1.5, borderDash: [5, 4], fill: false }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
                    y: {
                        beginAtZero: true,
                        grid: { color: cGrid },
                        border: { display: false },
                        ticks: { callback: (v) => Number(v).toLocaleString('de-DE', { notation: 'compact', maximumFractionDigits: 1 }) + ' €' }
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'line', boxWidth: 18 } },
                    tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${formatEuro(item.parsed.y)} €` } }
                }
            }
        });
    } else {
        zinsChartInstance.data.labels = labels;
        zinsChartInstance.data.datasets[0].data = nominal;
        zinsChartInstance.data.datasets[1].data = real;
        zinsChartInstance.data.datasets[2].data = eingezahlt;
    }

    // Die gewählte Ansicht wird betont (dicker und gefüllt), die andere bleibt als dünne Linie sichtbar
    const istReal = zinsAnsicht === 'real';
    const [dsNominal, dsReal] = zinsChartInstance.data.datasets;
    dsNominal.borderWidth = istReal ? 1.5 : 2.5;
    dsNominal.fill = !istReal;
    dsReal.borderWidth = istReal ? 2.5 : 1.5;
    dsReal.fill = istReal;
    zinsChartInstance.update();
}

function setZinsAnsicht(ansicht) {
    zinsAnsicht = ansicht === 'real' ? 'real' : 'nominal';
    document.querySelectorAll('#zinsContainer .seg-btn').forEach(b => {
        const aktiv = b.dataset.ansicht === zinsAnsicht;
        b.classList.toggle('active', aktiv);
        b.setAttribute('aria-pressed', String(aktiv));
    });
    if (zinsGeladen) {
        setCloudItem('zins_ansicht', zinsAnsicht);
        updateZinsRechner(false);
    }
}

function toggleZinsRechner() {
    const container = document.getElementById('zinsContainer');
    const btn = document.getElementById('zinsToggleBtn');
    const oeffnen = container.style.display !== 'block';
    container.style.display = oeffnen ? 'block' : 'none';
    btn.textContent = oeffnen ? 'Zinseszins-Rechner ausblenden' : 'Zinseszins-Rechner anzeigen';
    btn.setAttribute('aria-expanded', String(oeffnen));
    if (oeffnen) updateZinsRechner(false);
}

function loadZinsData() {
    zinsGeladen = false;
    Object.entries(ZINS_FELDER).forEach(([id, key]) => {
        const el = document.getElementById(id);
        const gespeichert = getCloudItem(key);
        if (gespeichert !== null) el.value = gespeichert;
        else if (id !== 'zinsStart') el.value = ZINS_STANDARD[id];
    });
    setZinsAnsicht(getCloudItem('zins_ansicht'));
    zinsGeladen = true;
    aktualisiereDepotHinweis(); // setzt ggf. den Depotwert als Startkapital und rechnet
}

// ===== Altersvorsorgedepot-Rechner (Förderung ab 2027, Altersvorsorgereformgesetz) =====
// Bis zu zwei Depots. Depot 1 speichert unter avd_<feld> (wie bisher), Depot 2 unter avd2_<feld>.
// avd2_aktiv = true, solange das zweite Depot existiert.
const AVD_FELDER = {
    avdName: 'name',
    avdAlter: 'alter',
    avdRente: 'rente',
    avdBeitrag: 'beitrag',
    avdKinder: 'kinder',
    avdKinderJahre: 'kinderjahre',
    avdRendite: 'rendite',
    avdKosten: 'kosten',
    avdInflation: 'inflation',
    avdSteuerHeute: 'steuerheute',
    avdSteuerRente: 'steuerrente'
};
const AVD_STANDARD = {
    name: 'Mein Depot', alter: '30', rente: '67', beitrag: '150', kinder: '0', kinderjahre: '0',
    rendite: '5', kosten: '0.5', inflation: '2', steuerheute: '', steuerrente: '20'
};
const AVD_STANDARD_NAME_2 = 'Zweites Depot';
const AVD_GRUNDZULAGE_STUFE1 = 360;   // 50 % Zulage bis hier
const AVD_GEFOERDERT_MAX = 1800;      // 25 % Zulage bis hier
const AVD_KINDERZULAGE_MAX = 300;     // je Kind und Jahr
const AVD_BERUFSEINSTEIGER = 200;     // einmalig, unter 25
const AVD_AUSZAHLPLAN_BIS = 85;
const ABGELTUNGSSTEUER = 0.26375;     // 25 % + Soli
const TEILFREISTELLUNG_AKTIEN_ETF = 0.30;
const ETF_STEUER_AUF_GEWINN = (1 - TEILFREISTELLUNG_AKTIEN_ETF) * ABGELTUNGSSTEUER;

let avdChartInstance = null;
let avdAktiv = 1;

const euro = (v) => formatEuro(v) + ' €';
const mitVorzeichen = (v) => (v > 0.005 ? '+' : v < -0.005 ? '−' : '') + euro(Math.abs(v));

function avdPrefix(nr) {
    return nr === 2 ? 'avd2_' : 'avd_';
}

function avdAnzahl() {
    return istWahr(getCloudItem('avd2_aktiv')) ? 2 : 1;
}

// Gespeicherter Wert eines Depots als Text, sonst Standardwert
function avdWert(nr, feld) {
    const v = getCloudItem(avdPrefix(nr) + feld);
    if (v !== null) return String(v);
    if (feld === 'name' && nr === 2) return AVD_STANDARD_NAME_2;
    return AVD_STANDARD[feld];
}

function avdName(nr) {
    return avdWert(nr, 'name').trim() || (nr === 1 ? AVD_STANDARD.name : AVD_STANDARD_NAME_2);
}

function grundzulage(jahresbeitrag) {
    const b = Math.max(0, jahresbeitrag);
    return Math.min(b, AVD_GRUNDZULAGE_STUFE1) * 0.5
        + Math.max(0, Math.min(b, AVD_GEFOERDERT_MAX) - AVD_GRUNDZULAGE_STUFE1) * 0.25;
}

// 100 % des Eigenbeitrags (bis 1.800 €), höchstens 300 € je Kind
function kinderzulage(jahresbeitrag, kinder) {
    if (kinder <= 0) return 0;
    return Math.min(Math.max(0, jahresbeitrag), AVD_GEFOERDERT_MAX, kinder * AVD_KINDERZULAGE_MAX);
}

// Gleichbleibende Monatsrate, mit der ein Kapital in "monate" Monaten aufgebraucht ist (Rest wird weiter angelegt)
function annuitaet(wert, rMonat, monate) {
    if (monate <= 0 || wert <= 0) return 0;
    return Math.abs(rMonat) < 1e-12 ? wert / monate : wert * rMonat / (1 - Math.pow(1 + rMonat, -monate));
}

// Anteil, der nach Abgeltungssteuer auf den Gewinnanteil übrig bleibt (Aktien-ETF)
function etfNettoFaktor(wert, eingezahlt) {
    if (wert <= 0) return 1;
    const gewinnAnteil = Math.max(0, wert - eingezahlt) / wert;
    return 1 - gewinnAnteil * ETF_STEUER_AUF_GEWINN;
}

function berechneAvd(p) {
    const rMonat = Math.pow(1 + (p.rendite - p.kosten) / 100, 1 / 12) - 1;
    const jahresbeitrag = p.beitrag * 12;
    let avd = 0, etf = 0, eigen = 0;
    let summeGrund = 0, summeKind = 0, summeBonus = 0, steuerVorteil = 0;
    const verlauf = [{ alter: p.alter, avd: 0, etf: 0, eigen: 0 }];

    for (let j = 1; j <= p.jahre; j++) {
        for (let m = 0; m < 12; m++) {
            avd = avd * (1 + rMonat) + p.beitrag;
            etf = etf * (1 + rMonat) + p.beitrag;
            eigen += p.beitrag;
        }
        const gz = grundzulage(jahresbeitrag);
        const kz = j <= p.kinderJahre ? kinderzulage(jahresbeitrag, p.kinder) : 0;
        const bz = p.bonus && j === 1 ? AVD_BERUFSEINSTEIGER : 0;
        avd += gz + kz + bz;
        summeGrund += gz; summeKind += kz; summeBonus += bz;

        // Günstigerprüfung: Sonderausgabenabzug (Beiträge bis 1.800 € + Zulagen) gegen die Zulagen
        if (p.steuerHeute > 0) {
            const abzug = Math.min(jahresbeitrag, AVD_GEFOERDERT_MAX) + gz + kz;
            steuerVorteil += Math.max(0, abzug * p.steuerHeute / 100 - (gz + kz));
        }
        verlauf.push({ alter: p.alter + j, avd, etf, eigen });
    }

    const inflFaktor = Math.pow(1 + p.inflation / 100, p.jahre);
    const steuerAvd = avd * p.steuerRente / 100;
    const nettoAvd = avd - steuerAvd;

    const steuerEtf = Math.max(0, etf - eigen) * ETF_STEUER_AUF_GEWINN;
    const nettoEtf = etf - steuerEtf;

    // Auszahlplan bis 85 – für das Altersvorsorgedepot und zum Vergleich für das ETF-Depot
    const monate = Math.max(12, (AVD_AUSZAHLPLAN_BIS - p.rente) * 12);
    const rateBrutto = annuitaet(avd, rMonat, monate);
    const rateNetto = rateBrutto * (1 - p.steuerRente / 100);
    const rateEtfNetto = annuitaet(etf, rMonat, monate) * etfNettoFaktor(etf, eigen);

    return {
        verlauf, avd, eigen, summeGrund, summeKind, summeBonus, steuerVorteil,
        inflFaktor, steuerAvd, nettoAvd, etf, steuerEtf, nettoEtf, monate,
        rateBrutto, rateNetto, rateEtfNetto, jahresbeitrag
    };
}

// Parameter eines Depots aus den gespeicherten Werten (bzw. Standardwerten)
function avdParameter(nr) {
    const z = (feld) => parseFloat(avdWert(nr, feld)) || 0;
    const alter = Math.min(70, Math.max(16, Math.round(z('alter')) || 30));
    let rente = Math.min(80, Math.max(65, Math.round(z('rente')) || 67));
    if (rente <= alter) rente = alter + 1;
    return {
        name: avdName(nr),
        alter,
        rente,
        jahre: rente - alter,
        beitrag: Math.max(0, z('beitrag')),
        kinder: Math.min(10, Math.max(0, Math.round(z('kinder')))),
        kinderJahre: Math.max(0, Math.round(z('kinderjahre'))),
        rendite: Math.max(-50, z('rendite')),
        kosten: Math.max(0, z('kosten')),
        inflation: Math.max(-50, z('inflation')),
        steuerHeute: Math.min(45, Math.max(0, z('steuerheute'))),
        steuerRente: Math.min(45, Math.max(0, z('steuerrente'))),
        bonus: istWahr(getCloudItem(avdPrefix(nr) + 'bonus'))
    };
}

function avdFormularSpeichern() {
    const pre = avdPrefix(avdAktiv);
    Object.entries(AVD_FELDER).forEach(([id, feld]) => setCloudItem(pre + feld, document.getElementById(id).value));
    setCloudItem(pre + 'bonus', document.getElementById('avdBonus').checked);
}

function avdFormularLaden() {
    Object.entries(AVD_FELDER).forEach(([id, feld]) => {
        document.getElementById(id).value = avdWert(avdAktiv, feld);
    });
    document.getElementById('avdBonus').checked = istWahr(getCloudItem(avdPrefix(avdAktiv) + 'bonus'));
    document.getElementById('avdRemoveBtn').hidden = avdAktiv !== 2;
    zeichneAvdProfile();
}

function zeichneAvdProfile() {
    const bar = document.getElementById('avdProfilBar');
    bar.innerHTML = '';
    const anzahl = avdAnzahl();
    for (let nr = 1; nr <= anzahl; nr++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seg-btn' + (nr === avdAktiv ? ' active' : '');
        btn.textContent = avdName(nr);
        btn.title = avdName(nr);
        btn.setAttribute('aria-pressed', String(nr === avdAktiv));
        btn.addEventListener('click', () => avdWechseln(nr));
        bar.appendChild(btn);
    }
    if (anzahl < 2) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'seg-btn seg-add';
        add.textContent = '+ Zweites Depot';
        add.addEventListener('click', avdDepotHinzufuegen);
        bar.appendChild(add);
    }
}

function avdWechseln(nr) {
    if (nr === avdAktiv) return;
    avdAktiv = nr;
    avdFormularLaden();
    updateAvdRechner(false);
}

function avdDepotHinzufuegen() {
    setCloudItem('avd2_aktiv', true);
    avdAktiv = 2;
    avdFormularLaden();
    updateAvdRechner(false);
    const nameEl = document.getElementById('avdName');
    nameEl.focus();
    nameEl.select();
}

function avdDepotEntfernen() {
    if (avdAnzahl() < 2) return;
    if (!confirm(`Depot „${avdName(2)}“ mit allen Eingaben entfernen?`)) return;
    Object.values(AVD_FELDER).forEach(feld => setCloudItem('avd2_' + feld, null));
    setCloudItem('avd2_bonus', null);
    setCloudItem('avd2_aktiv', null);
    setCloudItem('eink_q_avd2', null);
    avdAktiv = 1;
    avdFormularLaden();
    updateAvdRechner(false);
}

function updateAvdRechner(speichern) {
    if (speichern) {
        avdFormularSpeichern();
        // Namen im Umschalter sofort mitziehen
        const btn = document.getElementById('avdProfilBar').children[avdAktiv - 1];
        if (btn) { btn.textContent = avdName(avdAktiv); btn.title = avdName(avdAktiv); }
    }

    const p = avdParameter(avdAktiv);
    const r = berechneAvd(p);
    const prozent = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });

    // Zulagen pro Jahr als Info
    const gz = grundzulage(r.jahresbeitrag);
    const kz = kinderzulage(r.jahresbeitrag, p.kinder);
    const quote = r.jahresbeitrag > 0 ? (gz + kz) / r.jahresbeitrag * 100 : 0;
    let info = `Jahresbeitrag ${euro(r.jahresbeitrag)} → Grundzulage ${euro(gz)}`;
    if (p.kinder > 0) info += ` + Kinderzulage ${euro(kz)}`;
    info += ` pro Jahr (Förderquote ${prozent(quote)} %).`;
    if (r.jahresbeitrag < AVD_GEFOERDERT_MAX) {
        info += ` Volle Grundzulage ab ${formatEuro(AVD_GEFOERDERT_MAX / 12)} € im Monat.`;
    }
    if (p.kinder > 0 && r.jahresbeitrag < Math.min(AVD_GEFOERDERT_MAX, p.kinder * AVD_KINDERZULAGE_MAX)) {
        info += ` Volle Kinderzulage ab ${euro(Math.min(AVD_GEFOERDERT_MAX, p.kinder * AVD_KINDERZULAGE_MAX))} Eigenbeitrag im Jahr.`;
    }
    const infoEl = document.getElementById('avdZulageInfo');
    infoEl.textContent = info;
    if (avdAnzahl() === 2 && avdParameter(1).kinder > 0 && avdParameter(2).kinder > 0) {
        const warn = document.createElement('span');
        warn.className = 'calc-warn';
        warn.textContent = 'Achtung: In beiden Depots sind Kinder eingetragen. Die Kinderzulage gibt es je Kind nur einmal.';
        infoEl.appendChild(warn);
    }

    const zulagen = r.summeGrund + r.summeKind + r.summeBonus;
    const ertrag = r.avd - r.eigen - zulagen;

    document.getElementById('avdResultLabel').textContent = `${p.name}: Depotwert mit ${p.rente} (nach ${p.jahre} ${p.jahre === 1 ? 'Jahr' : 'Jahren'})`;
    document.getElementById('avdEndwert').textContent = formatEuro(r.avd);
    document.getElementById('avdResultSub').textContent = `in heutiger Kaufkraft ${euro(r.avd / r.inflFaktor)} · vor Steuern`;

    document.getElementById('avdAusEigen').textContent = euro(r.eigen);
    document.getElementById('avdAusZulagen').textContent = '+' + euro(zulagen);
    const ertragEl = document.getElementById('avdAusErtrag');
    ertragEl.textContent = (ertrag > 0 ? '+' : '') + euro(ertrag);
    ertragEl.className = ertrag > 0 ? 'diff-pos' : (ertrag < 0 ? 'diff-neg' : '');
    document.getElementById('avdAusDepot').textContent = euro(r.avd);
    document.getElementById('avdAusSteuer').textContent = '−' + euro(r.steuerAvd);
    document.getElementById('avdAusNetto').textContent = euro(r.nettoAvd);
    document.getElementById('avdAusReal').textContent = euro(r.nettoAvd / r.inflFaktor);

    const vorteilRow = document.getElementById('avdVorteilRow');
    vorteilRow.hidden = !(p.steuerHeute > 0 && r.steuerVorteil > 0.005);
    document.getElementById('avdAusVorteil').textContent = '+' + euro(r.steuerVorteil);

    // Auszahlplan
    document.getElementById('avdRateNetto').textContent = formatEuro(r.rateNetto);
    document.getElementById('avdRateSub').textContent =
        `${euro(r.rateBrutto)} brutto von ${p.rente} bis ${AVD_AUSZAHLPLAN_BIS} (${r.monate / 12} Jahre) · in heutiger Kaufkraft ca. ${euro(r.rateNetto / r.inflFaktor)} netto`;

    // Vergleich ETF-Depot: gesamt und monatlich
    document.getElementById('avdEtfNetto').textContent = euro(r.nettoEtf);
    document.getElementById('avdEtfRate').textContent = euro(r.rateEtfNetto) + ' / Monat';
    document.getElementById('avdEtfSub').textContent =
        `Vor Steuern ${euro(r.etf)} · Vorsprung Altersvorsorgedepot nach Steuern: ` +
        `${mitVorzeichen(r.nettoAvd - r.nettoEtf)} gesamt, ${mitVorzeichen(r.rateNetto - r.rateEtfNetto)} pro Monat`;

    if (document.getElementById('avdContainer').style.display === 'block') {
        zeichneAvdChart(r.verlauf);
    }

    if (einkGeladen) {
        if (document.getElementById('einkContainer').style.display === 'block') zeichneEinkQuellen();
        updateEinkommen(false);
    }
}

function zeichneAvdChart(verlauf) {
    const labels = verlauf.map(p => `${p.alter}`);
    const avd = verlauf.map(p => Math.round(p.avd * 100) / 100);
    const etf = verlauf.map(p => Math.round(p.etf * 100) / 100);
    const eigen = verlauf.map(p => Math.round(p.eigen * 100) / 100);

    if (!avdChartInstance) {
        const css = getComputedStyle(document.documentElement);
        const cSpruce = css.getPropertyValue('--spruce').trim() || '#1F5C4E';
        const cSpruceSoft = css.getPropertyValue('--spruce-soft').trim() || 'rgba(31, 92, 78, 0.12)';
        const cOchre = css.getPropertyValue('--ochre').trim() || '#A86A12';
        const cMuted = css.getPropertyValue('--muted').trim() || '#5F6E69';
        const cGrid = css.getPropertyValue('--line').trim() || '#DCE3DE';
        Chart.defaults.font.family = css.getPropertyValue('--font').trim() || 'system-ui, sans-serif';
        Chart.defaults.color = cMuted;

        const linie = { pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 10, tension: 0.25 };

        avdChartInstance = new Chart(document.getElementById('avdChart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { ...linie, label: 'Altersvorsorgedepot', data: avd, borderColor: cSpruce, backgroundColor: cSpruceSoft, pointBackgroundColor: cSpruce, borderWidth: 2.5, fill: true },
                    { ...linie, label: 'ETF-Depot ohne Zulagen', data: etf, borderColor: cOchre, backgroundColor: 'transparent', pointBackgroundColor: cOchre, borderWidth: 1.5, fill: false },
                    { ...linie, label: 'Eigenbeiträge', data: eigen, borderColor: cMuted, backgroundColor: 'transparent', pointBackgroundColor: cMuted, borderWidth: 1.5, borderDash: [5, 4], fill: false }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 }, title: { display: true, text: 'Alter' } },
                    y: {
                        beginAtZero: true,
                        grid: { color: cGrid },
                        border: { display: false },
                        ticks: { callback: (v) => Number(v).toLocaleString('de-DE', { notation: 'compact', maximumFractionDigits: 1 }) + ' €' }
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'line', boxWidth: 18 } },
                    tooltip: {
                        callbacks: {
                            title: (items) => `Alter ${items[0].label}`,
                            label: (item) => `${item.dataset.label}: ${formatEuro(item.parsed.y)} €`
                        }
                    }
                }
            }
        });
    } else {
        avdChartInstance.data.labels = labels;
        avdChartInstance.data.datasets[0].data = avd;
        avdChartInstance.data.datasets[1].data = etf;
        avdChartInstance.data.datasets[2].data = eigen;
        avdChartInstance.update();
    }
}

function toggleAvdRechner() {
    const container = document.getElementById('avdContainer');
    const btn = document.getElementById('avdToggleBtn');
    const oeffnen = container.style.display !== 'block';
    container.style.display = oeffnen ? 'block' : 'none';
    btn.textContent = oeffnen ? 'Altersvorsorgedepot-Rechner ausblenden' : 'Altersvorsorgedepot-Rechner anzeigen';
    btn.setAttribute('aria-expanded', String(oeffnen));
    if (oeffnen) updateAvdRechner(false);
}

function loadAvdData() {
    if (avdAktiv > avdAnzahl()) avdAktiv = 1;
    avdFormularLaden();
    updateAvdRechner(false);
}

// ===== Monatliches Einkommen aus Privatvermögen =====
// Speicherort (in "haushalt"): eink_alter, eink_rente, eink_bis, eink_inflation, eink_rest_rendite, eink_ansicht,
//   eink_q_depot, eink_q_avd1, eink_q_avd2, eink_q_rest (welche Quellen einbezogen werden)
const EINK_FELDER = {
    einkAlter: 'eink_alter',
    einkRente: 'eink_rente',
    einkBis: 'eink_bis',
    einkInflation: 'eink_inflation',
    einkRestRendite: 'eink_rest_rendite'
};

let einkAnsicht = 'nominal';
let einkGeladen = false;

function einkStandard(id) {
    switch (id) {
        case 'einkAlter': return avdWert(1, 'alter');
        case 'einkRente': return avdWert(1, 'rente');
        case 'einkBis': return '90';
        case 'einkInflation': {
            const z = getCloudItem('zins_inflation');
            return z !== null ? String(z) : '2';
        }
        case 'einkRestRendite': return '2';
    }
    return '';
}

function einkQuelleAn(key, standard) {
    const v = getCloudItem(key);
    return v === null ? standard : istWahr(v);
}

function einkQuellenListe() {
    const liste = [
        { key: 'eink_q_depot', std: true, text: 'ETF-Depot (Zinseszins-Rechner)' },
        { key: 'eink_q_avd1', std: true, text: `${avdName(1)} (Altersvorsorgedepot)` }
    ];
    if (avdAnzahl() === 2) liste.push({ key: 'eink_q_avd2', std: true, text: `${avdName(2)} (Altersvorsorgedepot)` });
    liste.push({ key: 'eink_q_rest', std: false, text: 'Übriges Vermögen aus der Liste (ohne Depot)' });
    return liste;
}

function zeichneEinkQuellen() {
    const box = document.getElementById('einkQuellen');
    box.innerHTML = '';
    einkQuellenListe().forEach(({ key, std, text }) => {
        const label = document.createElement('label');
        label.className = 'calc-check';
        label.innerHTML = '<span class="switch"><input type="checkbox"><span class="slider"></span></span><span></span>';
        const cb = label.querySelector('input');
        cb.checked = einkQuelleAn(key, std);
        cb.setAttribute('aria-label', text);
        label.lastElementChild.textContent = text;
        cb.addEventListener('change', () => {
            setCloudItem(key, cb.checked);
            document.getElementById('einkRestFeld').hidden = !einkQuelleAn('eink_q_rest', false);
            updateEinkommen(false);
        });
        box.appendChild(label);
    });
    document.getElementById('einkRestFeld').hidden = !einkQuelleAn('eink_q_rest', false);
}

// Summe der Vermögensliste ohne die Depot-Zeile
function vermoegenOhneDepot() {
    const depot = depotwertFinden();
    let summe = 0;
    for (let i = 0; i < standardAssets.length; i++) {
        if (i === depot.index) continue;
        const el = document.getElementById(`assetWert${i}`);
        summe += el ? (parseFloat(el.value) || 0) : 0;
    }
    return summe;
}

function updateEinkommen(speichern) {
    if (!einkGeladen) return;
    if (speichern) {
        Object.entries(EINK_FELDER).forEach(([id, key]) => setCloudItem(key, document.getElementById(id).value));
    }

    const alter = Math.min(90, Math.max(16, Math.round(zinsZahl('einkAlter')) || 30));
    let rente = Math.min(85, Math.max(40, Math.round(zinsZahl('einkRente')) || 67));
    if (rente < alter) rente = alter;
    let bis = Math.min(110, Math.max(60, Math.round(zinsZahl('einkBis')) || 90));
    if (bis <= rente) bis = rente + 1;
    const inflation = Math.max(-50, zinsZahl('einkInflation'));
    const jahre = rente - alter;
    const faktor = Math.pow(1 + inflation / 100, jahre);
    const monate = (bis - rente) * 12;

    const zeilen = [];
    let erhaltNom = 0, erhaltReal = 0;

    // ETF-Depot: Werte aus dem Zinseszins-Rechner, aber bis zum Ruhestandsalter gerechnet
    if (einkQuelleAn('eink_q_depot', true)) {
        const start = Math.max(0, zinsZahl('zinsStart'));
        const spar = Math.max(0, zinsZahl('zinsSparrate'));
        const rendite = Math.max(-99, zinsZahl('zinsRendite'));
        const rM = Math.pow(1 + rendite / 100, 1 / 12) - 1;
        const v = berechneZinseszins(start, spar, rendite, jahre, inflation);
        const ende = v[v.length - 1];
        const rate = annuitaet(ende.nominal, rM, monate) * etfNettoFaktor(ende.nominal, ende.eingezahlt);
        const erhalt = Math.max(0, ende.nominal * rM) * (1 - ETF_STEUER_AUF_GEWINN);
        zeilen.push({ name: 'ETF-Depot', nom: rate, real: rate / faktor, info: `${euro(ende.nominal)} mit ${rente} · Entnahme bis ${bis}` });
        erhaltNom += erhalt; erhaltReal += erhalt / faktor;
    }

    // Altersvorsorgedepots: Auszahlplan bis 85 ab dem jeweiligen Auszahlungsalter
    for (let nr = 1; nr <= avdAnzahl(); nr++) {
        if (!einkQuelleAn('eink_q_avd' + nr, true)) continue;
        const p = avdParameter(nr);
        const r = berechneAvd(p);
        let info = `${euro(r.avd)} mit ${p.rente} · Auszahlung ${p.rente}–${AVD_AUSZAHLPLAN_BIS}`;
        if (nr === 1 && p.rente !== rente) info += ` (Ruhestand oben: ${rente})`;
        zeilen.push({ name: p.name, nom: r.rateNetto, real: r.rateNetto / r.inflFaktor, info });
        erhaltNom += r.rateNetto; erhaltReal += r.rateNetto / r.inflFaktor;
    }

    // Übriges Vermögen aus der Liste (Tagesgeld, Gold, …) mit eigener Rendite, vor Steuern
    if (einkQuelleAn('eink_q_rest', false)) {
        const heute = vermoegenOhneDepot();
        const rr = Math.max(-99, zinsZahl('einkRestRendite'));
        const rM = Math.pow(1 + rr / 100, 1 / 12) - 1;
        const wert = heute * Math.pow(1 + rr / 100, jahre);
        const rate = annuitaet(wert, rM, monate);
        const erhalt = Math.max(0, wert * rM);
        zeilen.push({ name: 'Übriges Vermögen', nom: rate, real: rate / faktor, info: `${euro(wert)} mit ${rente} · Entnahme bis ${bis} · vor Steuern` });
        erhaltNom += erhalt; erhaltReal += erhalt / faktor;
    }

    const istReal = einkAnsicht === 'real';
    const summeNom = zeilen.reduce((s, z) => s + z.nom, 0);
    const summeReal = zeilen.reduce((s, z) => s + z.real, 0);

    document.getElementById('einkResultLabel').textContent = istReal
        ? `Monatliches Einkommen ab ${rente} – in heutiger Kaufkraft`
        : `Monatliches Einkommen ab ${rente}`;
    document.getElementById('einkSumme').textContent = formatEuro(istReal ? summeReal : summeNom);
    document.getElementById('einkResultSub').textContent = istReal
        ? `nominal ${euro(summeNom)} · nach Steuern (geschätzt)`
        : `inflationsbereinigt ${euro(summeReal)} · nach Steuern (geschätzt)`;
    document.getElementById('einkResultBox').classList.toggle('real', istReal);

    const box = document.getElementById('einkZeilen');
    box.innerHTML = '';
    if (zeilen.length === 0) {
        const p = document.createElement('p');
        p.className = 'diff-hint';
        p.textContent = 'Keine Quelle ausgewählt.';
        box.appendChild(p);
    }
    zeilen.forEach(z => {
        const row = document.createElement('div');
        row.className = 'diff-row';
        row.innerHTML = '<span><span class="eink-name"></span><span class="eink-quelle-sub"></span></span><span></span>';
        row.querySelector('.eink-name').textContent = z.name;
        row.querySelector('.eink-quelle-sub').textContent = z.info;
        row.lastElementChild.textContent = euro(istReal ? z.real : z.nom);
        box.appendChild(row);
    });

    document.getElementById('einkErhalt').textContent = formatEuro(istReal ? erhaltReal : erhaltNom);
    document.getElementById('einkErhaltSub').textContent =
        'ETF-Depot und übriges Vermögen: nur die Erträge entnehmen, das Kapital bleibt erhalten. Altersvorsorgedepots zahlen weiter ihren Auszahlplan bis 85.';
}

function setEinkAnsicht(ansicht) {
    einkAnsicht = ansicht === 'real' ? 'real' : 'nominal';
    document.querySelectorAll('#einkSeg .seg-btn').forEach(b => {
        const aktiv = b.dataset.ansicht === einkAnsicht;
        b.classList.toggle('active', aktiv);
        b.setAttribute('aria-pressed', String(aktiv));
    });
    if (einkGeladen) {
        setCloudItem('eink_ansicht', einkAnsicht);
        updateEinkommen(false);
    }
}

function toggleEinkommen() {
    const container = document.getElementById('einkContainer');
    const btn = document.getElementById('einkToggleBtn');
    const oeffnen = container.style.display !== 'block';
    container.style.display = oeffnen ? 'block' : 'none';
    btn.textContent = oeffnen ? 'Monatliches Einkommen ausblenden' : 'Monatliches Einkommen aus Privatvermögen anzeigen';
    btn.setAttribute('aria-expanded', String(oeffnen));
    if (oeffnen) {
        zeichneEinkQuellen();
        updateEinkommen(false);
    }
}

function loadEinkData() {
    einkGeladen = false;
    Object.entries(EINK_FELDER).forEach(([id, key]) => {
        const gespeichert = getCloudItem(key);
        document.getElementById(id).value = gespeichert !== null ? gespeichert : einkStandard(id);
    });
    setEinkAnsicht(getCloudItem('eink_ansicht'));
    einkGeladen = true;
    zeichneEinkQuellen();
    updateEinkommen(false);
}

let appEingerichtet = false;

function initApp() {
    // Ereignisse nur einmal einrichten (initApp läuft bei jedem Login)
    if (!appEingerichtet) {
        appEingerichtet = true;

        inputKontostand.addEventListener('input', calcSum);
        richteListeEin('ausgabe');

        monatSelect.addEventListener('change', loadData);
        jahrSelect.addEventListener('change', loadData);

        createFixkostenRows();
        createVermoegenRows();
        richteBudgetEin();
        richteBudgetFixEin();

        Object.keys(ZINS_FELDER).forEach(id => {
            document.getElementById(id).addEventListener('input', () => updateZinsRechner(true));
        });
        Object.keys(AVD_FELDER).forEach(id => {
            document.getElementById(id).addEventListener('input', () => updateAvdRechner(true));
        });
        document.getElementById('avdBonus').addEventListener('change', () => updateAvdRechner(true));
        Object.keys(EINK_FELDER).forEach(id => {
            document.getElementById(id).addEventListener('input', () => updateEinkommen(true));
        });
    }

    database.ref('haushalt').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) cloudData = data;

        initDate();
        loadData();
        loadFixkostenData();
        loadBudgetData();
        loadVermoegenData();
        loadZinsData();
        loadAvdData();
        loadEinkData();
    }).catch((err) => {
        console.error("Fehler beim Laden der Daten:", err);
    });
}