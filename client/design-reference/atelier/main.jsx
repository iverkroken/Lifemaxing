import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Study from './Study.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Study />
  </StrictMode>
)
