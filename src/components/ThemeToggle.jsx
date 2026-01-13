import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`flex items-center justify-center p-2 rounded-xl transition-all duration-300 ${theme === 'dark'
                    ? 'bg-paper-200 text-yellow-400 hover:bg-paper-300'
                    : 'bg-paper-200 text-paper-900 hover:bg-paper-300'
                } ${className}`}
            aria-label="Toggle theme"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    );
}
