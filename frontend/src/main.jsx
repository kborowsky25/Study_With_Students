import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { ConfirmProvider } from './components/ui/confirm'
import { router } from './router'
import './index.css'
import './styles/brand.css'
import './styles/app.css'
import './styles/responsive.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 3500,
          // Theme tokens (index.css), so toasts follow light and dark mode
          style: {
            background: 'var(--elevated)',
            color: 'var(--text)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-pop)',
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '13px',
            fontWeight: '500',
            padding: '10px 14px',
            maxWidth: '360px',
          },
          success: { iconTheme: { primary: 'var(--coral)', secondary: 'var(--elevated)' } },
          error:   { iconTheme: { primary: 'var(--red)', secondary: 'var(--elevated)' } },
          loading: { iconTheme: { primary: 'var(--coral)', secondary: 'var(--border-strong)' } },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>,
)
