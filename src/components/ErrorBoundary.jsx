import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('[ResellTrack]', error, info?.componentStack)
  }
  handleReset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { T, children, pageName = 'This page' } = this.props
    if (!error) return children

    const accent  = T?.accent  || '#F5A623'
    const surface = T?.surface || '#1A1D27'
    const border  = T?.border  || '#2E3344'
    const text    = T?.textPrimary   || '#F0F2F8'
    const muted   = T?.textSecondary || '#8B92A8'

    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', textAlign:'center', minHeight:'60vh', gap:16 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'#F8717118', border:'1px solid #F8717144', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>⚠️</div>
        <div style={{ fontSize:20, fontWeight:700, color:text, fontFamily:"'DM Sans',sans-serif" }}>Something went wrong</div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.7, maxWidth:300 }}>
          <strong style={{ color:text }}>{pageName}</strong> ran into a problem.
          Your data is safe — tap Retry to reload.
        </div>
        <details style={{ fontSize:11, color:muted, maxWidth:340, textAlign:'left', background:surface, border:`1px solid ${border}`, borderRadius:8, padding:'8px 12px' }}>
          <summary style={{ cursor:'pointer', fontWeight:600, marginBottom:6 }}>Error details</summary>
          <code style={{ fontSize:10, color:'#F87171', display:'block', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
            {error?.message || String(error)}
          </code>
        </details>
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={this.handleReset} style={{ background:accent, color:'#0D0F14', border:'none', borderRadius:10, padding:'12px 24px', fontWeight:700, fontSize:14, cursor:'pointer', minHeight:44 }}>
            🔄 Retry
          </button>
          <button onClick={() => window.location.reload()} style={{ background:'transparent', color:muted, border:`1px solid ${border}`, borderRadius:10, padding:'12px 24px', fontWeight:600, fontSize:14, cursor:'pointer', minHeight:44 }}>
            Reload App
          </button>
        </div>
      </div>
    )
  }
}
