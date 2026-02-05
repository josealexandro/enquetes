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
import ExpandableImage from "./ExpandableImage"; // Importar componente de imagem expansível
import { getValidAvatarUrl } from "@/utils/avatarUtils"; // Importar a função utilitária de avatar

interface HeaderProps {
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  showSignupModal: boolean;
  setShowSignupModal: (show: boolean) => void;
}

export default function Header({ showLoginModal, setShowLoginModal, showSignupModal, setShowSignupModal }: HeaderProps) {
  // ============================================
  // DARK MODE - ESTADOS E CONTROLE
  // ============================================
  const [darkMode, setDarkMode] = useState(false); // Estado do dark mode - inicializa como false (light mode)
  const [mounted, setMounted] = useState(false); // Controla quando o componente foi montado no cliente (evita hidratação)
  const [isIOS, setIsIOS] = useState(false); // Detecta iPhone/iPad para fundo do logo no modo light
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false); // Estado para controlar expansão do avatar
  const { user, logout /*, loading */ } = useAuth(); // Remover loading, pois não está sendo usado
  const router = useRouter(); // Inicializar useRouter
  // REMOVIDO: const { openLoginModal, openSignupModal } = useAuthModal();

  // ============================================
  // useEffect 1: INICIALIZAÇÃO DO TEMA
  // ============================================
  // OBJETIVO: Ler o localStorage e aplicar o tema salvo na primeira renderização
  // EXECUÇÃO: Uma única vez na montagem do componente (dependências vazias [])
  // LÓGICA:
  //   1. Lê localStorage.getItem('theme')
  //   2. Se for 'dark', adiciona classe 'dark' no <html> e atualiza estado
  //   3. Se for 'light' ou null, remove classe 'dark' e salva 'light' como padrão
  //   4. Marca componente como montado (mounted = true)
  // ============================================
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      
      // Só aplica dark mode se o usuário escolheu explicitamente
      // Padrão sempre é light mode (não respeita prefers-color-scheme)
      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add("dark"); // Adiciona classe 'dark' no <html>
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove("dark"); // Remove classe 'dark' do <html>
        // Salvar light como padrão se não houver preferência salva
        if (!savedTheme) {
          localStorage.setItem("theme", "light");
        }
      }
      
      setMounted(true); // Componente montado no cliente - permite renderização do ícone
      const ua = navigator.userAgent || navigator.vendor;
      setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    }
  }, []); // Executar apenas uma vez na montagem

  // ============================================
  // useEffect 2: APLICAR MUDANÇAS DO TEMA
  // ============================================
  // OBJETIVO: Aplicar mudanças quando o estado darkMode mudar (via toggle)
  // EXECUÇÃO: Sempre que darkMode ou mounted mudar
  // LÓGICA:
  //   1. Se darkMode === true, adiciona classe 'dark' no <html> e salva 'dark' no localStorage
  //   2. Se darkMode === false, remove classe 'dark' do <html> e salva 'light' no localStorage
  // IMPORTANTE: Só executa após mounted === true para evitar conflitos na inicialização
  // ============================================
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      if (darkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", "#27272a");
        else {
          const m = document.createElement("meta");
          m.name = "theme-color";
          m.content = "#27272a";
          document.head.appendChild(m);
        }
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", "#ffffff");
        else {
          const m = document.createElement("meta");
          m.name = "theme-color";
          m.content = "#ffffff";
          document.head.appendChild(m);
        }
      }
    }
  }, [darkMode, mounted]); // Reage às mudanças no darkMode (quando mounted === true)

  // ============================================
  // FUNÇÃO: TOGGLE DARK MODE
  // ============================================
  // OBJETIVO: Alternar entre light e dark mode quando o usuário clica no botão
  // FUNCIONAMENTO:
  //   - Apenas alterna o estado darkMode (true <-> false)
  //   - O useEffect 2 detecta a mudança e aplica as mudanças (classe + localStorage)
  // SIMPLICIDADE: Não aplica mudanças diretamente aqui - deixa o useEffect fazer isso
  // ============================================
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
    <header className="w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white py-1 px-6 pt-[max(0.25rem,env(safe-area-inset-top))] fixed top-0 left-0 right-0 z-50 shadow-md transition-colors duration-300">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className={`inline-flex items-center hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300 ${!darkMode && isIOS ? "bg-zinc-900 px-2 py-1 -mx-2 -my-1 rounded-md" : ""}`}>
            <Image src="/logoHomeNova.png" alt="Engaja" width={120} height={40} objectFit="contain" />
        </Link>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-zinc-900 dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
            aria-label="Abrir/Fechar Menu Mobile"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} size="lg" />
          </motion.button>
        </div>

        {/* Desktop menu items and mobile menu content */}
        <div className={`md:flex items-center space-x-6 ${isMobileMenuOpen ? "flex flex-col absolute top-full left-0 w-full bg-white dark:bg-zinc-800 p-4 shadow-md items-center space-y-4 z-50" : "hidden"}`}>
          <Link href="/" className="text-zinc-900 dark:text-white hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300 py-2 px-4 min-h-[44px] flex items-center" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/enquetes" className="text-zinc-900 dark:text-white hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300 py-2 px-4 min-h-[44px] flex items-center" onClick={() => setIsMobileMenuOpen(false)}>Enquetes</Link>
          {user && user.accountType === 'personal' && (
            <Link href="/profile" className="text-zinc-900 dark:text-white hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300 py-2 px-4 min-h-[44px] flex items-center" onClick={() => setIsMobileMenuOpen(false)}>Meu Perfil</Link>
          )}
          {user && user.accountType === 'commercial' && (
            <Link href="/dashboard" className="text-zinc-900 dark:text-white hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.7)] transition-colors duration-300 py-2 px-4 min-h-[44px] flex items-center" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
          )}
          {!user ? (
            <>
              <motion.button
                onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300 min-h-[44px] min-w-[100px] flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
              <motion.button
                onClick={() => { setShowSignupModal(true); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-gray-200 text-zinc-800 hover:bg-gray-300 transition-colors duration-300 min-h-[44px] min-w-[120px] flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cadastre-se
              </motion.button>
            </>
          ) : (
            <>
              {user.avatarUrl && (
                <ExpandableImage
                  src={getValidAvatarUrl(user.avatarUrl)}
                  alt="Avatar do Usuário"
                  defaultSize={32}
                  expandedSize={128}
                  showBorder={false}
                  className="bg-zinc-700"
                  onExpansionChange={setIsAvatarExpanded}
                />
              )}
              {!isAvatarExpanded && (
                <span className="text-zinc-900 dark:text-white">
                  {/* DOCUMENTAÇÃO: Para contas comerciais usa commercialName, para pessoais usa displayName */}
                  Olá, {user.accountType === 'commercial' && user.commercialName
                    ? user.commercialName
                    : user.displayName || user.email}
                  !
                </span>
              )}
              <motion.button
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-300 min-h-[44px] min-w-[80px] flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sair
              </motion.button>
            </>
          )}
          {/* ============================================
              BOTÃO TOGGLE DARK MODE
              ============================================
              - Mostra ícone de Sol (faSun) quando darkMode === true (modo escuro ativo)
              - Mostra ícone de Lua (faMoon) quando darkMode === false (modo claro ativo)
              - Só renderiza ícone após mounted === true para evitar flash durante hidratação
              - Classes Tailwind: text-zinc-900 (preto) / dark:text-white (branco no dark mode)
              ============================================ */}
          <motion.button
            onClick={toggleDarkMode}
            className="text-zinc-900 dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
            aria-label="Alternar Modo Escuro"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {mounted && <FontAwesomeIcon icon={darkMode ? faSun : faMoon} size="lg" />}
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
