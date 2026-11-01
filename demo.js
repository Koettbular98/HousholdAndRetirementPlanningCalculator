// ===== Demo mode =====
// Lets anyone who clones the repository try the app without setting up Firebase.
// Demo mode is active when firebase-config.js is missing, or when the URL contains ?demo.
// It replaces Firebase Auth and the Realtime Database with a small local stand-in:
//   - one test user (DEMO_EMAIL / DEMO_PASSWORD)
//   - sample data that is stored only in this browser (localStorage) and can be reset in the settings
// Nothing is ever sent to a server in demo mode.

const DEMO_MODE = !window.FIREBASE_CONFIG || new URLSearchParams(location.search).has('demo');
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo';

const DEMO_STORAGE_KEY = 'householdDemo.data.v1';
const DEMO_LOGIN_KEY = 'householdDemo.signedIn';

// localStorage can be unavailable (private mode, blocked storage) – then the demo keeps its data in memory only
const demoStorage = {
    memory: {},
    get(key) {
        try { return localStorage.getItem(key); } catch (e) { return this.memory[key] ?? null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { this.memory[key] = value; }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) { delete this.memory[key]; }
    }
};

function demoDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Builds a realistic sample household in the current language.
// Uses the same keys as the real database, so the app does not need to know it is running a demo.
function createDemoData() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear());
    const data = { letzterMonat: month, letztesJahr: year };

    // Monthly budget: balance and expenses for the current month (some already paid) plus the template for new months
    const expenses = [
        ['demo.exp.groceries', '450', true],
        ['demo.exp.fuel', '120', true],
        ['demo.exp.drugstore', '60', false],
        ['demo.exp.leisure', '150', false],
        ['demo.exp.gifts', '80', false]
    ];
    const monthPrefix = `haushalt_${year}_${month}_`;
    data[monthPrefix + 'kontostand'] = '2450';
    data[monthPrefix + 'ausgabeAnzahl'] = expenses.length;
    data['template_ausgabeAnzahl'] = expenses.length;
    expenses.forEach(([key, amount, paid], i) => {
        data[monthPrefix + 'ausgabeName' + (i + 1)] = t(key);
        data[monthPrefix + 'ausgabe' + (i + 1)] = amount;
        data[monthPrefix + 'status' + (i + 1)] = paid;
        data['template_ausgabeName' + (i + 1)] = t(key);
        data['template_ausgabe' + (i + 1)] = amount;
    });

    // Fixed costs: [amount, interval] for the default rows
    const fixedCosts = [
        ['1150', 'monatlich'], ['85', 'monatlich'], ['95', 'monatlich'], ['40', 'monatlich'],
        ['55.08', 'quartal'], ['25', 'monatlich'], ['35', 'monatlich'], ['23', 'monatlich'],
        ['72', 'jaehrlich'], ['540', 'jaehrlich'], ['0', 'monatlich'], ['50', 'monatlich']
    ];
    for (let i = 0; i < 16; i++) {
        const [amount, interval] = fixedCosts[i] || ['0', 'monatlich'];
        data[`fix_name_${i}`] = i < 12 ? t('fixed.default.' + i) : t('fixed.numbered', { n: i + 1 });
        data[`fix_betrag_${i}`] = amount;
        data[`fix_turnus_${i}`] = interval;
    }

    // Assets and a history of the last months for the chart
    const assets = ['2450', '12000', '38500', '1500', '3000', '8500', '0', '0'];
    assets.forEach((value, i) => {
        data[`asset_name_${i}`] = t('assets.default.' + i);
        data[`asset_wert_${i}`] = value;
    });
    const total = assets.reduce((sum, v) => sum + Number(v), 0);
    const history = [52100, 53400, 52800, 55900, 58200, 57600, 61300, total];
    history.forEach((value, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (history.length - 1 - i) * 30);
        data['asset_history_' + demoDateKey(d)] = value;
    });

    // Income & fixed costs scenarios
    const avd1 = t('avd.default1');
    const avd2 = t('demo.avd2');
    data.budget_szenarien = JSON.stringify([
        {
            name: t('default.current'),
            einnahmen: [
                { name: t('default.netSalary'), betrag: '3400' },
                { name: t('demo.income.partner'), betrag: '2100' },
                { name: t('demo.income.childBenefit'), betrag: '255' }
            ],
            sparen: [
                { name: t('default.etfPlan'), betrag: '400', einheit: 'eur' },
                { name: 'AVD ' + avd1, betrag: '150', einheit: 'eur' },
                { name: 'AVD ' + avd2, betrag: '150', einheit: 'eur' },
                { name: t('demo.saving.buffer'), betrag: '10', einheit: 'proz' }
            ],
            fix: {},
            fixExtra: []
        },
        {
            name: t('demo.scenario.parental'),
            einnahmen: [
                { name: t('default.netSalary'), betrag: '3400' },
                { name: t('demo.income.parentalAllowance'), betrag: '1300' },
                { name: t('demo.income.childBenefit'), betrag: '255' }
            ],
            sparen: [
                { name: t('default.etfPlan'), betrag: '200', einheit: 'eur' },
                { name: 'AVD ' + avd1, betrag: '150', einheit: 'eur' }
            ],
            fix: { '6': '0' },
            fixExtra: [{ name: t('demo.fix.daycare'), betrag: '250' }]
        }
    ]);
    data.budget_aktiv = 0;

    // Compound interest calculator
    Object.assign(data, {
        zins_start: '38500', zins_sparrate: '400', zins_rendite: '6', zins_jahre: '25', zins_inflation: '2'
    });

    // German pension accounts (Altersvorsorgedepot): one per partner
    Object.assign(data, {
        avd_name: avd1, avd_alter: '35', avd_rente: '67', avd_beitrag: '150', avd_kinder: '1', avd_kinderjahre: '16',
        avd_rendite: '6', avd_kosten: '0.4', avd_inflation: '2', avd_steuerheute: '35', avd_steuerrente: '20',
        avd2_aktiv: true, avd2_name: avd2, avd2_alter: '33', avd2_rente: '67', avd2_beitrag: '150', avd2_kinder: '0',
        avd2_kinderjahre: '0', avd2_rendite: '6', avd2_kosten: '0.4', avd2_inflation: '2', avd2_steuerheute: '30', avd2_steuerrente: '18'
    });

    // Retirement income
    Object.assign(data, { eink_alter: '35', eink_rente: '67', eink_bis: '90', eink_inflation: '2' });

    return data;
}

