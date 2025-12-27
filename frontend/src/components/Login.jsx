import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const Login = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Clear inputs when switching modes to prevent "sticky" data
    useEffect(() => {
        setUsername('');
        setPassword('');
        setError(null);
        setSuccessMsg(null);
    }, [isRegistering]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        const endpoint = isRegistering ? "register" : "login";

        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                if (isRegistering) {
                    setSuccessMsg("Account created! Please login.");
                    setIsRegistering(false);
                    // Slight delay to let user see the message, or just switch them immediately
                } else {
                    const data = await response.json();
                    localStorage.setItem("token", data.access_token);
                    onLoginSuccess();
                }
            } else {
                const errorData = await response.json();
                setError(errorData.detail || "Authentication failed");
            }
        } catch (err) {
            console.error("Auth error:", err);
            setError("Connection failed. Please try again.");
        }
    };

    return (
        // This wrapper ensures everything is dead-center on the screen
        <div className="fixed inset-0 min-h-screen w-full bg-slate-50 flex items-center justify-center z-[9999]">
            <div className="w-full max-w-md bg-white p-10 shadow-lg border border-slate-200 mx-4 transition-all rounded-xl">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <span className="text-white font-bold text-xl tracking-tighter">DB</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-center">
                        {isRegistering ? "Create Account" : "MSc Research Tool"}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-bold text-center">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-600 font-bold text-center">
                            {successMsg}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest">Username</label>
                        <input
                            type="text"
                            autoComplete="username"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all text-slate-900 rounded-lg font-medium"
                            placeholder="user_id"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block tracking-widest">Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all text-slate-900 rounded-lg font-medium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 font-bold bg-slate-900 text-white hover:bg-black transition-all uppercase tracking-wider text-xs rounded-lg shadow-md hover:shadow-lg translat-y-0 hover:-translate-y-0.5"
                    >
                        {isRegistering ? "Create Account" : "Login"}
                    </button>
                </form>

                <div className="mt-8 text-center pt-8 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-xs text-slate-400 hover:text-slate-900 transition-colors font-medium"
                    >
                        {isRegistering ? "Already have an account? Login" : "Need access? Create an account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;