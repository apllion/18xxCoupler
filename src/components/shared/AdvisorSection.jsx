// AdvisorSection — renders advisor tips in player/corp detail views.
// Only shown when plusPlus is active.

import { useUIStore } from '../../store/uiStore.js'

const SEVERITY = {
  critical: { icon: '!!', broker: 'text-red-400 bg-red-900/20 border-red-800/40', mod: 'text-red-400' },
  warning:  { icon: '!',  broker: 'text-amber-400 bg-amber-900/20 border-amber-800/40', mod: 'text-yellow-300' },
  opportunity: { icon: '+', broker: 'text-green-400 bg-green-900/20 border-green-800/40', mod: 'text-green-400' },
  info:     { icon: 'i',  broker: 'text-blue-400 bg-blue-900/20 border-blue-800/40', mod: 'text-blue-300' },
}

export function AdvisorSection({ tips, skin, onCorpClick, onPlayerClick }) {
  if (!tips || tips.length === 0) return null
  const m = skin === 'moderator'

  return (
    <div className={m ? 'space-y-0.5' : 'space-y-1'}>
      {tips.map(tip => {
        const s = SEVERITY[tip.severity] || SEVERITY.info
        return (
          <div key={tip.id} className={m
            ? `${s.mod} text-xs`
            : `text-xs px-2 py-1 rounded border ${s.broker}`
          }>
            <span className="font-bold mr-1">[{s.icon}]</span>
            <TipText tip={tip} onCorpClick={onCorpClick} onPlayerClick={onPlayerClick} m={m} />
          </div>
        )
      })}
    </div>
  )
}

function TipText({ tip, onCorpClick, onPlayerClick, m }) {
  // If tip has a corpSym, make it clickable
  if (tip.corpSym && onCorpClick) {
    const parts = tip.text.split(tip.corpSym)
    return (
      <span>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <button
                onClick={() => onCorpClick(tip.corpSym)}
                className={m ? 'underline text-yellow-300' : 'underline hover:text-white cursor-pointer'}
              >
                {tip.corpSym}
              </button>
            )}
          </span>
        ))}
      </span>
    )
  }
  return <span>{tip.text}</span>
}