// Stand-in for firebase.auth() and firebase.database() with the few methods the app uses
function createDemoBackend() {
    let data;
    try {
        data = JSON.parse(demoStorage.get(DEMO_STORAGE_KEY));
    } catch (e) {
        data = null;
    }
    if (!data || typeof data !== 'object') {
        data = createDemoData();
        demoStorage.set(DEMO_STORAGE_KEY, JSON.stringify(data));
    }

    const save = () => demoStorage.set(DEMO_STORAGE_KEY, JSON.stringify(data));
    const demoUser = { uid: 'demo-user', email: DEMO_EMAIL };
    let authListener = null;

    const auth = {
        currentUser: null,
        onAuthStateChanged(callback) {
            authListener = callback;
            this.currentUser = demoStorage.get(DEMO_LOGIN_KEY) === '1' ? demoUser : null;
            setTimeout(() => callback(this.currentUser), 0);
        },
        signInWithEmailAndPassword(email, password) {
            if (String(email).trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
                return Promise.reject(new Error(t('demo.wrongLogin')));
            }
            this.currentUser = demoUser;
            demoStorage.set(DEMO_LOGIN_KEY, '1');
            setTimeout(() => authListener && authListener(demoUser), 0);
            return Promise.resolve({ user: demoUser });
        },
        signOut() {
            this.currentUser = null;
            demoStorage.remove(DEMO_LOGIN_KEY);
            if (authListener) authListener(null);
            return Promise.resolve();
        }
    };

    const database = {
        ref() {
            return {
                once: () => Promise.resolve({ val: () => JSON.parse(JSON.stringify(data)) }),
                update(changes) {
                    Object.entries(changes).forEach(([key, value]) => {
                        if (value === null) delete data[key];
                        else data[key] = value;
                    });
                    save();
                    return Promise.resolve();
                },
                child: () => ({ transaction() {} })
            };
        }
    };

    // Discards all changes and starts again with fresh sample data
    function reset() {
        data = createDemoData();
        save();
    }

    return { auth, database, reset };
}