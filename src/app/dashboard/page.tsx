"use client";

import React, { useEffect, useState } from "react"; // Adicionar useState
import Link from "next/link"; // Importar Link
import { useRouter } from 'next/navigation'; // Importar useRouter para redirecionamento
import { useAuth } from "../context/AuthContext";
import DashboardComponent from "../components/Dashboard"; // Renomear para evitar conflito
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Importar FontAwesomeIcon
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'; // Importar ícones
// Removido: import { Poll } from "../types/poll"; // Importar a interface Poll

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Remover isMasterUser da desestruturação
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Estado para controlar a visibilidade da sidebar
  
  // Redirecionar se o usuário não for comercial ou não estiver logado após o carregamento
  useEffect(() => {
    if (!loading && (!user || user.accountType !== 'commercial')) {
      router.push('/'); // Redirecionar para a página inicial
    }
  }, [user, loading, router]);
  
  if (loading || !user || user.accountType !== 'commercial') {
    return (
      <div className="flex h-screen bg-gray-900 text-white justify-center items-center">
        <p>Carregando ou acesso negado...</p>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Botão para abrir/fechar a sidebar em mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 text-white focus:outline-none"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} size="lg" />
      </button>

      {/* Overlay para mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 p-4 transform transition-transform duration-300 ease-in-out z-50 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}
      >
        <h1 className="text-2xl font-bold mb-6">ENQUETES</h1>
        <nav>
          <ul>
            <li className="mb-2">
              <Link href="/" className="flex items-center p-2 rounded-lg bg-gray-700">
                <span className="mr-2">🏠</span> Início
              </Link>
            </li>
            <li className="mb-2">
              <Link href="/enquetes" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">📊</span> Enquetes
              </Link>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">💬</span> Comentários
              </a>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">📈</span> Estatísticas
              </a>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">🏢</span> Perfil da Empresa
              </a>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">💳</span> Assinatura
              </a>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">⚙️</span> Configurações
              </a>
            </li>
            <li className="mb-2">
              <Link href="/dashboard" className="flex items-center p-2 rounded-lg bg-gray-700">
                <span className="mr-2">📝</span> Minhas Enquetes
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto md:ml-64"> {/* Ajustar margem para desktop */}
        <DashboardComponent />
      </main>
    </div>
  );
}

