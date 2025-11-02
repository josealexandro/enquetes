"use client"; // Adicionar no topo do arquivo para usar hooks de estado e efeitos

import React, { useState, useEffect, use } from 'react'; // Adicionar use aqui
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, updateDoc, arrayUnion, deleteDoc, doc, getDoc, getDocs } from "firebase/firestore"; // Adicionar getDocs aqui
import slugify from "@/utils/slugify";
// Removido Link, pois não é mais usado
import { Poll } from "@/app/types/poll"; // Manter importação de Poll
import PollCard from "@/app/components/PollCard"; // Importar PollCard
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth
import { useAuthModal } from "@/app/context/AuthModalContext"; // Importar useAuthModal
import AuthPromptCard from "@/app/components/Auth/AuthPromptCard"; // Importar AuthPromptCard
import Image from "next/image"; // Importar Image do next/image
// Removido: import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Importar FontAwesomeIcon
// Removido: import { faFacebookF, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons'; // Importar ícones de redes sociais
// Removido: import { faEnvelope } from '@fortawesome/free-solid-svg-icons'; // Importar ícone de envelope
import { useCompanyFooter } from "@/app/context/CompanyFooterContext"; // Re-importar useCompanyFooter

interface CompanyProfilePageProps {
  params: Promise<{ slug: string }>; // Atualizado para Promise
}

interface CompanyData {
  id: string;
  displayName: string;
  commercialName: string;
  photoURL?: string;
  description?: string;
  aboutUs?: string;
  contactEmail?: string;
  address?: string;
  facebookUrl?: string;
  instagramUrl?: string; // Antigo twitterUrl
  twitterUrl?: string; // Antigo linkedinUrl
}

// Alterado para usar a interface Poll completa

const getCompanyData = async (slug: string): Promise<CompanyData | null> => {
  let companyData: CompanyData | null = null; // Mover a declaração para o início da função
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("accountType", "==", "commercial"));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.commercialName && slugify(data.commercialName) === slug) {
        companyData = {
          id: doc.id,
          displayName: data.displayName || data.commercialName,
          commercialName: data.commercialName,
          photoURL: data.photoURL || undefined,
          description: data.description || undefined,
          aboutUs: data.aboutUs || undefined,
          contactEmail: data.contactEmail || undefined,
          address: data.address || undefined,
          facebookUrl: data.facebookUrl || undefined,
          instagramUrl: data.twitterUrl || undefined, // Mapeia o antigo twitterUrl para o novo instagramUrl
          twitterUrl: data.linkedinUrl || undefined, // Mapeia o antigo linkedinUrl para o novo twitterUrl
        };
      }
    });
    return companyData;
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    return null;
  } finally {
    console.log("getCompanyData returned:", companyData); // LOG DE DEBUG TEMPORÁRIO
  }
};

// Removido getCompanyPolls, pois onSnapshot será usado para real-time updates
// const getCompanyPolls = async (companyId: string): Promise<Poll[]> => { ... };

export default function CompanyProfilePage({ params }: CompanyProfilePageProps) { // Remover async daqui
  const unwrappedParams = use(params); // Desembrulhar params com React.use
  const { slug } = unwrappedParams; // Acessar slug do objeto desembrulhado
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyPolls, setCompanyPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true); // Novo estado de carregamento
  const { user } = useAuth();
  const { openLoginModal, openSignupModal } = useAuthModal();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { setCompanyFooterData } = useCompanyFooter(); // Usar o hook

  // Removido useEffect que logava company, será logado dentro do useEffect principal
  // useEffect(() => { ... }, [company]);

  useEffect(() => {
    const fetchCompanyAndPolls = async () => {
      setLoading(true);
      const fetchedCompany = await getCompanyData(slug);
      console.log("Fetched company in useEffect:", fetchedCompany); // LOG DE DEBUG TEMPORÁRIO
      setCompany(fetchedCompany);
      setCompanyFooterData(fetchedCompany); // Definir os dados da empresa no contexto do rodapé

      if (fetchedCompany) {
        const pollsCollection = collection(db, "polls");
        const q = query(pollsCollection, where("creator.id", "==", fetchedCompany.id));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const creatorId = data.creator?.id;

            let creatorName = "Usuário Desconhecido";
            let creatorAvatarUrl = "https://www.gravatar.com/avatar/?d=mp";

            if (creatorId) {
              const userDocRef = doc(db, "users", creatorId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                creatorName = userData.name || userData.displayName || "Usuário";
                creatorAvatarUrl = userData.avatarUrl || "https://www.gravatar.com/avatar/?d=mp";
              }
            }

            // Garantir que as opções tenham um 'id' para consistência
            const optionsWithIds = data.options.map((opt: { id?: string; votes: number; text: string }) => ({
              ...opt,
              id: opt.id || Math.random().toString(36).substring(7)
            }));

            return {
              id: docSnap.id,
              ...data,
              options: optionsWithIds,
              creator: {
                id: creatorId,
                name: creatorName,
                avatarUrl: creatorAvatarUrl,
              },
            } as Poll;
          });

          const allPolls = await Promise.all(fetchedPollsPromises);
          setCompanyPolls(allPolls);
          setLoading(false);
        }, (error) => {
          console.error("Erro ao carregar enquetes da empresa:", error);
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    };

    fetchCompanyAndPolls();
  }, [slug, setCompanyFooterData]); // Adicionado setCompanyFooterData como dependência

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-2xl text-gray-700 dark:text-gray-300">Carregando...</div>;
  }

  if (!company) {
    return <div className="flex justify-center items-center min-h-screen text-2xl text-red-600">Empresa não encontrada.</div>;
  }

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    try {
      const pollRef = doc(db, "polls", pollId);
      // A atualização real-time via onSnapshot se encarregará de atualizar o estado local
      await updateDoc(pollRef, {
        "options": companyPolls.find(p => p.id === pollId)?.options.map(opt =>
          opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
        ),
        votedBy: arrayUnion(user.uid),
      });
    } catch (error) {
      console.error("Erro ao votar na enquete:", error);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir esta enquete?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "polls", pollId));
      setCompanyPolls(prevPolls => prevPolls.filter(poll => poll.id !== pollId));
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
    }
  };

  return (
    // Removido: <CompanyFooterProvider> {/* Envolver o componente com o Provider */} // Remover o Provider
    <div className="w-full max-w-screen-2xl mx-auto px-4 pt-8"> {/* Alterado para maior largura (2xl) */}
      <div className="flex justify-center mb-6">
        {company.photoURL ? (
            <Image
              src={company.photoURL}
              alt={company.commercialName || "Logo da empresa"}
              width={128} // Tamanho fixo para o logo
              height={128} // Tamanho fixo para o logo
              objectFit="contain"
              className="rounded-full shadow-lg border-4 border-white"
            />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 text-2xl font-semibold border-4 border-white shadow-lg">
              {company.commercialName?.charAt(0)}
            </div>
          )}
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Enquetes de {company.commercialName}</h2>

      {companyPolls.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">Nenhuma enquete encontrada para esta empresa.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companyPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              onDelete={handleDeletePoll}
              companySlug={slug}
            />
          ))}
        </div>
      )}
      {showAuthPrompt && (
        <AuthPromptCard
          message="Você precisa estar logado para interagir com as enquetes."
          onClose={() => setShowAuthPrompt(false)}
          onLoginClick={() => {
            setShowAuthPrompt(false);
            openLoginModal();
          }}
          onSignupClick={() => {
            setShowAuthPrompt(false);
            openSignupModal();
          }}
        />
      )}
    </div>
  );
}
