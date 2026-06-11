// StrategyCardsTab — shows strategy card assignments and status (PTG).
// Who holds each card, whether it's been used (unique action or train permit).

import { useGameStore } from '../../store/gameStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'

export default function StrategyCardsTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()

  if (!game || !game.title.strategyCards?.length) return null

  const titleCards = game.title.strategyCards
  const playerCards = game.players.flatMap(p =>
    (p.cards || []).map(c => ({ ...c, playerName: p.name, playerId: p.id }))
  )

  // Map card id → holder info
  const cardHolders = {}
  for (const pc of playerCards) {
    cardHolders[pc.id] = pc
  }

  return (
    <div className='text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'>
      <h2 className="text-broker-text font-bold text-lg">
        Strategy Cards
      </h2>

      <div className="space-y-2">
        {titleCards.map(card => {
          const holder = cardHolders[card.id]
          const used = holder?.used
          const usedAs = holder?.usedAs
          const assignedTo = holder?.assignedTo

          return (
            <div key={card.id} className='bg-broker-surface rounded-lg p-3 border border-broker-border'>
              {/* Card header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: card.color === 'white' ? '#e5e5e5' : card.color }} />
                <span className={`font-bold text-broker-text`}>
                  {card.name}
                </span>
                {holder && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                    used
                      ? 'bg-red-900/40 text-red-400'
                      : 'bg-green-900/40 text-green-400'
                  }`}>
                    {used ? 'Used' : 'Active'}
                  </span>
                )}
                {!holder && (
                  <span className={`ml-auto text-xs text-broker-text-muted`}>
                    Unassigned
                  </span>
                )}
              </div>

              {/* Abilities */}
              <div className={`text-xs space-y-0.5 text-broker-text-muted`}>
                <div><span className="font-medium">Permit:</span> {card.permit}</div>
                <div><span className="font-medium">Unique:</span> {card.unique}</div>
              </div>

              {/* Assign to player or corp */}
              {!holder && (
                <div className={`mt-2 flex gap-1 flex-wrap`}>
                  {game.players.map(p => (
                    <button key={p.id}
                      onClick={() => dispatch({ type: 'GIVE_CARD', playerId: p.id, card })}
                      className={`text-[10px] px-2 py-0.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white`}>
                      → {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Holder info */}
              {holder && (
                <div className={`mt-2 text-xs flex items-center gap-2 text-broker-text-muted`}>
                  <span>
                    Held by <span className="text-broker-text">{holder.playerName}</span>
                    {assignedTo && <span> — attached to {assignedTo.corpSym} train</span>}
                    {usedAs === 'unique_action' && <span> — unique action used</span>}
                  </span>
                  <button
                    onClick={() => dispatch({ type: 'RETURN_CARD', playerId: holder.playerId, cardId: card.id })}
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded bg-broker-surface-hover text-broker-text-muted hover:text-white`}
                  >
                    Return
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
