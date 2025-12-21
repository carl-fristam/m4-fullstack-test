import React, { useState, useEffect } from 'react';

const Login = ({ onLoginSuccess }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Clear inputs when switching modes to prevent "sticky" data
    useEffect(() => {
        setUsername('');
        setPassword('');
    }, [isRegistering]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegistering ? "register" : "login";

        try {
            const response = await fetch(`http://localhost:8000/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                if (isRegistering) {
                    alert("Registration successful! Please login.");
                    setIsRegistering(false);
                } else {
                    const data = await response.json();
                    localStorage.setItem("token", data.access_token);
                    onLoginSuccess();
                }
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "Authentication failed");
            }
        } catch (err) {
            console.error("Auth error:", err);
        }
    };

    return (
        // This wrapper ensures everything is dead-center on the screen
        <div className="fixed inset-0 min-h-screen w-full bg-slate-50 flex items-center justify-center z-[9999]">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 mx-4">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
                        <span className="text-white font-bold text-2xl">A</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 text-center">
                        {isRegistering ? "Create Account" : "Welcome Back"}
                    </h2>
                    <p className="text-slate-400 font-medium mt-2 text-center">
                        {isRegistering ? "Join the AgentOS network" : "Access your autonomous pipeline"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">Username</label>
                        <input
                            type="text"
                            autoComplete="username"
                            className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900"
                            placeholder="agent_001"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-widest">Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-900"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.98]"
                    >
                        {isRegistering ? "Initialize Account" : "Authenticate"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        {isRegistering ? "Already have an account? Login" : "Need access? Create an account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;