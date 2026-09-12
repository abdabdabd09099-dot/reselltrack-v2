export const buildCss = T => `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${T.bg};
    color: ${T.textPrimary};
    font-family: 'Plus Jakarta Sans', 'Noto Sans Ethiopic', sans-serif;
    min-height: 100vh;
    transition: background .3s, color .2s;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Inputs ── */
  input, select, textarea {
    font-family: inherit;
    background: ${T.bg};
    color: ${T.textPrimary};
    border: 1.5px solid ${T.border};
    border-radius: 8px;
    padding: 10px 12px;
    width: 100%;
    font-size: 14px;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    -webkit-appearance: none;
    appearance: none;
  }
  input:focus, select:focus, textarea:focus {
    border-color: ${T.accent};
    box-shadow: 0 0 0 3px ${T.accent}18;
  }
  input::placeholder, textarea::placeholder { color: ${T.textMuted}; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=checkbox] { width: auto; accent-color: ${T.accent}; cursor: pointer; }
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(.5); cursor: pointer; }
  select option { background: ${T.surface}; color: ${T.textPrimary}; }

  /* ── Buttons ── */
  button {
    cursor: pointer;
    font-family: inherit;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    -webkit-tap-highlight-color: transparent;
    transition: all .15s;
  }
  button:active { transform: scale(.96); }
  button:disabled { cursor: not-allowed !important; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${T.surface}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.textMuted}; }

  /* ── Typography helpers ── */
  .mono { font-family: 'JetBrains Mono', monospace; }
  .dm   { font-family: 'DM Sans', 'Noto Sans Ethiopic', sans-serif; }

  /* ── Lucide icon sizing helper ── */
  .icon-sm svg { width: 14px; height: 14px; }
  .icon-md svg { width: 18px; height: 18px; }
  .icon-lg svg { width: 24px; height: 24px; }

  /* ── Animations ── */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .5; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .fade-in  { animation: fadeIn  .22s ease both; }
  .slide-in { animation: slideIn .22s ease both; }
  .pulse    { animation: pulse   2s ease-in-out infinite; }
  .spin     { animation: spin    1s linear infinite; }

  /* ── Layout shell ── */
  .shell {
    display: flex;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 224px;
    background: ${T.surface};
    border-right: 1px solid ${T.border};
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    transition: width .22s ease;
    flex-shrink: 0;
    z-index: 50;
  }
  .sidebar.slim { width: 64px; }

  /* ── Main content ── */
  .main-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .content   { flex: 1; padding: 24px; overflow-y: auto; max-width: 1200px; }

  /* ── Overlay (mobile) ── */
  .overlay { display: none; position: fixed; inset: 0; background: #00000088; z-index: 49; backdrop-filter: blur(2px); }
  .overlay.on { display: block; }

  /* ── Bottom nav (mobile) ── */
  .bottom-nav { display: none; }

  /* ── Grid helpers ── */
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .two-col   { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

  /* ── Accordion header ── */
  .acc-hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px; cursor: pointer; user-select: none;
    transition: background .15s; border-radius: 10px;
  }
  .acc-hdr:hover { background: ${T.surfaceHigh}; }

  /* ── Card hover ── */
  .card-hover { transition: border-color .2s, transform .2s, box-shadow .2s; }
  .card-hover:hover {
    border-color: ${T.accent}44 !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${T.accent}11;
  }

  /* ── Tablet (≤900px) ── */
  @media (max-width: 900px) {
    .sidebar {
      position: fixed; top: 0; left: 0; height: 100%;
      transform: translateX(-100%);
      transition: transform .25s ease;
      width: 260px !important;
    }
    .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px #00000044; }
    .content { padding: 16px 14px 90px; }
    .two-col { grid-template-columns: 1fr; }
  }

  /* ── Mobile (≤600px) ── */
  @media (max-width: 600px) {
    .stat-grid  { grid-template-columns: 1fr 1fr; }
    .content    { padding: 12px 12px 82px; }
    .g2         { grid-template-columns: 1fr !important; }

    .bottom-nav {
      display: flex;
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: 48;
      background: ${T.surface};
      border-top: 1px solid ${T.border};
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .bottom-nav button {
      flex: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; padding: 9px 2px 7px;
      background: none; border: none; border-radius: 0;
      color: ${T.textMuted};
      font-size: 9px; font-weight: 600; letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .bottom-nav button.on { color: ${T.accent}; }
  }
`
