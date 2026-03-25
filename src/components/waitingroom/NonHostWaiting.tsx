import { styles, chamferMd, chamferSm } from './WaitingRoomStyles'

export default function NonHostWaiting() {
  return (
    <div style={{ background: styles.containerLow, ...chamferMd, padding: '24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, background: styles.containerHighest, ...chamferSm, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <span style={{ color: styles.secondary, fontSize: 20 }}>⟳</span>
        </div>
        <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 16, color: styles.onSurface, marginBottom: 6 }}>
          Standing By
        </div>
        <div style={{ color: styles.onSurfaceVar, fontSize: 10, fontFamily: 'Inter', letterSpacing: '0.15em' }} className="uppercase">
          Awaiting host to initiate operation<span className="blink">_</span>
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, background: styles.primaryContainer, ...chamferSm, animation: `blink ${1 + i * 0.3}s step-end infinite` }} />
        ))}
      </div>
    </div>
  )
}
