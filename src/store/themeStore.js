// Theme store — manages active theme, persists to localStorage.
// Themes are just CSS class names applied to <html>.
// Each theme defines CSS custom properties via @theme in index.css.

import { create } from 'zustand'

const OLD_KEY = '18xxCoupler_theme'
const STORAGE_KEY = 'laytrack_theme'

const savedTheme = (() => {
  try {
    // Migrate from old key if needed
    const oldVal = localStorage.getItem(OLD_KEY)
    if (oldVal && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, oldVal)
    }
    return localStorage.getItem(STORAGE_KEY) || 'broker'
  } catch { return 'broker' }
})()

export const themes = {
  broker: { id: 'broker', label: 'Laytrack', desc: 'Gold & teal' },
  dark:   { id: 'dark',   label: 'Dark',   desc: 'Classic dark mode' },
  light:  { id: 'light',  label: 'Light',  desc: 'Light mode' },
}

export const useThemeStore = create((set) => ({
  themeId: savedTheme,

  setTheme: (id) => {
    if (!themes[id]) return
    localStorage.setItem(STORAGE_KEY, id)
    document.documentElement.className = `theme-${id}`
    set({ themeId: id })
  },

  initTheme: () => {
    document.documentElement.className = `theme-${savedTheme}`
  },
}))
