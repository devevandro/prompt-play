import ReactDom from 'react-dom/client'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from 'renderer/lib/react-query'
import { AppRoutes } from './routes'

import './globals.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  </React.StrictMode>
)
