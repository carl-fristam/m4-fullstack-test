import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExaShowcase from './components/ExaShowcase';
import Header from './components/Header';
import ChatWidget from './components/ChatWidget';

const getUsernameFromToken = (token) => {
  if (!token) return null;
  try {
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload =
      decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    return JSON.parse(jsonPayload).sub;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default function App() {

  const [loading, setLoading] = useState(false); // Kept for consistency if needed by global spinners, though mainly used in Dashboard now
  const [token, setToken] = useState(localStorage.getItem("token"));
  const username = getUsernameFromToken(token);

  /* ---------- AUTH LOGIC ---------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);

  };




  /* ---------- RENDER GATEKEEPER ---------- */
  if (!token) {
    return <Login onLoginSuccess={() => setToken(localStorage.getItem("token"))} />;
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 font-sans antialiased">
      <BrowserRouter>
        {token && <Header username={username} handleLogout={handleLogout} />}
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                token={token}
                handleLogout={handleLogout}
                username={username}
              />
            }
          />
          <Route
            path="/exa-showcase"
            element={
              <ExaShowcase
                token={token}
                handleLogout={handleLogout}
                username={username}
              />
            }
          />
          <Route
            path="/chat-widget"
            element={
              <ChatWidget
                username={username}
                token={token}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}