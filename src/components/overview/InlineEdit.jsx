// InlineEdit — click-to-edit cell for super-umpire mode.
// Shows value normally. When clicked (and superUmpire on), shows input.

import { useState, useRef, useEffect } from 'react'

export function InlineEdit({ value, onSave, type = 'number', enabled, skin, children }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (editing && ref.current) ref.current.focus()
  }, [editing])

  if (!enabled || !editing) {
    return (
      <span
        onClick={enabled ? (e) => { e.stopPropagation(); setInput(String(value ?? '')); setEditing(true) } : undefined}
        className={enabled ? 'cursor-pointer hover:ring-1 hover:ring-orange-400/50 rounded px-0.5' : ''}
        title={enabled ? 'Click to edit' : undefined}
      >
        {children}
      </span>
    )
  }

  const m = skin === 'moderator'
  const confirm = () => {
    const v = type === 'number' ? parseInt(input, 10) : input
    if (type === 'number' && isNaN(v)) { setEditing(false); return }
    onSave(v)
    setEditing(false)
  }

  return (
    <input
      ref={ref}
      type={type}
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setEditing(false) }}
      onBlur={() => setEditing(false)}
      onClick={e => e.stopPropagation()}
      className={m
        ? 'w-14 bg-black border border-orange-600 rounded px-1 py-0 text-center text-xs font-mono text-orange-300'
        : 'w-16 bg-broker-bg border border-orange-500 rounded px-1 py-0 text-center text-xs text-orange-300'
      }
    />
  )
}
