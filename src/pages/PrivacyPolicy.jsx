// ─── PrivacyPolicy.jsx ────────────────────────────────────────────────────────
// Full privacy policy page — accessible before sign-up.
// ─────────────────────────────────────────────────────────────────────────────
export default function PrivacyPolicy({ onBack, T }) {
  const s = {
    wrap: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px', color: T?.textPrimary || '#F1F5F9', fontFamily: "'Plus Jakarta Sans',sans-serif" },
    back: { background: 'none', border: 'none', color: T?.accent || '#F5A623', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6, padding: 0 },
    h1:   { fontFamily: "'DM Sans',sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8, color: T?.textPrimary || '#F1F5F9', letterSpacing: '-0.5px' },
    date: { fontSize: 12, color: T?.textMuted || '#475569', marginBottom: 36 },
    h2:   { fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, marginTop: 36, marginBottom: 12, color: T?.textPrimary || '#F1F5F9' },
    p:    { fontSize: 14, lineHeight: 1.8, color: T?.textSecondary || '#94A3B8', marginBottom: 12 },
    ul:   { paddingLeft: 20, marginBottom: 12 },
    li:   { fontSize: 14, lineHeight: 1.8, color: T?.textSecondary || '#94A3B8', marginBottom: 6 },
    box:  { background: T?.surface || '#161A24', border: `1px solid ${T?.border || '#252C3F'}`, borderRadius: 12, padding: '16px 20px', marginTop: 20 },
    hl:   { color: T?.accent || '#F5A623', fontWeight: 600 },
  }
  return (
    <div style={{ background: T?.bg || '#0D0F14', minHeight: '100vh' }}>
      <div style={s.wrap}>
        <button style={s.back} onClick={onBack}>← Back</button>

        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.date}>Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div style={s.box}>
          <p style={{ ...s.p, marginBottom: 0, color: T?.textPrimary || '#F1F5F9', fontWeight: 600 }}>
            📋 Summary: ResellTrack stores your business data securely in Supabase (PostgreSQL). We do not sell, share, or monetise your data. You own your data and can export or delete it at any time.
          </p>
        </div>

        <h2 style={s.h2}>1. Who We Are</h2>
        <p style={s.p}>ResellTrack is a business management application for resellers. We provide tools to record sales, track inventory, manage expenses, and analyse your business performance.</p>

        <h2 style={s.h2}>2. Data We Collect</h2>
        <p style={s.p}>We collect only the data you directly enter into the app:</p>
        <ul style={s.ul}>
          <li style={s.li}><span style={s.hl}>Account data</span> — email address and hashed password (via Supabase Auth)</li>
          <li style={s.li}><span style={s.hl}>Business data</span> — sales records, products, expenses, lending/borrowing entries</li>
          <li style={s.li}><span style={s.hl}>Settings</span> — theme, currency, language, business name (stored locally)</li>
          <li style={s.li}><span style={s.hl}>Device data</span> — none. We do not collect device IDs, location, or contacts</li>
        </ul>

        <h2 style={s.h2}>3. How We Store Your Data</h2>
        <p style={s.p}>All your business data is stored in <span style={s.hl}>Supabase (PostgreSQL)</span> — a secure, encrypted database hosted on AWS. Your data is protected by:</p>
        <ul style={s.ul}>
          <li style={s.li}>Row-Level Security (RLS) — only your account can access your data</li>
          <li style={s.li}>TLS 1.3 encryption in transit</li>
          <li style={s.li}>AES-256 encryption at rest</li>
          <li style={s.li}>JWT-based authentication — your session token is never shared</li>
          <li style={s.li}>Passwords are hashed using bcrypt — we never see your plain password</li>
        </ul>

        <h2 style={s.h2}>4. What We Do NOT Do</h2>
        <ul style={s.ul}>
          <li style={s.li}>❌ We do not sell your data to third parties</li>
          <li style={s.li}>❌ We do not share your financial data with advertisers</li>
          <li style={s.li}>❌ We do not use your data for training AI models</li>
          <li style={s.li}>❌ We do not track your behaviour across other websites</li>
          <li style={s.li}>❌ We do not store payment card numbers</li>
          <li style={s.li}>❌ We do not use third-party analytics (no Google Analytics)</li>
        </ul>

        <h2 style={s.h2}>5. Session & Cookies</h2>
        <p style={s.p}>ResellTrack uses a secure session cookie managed by Supabase Auth to keep you logged in. This cookie:</p>
        <ul style={s.ul}>
          <li style={s.li}>Is <span style={s.hl}>HttpOnly</span> — cannot be accessed by JavaScript</li>
          <li style={s.li}>Is <span style={s.hl}>Secure</span> — only sent over HTTPS</li>
          <li style={s.li}>Is <span style={s.hl}>SameSite=Strict</span> — prevents cross-site request forgery</li>
          <li style={s.li}>Expires after <span style={s.hl}>7 days</span> of inactivity, or immediately on sign-out</li>
          <li style={s.li}>Your session auto-expires after <span style={s.hl}>30 minutes of idle time</span> for security</li>
        </ul>
        <p style={s.p}>We do not use advertising cookies, tracking pixels, or third-party cookies.</p>

        <h2 style={s.h2}>6. Your Rights</h2>
        <p style={s.p}>You have full control over your data:</p>
        <ul style={s.ul}>
          <li style={s.li}><span style={s.hl}>Export</span> — download all your data as a JSON file from Settings → Data Management</li>
          <li style={s.li}><span style={s.hl}>Delete</span> — delete your account and all associated data from Profile → Delete Account</li>
          <li style={s.li}><span style={s.hl}>Correct</span> — edit any record directly in the app</li>
          <li style={s.li}><span style={s.hl}>Portability</span> — your exported JSON can be imported into any compatible system</li>
        </ul>

        <h2 style={s.h2}>7. Data Retention</h2>
        <p style={s.p}>Your data is retained as long as your account is active. If you delete your account, all data is permanently removed from our database within 30 days. Demo mode data is stored only in your browser memory and is automatically cleared when you close the app.</p>

        <h2 style={s.h2}>8. Security Measures</h2>
        <ul style={s.ul}>
          <li style={s.li}>Row-Level Security (RLS) enforced at the database level</li>
          <li style={s.li}>Content Security Policy (CSP) prevents script injection</li>
          <li style={s.li}>Input sanitisation on all user-submitted fields</li>
          <li style={s.li}>Rate limiting on authentication — max 5 attempts per 10 minutes</li>
          <li style={s.li}>No sensitive data in URL parameters or browser history</li>
          <li style={s.li}>HTTPS enforced — HTTP connections are redirected</li>
          <li style={s.li}>Automatic session timeout after 30 minutes of inactivity</li>
        </ul>

        <h2 style={s.h2}>9. Third-Party Services</h2>
        <p style={s.p}>We use the following third-party services, each with their own privacy policy:</p>
        <ul style={s.ul}>
          <li style={s.li}><span style={s.hl}>Supabase</span> — database, auth, and storage (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T?.accent }}>supabase.com/privacy</a>)</li>
          <li style={s.li}><span style={s.hl}>Google Fonts</span> — typography only, no tracking</li>
          <li style={s.li}><span style={s.hl}>Google OAuth</span> — optional sign-in, only if you choose it</li>
        </ul>

        <h2 style={s.h2}>10. Contact</h2>
        <p style={s.p}>For privacy concerns, data deletion requests, or questions about this policy, contact us through the app's Settings → About section or at the GitHub repository.</p>

        <div style={{ ...s.box, marginTop: 36 }}>
          <p style={{ ...s.p, marginBottom: 0, fontSize: 12, color: T?.textMuted || '#475569' }}>
            This privacy policy applies to ResellTrack web app, Android APK, and PWA. By using ResellTrack, you agree to this policy.
          </p>
        </div>
      </div>
    </div>
  )
}
