// ─── App.jsx ──────────────────────────────────────────────────────────────────
// App root — handles landing, demo mode, auth, data, routing, navigation.
// Flow: Landing → Demo (optional) → Auth → Full App
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { sb, signOut, apiProducts, apiSales, apiExpenses, apiLending, apiBorrowing } from './utils/supabase.js'
import { CURRENCIES, THEMES, LANGS, DEFAULT_SETTINGS } from './data/constants.js'
import { loadSettings, saveSettings } from './utils/helpers.js'
import { buildCss } from './utils/buildCss.js'
import { useDemo, DEMO_LIMIT } from './hooks/useDemo.js'

// ── Pages ─────────────────────────────────────────────────────────────────────
import Landing       from './pages/Landing.jsx'
import AuthScreen    from './pages/AuthScreen.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import Products      from './pages/Products.jsx'
import Sales         from './pages/Sales.jsx'
import Expenses      from './pages/Expenses.jsx'
import LendBorrow    from './pages/LendBorrow.jsx'
import Reports       from './pages/Reports.jsx'
import Settings      from './pages/Settings.jsx'

// ── Components ────────────────────────────────────────────────────────────────
import { LoadingScreen, NetworkErrorScreen, OfflineBanner } from './components/Loader.jsx'
import InstallPrompt    from './components/InstallPrompt.jsx'
import DemoLimitPrompt  from './components/DemoLimitPrompt.jsx'

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV_ITEMS = L => [
  { id: 'dashboard', icon: '📊', lbl: L.dashboard  },
  { id: 'products',  icon: '📦', lbl: L.products   },
  { id: 'sales',     icon: '🛍️', lbl: L.sales      },
  { id: 'expenses',  icon: '💸', lbl: L.expenses   },
  { id: 'lend',      icon: '🤝', lbl: L.lendBorrow },
  { id: 'reports',   icon: '📈', lbl: L.reports    },
  { id: 'settings',  icon: '⚙️', lbl: L.settings   },
]
const BNAV_ITEMS = L => [
  { id: 'dashboard', icon: '📊', lbl: L.home     },
  { id: 'sales',     icon: '🛍️', lbl: L.sales    },
  { id: 'expenses',  icon: '💸', lbl: L.expenses },
  { id: 'reports',   icon: '📈', lbl: L.reports  },
  { id: 'settings',  icon: '⚙️', lbl: L.settings },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── View state: 'landing' | 'auth' | 'app' ────────────────────────────────
  const [view,      setView]      = useState('landing')
  const [user,      setUser]      = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [netError,  setNetError]  = useState(false)
  const [isDemo,    setIsDemo]    = useState(false)

  // ── Real data ──────────────────────────────────────────────────────────────
  const [products,  setProducts]  = useState([])
  const [sales,     setSales]     = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [lending,   setLending]   = useState([])
  const [borrowing, setBorrowing] = useState([])

  // ── Demo data ──────────────────────────────────────────────────────────────
  const {
    demoProducts, setDemoProducts, demoSales, setDemoSales,
    demoExpenses, setDemoExpenses, demoLending, setDemoLending,
    demoBorrowing, setDemoBorrowing, demoLimitHit, setDemoLimitHit, demoApi,
  } = useDemo()

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [settings,  setSettings]  = useState(() => loadSettings(DEFAULT_SETTINGS))
  const [page,      setPage]      = useState('dashboard')
  const [slim,      setSlim]      = useState(false)
  const [mOpen,     setMOpen]     = useState(false)
  const [ww,        setWw]        = useState(window.innerWidth)

  // ── Watch auth ─────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      setAuthReady(true)
      if (u) setView('app')
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) { setIsDemo(false); setView('app') }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load data (real users only) ────────────────────────────────────────────
  useEffect(() => {
    if (!user || isDemo) return
    setLoading(true); setNetError(false)
    Promise.all([
      apiProducts.fetch(), apiSales.fetch(), apiExpenses.fetch(),
      apiLending.fetch(), apiBorrowing.fetch(),
    ])
      .then(([p, s, e, l, b]) => {
        setProducts(p); setSales(s); setExpenses(e); setLending(l); setBorrowing(b)
      })
      .catch(() => setNetError(true))
      .finally(() => setLoading(false))
  }, [user, isDemo])

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setWw(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── Theme / language / currency ────────────────────────────────────────────
  const T      = THEMES[settings.theme]       || THEMES.dark
  const L      = LANGS[settings.language]     || LANGS.en
  const curObj = CURRENCIES.find(c => c.code === settings.currencyCode) || CURRENCIES[0]
  const cur    = (n, compact = false) => {
    const v = Number(n || 0)
    if (compact && v >= 1000) return curObj.symbol + (v / 1000).toFixed(1) + 'k'
    return curObj.symbol + v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  useEffect(() => {
    document.documentElement.style.setProperty('--srf', T.surface)
    document.documentElement.style.setProperty('--bdr', T.border)
  }, [T.surface, T.border])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const isTablet  = ww <= 900
  const go        = id => { setPage(id); setMOpen(false) }
  const biz       = settings.businessName || 'ResellTrack'
  const userId    = user?.id
  const navItems  = NAV_ITEMS(L)
  const bnavItems = BNAV_ITEMS(L)

  // ── Active data set (demo or real) ─────────────────────────────────────────
  const P  = isDemo ? demoProducts  : products
  const S  = isDemo ? demoSales     : sales
  const E  = isDemo ? demoExpenses  : expenses
  const LD = isDemo ? demoLending   : lending
  const B  = isDemo ? demoBorrowing : borrowing
  const setP  = isDemo ? setDemoProducts  : setProducts
  const setS  = isDemo ? setDemoSales     : setSales
  const setE  = isDemo ? setDemoExpenses  : setExpenses
  const setLD = isDemo ? setDemoLending   : setLending
  const setB  = isDemo ? setDemoBorrowing : setBorrowing

  // ── Shared props ───────────────────────────────────────────────────────────
  const shared = { T, L, cur }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const enterDemo = () => { setIsDemo(true); setView('app') }
  const goSignUp  = () => { setIsDemo(false); setView('auth') }
  const goSignIn  = () => setView('auth')

  const handleSignOut = () => {
    signOut()
    setUser(null)
    setProducts([]); setSales([]); setExpenses([]); setLending([]); setBorrowing([])
    setView('landing')
  }

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (!authReady && !isDemo && view === 'landing') {
    return <LoadingScreen accent={T.accent} />
  }

  if (view === 'landing') {
    return <Landing onSignUp={goSignUp} onDemo={enterDemo} />
  }

  // ── AUTH ───────────────────────────────────────────────────────────────────
  if (view === 'auth') {
    return <><style>{buildCss(T)}</style><AuthScreen T={T} /></>
  }

  // ── LOADING DATA ───────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen message="Loading your data…" submessage="Fetching from Supabase cloud…" accent={T.accent} />
  }

  // ── NETWORK ERROR ──────────────────────────────────────────────────────────
  if (netError) {
    return (
      <NetworkErrorScreen
        onRetry={() => {
          setNetError(false)
          setLoading(true)
          Promise.all([apiProducts.fetch(), apiSales.fetch(), apiExpenses.fetch(), apiLending.fetch(), apiBorrowing.fetch()])
            .then(([p, s, e, l, b]) => { setProducts(p); setSales(s); setExpenses(e); setLending(l); setBorrowing(b) })
            .catch(() => setNetError(true))
            .finally(() => setLoading(false))
        }}
      />
    )
  }

  // ── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{buildCss(T)}</style>
      <OfflineBanner accent={T.accent} />

      {/* Demo limit prompt */}
      {isDemo && demoLimitHit && (
        <DemoLimitPrompt
          T={T}
          onSignUp={goSignUp}
          onContinue={() => setDemoLimitHit(false)}
        />
      )}

      <div className="shell" dir={settings.language === 'ar' ? 'rtl' : 'ltr'}>
        {isTablet && mOpen && <div className="overlay on" onClick={() => setMOpen(false)} />}

        {/* ══ SIDEBAR ══ */}
        <aside className={`sidebar${!isTablet && slim ? ' slim' : ''}${isTablet && mOpen ? ' open' : ''}`}>
          <div style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <img src="/icons/icon-72.png" alt="ResellTrack" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            {(!slim || isTablet) && (
              <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDemo ? 'Demo Mode' : biz}
              </span>
            )}
            {!isTablet && <button onClick={() => setSlim(s => !s)} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 15, marginLeft: 'auto', flexShrink: 0, cursor: 'pointer' }}>{slim ? '▶' : '◀'}</button>}
            {isTablet  && <button onClick={() => setMOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 22, marginLeft: 'auto', lineHeight: 1, cursor: 'pointer' }}>×</button>}
          </div>

          {/* Demo badge */}
          {isDemo && (!slim || isTablet) && (
            <div style={{ margin: '10px 10px 0', background: '#F5A62318', border: '1px solid #F5A62344', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#F5A623', textAlign: 'center', lineHeight: 1.5 }}>
              👀 Demo Mode<br/>
              <span style={{ color: '#64748B' }}>
                {S.length}/{DEMO_LIMIT} sales · {P.filter(p => !p.id?.startsWith('demo-p')).length}/{DEMO_LIMIT} products
              </span>
            </div>
          )}

          <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => go(n.id)} style={{
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

          <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            {isDemo ? (
              <>
                {(!slim || isTablet) && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Browsing in demo</div>}
                <button onClick={goSignUp} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 8, background: '#F5A623', border: 'none', color: '#0D0F14', fontSize: 12, fontWeight: 700, cursor: 'pointer', justifyContent: 'center' }}>
                  <span>🔓</span>{(!slim || isTablet) && <span>Create Free Account</span>}
                </button>
              </>
            ) : (
              <>
                {(!slim || isTablet) && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>}
                <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <span>🚪</span>{(!slim || isTablet) && <span>Sign Out</span>}
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ══ MAIN CONTENT ══ */}
        <div className="main-wrap">
          {isTablet && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: T.surface, borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 40 }}>
              <button onClick={() => setMOpen(true)} style={{ background: 'none', border: 'none', color: T.textSecondary, fontSize: 24, padding: '4px 8px', cursor: 'pointer' }}>☰</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/icons/icon-72.png" alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
                <span className="dm" style={{ fontWeight: 700, color: T.accent, fontSize: 15 }}>{isDemo ? 'Demo Mode' : biz}</span>
              </div>
              <span style={{ fontSize: 12, color: T.textMuted }}>{curObj.symbol} {curObj.code}</span>
            </div>
          )}

          <div className="content">
            {/* Demo top banner */}
            {isDemo && (
              <div style={{ background: '#F5A62318', border: '1px solid #F5A62344', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 13, color: '#F5A623', fontWeight: 600 }}>
                  👀 Demo Mode — {S.length}/{DEMO_LIMIT} sales · {P.filter(p => !p.id?.startsWith('demo-p')).length}/{DEMO_LIMIT} products used
                </div>
                <button onClick={goSignUp} style={{ padding: '7px 16px', background: '#F5A623', color: '#0D0F14', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Create Free Account →
                </button>
              </div>
            )}

            {/* ── Page routing ── */}
            {page === 'dashboard' && <Dashboard products={P} sales={S} expenses={E} lending={LD} borrowing={B} {...shared} />}
            {page === 'products'  && <Products  products={P} setProducts={setP} userId={userId} isDemo={isDemo} demoApi={demoApi} onDemoLimit={() => setDemoLimitHit(true)} {...shared} />}
            {page === 'sales'     && <Sales     products={P} setProducts={setP} sales={S} setSales={setS} lending={LD} setLending={setLD} userId={userId} isDemo={isDemo} demoApi={demoApi} onDemoLimit={() => setDemoLimitHit(true)} {...shared} />}
            {page === 'expenses'  && <Expenses  expenses={E} setExpenses={setE} products={P} setProducts={setP} userId={userId} isDemo={isDemo} demoApi={demoApi} {...shared} />}
            {page === 'lend'      && <LendBorrow lending={LD} setLending={setLD} borrowing={B} setBorrowing={setB} userId={userId} isDemo={isDemo} demoApi={demoApi} {...shared} />}
            {page === 'reports'   && <Reports   sales={S} expenses={E} lending={LD} borrowing={B} {...shared} />}
            {page === 'settings'  && <Settings  settings={settings} setSettings={setSettings} user={user} onSignOut={handleSignOut} products={P} sales={S} expenses={E} lending={LD} borrowing={B} {...shared} />}
          </div>
        </div>

        {/* ══ BOTTOM NAV ══ */}
        <nav className="bottom-nav">
          {bnavItems.map(n => (
            <button key={n.id} onClick={() => go(n.id)} className={page === n.id ? 'on' : ''}>
              <span className="bnav-i">{n.icon}</span>
              <span>{n.lbl}</span>
            </button>
          ))}
        </nav>

        <InstallPrompt T={T} />
      </div>
    </>
  )
}
