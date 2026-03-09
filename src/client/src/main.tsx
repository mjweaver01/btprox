import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BluetoothProvider } from './context/BluetoothContext';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BluetoothProvider>
        <App />
      </BluetoothProvider>
    </BrowserRouter>
  </React.StrictMode>
);
