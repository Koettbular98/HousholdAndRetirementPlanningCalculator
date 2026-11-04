# Household- & RetirementPlanningCalculator

This project helps you keep track of your own financial data: monthly spending, fixed costs, assets and savings. I run my own instance with a Firebase Realtime Database as the backend.

Your bank accounts are **not** connected through a banking or wealth API. All values are entered manually, so you decide exactly what is stored, and the data stays in your own Firebase project.

The app is also meant to support private retirement planning: it projects how your savings grow over time, what they are worth after inflation, and how much monthly income your private assets could provide in retirement.

## Try the demo

You can try the app without setting up Firebase:

1. Clone or download the repository.
2. Start a local web server in the project folder, e.g. `python3 -m http.server 8000`.
3. Open `http://localhost:8000/?demo` and sign in with the test user:
   - Email: `demo@example.com`
   - Password: `demo`

Without a `firebase-config.js` the app automatically runs in **demo mode**. It comes with a sample household and keeps all changes in your browser only (localStorage). Nothing is sent to a server. You can reset the sample data at any time in the settings (⚙︎).

With Firebase configured, you can still open the demo by adding `?demo` to the URL.

## Features

- **Monthly budget**: account balance, expenses that can be ticked off once paid, and the amount still available this month. New months start from the expenses of the last month you edited.
- **Fixed costs**: monthly, quarterly and yearly costs, converted into an average monthly amount.
- **Assets**: asset categories with a running total and a history chart. Tap two points in the chart to see the difference between them.
- **Income & fixed costs scenarios**: any number of scenarios (e.g. "Current", "Parental leave"), each with its own income, savings and adjustments to the fixed costs. The fixed costs tab itself stays unchanged. Each scenario shows what is left after fixed costs and savings, plus your savings rate, and a comparison table puts all scenarios side by side.
- **Compound interest calculator**: starting capital (taken from your portfolio value), monthly savings, annual return and duration. Results are shown both nominal and inflation-adjusted.
- **German pension account calculator (Altersvorsorgedepot, optional)**: models Germany's state-subsidised retirement account from 2027, including basic subsidy, child bonus, career starter bonus and a payout plan until age 85. You can model a second account (e.g. for your partner) and compare it with a regular ETF portfolio. Because this only applies in Germany, the calculator can be switched off in the settings.
- **Retirement income from private assets**: combines the ETF portfolio, the pension accounts and, optionally, your other assets into an estimated monthly income from a chosen age. It shows both a payout plan and a capital-preservation variant, nominal or in today's money.
- **German and English**: switch the language in the settings. The choice is saved per device.
- **Mobile-friendly**: designed for smartphones, can be added to the home screen and supports light and dark mode.
- **Demo mode**: try everything with sample data, no Firebase needed.

## Tech stack

- Plain HTML, CSS and JavaScript, no build step
- [Firebase](https://firebase.google.com/) (Authentication with email/password, Realtime Database)
- [Chart.js](https://www.chartjs.org/) for the charts

## Project structure

```
index.html                  Layout and styles
app.js                      Application logic and calculations
i18n.js                     All texts in German and English
demo.js                     Demo mode: local test user and sample data
firebase-config.js          Your own configuration (not in the repository)
database.rules.json         Example security rules for the Realtime Database
pictures/                   Logo and app icon
```

## Setup

1. **Create a Firebase project** in the [Firebase console](https://console.firebase.google.com/) and add a web app.
2. **Enable Authentication** with the *Email/Password* provider and create one user for each person in your household.
3. **Disable self sign-up** (Authentication → Settings → User actions), so nobody else can create an account with your public config.
4. **Create a Realtime Database** and apply the rules from `database.rules.json`. Replace `UID_PERSON_1` / `UID_PERSON_2` with the user IDs from Authentication → Users.
5. **Add your configuration**: copy `firebase-config.example.js` to `firebase-config.js` and fill in the values from your project settings. This file is listed in `.gitignore` and must never be committed.
6. **Run it locally** through a local web server rather than by opening the file directly, e.g.
   ```bash
   python3 -m http.server 8000
   ```
   then open `http://localhost:8000`.
7. **Deploy (optional)**, e.g. with Firebase Hosting:
   ```bash
   firebase deploy
   ```

## Security notes

- The Firebase web config is not a secret: browsers can always read it. Your data is protected by the **database rules** and by **disabling sign-up**, so set both up before going live.
- Never commit `firebase-config.js`, data exports or backups. They are excluded in `.gitignore`.

## Disclaimer

All projections are simplified estimates based on your own assumptions about returns, inflation and taxes. Tax calculations follow German rules (e.g. flat-rate capital gains tax with partial exemption for equity ETFs). This project is not financial, tax or investment advice.
