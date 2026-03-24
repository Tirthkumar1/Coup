import { useEffect, useRef } from 'react'

export interface ActionLogEntry {
  id: string
  actorName: string
  actionType: string
  targetName?: string
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  income:       'text-green-400',
  foreign_aid:  'text-teal-400',
  coup:         'text-red-500',
  tax:          'text-yellow-400',
  assassinate:  'text-orange-500',
  steal:        'text-blue-400',
  exchange:     'text-purple-400',
  block:        'text-pink-400',
  challenge:    'text-rose-400',
  pass:         'text-gray-500',
  lose_influence: 'text-red-400',
}

const ACTION_LABELS: Record<string, string> = {
  income:         'took Income (+1)',
  foreign_aid:    'took Foreign Aid (+2)',
  coup:           'launched a Coup on',
  tax:            'collected Tax as Duke (+3)',
  assassinate:    'assassinated',
  steal:          'stole coins from',
  exchange:       'exchanged cards (Ambassador)',
  block:          'blocked',
  challenge:      'challenged',
  pass:           'passed',
  lose_influence: 'lost an influence',
}

export default function ActionLog({ entries }: { entries: ActionLogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-2 gap-2 text-sm">
      {entries.length === 0 && (
        <p className="text-gray-600 italic text-center mt-6 text-xs">Game log will appear here…</p>
      )}
      {entries.map(e => (
        <div key={e.id} className="leading-snug">
          <span className="font-semibold text-white">{e.actorName} </span>
          <span className={ACTION_COLORS[e.actionType] ?? 'text-gray-400'}>
            {ACTION_LABELS[e.actionType] ?? e.actionType}
          </span>
          {e.targetName && <span className="font-semibold text-white"> {e.targetName}</span>}
          <div className="text-gray-600 text-[10px]">
            {new Date(e.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
