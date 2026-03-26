/* ─── Shared Noir styles for Game page ──────────────────────────────────── */
export const NOIR_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
.material-symbols-outlined{font-family:'Material Symbols Outlined';font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;font-style:normal;font-size:24px;line-height:1;display:inline-block;white-space:nowrap;direction:ltr;user-select:none}
*{box-sizing:border-box}
body{margin:0;background:#131313}
.chamfer-sm{clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.chamfer-md{clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
.chamfer-lg{clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}
.chamfer-btn{clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))}
.action-btn{font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;padding:12px 8px;background:#1c1b1b;color:#e5e2e1;border:none;cursor:pointer;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);border-bottom:1px solid #2a2a2a;transition:background .15s,box-shadow .15s}
.action-btn:hover:not(:disabled){background:#2a2a2a;box-shadow:0 0 20px rgba(246,190,59,.15)}
.action-btn:disabled{opacity:.35;cursor:not-allowed}
.action-btn.danger{color:#ffb4ab;border-bottom-color:rgba(200,8,21,.4)}
.action-btn.danger:hover:not(:disabled){background:rgba(200,8,21,.15);box-shadow:0 0 20px rgba(200,8,21,.2)}
.action-btn.primary{background:linear-gradient(135deg,#c80815,#93000a);color:#ffd7d2;font-weight:700;border-bottom:none}
.action-btn.primary:hover:not(:disabled){background:linear-gradient(135deg,#e00a1a,#c80815);box-shadow:0 0 20px rgba(200,8,21,.35)}
.react-btn{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:14px 24px;border:none;cursor:pointer;clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));transition:all .15s}
.react-btn.challenge{background:linear-gradient(135deg,#c80815,#93000a);color:#ffd7d2}
.react-btn.challenge:hover{background:linear-gradient(135deg,#e00a1a,#c80815);box-shadow:0 0 24px rgba(200,8,21,.4)}
.react-btn.block{background:transparent;border:1px solid #5d3f3c;color:#e6bdb8}
.react-btn.block:hover{background:rgba(93,63,60,.2);box-shadow:0 0 20px rgba(246,190,59,.2)}
.react-btn.pass{background:transparent;border:1px solid #2a2a2a;color:#5d3f3c}
.react-btn.pass:hover{background:#1c1b1b;color:#ad8883}
.react-btn:disabled{opacity:.35;cursor:not-allowed}
.influence-card{position:relative;background:#1c1b1b;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);overflow:hidden;transition:transform .2s,box-shadow .2s}
.influence-card.selectable{cursor:pointer;border:1px solid #c80815}
.influence-card.selectable:hover{box-shadow:0 0 20px rgba(200,8,21,.3);transform:translateY(-2px)}
.scroll-hide{scrollbar-width:none}
.scroll-hide::-webkit-scrollbar{display:none}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
.gothic-bg{background:#131313;background-image:radial-gradient(circle at center,#2a0000 0%,#131313 100%)}
.fade-in{animation:fadeIn .3s ease forwards}
.glass{backdrop-filter:blur(12px);background:rgba(32,31,31,.9)}
.opp-card{background:#1c1b1b;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px);padding:12px;position:relative;overflow:hidden;transition:opacity .3s}
.target-row{display:flex;align-items:center;gap:12px;background:#2a2a2a;border:none;color:#e5e2e1;padding:12px 14px;cursor:pointer;transition:all .15s;text-align:left;width:100%;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
.target-row:hover{background:#353534;box-shadow:0 0 16px rgba(200,8,21,.2)}
`

export const S = {
  root: { minHeight: '100dvh', background: '#131313', display: 'flex', flexDirection: 'column' as const, fontFamily: 'Space Grotesk,sans-serif', color: '#e5e2e1', overflowX: 'hidden' as const },
  header: { background: 'rgba(14,14,14,.9)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(93,63,60,.2)', position: 'sticky' as const, top: 0, zIndex: 50, flexShrink: 0 },
  main: { flex: 1, overflowY: 'auto' as const, padding: '14px 14px 100px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
  nav: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(14,14,14,.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(93,63,60,.2)', padding: '8px 0 12px' },
  navInner: { display: 'flex', justifyContent: 'space-around', alignItems: 'center' },
  navBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: '#353534', padding: 8, transition: 'color .2s', fontFamily: 'Space Grotesk,sans-serif' },
  navActive: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, background: '#1c1b1b', padding: '8px 16px', color: '#f6be3b', fontFamily: 'Space Grotesk,sans-serif' },
  mono: { fontFamily: 'Inter,monospace' },
  serif: { fontFamily: 'Newsreader,serif', fontStyle: 'italic' as const },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24, backdropFilter: 'blur(4px)' },
}

export const ACTION_LABELS: Record<string, string> = {
  income: 'INCOME', foreign_aid: 'FOREIGN AID', coup: 'COUP',
  tax: 'TAX', assassinate: 'ASSASSINATE', steal: 'STEAL', exchange: 'EXCHANGE',
}

export const BLOCK_OPTIONS: Record<string, string[]> = {
  foreign_aid: ['Duke'], assassinate: ['Contessa'], steal: ['Captain', 'Ambassador'],
}
