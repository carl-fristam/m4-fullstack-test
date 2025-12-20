import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Checking...');

  // 1. Check if Backend is alive on mount
  useEffect(() => {
    fetch('http://localhost:5000/')
      .then(() => setStatus('Online'))
      .catch(() => setStatus('Offline'));
  }, []);

  // 2. Fetch specific data from Flask
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Backend not reachable! Check if Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="navbar">
        <div className="logo">M4-FULLSTACK</div>
        <div className={`status-tag ${status.toLowerCase()}`}>
          Backend: {status}
        </div>
      </header>

      <main className="hero">
        <section className="card">
          <h1>React + Flask Connection</h1>
          <p>Click the button below to pull data from your Python environment.</p>
          
          <button 
            onClick={fetchData} 
            className={loading ? 'btn-loading' : ''}
          >
            {loading ? 'Fetching...' : 'Get Data from Flask'}
          </button>

          {data && (
            <div className="data-display">
              <h3>Response from Server:</h3>
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Project Root: <code>~/Developer/M4-Fullstack</code></p>
      </footer>
    </div>
  );
}

export default App;
