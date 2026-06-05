// AdvisorSection — renders advisor tips in player/corp detail views.
// Only shown when plusPlus is active.



const SEVERITY = {
  critical: { icon: '!!', broker: 'text-red-400 bg-red-900/20 border-red-800/40' },
  warning:  { icon: '!',  broker: 'text-amber-400 bg-amber-900/20 border-amber-800/40' },
  opportunity: { icon: '+', broker: 'text-green-400 bg-green-900/20 border-green-800/40' },
  info:     { icon: 'i',  broker: 'text-blue-400 bg-blue-900/20 border-blue-800/40' },
}

export function AdvisorSection({ tips, onCorpClick, onPlayerClick }) {
  if (!tips || tips.length === 0) return null

  return (
    <div className="space-y-1">
      {tips.map(tip => {
        const s = SEVERITY[tip.severity] || SEVERITY.info
        return (
          <div key={tip.id} className={`text-xs px-2 py-1 rounded border ${s.broker}`}>
            <span className="font-bold mr-1">[{s.icon}]</span>
            <TipText tip={tip} onCorpClick={onCorpClick} onPlayerClick={onPlayerClick} />
          </div>
        )
      })}
    </div>
  )
}

function TipText({ tip, onCorpClick, onPlayerClick }) {
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
                className="underline hover:text-white cursor-pointer"
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
