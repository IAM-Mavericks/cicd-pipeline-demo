import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OfflineProvider } from './context/OfflineContext';

createRoot(document.getElementById('root')!).render(
    <OfflineProvider>
        <App />
    </OfflineProvider>
);
