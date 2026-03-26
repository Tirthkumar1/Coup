interface GameHeaderProps {
  showLog: boolean
  onToggleLog: () => void
}

export default function GameHeader({ showLog, onToggleLog }: GameHeaderProps) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 24px',
      background: 'rgba(10,10,10,0.70)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
      borderBottom: '1px solid rgba(139,0,0,0.2)',
    }}>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
        <span className="material-symbols-outlined" style={{ color: '#6b1111', fontSize: 22 }}>info</span>
      </button>
      <h1 style={{
        fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontWeight: 900,
        fontSize: 22, color: '#c80815', textTransform: 'uppercase',
        letterSpacing: '0.25em', margin: 0,
      }}>COUP</h1>
      <button onClick={onToggleLog} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
        <span className="material-symbols-outlined" style={{ color: showLog ? '#f6be3b' : '#6b1111', fontSize: 22 }}>settings</span>
      </button>
    </header>
  )
}
