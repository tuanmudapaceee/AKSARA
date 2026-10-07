import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/rdp.css'
import App from './App.tsx'

/*
 * =====================================================
 * INITIAL THEME
 * =====================================================
 *
 * Apply theme before React renders.
 * This prevents light-theme flash when reloading
 * while dark mode is active.
 */

const savedTheme =
  localStorage.getItem(
    'aksara-theme'
  )

const initialTheme =
  savedTheme === 'dark'
    ? 'dark'
    : 'light'

document.documentElement.setAttribute(
  'data-theme',
  initialTheme
)

createRoot(
  document.getElementById('root')!
).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
