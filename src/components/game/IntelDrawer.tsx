import ActionLogComponent, { type ActionLogEntry } from '../ActionLog'
import { S } from './GameStyles'

interface IntelDrawerProps {
  entries: ActionLogEntry[]
  onClose: () => void
}

export default function IntelDrawer({ entries, onClose }: IntelDrawerProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div className="glass fade-in" style={{ width: 260, height: '100%', borderLeft: '1px solid rgba(93,63,60,.3)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(93,63,60,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#c80815', letterSpacing: '0.25em', ...S.mono }}>INTEL FEED</div>
            <div style={{ fontSize: 11, color: '#ad8883', letterSpacing: '0.1em' }}>ACTION LOG</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d3f3c', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }} className="scroll-hide">
          <ActionLogComponent entries={entries} />
        </div>
      </div>
    </div>
  )
}
