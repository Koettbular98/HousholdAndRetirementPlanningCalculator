// ===== Sprachen (Deutsch / Englisch) =====
// Alle sichtbaren Texte der App stehen hier. Im HTML werden sie über Attribute verknüpft:
//   data-i18n="schluessel"              → Textinhalt
//   data-i18n-placeholder="schluessel"  → Platzhalter eines Eingabefelds
//   data-i18n-aria="schluessel"         → aria-label
//   data-i18n-title="schluessel"        → title (Tooltip)
//   data-i18n-toggle="schluessel"       → Ein-/Ausblende-Buttons: schluessel.show / schluessel.hide je nach aria-expanded
// Im JavaScript: t('schluessel', { platzhalter: wert }) – {platzhalter} im Text wird ersetzt.
// Die Sprache wird pro Gerät gespeichert (localStorage), damit jeder im Haushalt seine eigene wählen kann.

const I18N = {
    de: {
        // App
        'app.title': 'Haushaltsrechner, Fixkosten & Vermögen',
        'app.shortTitle': 'Haushalt',
        'app.heading': 'Finanz- & Haushaltsplaner',
        'app.logout': 'Abmelden',
        'app.settings': 'Einstellungen',
        'app.configMissing': 'firebase-config.js fehlt. Kopiere firebase-config.example.js nach firebase-config.js und trage deine Firebase-Daten ein.',
        'app.loadError': 'Fehler beim Laden der Daten:',
        'app.logoAlt': 'Logo',

        // Login
        'login.title': 'Anmelden',
        'login.email': 'E-Mail',
        'login.password': 'Passwort',
        'login.submit': 'Einloggen',
        'login.failed': 'Anmeldung fehlgeschlagen: ',

        // Einstellungen
        'settings.title': 'Einstellungen',
        'settings.language': 'Sprache',
        'settings.avd': 'Altersvorsorgedepot-Rechner',
        'settings.avdHint': 'Staatlich gefördertes Vorsorgedepot ab 2027 – nur in Deutschland relevant. Ausgeschaltet verschwindet der Rechner, und die Depots zählen weder beim Einkommen im Ruhestand noch bei der Übernahme der Sparraten. Deine Eingaben bleiben gespeichert.',
        'settings.close': 'Fertig',

        // Tabs
        'tab.month': 'Monatsrechner',
        'tab.fixed': 'Fixkosten',
        'tab.assets': 'Vermögen',

        // Allgemein
        'common.noName': 'ohne Namen',
        'common.description': 'Bezeichnung',
        'common.amount': 'Betrag',
        'common.amountEur': 'Betrag in Euro',
        'common.value': 'Wert',
        'common.delete': 'Löschen',
        'common.total': 'gesamt',
        'common.optional': '(optional)',
        'unit.perMonth': '€ / Monat',
        'unit.year': '{n} Jahr',
        'unit.yearsDative': '{n} Jahren',
        'unit.years': '{n} Jahre',
        'view.nominal': 'Nominal',
        'view.real': 'Inflationsbereinigt',

        // Monatsrechner
        'month.01': 'Januar', 'month.02': 'Februar', 'month.03': 'März', 'month.04': 'April',
        'month.05': 'Mai', 'month.06': 'Juni', 'month.07': 'Juli', 'month.08': 'August',
        'month.09': 'September', 'month.10': 'Oktober', 'month.11': 'November', 'month.12': 'Dezember',
        'month.monthAria': 'Monat',
        'month.yearAria': 'Jahr',
        'month.balance': 'Kontostand',
        'month.expenses': 'Ausgaben',
        'month.open': 'offen',
        'month.colName': 'Bezeichnung',
        'month.colAmount': 'Betrag (€)',
        'month.colPaid': 'Abgeb.',
        'month.empty': 'Noch keine Ausgaben in diesem Monat.',
        'month.add': '+ Ausgabe hinzufügen',
        'month.free': 'Frei verfügbar diesen Monat',
        'month.freeSub': 'Kontostand minus offene Ausgaben',
        'month.entryPlaceholder': 'Ausgabe benennen',
        'month.paid': 'Abgebucht',
        'month.deleteEntry': 'Ausgabe löschen',
        'month.confirmDelete': 'Ausgabe „{name}“ löschen?',

        // Fixkosten
        'fixed.title': 'Fixkosten',
        'fixed.colName': 'Bezeichnung',
        'fixed.colAmount': 'Betrag (€)',
        'fixed.colInterval': 'Turnus',
        'fixed.monthly': 'Monatlich',
        'fixed.quarterly': 'Quartal',
        'fixed.yearly': 'Jährlich',
        'fixed.total': 'Fixkosten pro Monat',
        'fixed.totalSub': 'Durchschnittliche Belastung',
        'fixed.numbered': 'Fixkosten {n}',
        'fixed.default.0': 'Miete / Hypothek',
        'fixed.default.1': 'Strom',
        'fixed.default.2': 'Gas / Heizung',
        'fixed.default.3': 'Internet & Festnetz',
        'fixed.default.4': 'Rundfunkbeitrag (GEZ)',
        'fixed.default.5': 'Handyvertrag',
        'fixed.default.6': 'Fitnessstudio',
        'fixed.default.7': 'Streaming-Dienste',
        'fixed.default.8': 'Haftpflichtversicherung',
        'fixed.default.9': 'KFZ-Versicherung',
        'fixed.default.10': 'Sparen / Depot',
        'fixed.default.11': 'Sonstiges',

        // Vermögen
        'assets.title': 'Vermögen',
        'assets.colCategory': 'Kategorie',
        'assets.colValue': 'Wert (€)',
        'assets.total': 'Gesamtvermögen',
        'assets.default.0': 'Girokonto / Cash',
        'assets.default.1': 'Tagesgeld / Notgroschen',
        'assets.default.2': 'ETF & Aktiendepot',
        'assets.default.3': 'Kryptowährungen',
        'assets.default.4': 'Edelmetalle (Gold/Silber)',
        'assets.default.5': 'Bausparer / Altersvorsorge',
        'assets.default.6': 'Immobilien / Sachwerte',
        'assets.default.7': 'Sonstiges Vermögen',
        'chart.toggle.show': 'Vermögensentwicklung anzeigen',
        'chart.toggle.hide': 'Vermögensentwicklung ausblenden',
        'chart.hint': 'Tippe zwei Punkte an, um die Differenz zu sehen.',
        'chart.secondHint': 'Tippe einen zweiten Punkt an, um die Differenz zu sehen.',
        'chart.difference': 'Differenz',
        'chart.reset': 'Auswahl zurücksetzen',
        'chart.totalLabel': 'Gesamtvermögen (€)',

        // Einnahmen & Fixkosten (Szenarien)
        'budget.toggle.show': 'Einnahmen & Fixkosten anzeigen',
        'budget.toggle.hide': 'Einnahmen & Fixkosten ausblenden',
        'budget.scenariosAria': 'Szenarien',
        'budget.scenarioName': 'Name des Szenarios',
        'budget.scenarioPlaceholder': 'z. B. Elternzeit',
        'budget.deleteScenario': 'Dieses Szenario löschen',
        'budget.addScenario': '+ Szenario',
        'budget.addScenarioTitle': 'Neues Szenario als Kopie des aktuellen anlegen',
        'budget.scenarioNumbered': 'Szenario {n}',
        'budget.confirmDeleteScenario': 'Szenario „{name}“ mit allen Einnahmen und Sparraten löschen?',
        'budget.income': 'Einnahmen',
        'budget.colPerMonth': '€ / Monat',
        'budget.incomeEmpty': 'Noch keine Einnahmen eingetragen.',
        'budget.addIncome': '+ Einnahme hinzufügen',
        'budget.incomePlaceholder': 'Einnahme benennen',
        'budget.incomeDelete': 'Einnahme löschen',
        'budget.incomeConfirm': 'Einnahme „{name}“ löschen?',
        'budget.fixedPerMonth': 'Fixkosten pro Monat',
        'budget.fixedSource': 'aus dem Fixkosten-Tab (Quartal und Jahr auf den Monat umgerechnet)',
        'budget.fixedAdjusted': 'in diesem Szenario angepasst · Fixkosten-Tab: {tab} ({diff})',
        'budget.adjustSummary': 'Fixkosten für dieses Szenario anpassen',
        'budget.adjustHint': 'Änderungen gelten nur in diesem Szenario, der Fixkosten-Tab bleibt unverändert. Beträge pro Monat.',
        'budget.addFixExtra': '+ Fixkosten nur für dieses Szenario',
        'budget.resetAll': 'Alle Anpassungen zurücksetzen',
        'budget.confirmResetAll': 'Alle Fixkosten-Anpassungen in diesem Szenario zurücksetzen? Zusätzliche Posten werden gelöscht.',
        'budget.fixNone': 'Im Fixkosten-Tab sind noch keine Beträge eingetragen.',
        'budget.fixRowAria': 'Betrag pro Monat in diesem Szenario',
        'budget.fixResetTitle': 'Auf den Wert aus dem Fixkosten-Tab zurücksetzen',
        'budget.fixResetAria': 'Zurücksetzen',
        'budget.fixTab': 'Tab: {v}',
        'budget.fixQuarterly': 'Quartal',
        'budget.fixYearly': 'jährlich',
        'budget.fixExtraPlaceholder': 'Fixkosten benennen',
        'budget.fixExtraDelete': 'Zusätzliche Fixkosten löschen',
        'budget.fixExtraDefault': 'Zusätzliche Fixkosten',
        'budget.amountPerMonth': 'Betrag pro Monat',
        'budget.confirmDeleteFixExtra': 'Fixkosten „{name}“ aus diesem Szenario löschen?',
        'budget.afterFixed': 'Frei verfügbar nach Fixkosten',
        'budget.savings': 'Sparraten',
        'budget.colAmount': 'Betrag',
        'budget.colUnit': 'Einheit',
        'budget.unitAria': 'Einheit',
        'budget.savingsEmpty': 'Noch keine Sparraten in diesem Szenario.',
        'budget.addSaving': '+ Sparrate hinzufügen',
        'budget.savingPlaceholder': 'Sparrate benennen',
        'budget.savingDelete': 'Sparrate löschen',
        'budget.savingConfirm': 'Sparrate „{name}“ löschen?',
        'budget.importSavings': 'Sparraten aus den Rechnern übernehmen',
        'budget.importNone': 'In den Rechnern sind noch keine Sparraten eingetragen.',
        'budget.importAlready': 'Die Sparraten aus den Rechnern sind schon übernommen.',
        'budget.importDone': '{neu} neu übernommen.',
        'budget.importDoneUpdated': '{neu} neu übernommen, {akt} aktualisiert.',
        'budget.percentHint': '„%“ bezieht sich auf das frei Verfügbare nach Fixkosten.',
        'budget.resultDefault': 'Frei verfügbar nach Fixkosten und Sparen',
        'budget.resultLabel': '{name}: frei verfügbar nach Fixkosten und Sparen',
        'budget.saldoSub': '{ein} − {fix} Fixkosten − {spar} Sparen',
        'budget.savingsRate': ' · Sparquote {q} % der Einnahmen',
        'budget.overplanned': ' · mehr verplant als vorhanden',
        'budget.doubleWarning': 'Hinweis: Unter den Fixkosten steht schon {liste}. Wenn das dieselben Sparraten sind, werden sie doppelt abgezogen.',
        'budget.legendFixed': 'Fixkosten',
        'budget.legendSavings': 'Sparen',
        'budget.legendFree': 'Frei verfügbar',
        'budget.compare': 'Szenarien im Vergleich',
        'budget.colIncome': 'Einnahmen',
        'budget.colFixed': 'Fixkosten',
        'budget.colSavings': 'Sparen',
        'budget.colFree': 'Frei',
        'budget.adjustedTag': ' · Fixkosten angepasst',
        'budget.openScenario': 'Szenario öffnen',

        // Zinseszins-Rechner
        'zins.toggle.show': 'Zinseszins-Rechner anzeigen',
        'zins.toggle.hide': 'Zinseszins-Rechner ausblenden',
        'zins.start': 'Startkapital / Depotwert (€)',
        'zins.rate': 'Sparrate pro Monat (€)',
        'zins.return': 'Rendite pro Jahr (%)',
        'zins.years': 'Laufzeit (Jahre)',
        'zins.inflation': 'Inflation pro Jahr (%)',
        'zins.viewAria': 'Darstellung des Endwerts',
        'zins.endValue': 'Endwert',
        'zins.rowStart': 'Startkapital',
        'zins.rowSavings': 'Summe der Sparraten',
        'zins.rowGains': 'Erträge (Zinseszins)',
        'zins.rowNominal': 'Endwert nominal',
        'zins.rowLoss': 'Kaufkraftverlust durch Inflation',
        'zins.rowReal': 'Endwert in heutiger Kaufkraft',
        'zins.hint': 'Annahmen: Sparrate am Monatsende, Erträge werden monatlich wieder angelegt, die Rendite gilt für Startkapital und Sparraten. Steuern und Kosten sind nicht berücksichtigt.',
        'zins.takeDepot': 'Depotwert übernehmen ({name}: {wert})',
        'zins.resultLabel': 'Endwert nach {jahre}',
        'zins.resultLabelReal': 'Endwert nach {jahre} – in heutiger Kaufkraft',
        'zins.subReal': 'nominal {nom} · bei {infl} % Inflation p. a.',
        'zins.subNominal': 'inflationsbereinigt {real} ({infl} % Inflation p. a.)',
        'zins.chartToday': 'Heute',
        'zins.chartYear': '{n} J.',
        'zins.chartNominal': 'Nominal',
        'zins.chartReal': 'Inflationsbereinigt',
        'zins.chartPaidIn': 'Eingezahlt',

        // Altersvorsorgedepot
        'avd.toggle.show': 'Altersvorsorgedepot-Rechner anzeigen',
        'avd.toggle.hide': 'Altersvorsorgedepot-Rechner ausblenden',
        'avd.intro': 'Staatlich gefördertes Depot ab 2027: Grundzulage 50 % auf die ersten 360 € und 25 % bis 1.800 € Eigenbeitrag im Jahr (max. 540 €), dazu bis zu 300 € je Kind. Auszahlung frühestens mit 65, als Auszahlplan mindestens bis 85.',
        'avd.profileAria': 'Depot auswählen',
        'avd.name': 'Name des Depots',
        'avd.namePlaceholder': 'z. B. Mein Depot',
        'avd.remove': 'Dieses Depot entfernen',
        'avd.confirmRemove': 'Depot „{name}“ mit allen Eingaben entfernen?',
        'avd.default1': 'Mein Depot',
        'avd.default2': 'Zweites Depot',
        'avd.addSecond': '+ Zweites Depot',
        'avd.phase': 'Ansparphase',
        'avd.age': 'Alter heute',
        'avd.payoutAge': 'Auszahlung ab Alter',
        'avd.contribution': 'Eigenbeitrag pro Monat (€)',
        'avd.children': 'Kinder mit Kinderzulage',
        'avd.childYears': 'Kinderzulage noch (Jahre)',
        'avd.return': 'Rendite pro Jahr (%)',
        'avd.costs': 'Kosten pro Jahr (%)',
        'avd.inflation': 'Inflation pro Jahr (%)',
        'avd.bonus': 'Berufseinsteigerbonus (unter 25, einmalig 200 €)',
        'avd.bonusAria': 'Berufseinsteigerbonus',
        'avd.taxes': 'Steuern',
        'avd.taxNow': 'Grenzsteuersatz heute (%)',
        'avd.taxNowPlaceholder': 'leer = ohne',
        'avd.taxRetire': 'Steuersatz im Ruhestand (%)',
        'avd.resultDefault': 'Depotwert bei Auszahlungsbeginn',
        'avd.rowOwn': 'Eigenbeiträge',
        'avd.rowSubsidies': 'Staatliche Zulagen',
        'avd.rowGains': 'Erträge',
        'avd.rowValue': 'Depotwert',
        'avd.rowTax': 'Steuer bei Auszahlung (geschätzt)',
        'avd.rowNet': 'Nach Steuern',
        'avd.rowReal': 'Nach Steuern in heutiger Kaufkraft',
        'avd.rowRefund': 'Zusätzliche Steuererstattung (Ansparphase)',
        'avd.payoutPlan': 'Auszahlplan bis 85',
        'avd.perMonthNet': '€ / Monat netto',
        'avd.compareTitle': 'Zum Vergleich: normales ETF-Depot (gleiche Eigenbeiträge, ohne Zulagen)',
        'avd.compareEnd': 'Endwert nach Steuern',
        'avd.comparePlan': 'Auszahlplan bis 85, netto',
        'avd.hint': 'Vereinfachte Schätzung: Eigenbeitrag am Monatsende, Zulagen einmal im Jahr gutgeschrieben, Rendite abzüglich Kosten. Im Altersvorsorgedepot werden die Auszahlungen voll mit dem persönlichen Steuersatz versteuert; im ETF-Depot nur die Gewinne mit Abgeltungssteuer (inkl. Soli, 30 % Teilfreistellung, ohne Kirchensteuer, Freibetrag und Vorabpauschale). Die Kinderzulage gibt es je Kind nur für einen Elternteil – trag die Kinder nur in einem Depot ein. Die Steuererstattung aus der Ansparphase ist nicht im Depotwert enthalten. Keine Anlageberatung.',
        'avd.infoBase': 'Jahresbeitrag {beitrag} → Grundzulage {gz}',
        'avd.infoKids': ' + Kinderzulage {kz}',
        'avd.infoRate': ' pro Jahr (Förderquote {q} %).',
        'avd.infoFullBase': ' Volle Grundzulage ab {v} € im Monat.',
        'avd.infoFullKids': ' Volle Kinderzulage ab {v} Eigenbeitrag im Jahr.',
        'avd.kidsWarning': 'Achtung: In beiden Depots sind Kinder eingetragen. Die Kinderzulage gibt es je Kind nur einmal.',
        'avd.resultLabel': '{name}: Depotwert mit {alter} (nach {jahre})',
        'avd.resultSub': 'in heutiger Kaufkraft {v} · vor Steuern',
        'avd.rateSub': '{brutto} brutto von {von} bis {bis} ({jahre}) · in heutiger Kaufkraft ca. {real} netto',
        'avd.etfRate': '{v} / Monat',
        'avd.etfSub': 'Vor Steuern {etf} · Vorsprung Altersvorsorgedepot nach Steuern: {ges} gesamt, {mon} pro Monat',
        'avd.chartAvd': 'Altersvorsorgedepot',
        'avd.chartEtf': 'ETF-Depot ohne Zulagen',
        'avd.chartOwn': 'Eigenbeiträge',
        'avd.chartAge': 'Alter',
        'avd.chartAgeTooltip': 'Alter {n}',

        // Einkommen aus Privatvermögen
        'eink.toggle.show': 'Monatliches Einkommen aus Privatvermögen anzeigen',
        'eink.toggle.hide': 'Monatliches Einkommen ausblenden',
        'eink.intro': 'Was dein privates Vermögen im Ruhestand pro Monat auszahlen kann. Die Werte kommen aus dem Zinseszins-Rechner, den Altersvorsorgedepots und auf Wunsch aus deiner Vermögensliste.',
        'eink.introNoAvd': 'Was dein privates Vermögen im Ruhestand pro Monat auszahlen kann. Die Werte kommen aus dem Zinseszins-Rechner und auf Wunsch aus deiner Vermögensliste.',
        'eink.age': 'Mein Alter heute',
        'eink.retire': 'Ruhestand ab Alter',
        'eink.until': 'Entnahme bis Alter',
        'eink.inflation': 'Inflation pro Jahr (%)',
        'eink.include': 'Einbeziehen',
        'eink.restReturn': 'Rendite übriges Vermögen pro Jahr (%)',
        'eink.viewAria': 'Darstellung des Einkommens',
        'eink.resultDefault': 'Monatliches Einkommen',
        'eink.preserve': 'Variante Kapitalerhalt',
        'eink.hint': 'Das ETF-Depot und das übrige Vermögen wachsen bis zum Ruhestand mit Sparrate und Rendite aus dem Zinseszins-Rechner bzw. der angegebenen Rendite und werden danach bis zum gewählten Alter gleichmäßig entnommen. Die Altersvorsorgedepots zahlen jeweils ab ihrem eigenen Auszahlungsalter bis 85 (Werte aus dem Rechner darüber). ETF-Depot nach Abgeltungssteuer auf den Gewinnanteil, Altersvorsorgedepots nach dem dort angegebenen Steuersatz, übriges Vermögen vor Steuern. Gesetzliche Rente ist nicht enthalten.',
        'eink.hintNoAvd': 'Das ETF-Depot und das übrige Vermögen wachsen bis zum Ruhestand mit Sparrate und Rendite aus dem Zinseszins-Rechner bzw. der angegebenen Rendite und werden danach bis zum gewählten Alter gleichmäßig entnommen. ETF-Depot nach Abgeltungssteuer auf den Gewinnanteil, übriges Vermögen vor Steuern. Gesetzliche Rente ist nicht enthalten.',
        'eink.srcEtf': 'ETF-Depot (Zinseszins-Rechner)',
        'eink.srcAvd': '{name} (Altersvorsorgedepot)',
        'eink.srcRest': 'Übriges Vermögen aus der Liste (ohne Depot)',
        'eink.rowEtf': 'ETF-Depot',
        'eink.rowEtfInfo': '{wert} mit {alter} · Entnahme bis {bis}',
        'eink.rowAvdInfo': '{wert} mit {alter} · Auszahlung {von}–{bis}',
        'eink.retireAbove': ' (Ruhestand oben: {n})',
        'eink.rowRest': 'Übriges Vermögen',
        'eink.rowRestInfo': '{wert} mit {alter} · Entnahme bis {bis} · vor Steuern',
        'eink.resultLabel': 'Monatliches Einkommen ab {n}',
        'eink.resultLabelReal': 'Monatliches Einkommen ab {n} – in heutiger Kaufkraft',
        'eink.subReal': 'nominal {v} · nach Steuern (geschätzt)',
        'eink.subNominal': 'inflationsbereinigt {v} · nach Steuern (geschätzt)',
        'eink.none': 'Keine Quelle ausgewählt.',
        'eink.preserveSub': 'ETF-Depot und übriges Vermögen: nur die Erträge entnehmen, das Kapital bleibt erhalten. Altersvorsorgedepots zahlen weiter ihren Auszahlplan bis 85.',
        'eink.preserveSubNoAvd': 'ETF-Depot und übriges Vermögen: nur die Erträge entnehmen, das Kapital bleibt erhalten.',

        // Vorgabewerte, die als Daten gespeichert werden
        'default.netSalary': 'Nettogehalt',
        'default.current': 'Aktuell',
        'default.etfPlan': 'ETF-Sparplan'
    },

    en: {
        // App
        'app.title': 'Household budget, fixed costs & assets',
        'app.shortTitle': 'Budget',
        'app.heading': 'Finance & Household Planner',
        'app.logout': 'Log out',
        'app.settings': 'Settings',
        'app.configMissing': 'firebase-config.js is missing. Copy firebase-config.example.js to firebase-config.js and enter your Firebase details.',
        'app.loadError': 'Error loading data:',
        'app.logoAlt': 'Logo',

        // Login
        'login.title': 'Sign in',
        'login.email': 'Email',
        'login.password': 'Password',
        'login.submit': 'Log in',
        'login.failed': 'Sign-in failed: ',

        // Settings
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.avd': 'German pension account calculator (Altersvorsorgedepot)',
        'settings.avdHint': 'State-subsidised retirement account from 2027 – only relevant in Germany. When switched off, the calculator is hidden and the accounts are left out of retirement income and the savings import. Your entries stay saved.',
        'settings.close': 'Done',

        // Tabs
        'tab.month': 'Monthly',
        'tab.fixed': 'Fixed costs',
        'tab.assets': 'Assets',

        // General
        'common.noName': 'unnamed',
        'common.description': 'Description',
        'common.amount': 'Amount',
        'common.amountEur': 'Amount in euros',
        'common.value': 'Value',
        'common.delete': 'Delete',
        'common.total': 'total',
        'common.optional': '(optional)',
        'unit.perMonth': '€ / month',
        'unit.year': '{n} year',
        'unit.yearsDative': '{n} years',
        'unit.years': '{n} years',
        'view.nominal': 'Nominal',
        'view.real': 'Inflation-adjusted',

        // Monthly budget
        'month.01': 'January', 'month.02': 'February', 'month.03': 'March', 'month.04': 'April',
        'month.05': 'May', 'month.06': 'June', 'month.07': 'July', 'month.08': 'August',
        'month.09': 'September', 'month.10': 'October', 'month.11': 'November', 'month.12': 'December',
        'month.monthAria': 'Month',
        'month.yearAria': 'Year',
        'month.balance': 'Account balance',
        'month.expenses': 'Expenses',
        'month.open': 'open',
        'month.colName': 'Description',
        'month.colAmount': 'Amount (€)',
        'month.colPaid': 'Paid',
        'month.empty': 'No expenses this month yet.',
        'month.add': '+ Add expense',
        'month.free': 'Available this month',
        'month.freeSub': 'Balance minus open expenses',
        'month.entryPlaceholder': 'Name expense',
        'month.paid': 'Paid',
        'month.deleteEntry': 'Delete expense',
        'month.confirmDelete': 'Delete expense “{name}”?',

        // Fixed costs
        'fixed.title': 'Fixed costs',
        'fixed.colName': 'Description',
        'fixed.colAmount': 'Amount (€)',
        'fixed.colInterval': 'Interval',
        'fixed.monthly': 'Monthly',
        'fixed.quarterly': 'Quarterly',
        'fixed.yearly': 'Yearly',
        'fixed.total': 'Fixed costs per month',
        'fixed.totalSub': 'Average monthly burden',
        'fixed.numbered': 'Fixed cost {n}',
        'fixed.default.0': 'Rent / Mortgage',
        'fixed.default.1': 'Electricity',
        'fixed.default.2': 'Gas / Heating',
        'fixed.default.3': 'Internet & Landline',
        'fixed.default.4': 'Broadcasting fee',
        'fixed.default.5': 'Mobile contract',
        'fixed.default.6': 'Gym',
        'fixed.default.7': 'Streaming services',
        'fixed.default.8': 'Liability insurance',
        'fixed.default.9': 'Car insurance',
        'fixed.default.10': 'Savings / Investments',
        'fixed.default.11': 'Other',

        // Assets
        'assets.title': 'Assets',
        'assets.colCategory': 'Category',
        'assets.colValue': 'Value (€)',
        'assets.total': 'Total assets',
        'assets.default.0': 'Current account / Cash',
        'assets.default.1': 'Savings / Emergency fund',
        'assets.default.2': 'ETF & stock portfolio',
        'assets.default.3': 'Cryptocurrencies',
        'assets.default.4': 'Precious metals (gold/silver)',
        'assets.default.5': 'Building savings / Pension',
        'assets.default.6': 'Real estate / Tangible assets',
        'assets.default.7': 'Other assets',
        'chart.toggle.show': 'Show asset history',
        'chart.toggle.hide': 'Hide asset history',
        'chart.hint': 'Tap two points to see the difference.',
        'chart.secondHint': 'Tap a second point to see the difference.',
        'chart.difference': 'Difference',
        'chart.reset': 'Clear selection',
        'chart.totalLabel': 'Total assets (€)',

        // Income & fixed costs (scenarios)
        'budget.toggle.show': 'Show income & fixed costs',
        'budget.toggle.hide': 'Hide income & fixed costs',
        'budget.scenariosAria': 'Scenarios',
        'budget.scenarioName': 'Scenario name',
        'budget.scenarioPlaceholder': 'e.g. Parental leave',
        'budget.deleteScenario': 'Delete this scenario',
        'budget.addScenario': '+ Scenario',
        'budget.addScenarioTitle': 'Create a new scenario as a copy of the current one',
        'budget.scenarioNumbered': 'Scenario {n}',
        'budget.confirmDeleteScenario': 'Delete scenario “{name}” with all its income and savings?',
        'budget.income': 'Income',
        'budget.colPerMonth': '€ / month',
        'budget.incomeEmpty': 'No income entered yet.',
        'budget.addIncome': '+ Add income',
        'budget.incomePlaceholder': 'Name income',
        'budget.incomeDelete': 'Delete income',
        'budget.incomeConfirm': 'Delete income “{name}”?',
        'budget.fixedPerMonth': 'Fixed costs per month',
        'budget.fixedSource': 'from the Fixed costs tab (quarterly and yearly converted to monthly)',
        'budget.fixedAdjusted': 'adjusted in this scenario · Fixed costs tab: {tab} ({diff})',
        'budget.adjustSummary': 'Adjust fixed costs for this scenario',
        'budget.adjustHint': 'Changes apply to this scenario only; the Fixed costs tab stays unchanged. Amounts per month.',
        'budget.addFixExtra': '+ Fixed cost for this scenario only',
        'budget.resetAll': 'Reset all adjustments',
        'budget.confirmResetAll': 'Reset all fixed-cost adjustments in this scenario? Additional items will be deleted.',
        'budget.fixNone': 'No amounts entered in the Fixed costs tab yet.',
        'budget.fixRowAria': 'Amount per month in this scenario',
        'budget.fixResetTitle': 'Reset to the value from the Fixed costs tab',
        'budget.fixResetAria': 'Reset',
        'budget.fixTab': 'Tab: {v}',
        'budget.fixQuarterly': 'quarterly',
        'budget.fixYearly': 'yearly',
        'budget.fixExtraPlaceholder': 'Name fixed cost',
        'budget.fixExtraDelete': 'Delete additional fixed cost',
        'budget.fixExtraDefault': 'Additional fixed cost',
        'budget.amountPerMonth': 'Amount per month',
        'budget.confirmDeleteFixExtra': 'Delete fixed cost “{name}” from this scenario?',
        'budget.afterFixed': 'Available after fixed costs',
        'budget.savings': 'Savings',
        'budget.colAmount': 'Amount',
        'budget.colUnit': 'Unit',
        'budget.unitAria': 'Unit',
        'budget.savingsEmpty': 'No savings in this scenario yet.',
        'budget.addSaving': '+ Add savings',
        'budget.savingPlaceholder': 'Name savings',
        'budget.savingDelete': 'Delete savings',
        'budget.savingConfirm': 'Delete savings “{name}”?',
        'budget.importSavings': 'Import savings from the calculators',
        'budget.importNone': 'No savings entered in the calculators yet.',
        'budget.importAlready': 'The savings from the calculators are already imported.',
        'budget.importDone': '{neu} imported.',
        'budget.importDoneUpdated': '{neu} imported, {akt} updated.',
        'budget.percentHint': '“%” refers to the amount available after fixed costs.',
        'budget.resultDefault': 'Available after fixed costs and savings',
        'budget.resultLabel': '{name}: available after fixed costs and savings',
        'budget.saldoSub': '{ein} − {fix} fixed costs − {spar} savings',
        'budget.savingsRate': ' · savings rate {q} % of income',
        'budget.overplanned': ' · more allocated than available',
        'budget.doubleWarning': 'Note: your fixed costs already include {liste}. If these are the same savings, they are deducted twice.',
        'budget.legendFixed': 'Fixed costs',
        'budget.legendSavings': 'Savings',
        'budget.legendFree': 'Available',
        'budget.compare': 'Scenario comparison',
        'budget.colIncome': 'Income',
        'budget.colFixed': 'Fixed',
        'budget.colSavings': 'Savings',
        'budget.colFree': 'Left',
        'budget.adjustedTag': ' · fixed costs adjusted',
        'budget.openScenario': 'Open scenario',

        // Compound interest
        'zins.toggle.show': 'Show compound interest calculator',
        'zins.toggle.hide': 'Hide compound interest calculator',
        'zins.start': 'Starting capital / portfolio value (€)',
        'zins.rate': 'Monthly savings (€)',
        'zins.return': 'Annual return (%)',
        'zins.years': 'Duration (years)',
        'zins.inflation': 'Annual inflation (%)',
        'zins.viewAria': 'Final value view',
        'zins.endValue': 'Final value',
        'zins.rowStart': 'Starting capital',
        'zins.rowSavings': 'Total contributions',
        'zins.rowGains': 'Returns (compound interest)',
        'zins.rowNominal': 'Final value (nominal)',
        'zins.rowLoss': 'Purchasing power lost to inflation',
        'zins.rowReal': 'Final value in today’s money',
        'zins.hint': 'Assumptions: contributions at the end of each month, returns reinvested monthly, the return applies to starting capital and contributions. Taxes and costs are not included.',
        'zins.takeDepot': 'Use portfolio value ({name}: {wert})',
        'zins.resultLabel': 'Final value after {jahre}',
        'zins.resultLabelReal': 'Final value after {jahre} – in today’s money',
        'zins.subReal': 'nominal {nom} · at {infl} % inflation p.a.',
        'zins.subNominal': 'inflation-adjusted {real} ({infl} % inflation p.a.)',
        'zins.chartToday': 'Today',
        'zins.chartYear': 'Yr {n}',
        'zins.chartNominal': 'Nominal',
        'zins.chartReal': 'Inflation-adjusted',
        'zins.chartPaidIn': 'Paid in',

        // German pension account (Altersvorsorgedepot)
        'avd.toggle.show': 'Show pension account calculator (Germany)',
        'avd.toggle.hide': 'Hide pension account calculator',
        'avd.intro': 'Germany’s state-subsidised retirement account from 2027: basic subsidy of 50 % on the first €360 and 25 % up to €1,800 of own contributions per year (max. €540), plus up to €300 per child. Payout from age 65 at the earliest; as a payout plan until at least age 85.',
        'avd.profileAria': 'Select account',
        'avd.name': 'Account name',
        'avd.namePlaceholder': 'e.g. My account',
        'avd.remove': 'Remove this account',
        'avd.confirmRemove': 'Remove account “{name}” and all its entries?',
        'avd.default1': 'My account',
        'avd.default2': 'Second account',
        'avd.addSecond': '+ Second account',
        'avd.phase': 'Savings phase',
        'avd.age': 'Current age',
        'avd.payoutAge': 'Payout from age',
        'avd.contribution': 'Own contribution per month (€)',
        'avd.children': 'Children with child bonus',
        'avd.childYears': 'Child bonus for (years)',
        'avd.return': 'Annual return (%)',
        'avd.costs': 'Annual costs (%)',
        'avd.inflation': 'Annual inflation (%)',
        'avd.bonus': 'Career starter bonus (under 25, one-off €200)',
        'avd.bonusAria': 'Career starter bonus',
        'avd.taxes': 'Taxes',
        'avd.taxNow': 'Marginal tax rate today (%)',
        'avd.taxNowPlaceholder': 'empty = none',
        'avd.taxRetire': 'Tax rate in retirement (%)',
        'avd.resultDefault': 'Account value at payout start',
        'avd.rowOwn': 'Own contributions',
        'avd.rowSubsidies': 'Government subsidies',
        'avd.rowGains': 'Returns',
        'avd.rowValue': 'Account value',
        'avd.rowTax': 'Tax on payout (estimated)',
        'avd.rowNet': 'After tax',
        'avd.rowReal': 'After tax in today’s money',
        'avd.rowRefund': 'Additional tax refund (savings phase)',
        'avd.payoutPlan': 'Payout plan until 85',
        'avd.perMonthNet': '€ / month after tax',
        'avd.compareTitle': 'For comparison: regular ETF portfolio (same contributions, no subsidies)',
        'avd.compareEnd': 'Final value after tax',
        'avd.comparePlan': 'Payout plan until 85, after tax',
        'avd.hint': 'Simplified estimate: contributions at the end of each month, subsidies credited once a year, return minus costs. Payouts from the pension account are fully taxed at your personal tax rate; in the ETF portfolio only the gains are taxed at the German flat rate (incl. solidarity surcharge, 30 % partial exemption, excluding church tax, allowance and advance lump sum). The child bonus is paid only once per child – enter children in one account only. The tax refund during the savings phase is not included in the account value. Not investment advice.',
        'avd.infoBase': 'Annual contribution {beitrag} → basic subsidy {gz}',
        'avd.infoKids': ' + child bonus {kz}',
        'avd.infoRate': ' per year (subsidy rate {q} %).',
        'avd.infoFullBase': ' Full basic subsidy from {v} € per month.',
        'avd.infoFullKids': ' Full child bonus from {v} own contribution per year.',
        'avd.kidsWarning': 'Note: children are entered in both accounts. The child bonus is paid only once per child.',
        'avd.resultLabel': '{name}: account value at {alter} (after {jahre})',
        'avd.resultSub': 'in today’s money {v} · before tax',
        'avd.rateSub': '{brutto} gross from {von} to {bis} ({jahre}) · in today’s money approx. {real} after tax',
        'avd.etfRate': '{v} / month',
        'avd.etfSub': 'Before tax {etf} · advantage of the pension account after tax: {ges} total, {mon} per month',
        'avd.chartAvd': 'Pension account',
        'avd.chartEtf': 'ETF portfolio without subsidies',
        'avd.chartOwn': 'Own contributions',
        'avd.chartAge': 'Age',
        'avd.chartAgeTooltip': 'Age {n}',

        // Income from private assets
        'eink.toggle.show': 'Show monthly income from private assets',
        'eink.toggle.hide': 'Hide monthly income',
        'eink.intro': 'What your private assets can pay out per month in retirement. The values come from the compound interest calculator, the pension accounts and, if you like, your asset list.',
        'eink.introNoAvd': 'What your private assets can pay out per month in retirement. The values come from the compound interest calculator and, if you like, your asset list.',
        'eink.age': 'My current age',
        'eink.retire': 'Retirement at age',
        'eink.until': 'Withdraw until age',
        'eink.inflation': 'Annual inflation (%)',
        'eink.include': 'Include',
        'eink.restReturn': 'Annual return on other assets (%)',
        'eink.viewAria': 'Income view',
        'eink.resultDefault': 'Monthly income',
        'eink.preserve': 'Capital preservation option',
        'eink.hint': 'The ETF portfolio and other assets grow until retirement using the savings rate and return from the compound interest calculator or the return entered, and are then withdrawn evenly until the chosen age. The pension accounts pay out from their own payout age until 85 (values from the calculator above). ETF portfolio after German capital gains tax on the gain portion, pension accounts after the tax rate entered there, other assets before tax. State pension is not included.',
        'eink.hintNoAvd': 'The ETF portfolio and other assets grow until retirement using the savings rate and return from the compound interest calculator or the return entered, and are then withdrawn evenly until the chosen age. ETF portfolio after German capital gains tax on the gain portion, other assets before tax. State pension is not included.',
        'eink.srcEtf': 'ETF portfolio (compound interest calculator)',
        'eink.srcAvd': '{name} (pension account)',
        'eink.srcRest': 'Other assets from the list (excluding portfolio)',
        'eink.rowEtf': 'ETF portfolio',
        'eink.rowEtfInfo': '{wert} at {alter} · withdrawals until {bis}',
        'eink.rowAvdInfo': '{wert} at {alter} · payout {von}–{bis}',
        'eink.retireAbove': ' (retirement above: {n})',
        'eink.rowRest': 'Other assets',
        'eink.rowRestInfo': '{wert} at {alter} · withdrawals until {bis} · before tax',
        'eink.resultLabel': 'Monthly income from age {n}',
        'eink.resultLabelReal': 'Monthly income from age {n} – in today’s money',
        'eink.subReal': 'nominal {v} · after tax (estimated)',
        'eink.subNominal': 'inflation-adjusted {v} · after tax (estimated)',
        'eink.none': 'No source selected.',
        'eink.preserveSub': 'ETF portfolio and other assets: withdraw only the returns, the capital is preserved. Pension accounts keep paying their payout plan until 85.',
        'eink.preserveSubNoAvd': 'ETF portfolio and other assets: withdraw only the returns, the capital is preserved.',

        // Default values stored as data
        'default.netSalary': 'Net salary',
        'default.current': 'Current',
        'default.etfPlan': 'ETF savings plan'
    }
};

