"use client";

import React, { useEffect, useState, Suspense } from "react"; // Importar Suspense
import Link from "next/link";
import { useRouter } from 'next/navigation'; // Remover useSearchParams daqui
import { useAuth } from "../context/AuthContext";
import DashboardComponent from "../components/Dashboard";
import SubscriptionPanel from "../components/SubscriptionPanel";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore"; // Importar funcionalidades do Firestore
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { Poll } from "../types/poll"; // Importar a interface Poll
import slugify from "@/utils/slugify"; // Importar a função slugify
import DashboardPaymentHandler from "../components/DashboardPaymentHandler"; // Importar o novo componente

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Remover refreshUserData daqui
  const router = useRouter();
  // const searchParams = useSearchParams(); // Remover inicialização de useSearchParams
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]); // Estado para armazenar as enquetes
  const [activeSection, setActiveSection] = useState<"polls" | "subscription">("polls");

  useEffect(() => {
    if (!loading && (!user || user.accountType !== 'commercial')) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Adicionado useEffect para logar o href gerado
  useEffect(() => {
    if (user?.accountType === 'commercial' && user?.commercialName) {
      // console.log("commercialName:", user.commercialName);
      // console.log("Generated href for public page:", `/empresa/${slugify(user.commercialName)}`);
    }
  }, [user]); // Dependência do usuário para logar quando o usuário mudar

  // REMOVIDO: Novo useEffect para recarregar dados do usuário após pagamento Stripe
  // useEffect(() => {
  //   const paymentStatus = searchParams.get('payment');
  //   if (paymentStatus === 'success') {
  //     // console.log("Pagamento Stripe bem-sucedido, recarregando dados do usuário...");
  //     refreshUserData(); // Chamar a função para recarregar os dados
  //     // Opcional: remover o parâmetro 'payment' da URL para evitar recargas repetidas
  //     // router.replace(router.pathname, undefined, { shallow: true });
  //   }
  // }, [searchParams, refreshUserData]); // Depende de searchParams e refreshUserData

  // Hook para buscar as enquetes do usuário em tempo real
  // Usa onSnapshot para atualizar automaticamente quando há mudanças
  useEffect(() => {
    if (!user) return;

    const pollsCollection = collection(db, "polls");
    const q = query(pollsCollection, where("creator.id", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // Para cada enquete, buscar a contagem de comentários
        const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          try {
            const commentsQuery = query(collection(db, `polls/${docSnap.id}/comments`));
            const commentsSnapshot = await getDocs(commentsQuery);
            const commentCount = commentsSnapshot.size;

            return {
              id: docSnap.id,
              ...data,
              commentCount: commentCount,
              createdAt: data.createdAt, // Firebase retorna Timestamp, a interface Poll agora aceita isso
            } as Poll;
          } catch (commentError) {
            // Se houver erro ao buscar comentários, retornar enquete com commentCount = 0
            return {
              id: docSnap.id,
              ...data,
              commentCount: 0,
              createdAt: data.createdAt,
            } as Poll;
          }
        });
        const fetchedPolls = await Promise.all(fetchedPollsPromises);
        setPolls(fetchedPolls);
      } catch (error) {
        console.error("Erro ao processar enquetes no Dashboard:", error);
      }
    }, (error) => {
      // Erro no listener não deve quebrar a aplicação
      console.error("Erro no listener de enquetes do Dashboard:", error);
    });

    return () => unsubscribe();
  }, [user]); // Dependência do usuário para recarregar quando o usuário mudar

  if (loading || !user || user.accountType !== 'commercial') {
    return (
      <div className="flex h-screen bg-gray-900 text-white justify-center items-center">
        <p>Carregando ou acesso negado...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Suspense fallback={null}>
        {/* DOCUMENTAÇÃO: Componente para gerenciar pagamentos */}
        <DashboardPaymentHandler />
      </Suspense>
      
      {/* Botão para abrir/fechar a sidebar em mobile */}
      {/* DOCUMENTAÇÃO: Botão hamburger visível apenas no mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-gray-800 rounded-lg text-white hover:bg-gray-700 focus:outline-none transition-colors"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} size="lg" />
      </button>

      {/* Overlay para mobile */}
      {/* DOCUMENTAÇÃO: Overlay escuro quando sidebar está aberta no mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      {/* DOCUMENTAÇÃO: Sidebar fixa no desktop (md:fixed), oculta no mobile (abre com botão) */}
      {/* Ajuste para tablets: menor largura (w-56) em tablets, largura completa (w-64) em desktop */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 md:w-56 lg:w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out z-50 flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0`}
      >
        {/* Cabeçalho da Sidebar */}
        {/* Ajuste para tablets: padding menor em tablets */}
        <div className="p-4 md:p-5 lg:p-6 border-b border-gray-700">
          <h1 className="text-lg md:text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">Painel de Controle</p>
        </div>

        {/* Navegação */}
        {/* Ajuste para tablets: padding menor em tablets */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4">
          <ul className="space-y-1">
            {/* Seção Principal */}
            <li>
              <button
                type="button"
                onClick={() => setActiveSection("polls")}
                className={`flex items-center w-full p-2 md:p-2.5 lg:p-3 rounded-lg text-left transition-colors ${
                  activeSection === "polls" 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="mr-2 md:mr-3 text-base md:text-lg">📝</span>
                <span className="text-sm md:text-base font-medium">Minhas Enquetes</span>
              </button>
            </li>

            {/* Separador */}
            <li className="my-4">
              <div className="h-px bg-gray-700"></div>
            </li>

            {/* Links de Navegação */}
            <li>
              <Link 
                href="/" 
                className="flex items-center p-2 md:p-2.5 lg:p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <span className="mr-2 md:mr-3 text-base md:text-lg">🏠</span>
                <span className="text-sm md:text-base">Início</span>
              </Link>
            </li>
            <li>
              <Link 
                href="/enquetes" 
                className="flex items-center p-2 md:p-2.5 lg:p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <span className="mr-2 md:mr-3 text-base md:text-lg">📊</span>
                <span className="text-sm md:text-base">Enquetes</span>
              </Link>
            </li>

            {/* Separador */}
            <li className="my-4">
              <div className="h-px bg-gray-700"></div>
            </li>

            {/* Seção Empresa */}
            {user?.accountType === 'commercial' && user?.commercialName && (
              <li>
                <Link 
                  href={`/empresa/${slugify(user.commercialName)}`} 
                  className="flex items-center p-2 md:p-2.5 lg:p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <span className="mr-2 md:mr-3 text-base md:text-lg">🌐</span>
                  <span className="text-sm md:text-base">Página Pública</span>
                </Link>
              </li>
            )}

            {/* Separador */}
            <li className="my-4">
              <div className="h-px bg-gray-700"></div>
            </li>

            {/* Assinatura */}
            <li>
              <button
                type="button"
                onClick={() => setActiveSection("subscription")}
                className={`flex items-center w-full p-2 md:p-2.5 lg:p-3 rounded-lg text-left transition-colors ${
                  activeSection === "subscription" 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="mr-2 md:mr-3 text-base md:text-lg">💳</span>
                <span className="text-sm md:text-base font-medium">Assinatura</span>
              </button>
            </li>
          </ul>
        </nav>

        {/* Rodapé da Sidebar */}
        {/* Ajuste para tablets: padding menor em tablets */}
        <div className="p-3 md:p-4 border-t border-gray-700">
          <div className="flex items-center p-2 md:p-3 rounded-lg bg-gray-700">
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm font-medium text-white truncate">
                {user?.displayName || "Empresa"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      {/* DOCUMENTAÇÃO: Conteúdo principal com margin-left no desktop para compensar sidebar fixa */}
      {/* Ajuste para tablets: margin-left menor (ml-56) em tablets, maior (ml-64) em desktop */}
      <main className="flex-1 overflow-y-auto bg-gray-900 md:ml-56 lg:ml-64">
        {/* Ajuste para tablets: padding intermediário em tablets */}
        <div className="p-4 md:p-5 lg:p-8">
          {activeSection === "polls" ? (
            <DashboardComponent polls={polls} user={user} />
          ) : (
            <SubscriptionPanel
              companyId={user.uid}
              companyName={user.displayName || user.email || "Empresa"}
            />
          )}
        </div>
      </main>
    </div>
  );
}

