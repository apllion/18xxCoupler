import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { corpPrice } from '../../engine/stockMarket.js'
import { formatCurrency } from '../../utils/currency.js'
import MarketGrid from './MarketGrid.jsx'
import ShareHoldings from './ShareHoldings.jsx'
import ActionPanel from './ActionPanel.jsx'
import PlayerSelector from './PlayerSelector.jsx'

export default function MarketTab() {
  const game = useGameStore((s) => s.game)
  const dispatch = useDispatch()
  const [editMode, setEditMode] = useState(false)
  const [movingCorp, setMovingCorp] = useState(null)

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const floatedCorps = game.corporations.filter(c => c.floated)

  function handleCellClick(row, col) {
    if (!editMode || !movingCorp) return
    dispatch({ type: 'SET_MARKET_POSITION', corpSym: movingCorp, row, col })
    setMovingCorp(null)
  }

  return (
    <div className="p-3 space-y-4">
      <PlayerSelector />
      <MarketGrid movingCorp={movingCorp} onCellClick={editMode ? handleCellClick : null}
        onReorder={editMode ? (sym, dir) => dispatch({ type: 'REORDER_CORP_AT_PRICE', corpSym: sym, direction: dir }) : null} />

      {/* Edit mode: select corp to move */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setEditMode(!editMode); setMovingCorp(null) }}
          className={`text-xs px-2 py-1 rounded ${editMode ? 'bg-amber-700 text-white' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
          {editMode ? 'Done' : 'Move Corps'}
        </button>
        {editMode && floatedCorps.map(c => (
          <button key={c.sym}
            onClick={() => setMovingCorp(movingCorp === c.sym ? null : c.sym)}
            className={`text-xs px-2 py-1 rounded font-bold ${
              movingCorp === c.sym ? 'ring-2 ring-amber-400 bg-broker-surface-hover text-white' : 'bg-broker-surface-hover hover:brightness-125'
            }`}
            style={{ color: c.color }}>
            {c.sym} {fmt(corpPrice(game.stockMarket, c.sym) || 0)}
          </button>
        ))}
        {editMode && movingCorp && <span className="text-xs text-amber-400">Click a cell to place {movingCorp}</span>}
      </div>

      <ShareHoldings />
      <ActionPanel />
    </div>
  )
}
