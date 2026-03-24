import type { Card as CardType } from '../lib/gameLogic'

interface CardProps {
  card: CardType
  forceHidden?: boolean
  selectable?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  eliminated?: boolean
  alwaysShow?: boolean
}

const CHARACTER_IMAGES: Record<string, string> = {
  Duke: '/assets/characters/duke.png',
  Assassin: '/assets/characters/assassin.png',
  Captain: '/assets/characters/captain.png',
  Ambassador: '/assets/characters/ambassador.png',
  Contessa: '/assets/characters/contessa.png',
}

const CHARACTER_GRADIENTS: Record<string, string> = {
  Duke:        'from-yellow-700 to-yellow-950',
  Assassin:    'from-slate-600  to-slate-950',
  Captain:     'from-blue-700   to-blue-950',
  Ambassador:  'from-emerald-700 to-emerald-950',
  Contessa:    'from-rose-700   to-rose-950',
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-14 h-20',
  md: 'w-24 h-36',
  lg: 'w-32 h-48',
}

export default function Card({
  card,
  forceHidden = false,
  selectable = false,
  onClick,
  size = 'md',
  eliminated = false,
  alwaysShow = false,
}: CardProps) {
  const isRevealed = (card.revealed || alwaysShow) && !forceHidden

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={[
        'relative rounded-xl overflow-hidden border-2 transition-all duration-200 flex-shrink-0',
        SIZE_CLASSES[size],
        selectable
          ? 'border-amber-400 ring-2 ring-amber-400/40 hover:scale-110 cursor-pointer'
          : 'cursor-default',
        eliminated && !isRevealed ? 'border-gray-700 opacity-50' : '',
        isRevealed && !eliminated ? 'border-gray-500' : 'border-gray-700',
      ].join(' ')}
    >
      {isRevealed ? (
        <>
          <div className={`absolute inset-0 bg-gradient-to-b ${CHARACTER_GRADIENTS[card.character] ?? 'from-gray-700 to-gray-950'}`} />
          <img
            src={CHARACTER_IMAGES[card.character]}
            alt={card.character}
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold text-white py-1 tracking-wide uppercase">
            {card.character}
          </div>
          {eliminated && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-red-400 text-xs font-bold tracking-wider rotate-[-20deg]">DEAD</span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-indigo-800 to-indigo-950 flex items-center justify-center relative">
          <img
            src="/assets/characters/card-back.png"
            alt="Card back"
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="relative text-indigo-400/60 text-2xl select-none">♠</div>
        </div>
      )}
    </button>
  )
}
