import React from "react";
import { Link, NavLink } from "react-router-dom";
export default function Header({ username, handleLogout }) {
    return (
        <nav className="fixed top-0 w-full z-50 bg-slate-50/90 backdrop-blur-sm flex justify-center text-slate-800 h-16">
            <div className="w-full max-w-7xl px-6 grid grid-cols-3 items-center">

                {/* LEFT: TITLE */}
                <div className="flex items-center justify-start gap-8">
                    <Link to="/" className="flex items-center gap-3 cursor-pointer no-underline text-slate-900 group">
                        <span className="font-bold tracking-tight text-xl group-hover:opacity-80 transition-opacity">MSc Research Tool</span>
                    </Link>
                </div>

                {/* CENTER: NAVIGATION */}
                <div className="flex items-center justify-center gap-8">
                    {/* NavLink automatically adds logic to detect the active route */}
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `text-sm font-medium no-underline transition-all ${isActive ? "text-slate-900 relative after:absolute after:-bottom-5 after:left-0 after:w-full after:h-0.5 after:bg-slate-900" : "text-slate-500 hover:text-slate-900"}`
                        }
                    >
                        Knowledge Base
                    </NavLink>

                    <NavLink
                        to="/exa-showcase"
                        className={({ isActive }) =>
                            `text-sm font-medium no-underline transition-all ${isActive ? "text-slate-900 relative after:absolute after:-bottom-5 after:left-0 after:w-full after:h-0.5 after:bg-slate-900" : "text-slate-500 hover:text-slate-900"}`
                        }
                    >
                        Research Chat
                    </NavLink>
                </div>
                {/* RIGHT: USER & LOGOUT */}
                <div className="flex items-center justify-end gap-6">
                    <span className="text-sm font-medium text-slate-500">
                        Hi, <span className="text-slate-900 font-bold">{username || 'User'}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-xs font-bold text-slate-400 hover:text-[#E40000] transition-colors uppercase tracking-wider"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </nav>
    );
}