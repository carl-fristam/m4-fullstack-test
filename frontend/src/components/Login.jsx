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
        <div className="fixed inset-0 min-h-screen w-full bg-slate-100 flex items-center justify-center z-[9999]">
            <div className="w-full max-w-md bg-white p-10 shadow-lg border border-slate-200 mx-4">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-[#003253] flex items-center justify-center mb-4">
                        <span className="text-white font-bold text-2xl">DB</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#003253] text-center">
                        {isRegistering ? "Create Account" : "Access Portal"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2 text-center">
                        {isRegistering ? "Join the Master Thesis network" : "Internal Request System"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-widest">Username</label>
                        <input
                            type="text"
                            autoComplete="username"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#003253] outline-none transition-all text-[#003253]"
                            placeholder="user_id"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-widest">Password</label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#003253] outline-none transition-all text-[#003253]"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 font-bold bg-[#003253] text-white hover:bg-[#002842] transition-all uppercase tracking-wider text-sm"
                    >
                        {isRegistering ? "Create Account" : "Secure Login"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-bold text-[#E40000] hover:text-red-800 transition-colors"
                    >
                        {isRegistering ? "Already have an account? Login" : "Need access? Create an account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;