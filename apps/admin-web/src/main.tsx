import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router'
import './styles/app.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Missing root container')
}

const router = getRouter()
const root = createRoot(container)

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
