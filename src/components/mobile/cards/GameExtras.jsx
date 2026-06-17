// Game Extras card — round selector, phase info, bank, misc actions

import { useUIStore } from '../../../store/uiStore.js'

export default function GameExtras({ data }) {
  const { game, fmt, phase, rt, dispatch } = data
  const roundTypes = rt?.roundTypes || ['SR', 'OR']

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-3">Game</div>

      {/* Round selector */}
      <div className="bg-broker-surface rounded-lg p-3 mb-3">
        <div className="text-xs text-broker-text-muted mb-1">Round</div>
        <div className="flex gap-1">
          {roundTypes.map(rType => {
            const active = rType === rt?.roundType
            const colors = active
              ? rType === 'SR' ? 'bg-green-800 text-green-200'
                : rType === 'OR' ? 'bg-amber-800 text-amber-200'
                : 'bg-blue-800 text-blue-200'
              : 'bg-broker-surface-hover text-broker-text-muted'
            return (
              <button key={rType} onClick={() => dispatch({ type: 'SET_ROUND', roundType: rType })}
                className={`px-3 py-2 rounded font-medium text-sm flex-1 ${colors}`}>
                {rType}
              </button>
            )
          })}
        </div>
      </div>

      {/* Phase & Bank */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-broker-surface rounded-lg p-3 text-center">
          <div className="text-xs text-broker-text-muted">Phase</div>
          <div className="text-xl font-bold">{phase?.name}</div>
          <div className="text-[10px] text-broker-text-muted">Limit: {phase?.trainLimit}</div>
        </div>
        <div className="bg-broker-surface rounded-lg p-3 text-center">
          <div className="text-xs text-broker-text-muted">Bank</div>
          <div className={`text-xl font-bold ${game.bank.cash <= 0 ? 'text-red-400' : 'text-sky-300'}`}>
            {fmt(game.bank.cash)}
          </div>
        </div>
      </div>

      {/* Collect / Sold-out */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => dispatch({ type: 'COLLECT_ALL_REVENUE' })}
          className="flex-1 text-xs bg-green-800 hover:bg-green-700 text-white px-3 py-2 rounded">
          Collect Privates
        </button>
        <button onClick={() => dispatch({ type: 'SOLD_OUT_ADJUST' })}
          className="flex-1 text-xs bg-broker-surface-hover hover:bg-broker-surface text-white px-3 py-2 rounded">
          Sold-out Adjust
        </button>
      </div>

      {/* Switch to monitor */}
      <div className="mt-auto">
        <button onClick={() => useUIStore.getState().setViewMode('monitor')}
          className="w-full text-xs bg-broker-surface hover:bg-broker-surface-hover text-broker-text-muted hover:text-white py-3 rounded-lg">
          Switch to Monitor View
        </button>
      </div>
    </div>
  )
}
