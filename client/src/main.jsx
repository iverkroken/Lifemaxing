import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-600.css'
import { App } from './app/App.jsx'
import { LanguageProvider } from './features/settings/LanguageProvider.jsx'
import { queryClient } from './app/queryClient.js'
import './shared/styles/tokens.css'
import './shared/styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider><App /></LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
