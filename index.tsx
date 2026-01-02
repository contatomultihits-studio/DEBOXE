
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar a aplicação.");
}

// Pequeno tratamento para capturar erros críticos e não deixar a tela preta
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Erro Crítico:", message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") {
    root.innerHTML = `<div style="padding: 20px; color: #ef4444; font-family: sans-serif;">
      <h1 style="font-size: 20px;">Ih, deu bug no deploy!</h1>
      <p style="color: #94a3b8;">${message}</p>
      <button onclick="window.location.reload()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Tentar de novo</button>
    </div>`;
  }
};

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("Falha ao renderizar App:", e);
}
