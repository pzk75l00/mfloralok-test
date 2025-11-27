import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterScreen from './components/RegisterScreen';
import './index.css';

// Configurar título según el entorno
const setDocumentTitle = () => {
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('vercel.app') || 
                      hostname.includes('mundo-floral') || 
                      !hostname.includes('localhost');
  
  if (isProduction) {
    document.title = 'Mundo Floral';
  } else {
    document.title = 'Desarrollo Mfloralok';
  }
};

// Establecer título al cargar
setDocumentTitle();

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento root en el HTML.');
}
const root = createRoot(container);

root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/register" element={<RegisterScreen />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
