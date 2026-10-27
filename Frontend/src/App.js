import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { Route, Routes } from 'react-router-dom';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import { Page404 } from './pages/Page404';
import { ToastContainerWrapper } from './utils/toast';
import Dashboard from './pages/Dashboard';
import ExportPage from './pages/ExportPage';
import ReportsPage from './pages/ReportsPage';
import DataPage from './pages/DataPage';

function App() {
  return (
    <>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<SignInPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<Page404 />} />
        </Routes>    
      </AuthProvider>
      <ToastContainerWrapper />

    </>
  );
}

export default App;