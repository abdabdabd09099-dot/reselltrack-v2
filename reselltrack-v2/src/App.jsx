// ─── App.jsx ──────────────────────────────────────────────────────────────────
// App root — handles auth, data loading, navigation, and renders each page.
// Pages live in src/pages/ — edit them there, not here.
// To add a new page: create src/pages/MyPage.jsx, add to NAV_ITEMS, add a
// route in the {page === 'mypage'} block inside the <content> div.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { sb, signOut, apiProducts, apiSales, apiExpenses, apiLending, apiBorrowing } from './utils/supabase.js'
import { CURRENCIES, THEMES, LANGS, DEFAULT_SETTINGS } from './data/constants.js'
import { loadSettings, saveSettings } from './utils/helpers.js'
import { buildCss } from './utils/buildCss.js'

// ── Pages ─────────────────────────────────────────────────────────────────────
import AuthScreen  from './pages/AuthScreen.jsx'
import Dashboard   from './pages/Dashboard.jsx'
import Products    from './pages/Products.jsx'
import Sales       from './pages/Sales.jsx'
import Expenses    from './pages/Expenses.jsx'
import LendBorrow  from './pages/LendBorrow.jsx'
import Reports     from './pages/Reports.jsx'
import Settings    from './pages/Settings.jsx'

// ── Components ────────────────────────────────────────────────────────────────
import InstallPrompt from './components/InstallPrompt.jsx'
import OfflineBar    from './components/OfflineBar.jsx'

// ── Navigation config ─────────────────────────────────────────────────────────
// Add new pages here — icon, label key, page ID
const NAV_ITEMS = L => [
  { id: 'dashboard', icon: '📊', lbl: L.dashboard  },
  { id: 'products',  icon: '📦', lbl: L.products   },
  { id: 'sales',     icon: '🛍️', lbl: L.sales      },
  { id: 'expenses',  icon: '💸', lbl: L.expenses   },
  { id: 'lend',      icon: '🤝', lbl: L.lendBorrow },
  { id: 'reports',   icon: '📈', lbl: L.reports    },
  { id: 'settings',  icon: '⚙️', lbl: L.settings   },
]

