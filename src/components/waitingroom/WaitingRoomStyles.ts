/* ─── Shared Noir styles for WaitingRoom page ───────────────────────────── */
export const styles = {
  surface: '#131313',
  containerLow: '#1c1b1b',
  containerHigh: '#2a2a2a',
  containerHighest: '#353534',
  containerLowest: '#0e0e0e',
  primary: '#ffb4ab',
  primaryContainer: '#c80815',
  secondary: '#f6be3b',
  outlineVariant: '#5d3f3c',
  onSurface: '#e5e2e1',
  onSurfaceVar: '#e6bdb8',
}

export const chamferSm = { clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }
export const chamferMd = { clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }
export const chamferBtn = { clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }

export const WAITING_ROOM_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400;1,600&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;700&display=swap');
  .chamfer-sm { clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px); }
  .chamfer-md { clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); }
  .chamfer-btn { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
  .scanline { animation: scan 4s linear infinite; }
  @keyframes scan {
    0%   { opacity: 0.03; }
    50%  { opacity: 0.06; }
    100% { opacity: 0.03; }
  }
  .blink { animation: blink 1.2s step-end infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .player-row { animation: slideIn 0.3s ease-out; }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .glow-gold { box-shadow: 0 0 20px rgba(246,190,59,0.25); }
  .glow-red  { box-shadow: 0 0 20px rgba(200,8,21,0.3); }
  .btn-primary:hover { background: #e00a18 !important; box-shadow: 0 0 20px rgba(200,8,21,0.4); }
  .btn-secondary:hover { box-shadow: 0 0 20px rgba(246,190,59,0.3); color: ${styles.secondary} !important; }
  .player-item:hover { background: ${styles.containerHigh} !important; }
`
