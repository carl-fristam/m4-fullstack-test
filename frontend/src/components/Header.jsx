import React from "react";
import { Link, NavLink } from "react-router-dom";
export default function Header({ username, handleLogout }) {
    return (
        <nav className="fixed top-0 w-full z-50 bg-[#003253] border-b border-[#002842] flex justify-center text-white h-20">
            <div className="w-full max-w-7xl px-6 grid grid-cols-3 items-center">

                {/* LEFT: TITLE */}
                <div className="flex items-center justify-start gap-8">
                    <Link to="/" className="flex items-center gap-3 cursor-pointer no-underline text-white">
                        <span className="font-bold tracking-tight text-xl">MSc Research Tool</span>
                    </Link>
                </div>

                {/* CENTER: NAVIGATION */}
                <div className="flex items-center justify-center gap-8">
                    {/* NavLink automatically adds logic to detect the active route */}
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `text-sm font-bold no-underline transition-colors ${isActive ? "text-white border-b-2 border-white pb-1" : "text-slate-300 hover:text-white"}`
                        }
                    >
                        Knowledge Base
                    </NavLink>

                    <NavLink
                        to="/exa-showcase"
                        className={({ isActive }) =>
                            `text-sm font-bold no-underline transition-colors ${isActive ? "text-white border-b-2 border-white pb-1" : "text-slate-300 hover:text-white"}`
                        }
                    >
                        Research Chat
                    </NavLink>
                </div>
                {/* RIGHT: USER & LOGOUT */}
                <div className="flex items-center justify-end gap-6">
                    <span className="text-sm font-medium text-slate-300">
                        Hi, <span className="text-white font-bold">{username || 'User'}</span>
                    </span>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2 bg-[#E40000] text-white text-xs font-bold hover:bg-red-700 transition-colors uppercase tracking-wider rounded-full"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </nav>
    );
}