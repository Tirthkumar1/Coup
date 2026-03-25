import { S } from './GameStyles'

interface GameNavProps {
  showLog: boolean
  onNavigateHome: () => void
  onToggleLog: () => void
}

export default function GameNav({ showLog, onNavigateHome, onToggleLog }: GameNavProps) {
  return (
    <nav style={S.nav}>
      <div style={S.navInner}>
        <button style={S.navBtn} onClick={onNavigateHome}
          onMouseEnter={e => (e.currentTarget.style.color = '#c80815')}
          onMouseLeave={e => (e.currentTarget.style.color = '#353534')}>
          <span style={{ fontSize: 20 }}>⬡</span>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>LOBBY</span>
        </button>
        <div className="chamfer-sm" style={S.navActive}>
          <span style={{ fontSize: 20 }}>◈</span>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>INFLUENCE</span>
        </div>
        <button style={{ ...S.navBtn, color: showLog ? '#f6be3b' : '#353534' }} onClick={onToggleLog}>
          <span style={{ fontSize: 20 }}>⊞</span>
          <span style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' }}>INTEL</span>
        </button>
      </div>
    </nav>
  )
}
