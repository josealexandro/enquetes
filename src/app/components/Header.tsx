"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from "../context/AuthContext";
import Login from "./Auth/Login";
import Signup from "./Auth/Signup";

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return newMode;
    });
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowSignupModal(false);
    // You might want to redirect or show a success message here
  };

  const handleSignupSuccess = () => {
    setShowSignupModal(false);
    setShowLoginModal(false);
    // You might want to automatically log in the user or redirect to login
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <header className="w-full bg-zinc-800 text-white py-4 px-6 fixed top-0 z-50 shadow-md transition-colors duration-300">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300">
          <Image src="/logoHome.png" alt="Poll App Logo" width={120} height={40} />
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/" className="hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300">Home</Link>
          <Link href="/enquetes" className="hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300">Enquetes</Link>
          {!user ? (
            <>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300"
              >
                Login
              </button>
              <button
                onClick={() => setShowSignupModal(true)}
                className="px-4 py-2 rounded-full bg-gray-200 text-zinc-800 hover:bg-gray-300 transition-colors duration-300"
              >
                Cadastre-se
              </button>
            </>
          ) : (
            <>
              <span className="text-white">Olá, {user.email}!</span>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-300"
              >
                Sair
              </button>
            </>
          )}
          <button
            onClick={toggleDarkMode}
            className="text-white p-2 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
            aria-label="Toggle Dark Mode"
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} size="lg" />
          </button>
        </div>
      </nav>
      {(showLoginModal || showSignupModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="relative">
            {showLoginModal && (
              <Login
                onLoginSuccess={handleLoginSuccess}
                onSwitchToSignup={() => {
                  setShowLoginModal(false);
                  setShowSignupModal(true);
                }}
              />
            )}
            {showSignupModal && (
              <Signup
                onSignupSuccess={handleSignupSuccess}
                onSwitchToLogin={() => {
                  setShowSignupModal(false);
                  setShowLoginModal(true);
                }}
              />
            )}
            <button
              onClick={() => { setShowLoginModal(false); setShowSignupModal(false); }}
              className="absolute top-2 right-2 text-white text-xl p-2 hover:text-gray-300"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