// Bottom nav (phone) — 5 items max
const BNAV_ITEMS = L => [
  { id: 'dashboard', icon: '📊', lbl: L.home     },
  { id: 'sales',     icon: '🛍️', lbl: L.sales    },
  { id: 'expenses',  icon: '💸', lbl: L.expenses },
  { id: 'reports',   icon: '📈', lbl: L.reports  },
  { id: 'settings',  icon: '⚙️', lbl: L.settings },
]

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ T, message }) {
  return (
    <>
      <style>{buildCss(T)}</style>
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: T.bg, flexDirection: 'column', gap: 16 }}>
        <img src="/icons/icon-96.png" alt="" style={{ width: 56, height: 56, borderRadius: 14, opacity: .85 }} />
        <div style={{ color: T.textSecondary, fontSize: 14 }}>{message}</div>
      </div>
    </>
  )
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [user,      setUser]      = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading,   setLoading]   = useState(false)

  // ── Data state ─────────────────────────────────────────────────────────────
  const [products,  setProducts]  = useState([])
  const [sales,     setSales]     = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [lending,   setLending]   = useState([])
  const [borrowing, setBorrowing] = useState([])

  // ── UI state ───────────────────────────────────────────────────────────────
  const [settings,  setSettings]  = useState(() => loadSettings(DEFAULT_SETTINGS))
  const [page,      setPage]      = useState('dashboard')
  const [slim,      setSlim]      = useState(false)
  const [mOpen,     setMOpen]     = useState(false)
  const [ww,        setWw]        = useState(window.innerWidth)

  // ── Watch auth session ─────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch all data when user logs in ───────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setProducts([]); setSales([]); setExpenses([]); setLending([]); setBorrowing([])
      return
    }
    setLoading(true)
    Promise.all([
      apiProducts.fetch(),
      apiSales.fetch(),
      apiExpenses.fetch(),
      apiLending.fetch(),
      apiBorrowing.fetch(),
    ])
      .then(([p, s, e, l, b]) => {
        setProducts(p); setSales(s); setExpenses(e); setLending(l); setBorrowing(b)
      })
      .catch(err => console.error('Data load error:', err))
      .finally(() => setLoading(false))
  }, [user])

  // ── Responsive window width ────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setWw(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Theme / language / currency ────────────────────────────────────────────
  const T      = THEMES[settings.theme]       || THEMES.dark
  const L      = LANGS[settings.language]     || LANGS.en
  const curObj = CURRENCIES.find(c => c.code === settings.currencyCode) || CURRENCIES[0]

  const cur = (n, compact = false) => {
    const v = Number(n || 0)
    if (compact && v >= 1000) return curObj.symbol + (v / 1000).toFixed(1) + 'k'
    return curObj.symbol + v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Apply CSS vars to document
  useEffect(() => {
    document.documentElement.style.setProperty('--srf', T.surface)
    document.documentElement.style.setProperty('--bdr', T.border)
  }, [T.surface, T.border])

  const isTablet   = ww <= 900
  const go         = id => { setPage(id); setMOpen(false) }
  const biz        = settings.businessName || 'ResellTrack'
  const shared     = { T, L, cur }
  const userId     = user?.id
  const navItems   = NAV_ITEMS(L)
  const bnavItems  = BNAV_ITEMS(L)

  // ── Auth check loading ─────────────────────────────────────────────────────
  if (!authReady) return <Spinner T={T} message="Loading ResellTrack…" />

  // ── Not logged in → show auth screen ──────────────────────────────────────
  if (!user) return <><style>{buildCss(T)}</style><AuthScreen T={T} /></>

  // ── Fetching data ──────────────────────────────────────────────────────────
  if (loading) return <Spinner T={T} message="Loading your data from Supabase…" />

  // ── Main app shell ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{buildCss(T)}</style>
      <OfflineBar T={T} />

      <div className="shell" dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>

        {/* ── Mobile overlay ── */}
        {isTablet && mOpen && (
          <div className="overlay on" onClick={() => setMOpen(false)} />
        )}

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className={`sidebar${!isTablet && slim ? ' slim' : ''}${isTablet && mOpen ? ' open' : ''}`}>

          {/* Logo + collapse button */}
          <div style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <img src="/icons/icon-72.png" alt="ResellTrack" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            {(!slim || isTablet) && (
              <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {biz}
              </span>
            )}
            {!isTablet && (
              <button onClick={() => setSlim(s => !s)}
                style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 15, marginLeft: 'auto', flexShrink: 0, cursor: 'pointer' }}>
                {slim ? '▶' : '◀'}
              </button>
            )}
            {isTablet && (
              <button onClick={() => setMOpen(false)}
                style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 22, marginLeft: 'auto', lineHeight: 1, cursor: 'pointer' }}>×</button>
            )}
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => go(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', borderRadius: 8, marginBottom: 3,
                  background: page === n.id ? T.accent + '22' : 'transparent',
                  color:      page === n.id ? T.accent : T.textSecondary,
                  fontWeight: page === n.id ? 600 : 400,
                  border:     page === n.id ? `1px solid ${T.accent}44` : '1px solid transparent',
                  textAlign: 'left', cursor: 'pointer',
                }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{n.icon}</span>
                {(!slim || isTablet) && <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{n.lbl}</span>}
              </button>
            ))}
          </nav>

          {/* User email + sign out */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            {(!slim || isTablet) && (
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            )}
            <button onClick={() => signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <span>🚪</span>
              {(!slim || isTablet) && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ══ MAIN CONTENT ═════════════════════════════════════════════════ */}
        <div className="main-wrap">

          {/* Mobile top bar */}
          {isTablet && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: T.surface, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 40 }}>
              <button onClick={() => setMOpen(true)}
                style={{ background: 'none', border: 'none', color: T.textSecondary, fontSize: 24, padding: '4px 8px', cursor: 'pointer' }}>☰</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/icons/icon-72.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
                <span className="dm" style={{ fontWeight: 700, color: T.accent, fontSize: 15 }}>{biz}</span>
              </div>
              <span style={{ fontSize: 12, color: T.textMuted, padding: '0 8px' }}>{curObj.symbol} {curObj.code}</span>
            </div>
          )}

          {/* ── Page content — each page is its own file in src/pages/ ── */}
          <div className="content">
            {page === 'dashboard' && (
              <Dashboard
                products={products} sales={sales} expenses={expenses}
                lending={lending} borrowing={borrowing} {...shared}
              />
            )}
            {page === 'products' && (
              <Products
                products={products} setProducts={setProducts}
                userId={userId} {...shared}
              />
            )}
            {page === 'sales' && (
              <Sales
                products={products} setProducts={setProducts}
                sales={sales} setSales={setSales}
                lending={lending} setLending={setLending}
                userId={userId} {...shared}
              />
            )}
            {page === 'expenses' && (
              <Expenses
                expenses={expenses} setExpenses={setExpenses}
                userId={userId} {...shared}
              />
            )}
            {page === 'lend' && (
              <LendBorrow
                lending={lending} setLending={setLending}
                borrowing={borrowing} setBorrowing={setBorrowing}
                userId={userId} {...shared}
              />
            )}
            {page === 'reports' && (
              <Reports
                sales={sales} expenses={expenses}
                lending={lending} borrowing={borrowing} {...shared}
              />
            )}
            {page === 'settings' && (
              <Settings
                settings={settings} setSettings={setSettings}
                products={products} sales={sales} expenses={expenses}
                lending={lending} borrowing={borrowing} {...shared}
              />
            )}
          </div>
        </div>

        {/* ══ BOTTOM NAV (phone) ═══════════════════════════════════════════ */}
        <nav className="bottom-nav">
          {bnavItems.map(n => (
            <button key={n.id} onClick={() => go(n.id)} className={page === n.id ? 'on' : ''}>
              <span className="bnav-i">{n.icon}</span>
              <span>{n.lbl}</span>
            </button>
          ))}
        </nav>

        {/* PWA install prompt */}
        <InstallPrompt T={T} />
      </div>
    </>
  )
}
