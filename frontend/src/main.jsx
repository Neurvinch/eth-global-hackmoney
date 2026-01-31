import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {getDefaultConfig, RainbowKitProvider,darkTheme} from '@rainbow-me/rainbowkit'
import './index.css'
import App from './App.jsx'
import { sepolia } from 'viem/chains'
import { http } from 'viem'
import { QueryClient } from '@tanstack/react-query'

const projectID = import.meta.env.VITE_PROJECT_ID;

const config = getDefaultConfig({
  appName: 'Speak-Defi',
  projectId: projectID,
  chains:[sepolia],
  transports: {
    [sepolia.id]: http("")
  }

})

const queryCLient = new QueryClient();



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
