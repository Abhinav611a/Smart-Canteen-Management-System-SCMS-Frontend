import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './polyfills.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/*
        BUG FIX: Toaster was using hardcoded dark colours — now reads from CSS
        custom properties set by ThemeContext on <html>, so it adapts to light/dark.
        containerStyle keeps it above modals (z-index: 9999).
      */}
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 4000,
          className: 'toast-base',
          style: {
            background: 'var(--toast-bg)',
            color:      'var(--toast-fg)',
            border:     '1px solid var(--toast-border)',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          loading: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
