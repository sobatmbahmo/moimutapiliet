import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register Service Worker with auto-update
registerSW({
  onNeedRefresh() {
    // Otomatis update tanpa prompt
    console.log('📦 Update tersedia, memperbarui...')
  },
  onOfflineReady() {
    console.log('✅ Aplikasi siap digunakan offline')
  },
  onRegisteredSW(swUrl, r) {
    // Check for updates every hour
    if (r) {
      setInterval(() => {
        r.update()
      }, 60 * 60 * 1000)
    }
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
