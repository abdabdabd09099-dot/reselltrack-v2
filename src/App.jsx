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

import Profile       from './pages/Profile.jsx'
// ── Components ────────────────────────────────────────────────────────────────
import { LoadingScreen, NetworkErrorScreen, OfflineBanner } from './components/Loader.jsx'
import { startSessionWatcher, stopSessionWatcher, injectCSP } from './utils/security.js'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import InstallPrompt    from './components/InstallPrompt.jsx'
import { SessionWarning, Logo, Icon } from './components/UI.jsx'
import DemoLimitPrompt  from './components/DemoLimitPrompt.jsx'

// ── Navigation ────────────────────────────────────────────────────────────────
const NAV_ITEMS = L => [
  { id: 'dashboard', icon: 'dashboard', lbl: L.dashboard  },
  { id: 'products',  icon: 'products',  lbl: L.products   },
  { id: 'sales',     icon: 'sales',     lbl: L.sales      },
  { id: 'expenses',  icon: 'expenses',  lbl: L.expenses   },
  { id: 'lend',      icon: 'lend',      lbl: L.lendBorrow },
  { id: 'reports',   icon: 'reports',   lbl: L.reports    },
  { id: 'settings',  icon: 'settings',  lbl: L.settings   },
  { id: 'profile',   icon: 'user',      lbl: 'Profile'    },
]
const BNAV_ITEMS = L => [
  { id: 'dashboard', icon: 'dashboard', lbl: L.home     },
  { id: 'sales',     icon: 'sales',     lbl: L.sales    },
  { id: 'expenses',  icon: 'expenses',  lbl: L.expenses },
  { id: 'reports',   icon: 'reports',   lbl: L.reports  },
  { id: 'profile',   icon: 'user',      lbl: 'Profile'  },
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
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [sessionWarn, setSessionWarn] = useState(false)

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

  // ── Session watcher + CSP ─────────────────────────────────────────────────
  useEffect(() => {
    injectCSP()
    if (!user || isDemo) return
    const cleanup = startSessionWatcher({
      onWarn:   () => setSessionWarn(true),
      onExpire: () => { setSessionWarn(false); handleSignOut() },
    })
    return cleanup
  }, [user, isDemo])

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setWw(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Listen for privacy event from AuthScreen / Landing
  useEffect(() => {
    const handler = () => setShowPrivacy(true)
    window.addEventListener('rt-show-privacy', handler)
    return () => window.removeEventListener('rt-show-privacy', handler)
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

  if (showPrivacy) {
    return <PrivacyPolicy T={T} onBack={() => setShowPrivacy(false)} />
  }

  if (view === 'landing') {
    return <Landing onSignUp={goSignUp} onDemo={enterDemo} onPrivacy={() => setShowPrivacy(true)} />
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
            <Logo size={32} T={{ ...T, themeName: settings.theme }} showName={false} />
            {(!slim || isTablet) && (
              <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isDemo ? '👀 Demo' : biz}
              </span>
            )}
            {!isTablet && <button onClick={() => setSlim(s => !s)} style={{ background: 'none', border: 'none', color: T.textMuted, marginLeft: 'auto', flexShrink: 0, cursor: 'pointer' }}><Icon name={slim ? 'chevron-right' : 'chevron-down'} size={15} color={T.textMuted} /></button>}
            {isTablet  && <button onClick={() => setMOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, marginLeft: 'auto', lineHeight: 1, cursor: 'pointer' }}><Icon name="close" size={18} color={T.textMuted} /></button>}
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
                <Icon name={n.icon} size={17} color={page === n.id ? T.accent : T.textSecondary} strokeWidth={page === n.id ? 2.2 : 1.8} />
                {(!slim || isTablet) && <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{n.lbl}</span>}
              </button>
            ))}
          </nav>

          <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            {isDemo ? (
              <>
                {(!slim || isTablet) && (
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, textAlign: 'center' }}>
                    👀 Demo Mode
                  </div>
                )}
                <button onClick={goSignUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 8, background: '#F5A623', border: 'none', color: '#0D0F14', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <Icon name="unlock" size={13} color="#0D0F14" />
                  {(!slim || isTablet) && <span>Create Free Account</span>}
                </button>
              </>
            ) : (
              <>
                {/* Avatar + email — clicks to profile */}
                <button onClick={() => go('profile')} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 10, marginBottom: 7, background: page === 'profile' ? T.accent + '18' : 'transparent', border: page === 'profile' ? `1px solid ${T.accent}44` : '1px solid transparent', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}>
                  {/* Avatar circle with initials */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0D0F14', flexShrink: 0, fontFamily: "'DM Sans',sans-serif" }}>
                    {user?.email?.slice(0, 2).toUpperCase()}
                  </div>
                  {(!slim || isTablet) && (
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: page === 'profile' ? T.accent : T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email?.split('@')[0]}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.email}
                      </div>
                    </div>
                  )}
                  {(!slim || isTablet) && (
                    <Icon name="chevron-right" size={13} color={T.textMuted} />
                  )}
                </button>
                {/* Sign out */}
                <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'border-color .15s' }}>
                  <Icon name="logout" size={13} color={T.textSecondary} />
                  {(!slim || isTablet) && <span>Sign Out</span>}
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
                <Logo size={26} T={{ ...T, themeName: settings.theme }} showName={false} />
                <span className="dm" style={{ fontWeight: 700, color: T.accent, fontSize: 15 }}>{isDemo ? '👀 Demo' : biz}</span>
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
            {page === 'expenses'  && <Expenses  expenses={E} setExpenses={setE} userId={userId} isDemo={isDemo} demoApi={demoApi} {...shared} />}
            {page === 'lend'      && <LendBorrow lending={LD} setLending={setLD} borrowing={B} setBorrowing={setB} userId={userId} isDemo={isDemo} demoApi={demoApi} {...shared} />}
            {page === 'reports'   && <Reports   sales={S} expenses={E} lending={LD} borrowing={B} {...shared} />}
            {page === 'settings'  && <Settings  settings={settings} setSettings={setSettings} products={P} sales={S} expenses={E} lending={LD} borrowing={B} {...shared} />}
            {page === 'profile'   && <Profile   user={user} T={T} onSignOut={handleSignOut} />}
          </div>
        </div>

        {/* ══ BOTTOM NAV ══ */}
        <nav className="bottom-nav">
          {bnavItems.map(n => (
            <button key={n.id} onClick={() => go(n.id)} className={page === n.id ? 'on' : ''}>
              <Icon name={n.icon} size={20} color={page === n.id ? T.accent : T.textMuted} strokeWidth={page === n.id ? 2.2 : 1.6} />
              <span>{n.lbl}</span>
            </button>
          ))}
        </nav>

        <InstallPrompt T={T} />
        {sessionWarn && <SessionWarning T={T} onStay={() => { setSessionWarn(false); startSessionWatcher({ onWarn: () => setSessionWarn(true), onExpire: () => handleSignOut() }) }} onSignOut={handleSignOut} />}
      </div>
    </>
  )
}
