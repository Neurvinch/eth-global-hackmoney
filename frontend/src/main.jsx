import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import './index.css'
import App from './App.jsx'
import { sepolia } from 'viem/chains'
import { http } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

const projectID = import.meta.env.VITE_PROJECT_ID || "20f1a02f9fe04c451b09814b7a8423fb";

const config = getDefaultConfig({
  appName: 'Speak-Defi',
  projectId: projectID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("")
  }

})

const queryCLient = new QueryClient();

const theme = darkTheme({
  accentColor: '#7b3fe4',
  accentColorForeground: 'white',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryCLient}>
        <RainbowKitProvider theme={theme} chains={config.chains}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>

  </StrictMode>,
)