const SPRACHEN = Object.keys(I18N);

function ermittleStartSprache() {
    try {
        const gespeichert = localStorage.getItem('sprache');
        if (gespeichert && I18N[gespeichert]) return gespeichert;
    } catch (e) { /* localStorage nicht verfügbar */ }
    const browser = (navigator.language || 'de').toLowerCase();
    return browser.startsWith('de') ? 'de' : 'en';
}

let SPRACHE = ermittleStartSprache();

// Text in der aktuellen Sprache, {platzhalter} werden ersetzt
function t(schluessel, werte) {
    let text = (I18N[SPRACHE] && I18N[SPRACHE][schluessel]) ?? I18N.de[schluessel] ?? schluessel;
    if (werte) {
        Object.entries(werte).forEach(([k, v]) => { text = text.split('{' + k + '}').join(String(v)); });
    }
    return text;
}

// Zahlenformat passend zur Sprache (de: 1.234,56 – en: 1,234.56)
function zahlLocale() {
    return SPRACHE === 'en' ? 'en-GB' : 'de-DE';
}

// Anführungszeichen passend zur Sprache: „Text“ bzw. “Text”
function zitat(text) {
    return SPRACHE === 'en' ? '“' + text + '”' : '„' + text + '“';
}

// "1 Jahr" / "20 Jahren" bzw. "1 year" / "20 years"
function jahreText(n, nominativ) {
    if (n === 1) return t('unit.year', { n });
    return t(nominativ ? 'unit.years' : 'unit.yearsDative', { n });
}

