import { useState, useEffect, useCallback, useRef } from 'react'
import { PresetBar } from './PresetBar.jsx'

/**
 * NumPad — fixed-position numeric overlay at the bottom of the viewport.
 * Does NOT resize the viewport (critical for iOS Safari).
 *
 * Props:
 *  - onSubmit(value: number) — called on Done or preset tap
 *  - onCancel() — called on backdrop tap or Escape
 *  - presets: Array<{label, value}> — quick-pick buttons
 *  - recents: Array<number> — recently used values shown as chips
 *  - initialValue: number — pre-fill value
 */
export function NumPad({ onSubmit, onCancel, presets = [], recents = [], initialValue = 0 }) {
  // Calculator state
  const [display, setDisplay] = useState(initialValue > 0 ? String(initialValue) : '')
  const [accumulator, setAccumulator] = useState(null) // running total from + / -
  const [pendingOp, setPendingOp] = useState(null) // '+' or '-'
  const [justComputed, setJustComputed] = useState(false)
  const padRef = useRef(null)

  // Current numeric value of the display
  const displayNum = parseInt(display, 10) || 0

  // Total including any pending calculation
  const total = accumulator !== null
    ? (pendingOp === '-' ? accumulator - displayNum : accumulator + displayNum)
    : displayNum

  // Escape key closes
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const tapDigit = useCallback((d) => {
    if (justComputed) {
      setDisplay(String(d))
      setJustComputed(false)
    } else {
      setDisplay(prev => (prev === '0' ? String(d) : prev + d))
    }
  }, [justComputed])

  const tapBackspace = useCallback(() => {
    setDisplay(prev => prev.slice(0, -1))
    setJustComputed(false)
  }, [])

  const tapClear = useCallback(() => {
    setDisplay('')
    setAccumulator(null)
    setPendingOp(null)
    setJustComputed(false)
  }, [])

  const applyOp = useCallback((op) => {
    const current = parseInt(display, 10) || 0
    if (accumulator !== null && pendingOp) {
      const result = pendingOp === '-' ? accumulator - current : accumulator + current
      setAccumulator(result)
    } else {
      setAccumulator(current)
    }
    setPendingOp(op)
    setDisplay('')
    setJustComputed(false)
  }, [display, accumulator, pendingOp])

  const tapEquals = useCallback(() => {
    const current = parseInt(display, 10) || 0
    let result = current
    if (accumulator !== null && pendingOp) {
      result = pendingOp === '-' ? accumulator - current : accumulator + current
    }
    setDisplay(String(result))
    setAccumulator(null)
    setPendingOp(null)
    setJustComputed(true)
  }, [display, accumulator, pendingOp])

  const tapDone = useCallback(() => {
    // If there's a pending operation, compute first
    let result = parseInt(display, 10) || 0
    if (accumulator !== null && pendingOp) {
      result = pendingOp === '-' ? accumulator - result : accumulator + result
    }
    onSubmit(result)
  }, [display, accumulator, pendingOp, onSubmit])

  const tapPreset = useCallback((value) => {
    onSubmit(value)
  }, [onSubmit])

  // Display text: show calculation in progress
  const displayText = (() => {
    if (accumulator !== null) {
      const opSymbol = pendingOp === '-' ? ' - ' : ' + '
      return `${accumulator}${opSymbol}${display || '...'}`
    }
    return display || '0'
  })()

  // Digit button component
  const DigitBtn = ({ label, onTap, className = '' }) => (
    <button
      onClick={onTap}
      className={`min-h-[44px] min-w-[44px] rounded-lg bg-broker-surface-hover text-white text-lg font-medium active:bg-broker-border transition-colors select-none ${className}`}
    >
      {label}
    </button>
  )

  // Operation button
  const OpBtn = ({ label, onTap, variant = 'op' }) => {
    const colors = {
      op: 'bg-broker-green text-white active:bg-broker-green-light',
      done: 'bg-broker-gold text-broker-bg active:bg-broker-gold-dim',
      clear: 'bg-red-800/60 text-red-300 active:bg-red-700',
    }
    return (
      <button
        onClick={onTap}
        className={`min-h-[44px] min-w-[44px] rounded-lg text-lg font-medium transition-colors select-none ${colors[variant] || colors.op}`}
      >
        {label}
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onCancel}
      />

      {/* NumPad panel — fixed at bottom, does not resize viewport */}
      <div
        ref={padRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-broker-surface border-t border-broker-border"
        style={{ position: 'fixed' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Display area */}
        <div className="px-3 pt-3 pb-1">
          <div className="bg-broker-bg rounded-lg px-3 py-2 text-right">
            <div className="text-white text-2xl font-mono font-bold tabular-nums truncate">
              {displayText}
            </div>
            {accumulator !== null && display && (
              <div className="text-broker-text-muted text-xs text-right">
                = {total}
              </div>
            )}
          </div>
        </div>

        {/* Presets + Recents row */}
        {(presets.length > 0 || recents.length > 0) && (
          <div className="px-3 pb-1">
            <PresetBar
              presets={[
                ...presets,
                ...recents
                  .filter(r => !presets.some(p => p.value === r))
                  .map(r => ({ label: String(r), value: r })),
              ]}
              onSelect={tapPreset}
            />
          </div>
        )}

        {/* Grid: 4 columns (3 digits + 1 operations) */}
        <div className="px-3 pb-3 pt-1">
          <div className="grid grid-cols-4 gap-1.5">
            {/* Row 1 */}
            <DigitBtn label="1" onTap={() => tapDigit('1')} />
            <DigitBtn label="2" onTap={() => tapDigit('2')} />
            <DigitBtn label="3" onTap={() => tapDigit('3')} />
            <OpBtn label="+" onTap={() => applyOp('+')} />

            {/* Row 2 */}
            <DigitBtn label="4" onTap={() => tapDigit('4')} />
            <DigitBtn label="5" onTap={() => tapDigit('5')} />
            <DigitBtn label="6" onTap={() => tapDigit('6')} />
            <OpBtn label="−" onTap={() => applyOp('-')} />

            {/* Row 3 */}
            <DigitBtn label="7" onTap={() => tapDigit('7')} />
            <DigitBtn label="8" onTap={() => tapDigit('8')} />
            <DigitBtn label="9" onTap={() => tapDigit('9')} />
            <OpBtn label="=" onTap={tapEquals} />

            {/* Row 4 */}
            <OpBtn label="C" onTap={tapClear} variant="clear" />
            <DigitBtn label="0" onTap={() => tapDigit('0')} />
            <DigitBtn label="⌫" onTap={tapBackspace} />
            <OpBtn label="✓" onTap={tapDone} variant="done" />
          </div>
        </div>
      </div>
    </>
  )
}
