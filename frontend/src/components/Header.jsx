import React from "react";
import { Link, NavLink } from "react-router-dom";
export default function Header({ username, handleLogout }) {
    return (
        <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-sm border-b border-border/50 flex justify-center text-slate-100 h-24">
            <div className="w-full max-w-7xl px-6 grid grid-cols-3 items-center">

                {/* LEFT: TITLE */}
                <div className="flex items-center justify-start gap-8">
                    <Link to="/" className="flex items-center gap-4 cursor-pointer no-underline text-primary-light group">
                        <span className="font-bold tracking-tight text-3xl group-hover:opacity-80 transition-opacity">MSc Research Tool</span>
                    </Link>
                </div>

                {/* CENTER: NAVIGATION */}
                <div className="flex items-center justify-center gap-8">
                    {/* NavLink automatically adds logic to detect the active route */}
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `text-lg font-medium no-underline transition-all ${isActive ? "text-primary-light relative after:absolute after:-bottom-8 after:left-0 after:w-full after:h-0.5 after:bg-primary-light" : "text-slate-400 hover:text-primary-light"}`
                        }
                    >
                        Knowledge Base
                    </NavLink>

                    <NavLink
                        to="/exa-showcase"
                        className={({ isActive }) =>
                            `text-lg font-medium no-underline transition-all ${isActive ? "text-primary-light relative after:absolute after:-bottom-8 after:left-0 after:w-full after:h-0.5 after:bg-primary-light" : "text-slate-400 hover:text-primary-light"}`
                        }
                    >
                        Research Chat
                    </NavLink>
                </div>
                {/* RIGHT: USER & LOGOUT */}
                <div className="flex items-center justify-end gap-10">
                    <span className="text-base font-medium text-slate-400">
                        Hi, <span className="text-slate-100 font-bold">{username || 'User'}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </nav>
    );
}