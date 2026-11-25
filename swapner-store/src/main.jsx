import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { StoreProvider } from './lib/store.jsx'
import './styles/index.css'
import './styles/store.css'
import './styles/admin.css'

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <HashRouter>
      <App />
    </HashRouter>
  </StoreProvider>,
)
