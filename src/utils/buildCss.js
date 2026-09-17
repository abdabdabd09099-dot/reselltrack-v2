export const buildCss = T => `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Ethiopic:wght@400;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:${T.bg};color:${T.textPrimary};font-family:'Inter','Noto Sans Ethiopic',sans-serif;min-height:100vh;transition:background .25s,color .2s}
  input,select,textarea{font-family:inherit;background:${T.bg};color:${T.textPrimary};border:1px solid ${T.border};border-radius:8px;padding:10px 12px;width:100%;font-size:14px;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none}
  input:focus,select:focus,textarea:focus{border-color:${T.accent};box-shadow:0 0 0 3px ${T.accent}22}
  input[type=number]{-moz-appearance:textfield}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  input[type=checkbox]{width:auto;accent-color:${T.accent};cursor:pointer}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5);cursor:pointer}
  input::placeholder,textarea::placeholder{color:${T.textMuted}}
  select option{background:${T.surface};color:${T.textPrimary}}
  button{cursor:pointer;font-family:inherit;border:none;border-radius:8px;font-size:14px;font-weight:500;-webkit-tap-highlight-color:transparent;transition:all .15s}
  button:active{transform:scale(.96)}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:${T.surface}}
  ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px}
  .mono{font-family:'JetBrains Mono',monospace}
  .dm{font-family:'DM Sans','Noto Sans Ethiopic',sans-serif}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .2s ease both}
  .shell{display:flex;min-height:100vh}
  .sidebar{width:220px;background:${T.surface};border-right:1px solid ${T.border};display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow:hidden;transition:width .2s;flex-shrink:0;z-index:50}
  .sidebar.slim{width:64px}
  .main-wrap{flex:1;display:flex;flex-direction:column;min-width:0}
  .content{flex:1;padding:24px;overflow-y:auto}
  .overlay{display:none;position:fixed;inset:0;background:#00000088;z-index:49}
  .overlay.on{display:block}
  .bottom-nav{display:none}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px;margin-bottom:20px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .acc-hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;cursor:pointer;user-select:none;transition:background .15s;border-radius:10px}
  .acc-hdr:hover{background:${T.surfaceHigh}}
  @media(max-width:900px){
    .sidebar{position:fixed;top:0;left:0;height:100%;transform:translateX(-100%);transition:transform .25s}
    .sidebar.open{transform:translateX(0)}
    .content{padding:16px 14px 86px}
    .two-col{grid-template-columns:1fr}
  }
  @media(max-width:600px){
    .stat-grid{grid-template-columns:1fr 1fr}
    .content{padding:12px 12px 78px}
    .bottom-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:48;background:${T.surface};border-top:1px solid ${T.border};padding-bottom:env(safe-area-inset-bottom)}
    .bottom-nav button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 2px;background:none;border:none;border-radius:0;color:${T.textMuted};font-size:10px}
    .bottom-nav button.on{color:${T.accent}}
    .bnav-i{font-size:19px}
    .g2{grid-template-columns:1fr!important}
  }
`
