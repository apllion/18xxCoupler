/**
 * PresetBar — horizontal scrollable row of preset value buttons.
 * Tapping a preset calls onSubmit directly (skips numpad grid).
 */
export function PresetBar({ presets = [], onSelect }) {
  if (presets.length === 0) return null

  return (
    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-1">
      {presets.map((p, i) => (
        <button
          key={`${p.value}-${i}`}
          onClick={() => onSelect(p.value)}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg bg-broker-green text-white text-sm font-medium hover:bg-broker-green-light active:bg-broker-green-light transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
