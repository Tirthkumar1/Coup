import { S } from './GameStyles'

interface GameHeaderProps {
  code: string | undefined
  treasuryCoins: number
  showLog: boolean
  onToggleLog: () => void
}

export default function GameHeader({ code, treasuryCoins, showLog, onToggleLog }: GameHeaderProps) {
  return (
    <header style={S.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#c80815', fontSize: 13, fontWeight: 800 }}>{'>'}_</span>
        <div>
          <div style={{ color: '#c80815', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>ROOM: {code}</div>
          <div style={{ color: '#5d3f3c', fontSize: 9, ...S.mono, letterSpacing: '0.1em' }}>SESSION ACTIVE · OPERATION NOIR</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#5d3f3c', fontSize: 9, ...S.mono, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Treasury</div>
          <div style={{ color: '#f6be3b', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>{treasuryCoins} GOLD</div>
        </div>
        <button onClick={onToggleLog} className="chamfer-sm" style={{ background: showLog ? '#1c1b1b' : 'none', border: '1px solid #2a2a2a', color: showLog ? '#f6be3b' : '#5d3f3c', cursor: 'pointer', padding: '6px 10px', fontSize: 9, letterSpacing: '0.15em', fontFamily: 'Space Grotesk,sans-serif', textTransform: 'uppercase' }}>
          INTEL
        </button>
      </div>
    </header>
  )
}
