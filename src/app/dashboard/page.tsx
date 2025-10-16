"use client";

import React, { useEffect } from "react";
import Link from "next/link"; // Importar Link
import { useRouter } from 'next/navigation'; // Importar useRouter para redirecionamento
import { useAuth } from "../context/AuthContext";
import DashboardComponent from "../components/Dashboard"; // Renomear para evitar conflito
// Removido: import { Poll } from "../types/poll"; // Importar a interface Poll

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Remover isMasterUser da desestruturação
  const router = useRouter();
  
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
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4">
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
      <main className="flex-1 p-8 overflow-y-auto">
        <DashboardComponent />
      </main>
    </div>
  );
}

