import '@fontsource-variable/playfair-display'
import '@fontsource-variable/montserrat'
import './styles.css'
import './pedidos.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AvisoProvider, ConfirmarProvider } from './ui'

const cliente = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <AvisoProvider>
        <ConfirmarProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmarProvider>
      </AvisoProvider>
    </QueryClientProvider>
  </StrictMode>,
)
