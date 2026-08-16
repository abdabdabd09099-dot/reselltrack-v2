# ResellTrack v2 — Modular Project

Every page is its own file. Open the one you want to edit and change it.

## Project Structure

```
reselltrack-v2/
├── index.html               ← PWA meta tags, viewport
├── vite.config.js           ← Vite + PWA plugin config
├── package.json
├── supabase-fix.sql         ← Run once in Supabase SQL Editor
│
└── src/
    ├── main.jsx             ← Entry point (don't touch)
    ├── App.jsx              ← Shell: auth, routing, nav, data loading
    │
    ├── pages/               ← ✏️  EDIT THESE
    │   ├── AuthScreen.jsx   ← Login / Register screen
    │   ├── Dashboard.jsx    ← Overview, charts, recent sales
    │   ├── Products.jsx     ← Product catalog, stock tracking
    │   ├── Sales.jsx        ← Record sales, filters, mark paid
    │   ├── Expenses.jsx     ← Log expenses by category
    │   ├── LendBorrow.jsx   ← Lending & borrowing ledger
    │   ├── Reports.jsx      ← Daily/Weekly/Monthly charts
    │   └── Settings.jsx     ← Theme, language, currency, export
    │
    ├── components/          ← Shared UI atoms (used by all pages)
    │   ├── UI.jsx           ← Badge, Btn, Modal, Field, Stat, Tbl, Accordion...
    │   ├── InstallPrompt.jsx← PWA "Add to Home Screen" banner
    │   └── OfflineBar.jsx   ← Online/offline indicator
    │
    ├── data/
    │   └── constants.js     ← Themes, currencies, languages, colors
    │
    ├── hooks/               ← Add custom React hooks here
    │
    └── utils/
        ├── supabase.js      ← Supabase client + all API calls
        ├── helpers.js       ← Date, currency, storage helpers
        └── buildCss.js      ← Theme-aware global CSS
```

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Fix the database (run once)
Go to → https://app.supabase.com/project/devqrpcxaxjcxdixwitw/sql/new
Paste `supabase-fix.sql` → Run → see `Database ready ✅`

### 3. Run locally
```bash
npm run dev
# Open http://localhost:5173
```

### 4. Build for production
```bash
npm run build
npm run preview
```

## How to modify each page

Every page file has a comment at the top telling you what it does and what you might want to change. For example:

```
// To modify: add discount field, add receipt print, change filter options.
```

Open the file, make your change, save — Vite hot-reloads instantly.

## How to add a new page

1. Create `src/pages/MyPage.jsx`
2. Open `src/App.jsx`
3. Add to `NAV_ITEMS`: `{ id: 'mypage', icon: '🆕', lbl: 'My Page' }`
4. Add the import: `import MyPage from './pages/MyPage.jsx'`
5. Add the route: `{page === 'mypage' && <MyPage {...shared} />}`

## Supabase
- **URL:** https://devqrpcxaxjcxdixwitw.supabase.co
- **Dashboard:** https://app.supabase.com/project/devqrpcxaxjcxdixwitw
- Credentials are in `src/utils/supabase.js`

## Deploy to Vercel
```bash
npm run build
# Drag dist/ to vercel.com  OR  connect your GitHub repo
```
