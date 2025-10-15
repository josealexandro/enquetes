"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Importar useRouter
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from "../context/AuthContext";
import Login from "./Auth/Login";
import Signup from "./Auth/Signup";
import { motion } from "framer-motion";
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'; // Import hamburger and close icons

interface HeaderProps {
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  showSignupModal: boolean;
  setShowSignupModal: (show: boolean) => void;
}

export default function Header({ showLoginModal, setShowLoginModal, showSignupModal, setShowSignupModal }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false); // Inicializa com valor padrão (modo claro)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu
  const { user, logout /*, loading */ } = useAuth(); // Remover loading, pois não está sendo usado
  const router = useRouter(); // Inicializar useRouter
  // REMOVIDO: const { openLoginModal, openSignupModal } = useAuthModal();

  // useEffect para inicializar o tema APENAS no lado do cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme) {
        setDarkMode(savedTheme === 'dark');
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (prefersDark) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }
  }, []); // Executar apenas uma vez na montagem do cliente

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]); // Este useEffect agora reage apenas às mudanças no estado darkMode

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowSignupModal(false);
    setIsMobileMenuOpen(false); // Close mobile menu on login
  };

  const handleSignupSuccessWithAccountType = (accountType: 'personal' | 'commercial') => {
    setShowSignupModal(false);
    setShowLoginModal(false);
    setIsMobileMenuOpen(false); // Close mobile menu on signup
    // Redirecionar para o dashboard se for uma conta comercial
    if (accountType === 'commercial') {
      router.push('/dashboard');
    } else {
      router.push('/'); // Redirecionar para a página inicial padrão para contas pessoais
    }
  };

  // if (loading) {
  //   return null; // Or a loading spinner
  // }

  return (
    <header className="w-full bg-zinc-800 text-white py-1 px-6 fixed top-0 z-50 shadow-md transition-colors duration-300">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300">
          <Image src="/logoHome.png" alt="Logo do Aplicativo de Enquetes" width={120} height={40} objectFit="contain" />
        </Link>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white p-2 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
            aria-label="Abrir/Fechar Menu Mobile"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} size="lg" />
          </motion.button>
        </div>

        {/* Desktop menu items and mobile menu content */}
        <div className={`md:flex items-center space-x-6 ${isMobileMenuOpen ? "flex flex-col absolute top-full left-0 w-full bg-zinc-800 p-4 shadow-md items-center space-y-4" : "hidden"}`}>
          <Link href="/" className="hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/enquetes" className="hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>Enquetes</Link>
          {user && user.accountType === 'commercial' && (
            <Link href="/dashboard" className="hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
          )}
          {!user ? (
            <>
              <motion.button
                onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
              <motion.button
                onClick={() => { setShowSignupModal(true); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-gray-200 text-zinc-800 hover:bg-gray-300 transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cadastre-se
              </motion.button>
            </>
          ) : (
            <>
              {user.avatarUrl && (
                <Image 
                  src={user.avatarUrl}
                  alt="Avatar do Usuário"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-white">Olá, {user.email}!</span>
              <motion.button
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sair
              </motion.button>
            </>
          )}
          <motion.button
            onClick={toggleDarkMode}
            className="text-white p-2 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
            aria-label="Alternar Modo Escuro"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} size="lg" />
          </motion.button>
        </div>
      </nav>
      {(showLoginModal || showSignupModal) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000]"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="relative"
          >
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
                onSignupSuccessWithAccountType={handleSignupSuccessWithAccountType}
                onSwitchToLogin={() => {
                  setShowSignupModal(false);
                  setShowLoginModal(true);
                }}
              />
            )}
            <motion.button
              onClick={() => { setShowLoginModal(false); setShowSignupModal(false); }}
              className="absolute top-2 right-2 text-white text-xl p-2 hover:text-gray-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              &times;
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </header>
  );
}