// --- Vorgabenamen, die als Daten gespeichert werden ---
// Steht in der Datenbank noch der unveränderte Vorgabename (egal in welcher Sprache),
// wird er in der aktuellen Sprache angezeigt. Selbst vergebene Namen bleiben unverändert.
const STANDARD_SCHLUESSEL = [
    ...Array.from({ length: 12 }, (_, i) => 'fixed.default.' + i),
    ...Array.from({ length: 8 }, (_, i) => 'assets.default.' + i),
    'default.netSalary', 'default.current', 'default.etfPlan', 'avd.default1', 'avd.default2'
];

function lokalisiereStandard(wert) {
    if (wert === null || wert === undefined) return wert;
    const s = String(wert).trim();
    if (s === '') return String(wert);
    for (const key of STANDARD_SCHLUESSEL) {
        if (SPRACHEN.some(l => I18N[l][key] === s)) return t(key);
    }
    let m = s.match(/^(?:Fixkosten|Fixed cost) (\d+)$/);
    if (m) return t('fixed.numbered', { n: m[1] });
    m = s.match(/^(?:Szenario|Scenario) (\d+)$/);
    if (m) return t('budget.scenarioNumbered', { n: m[1] });
    m = s.match(/^AVD (.+)$/);
    if (m) return 'AVD ' + lokalisiereStandard(m[1]);
    return String(wert);
}

