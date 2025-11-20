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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Re-importar FontAwesomeIcon
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons'; // Re-importar ícones de redes sociais
// Removido: import { faEnvelope } from '@fortawesome/free-solid-svg-icons'; // Importar ícone de envelope
import { useCompanyFooter } from "@/app/context/CompanyFooterContext"; // Re-importar useCompanyFooter
import { motion } from "framer-motion"; // Importar motion para animações
import CompanyRatingInput from "@/app/components/CompanyRatingInput"; // Importar o novo componente de avaliação
import Notification from "@/app/components/Notification"; // Importar o novo componente de notificação
import RatingSuccessAnimation from "@/app/components/RatingSuccessAnimation"; // Importar o novo componente de animação de estrelas

interface CompanyProfilePageProps {
  params: Promise<{ slug: string }>; // Atualizado para Promise
}

export interface CompanyData {
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
  themeColor?: string; // Novo campo para a cor do tema da empresa
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
          instagramUrl: data.instagramUrl || undefined, // Mapeia diretamente para instagramUrl
          twitterUrl: data.twitterUrl || undefined,   // Mapeia diretamente para twitterUrl
          themeColor: data.themeColor || undefined, // Obter themeColor
        };
      }
    });
    return companyData;
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    return null;
  } finally {
    // console.log("getCompanyData returned:", companyData); // LOG DE DEBUG TEMPORÁRIO
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
  const [averageRating, setAverageRating] = useState(0); // Novo estado para avaliação média
  const [totalRatings, setTotalRatings] = useState(0); // Novo estado para total de avaliações
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null); // Estado para a mensagem da notificação
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('info'); // Estado para o tipo da notificação
  const [showRatingAnimation, setShowRatingAnimation] = useState(false); // Novo estado para controlar a animação das estrelas

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
        // Adicionar listener para as avaliações da empresa
        const companyRatingsRef = collection(db, `users/${fetchedCompany.id}/ratings`);
        const unsubscribeRatings = onSnapshot(companyRatingsRef, (snapshot) => {
          const ratings = snapshot.docs.map(doc => doc.data().rating);
          if (ratings.length > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr, 0);
            setAverageRating(sum / ratings.length);
            setTotalRatings(ratings.length);
          } else {
            setAverageRating(0);
            setTotalRatings(0);
          }
        }, (error) => {
          console.error("Erro ao carregar avaliações da empresa:", error);
        });

        const pollsCollection = collection(db, "polls");
        const q = query(pollsCollection, where("creator.id", "==", fetchedCompany.id));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const fetchedPollsPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const creatorId = data.creator?.id;

            let creatorName = "Usuário Desconhecido";
            let creatorAvatarUrl = "https://www.gravatar.com/avatar/?d=mp";
            let creatorCommercialName: string | undefined = undefined; // Adicionar para consistência
            let creatorThemeColor: string | undefined = undefined; // Novo campo para themeColor

            if (creatorId) {
              const userDocRef = doc(db, "users", creatorId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                creatorName = userData.name || userData.displayName || "Usuário";
                creatorAvatarUrl = userData.avatarUrl || "https://www.gravatar.com/avatar/?d=mp";
                creatorCommercialName = userData.commercialName || undefined; // Obter commercialName
                creatorThemeColor = userData.themeColor || undefined; // Obter themeColor
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
                commercialName: creatorCommercialName, // Adicionar commercialName
                themeColor: creatorThemeColor, // Adicionar themeColor
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

        return () => { unsubscribe(); unsubscribeRatings(); }; // Limpar ambos os listeners
      } else {
        setLoading(false);
      }
    };

    fetchCompanyAndPolls();
  }, [slug, setCompanyFooterData]); // Adicionado setCompanyFooterData como dependência

  const handleShowNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotificationMessage(message);
    setNotificationType(type);
    if (type === 'success' && message === "Sua avaliação foi registrada com sucesso!") {
      setShowRatingAnimation(true);
    }
  };

  const handleCloseNotification = () => {
    setNotificationMessage(null);
  };

  const handleRatingAnimationComplete = () => {
    setShowRatingAnimation(false);
  };

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
    <div className="w-full max-w-screen-xl mx-auto px-4 py-8 md:py-12 lg:py-16"> {/* Removido cor de fundo e sombra */}
      <div className="flex flex-col items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 rounded-b-lg p-6 mb-6 shadow-lg"> {/* Banner com gradiente */}
        <div className="flex items-center w-full max-w-4xl">
          {company.photoURL ? (
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-4 border-white flex-shrink-0"> {/* Contêiner para garantir o formato redondo e corte */}
              <Image
                src={company.photoURL}
                alt={company.commercialName || "Logo da empresa"}
                width={96} 
                height={96}
                objectFit="cover" // Usar "cover" para preencher e cortar, garantindo o formato redondo
                className="w-full h-full" // Fazer a imagem preencher o contêiner
              />
            </div>
          ) : (
            <div className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 text-2xl font-semibold border-4 border-white shadow-lg flex-shrink-0">
              {company.commercialName?.charAt(0)}
            </div>
          )}
          <div className="flex flex-col ml-4 flex-grow">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-md">{company.commercialName}</h1>
            {company.description && (
               <p className="text-base text-purple-100 font-semibold italic mt-1 font-permanent-marker drop-shadow-md">{company.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-auto"> {/* Ícones empilhados verticalmente e alinhados à direita */}
            {company.facebookUrl && (
              <a href={company.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200">
                <FontAwesomeIcon icon={faFacebookF} size="2x" />
              </a>
            )}
            {company.instagramUrl && (
              <a href={company.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200">
                <FontAwesomeIcon icon={faInstagram} size="2x" />
              </a>
            )}
            {company.twitterUrl && (
              <a href={company.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200">
                <FontAwesomeIcon icon={faTwitter} size="2x" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Faixa Horizontal de Números de Impacto */}
      <div className="w-full max-w-screen-xl mx-auto px-4 mb-8">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 flex justify-around items-center flex-wrap gap-4">
          <div className="text-center">
            <motion.p
              className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {companyPolls.reduce((totalVotes, poll) => totalVotes + poll.options.reduce((sum, option) => sum + option.votes, 0), 0)}
            </motion.p>
            <p className="text-sm text-gray-500 dark:text-gray-400">votos recebidos</p>
          </div>
          <div className="text-center">
            <motion.p
              className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {companyPolls.length}
            </motion.p>
            <p className="text-sm text-gray-500 dark:text-gray-400">enquetes criadas</p>
          </div>
          <div className="text-center">
            <motion.p
              className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {averageRating.toFixed(1)} {/* Exibir avaliação média dinâmica */}
            </motion.p>
            <p className="text-sm text-gray-500 dark:text-gray-400">avaliação média ({totalRatings} {totalRatings === 1 ? 'voto' : 'votos'})</p> {/* Exibir total de avaliações */}
          </div>
        </div>
      </div>

      {/* Seção de Avaliação da Empresa */}
      <div className="w-full max-w-md mx-auto px-4 mb-8">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 text-center">Avalie esta empresa</h3>
        {company.id && <CompanyRatingInput companyId={company.id} onRatingSubmitted={handleShowNotification} />}
      </div>

      {companyPolls.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">Nenhuma enquete encontrada para esta empresa.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {companyPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              onDelete={handleDeletePoll}
              companySlug={slug}
              companyThemeColor={company.themeColor || poll.creator.themeColor} // Passar a cor do tema da empresa
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
      <Notification 
        message={notificationMessage}
        type={notificationType}
        onClose={handleCloseNotification}
      />
      <RatingSuccessAnimation 
        show={showRatingAnimation} 
        onAnimationComplete={handleRatingAnimationComplete} 
      />
    </div>
  );
}
