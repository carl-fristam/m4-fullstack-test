import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Checking...');

  // 1. Improved Status Check with useCallback to prevent re-renders
  const checkStatus = useCallback(async () => {
    try {
      // We add a cache-buster or just a standard fetch
      const response = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
      if (response.ok) {
        setStatus('Online');
      } else {
        setStatus('Error');
      }
    } catch (error) {
      console.warn("Backend heartbeat failed...");
      setStatus('Offline');
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Re-check every 5 seconds so the UI updates if you restart the server
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, [checkStatus]);

  // 2. Task Creation
  const createTask = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "New Agent Task",
          description: "Testing Pydantic validation",
          priority: 1
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Safe access to Pydantic errors
        const errorMsg = result.detail?.[0]?.msg || "Validation Failed";
        alert(`Pydantic rejected this: ${errorMsg}`);
        return;
      }
      
      setData(result);
      // Immediately re-check status if a request succeeds
      setStatus('Online'); 
    } catch (error) {
      console.error("Connection Error:", error);
      setStatus('Offline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="navbar">
        <div className="logo">M4-FASTAPI</div>
        {/* Added a pulsing dot for visual flair */}
        <div className={`status-tag ${status.toLowerCase()}`}>
          <span className="dot"></span> System: {status}
        </div>
      </header>

      <main className="hero">
        <section className="card">
          <h1>Agent Task Console</h1>
          <p>Send a validated payload to the FastAPI/Pydantic backend.</p>
          
          <div className="button-group">
            <button 
              onClick={createTask} 
              disabled={loading}
              className={loading ? 'btn-loading' : 'btn-primary'}
            >
              {loading ? 'Processing...' : 'Execute New Task'}
            </button>
          </div>

          {data && (
            <div className="data-display fadeIn">
              <h3>Latest Server Response:</h3>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Branch: <code>feature/fastapi-sql</code></p>
      </footer>
    </div>
  );
}

export default App;