// --- Statische Texte im HTML setzen ---
function wendeSpracheAufHtmlAn(wurzel) {
    const root = wurzel || document;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll('[data-i18n-toggle]').forEach(el => {
        const offen = el.getAttribute('aria-expanded') === 'true';
        el.textContent = t(el.dataset.i18nToggle + (offen ? '.hide' : '.show'));
    });
    root.querySelectorAll('.lang-switch [data-lang]').forEach(btn => {
        const aktiv = btn.dataset.lang === SPRACHE;
        btn.classList.toggle('active', aktiv);
        btn.setAttribute('aria-pressed', String(aktiv));
    });
    if (!wurzel) {
        document.documentElement.lang = SPRACHE;
        document.title = t('app.title');
        const appTitel = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appTitel) appTitel.content = t('app.shortTitle');
    }
}

// Öffnen/Schließen-Button mit passendem Text
function setzeToggle(btn, offen) {
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(offen));
    if (btn.dataset.i18nToggle) btn.textContent = t(btn.dataset.i18nToggle + (offen ? '.hide' : '.show'));
}

function setzeSprache(sprache) {
    if (!I18N[sprache] || sprache === SPRACHE) return;
    SPRACHE = sprache;
    try { localStorage.setItem('sprache', sprache); } catch (e) { /* nur für diese Sitzung */ }
    wendeSpracheAufHtmlAn();
    if (typeof window.nachSprachwechsel === 'function') window.nachSprachwechsel();
}

document.addEventListener('DOMContentLoaded', () => wendeSpracheAufHtmlAn());
