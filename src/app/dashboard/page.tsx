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

  // Hook para buscar as enquetes
  useEffect(() => {
    if (!user) return;

    const pollsCollection = collection(db, "polls");
    const q = query(pollsCollection, where("creator.id", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const commentsQuery = query(collection(db, `polls/${docSnap.id}/comments`));
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentCount = commentsSnapshot.size;

        return {
          id: docSnap.id,
          ...data,
          commentCount: commentCount,
          createdAt: data.createdAt, // Firebase retorna Timestamp, a interface Poll agora aceita isso
        } as Poll;
      });
      const fetchedPolls = await Promise.all(fetchedPollsPromises);
      setPolls(fetchedPolls);
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
      <Suspense fallback={null}> {/* Suspense Boundary para DashboardPaymentHandler */}
        <DashboardPaymentHandler />
      </Suspense>
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
                <span className="mr-2">🏢</span> Perfil da Empresa\
              </a>
            </li>
            {user?.accountType === 'commercial' && user?.commercialName && (
              <li className="mb-2">
                <Link href={`/empresa/${slugify(user.commercialName)}`} className="flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200">
                  <span className="mr-2">🌐</span> Ver Página Pública
                </Link>
              </li>
            )}
            <li className="mb-2">
              <button
                type="button"
                onClick={() => setActiveSection("subscription")}
                className={`flex items-center p-2 rounded-lg w-full text-left ${
                  activeSection === "subscription" ? "bg-gray-700" : "hover:bg-gray-700"
                }`}
              >
                <span className="mr-2">💳</span> Assinatura
              </button>
            </li>
            <li className="mb-2">
              <a href="#" className="flex items-center p-2 rounded-lg">
                <span className="mr-2">⚙️</span> Configurações
              </a>
            </li>
            <li className="mb-2">
              <button
                type="button"
                onClick={() => setActiveSection("polls")}
                className={`flex items-center p-2 rounded-lg w-full text-left ${
                  activeSection === "polls" ? "bg-gray-700" : "hover:bg-gray-700"
                }`}
              >
                <span className="mr-2">📝</span> Minhas Enquetes
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto md:ml-64">
        {activeSection === "polls" ? (
          <DashboardComponent polls={polls} user={user} />
        ) : (
          <SubscriptionPanel
            companyId={user.uid}
            companyName={user.displayName || user.email || "Empresa"}
          />
        )}
      </main>
    </div>
  );
}

