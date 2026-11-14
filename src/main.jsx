import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SyncProvider } from './hooks/SyncContext.jsx'
import { NumPadProvider } from './components/input/NumPadContext.jsx'
import { useThemeStore } from './store/themeStore.js'

// Apply saved theme on load
useThemeStore.getState().initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SyncProvider>
        <NumPadProvider>
          <App />
        </NumPadProvider>
      </SyncProvider>
    </BrowserRouter>
  </StrictMode>,
)
