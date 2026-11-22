// NumPadContext — provides a shared numeric input pad for touch devices.
// Wraps player views so any number input can open the NumPad overlay.

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const NumPadContext = createContext(null)

export function useNumPad() {
  return useContext(NumPadContext)
}

// Detect physical keyboard: true if a keydown with printable char arrives
export function usePhysicalKeyboard() {
  const [has, setHas] = useState(false)
  useEffect(() => {
    function onKey(e) {
      // Real keyboard keys are not from virtual keyboard (which fires input events)
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
        setHas(true)
        window.removeEventListener('keydown', onKey)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return { hasPhysicalKeyboard: has }
}

export function NumPadProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const callbackRef = useRef(null)
  const labelRef = useRef('')

  const openNumPad = useCallback((label, initialValue, onConfirm) => {
    labelRef.current = label || 'Enter value'
    setValue(initialValue != null ? String(initialValue) : '')
    callbackRef.current = onConfirm
    setOpen(true)
  }, [])

  const confirm = useCallback(() => {
    const num = parseInt(value, 10) || 0
    if (callbackRef.current) callbackRef.current(num)
    setOpen(false)
    setValue('')
    callbackRef.current = null
  }, [value])

  const cancel = useCallback(() => {
    setOpen(false)
    setValue('')
    callbackRef.current = null
  }, [])

  const press = useCallback((digit) => {
    setValue(v => v + digit)
  }, [])

  const backspace = useCallback(() => {
    setValue(v => v.slice(0, -1))
  }, [])

  const clear = useCallback(() => {
    setValue('')
  }, [])

  return (
    <NumPadContext.Provider value={{ openNumPad }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={cancel}>
          <div className="w-full max-w-sm bg-broker-surface rounded-t-2xl p-4 pb-6" onClick={e => e.stopPropagation()}>
            <div className="text-sm text-broker-text-muted text-center mb-2">{labelRef.current}</div>
            <div className="text-3xl font-bold text-center text-white mb-4 min-h-[2.5rem]">
              {value || '0'}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <button key={d} onClick={() => press(String(d))}
                  className="bg-broker-bg text-white text-xl font-bold py-4 rounded-xl active:bg-broker-surface-hover">
                  {d}
                </button>
              ))}
              <button onClick={clear}
                className="bg-red-900 text-red-300 text-sm font-bold py-4 rounded-xl active:bg-red-800">
                CLR
              </button>
              <button onClick={() => press('0')}
                className="bg-broker-bg text-white text-xl font-bold py-4 rounded-xl active:bg-broker-surface-hover">
                0
              </button>
              <button onClick={backspace}
                className="bg-broker-bg text-broker-text-muted text-xl font-bold py-4 rounded-xl active:bg-broker-surface-hover">
                DEL
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={cancel}
                className="flex-1 py-3 rounded-xl bg-broker-bg text-broker-text-muted font-medium">
                Cancel
              </button>
              <button onClick={confirm}
                className="flex-1 py-3 rounded-xl bg-broker-gold text-broker-bg font-bold">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </NumPadContext.Provider>
  )
}
