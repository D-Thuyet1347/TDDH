// src/index.js
import React, { Suspense } from 'react'; // <<< Thêm Suspense
import ReactDOM from 'react-dom/client';
import './index.css'; // File CSS chính của bạn
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router } from 'react-router-dom';
import './components/i18n'; 
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading translations...</div>}>
      <Router>
         <App />
      </Router>
    </Suspense>
  </React.StrictMode>
);

reportWebVitals();