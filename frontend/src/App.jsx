import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ExaShowcase from './components/ExaShowcase';

const API_URL = "http://localhost:8000/tasks";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false); // Kept for consistency if needed by global spinners, though mainly used in Dashboard now
  const [online, setOnline] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token"));

  /* ---------- AUTH LOGIC ---------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setTasks([]);
  };

  /* ---------- API STATUS ---------- */
  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("http://localhost:8000/");
        setOnline(res.ok);
      } catch {
        setOnline(false);
      }
    };
    ping();
    const i = setInterval(ping, 5000);
    return () => clearInterval(i);
  }, []);

  /* ---------- DATA (WITH HEADERS) ---------- */
  const loadTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch(API_URL, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
      } else if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  useEffect(() => {
    if (token) loadTasks();
  }, [token]);


  /* ---------- RENDER GATEKEEPER ---------- */
  if (!token) {
    return <Login onLoginSuccess={() => setToken(localStorage.getItem("token"))} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                tasks={tasks}
                setTasks={setTasks}
                token={token}
                handleLogout={handleLogout}
                loadTasks={loadTasks}
                online={online}
              />
            }
          />
          <Route
            path="/exa-showcase"
            element={
              <ExaShowcase
                token={token}
                online={online}
                handleLogout={handleLogout}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}