import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChatBot from './components/ChatBot';
import Pricing from './components/Pricing';
import Share from './components/Share';
import SubscriptionSuccess from './components/SubscriptionSuccess';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { AuthProvider } from './contexts/AuthContext';

function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/chat';
  const isShare = location.pathname.startsWith('/share/');

  useEffect(() => {
    console.log('Current path:', location.pathname);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      {!isDashboard && !isShare && <Header />}
      <main className="flex-grow">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<ChatBot />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/share/:id" element={<Share />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  useEffect(() => {
    console.log('App mounted');
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;