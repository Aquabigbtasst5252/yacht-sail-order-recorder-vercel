import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Import Bootstrap CSS here. This is the standard way to include it.
import 'bootstrap/dist/css/bootstrap.min.css';
// 2. Import Bootstrap's JavaScript bundle.
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from './App.jsx';
import './index.css'; // Your custom global styles (now clean)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

