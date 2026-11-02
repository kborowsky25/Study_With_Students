import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { ConfirmProvider } from './components/ui/confirm'
import { router } from './router'
import './index.css'
import './styles/app.css'

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
          style: {
            background: '#1a2640',
            color: '#e8edf4',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: "'Noto Sans JP', sans-serif",
            padding: '12px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.40)',
            maxWidth: '360px',
          },
          success: {
            iconTheme: { primary: '#ff725e', secondary: '#1a2640' },
            style: {
              background: '#1a2640',
              borderLeft: '3px solid #ff725e',
            },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1a2640' },
            style: {
              background: '#1a2640',
              borderLeft: '3px solid #ef4444',
            },
          },
          loading: {
            iconTheme: { primary: '#ff725e', secondary: '#1a2640' },
            style: {
              background: '#1a2640',
              borderLeft: '3px solid rgba(255,255,255,0.15)',
            },
          },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>,
)
