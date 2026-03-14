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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Re-importar FontAwesomeIcon
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons'; // Re-importar ícones de redes sociais
import { faStar, faStarHalfStroke, faThumbsUp, faXmark } from '@fortawesome/free-solid-svg-icons'; // Ícones para avaliação
import { useCompanyFooter } from "@/app/context/CompanyFooterContext"; // Re-importar useCompanyFooter
import CompanyRatingInput from "@/app/components/CompanyRatingInput"; // Importar o novo componente de avaliação
import Notification from "@/app/components/Notification"; // Importar o novo componente de notificação
import RatingSuccessAnimation from "@/app/components/RatingSuccessAnimation"; // Importar o novo componente de animação de estrelas
import ExpandableImage from "@/app/components/ExpandableImage"; // Importar componente de imagem expansível
import CompanyStories from "@/app/components/CompanyStories"; // Importar componente de stories

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
  bannerURL?: string; // Novo campo para a URL da imagem do banner da empresa
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
          // Se commercialName não existir, usar displayName (para empresas que não têm commercialName definido)
          commercialName: data.commercialName || data.displayName,
          // IMPORTANTE: Usar avatarUrl (campo do Firestore) em vez de photoURL para manter consistência
          photoURL: data.avatarUrl || data.photoURL || undefined,
          description: data.description || undefined,
          aboutUs: data.aboutUs || undefined,
          contactEmail: data.contactEmail || undefined,
          address: data.address || undefined,
          facebookUrl: data.facebookUrl || undefined,
          instagramUrl: data.instagramUrl || undefined,
          twitterUrl: data.twitterUrl || undefined,
          themeColor: data.themeColor || undefined,
          bannerURL: data.bannerURL || undefined,
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
  const [isProfileImageExpanded, setIsProfileImageExpanded] = useState(false); // Estado para controlar a expansão da imagem de perfil
  const [recommendationPercentage, setRecommendationPercentage] = useState<number | null>(null); // Percentual de clientes que recomendam
  const [showRatingModal, setShowRatingModal] = useState(false); // Modal de avaliação com estrelas

  // Removido useEffect que logava company, será logado dentro do useEffect principal
  // useEffect(() => { ... }, [company]);

  useEffect(() => {
    const fetchCompanyAndPolls = async () => {
      setLoading(true);
      const fetchedCompany = await getCompanyData(slug);
      console.log("[PAGE_SLUG] Fetched company in useEffect:", fetchedCompany); // LOG DE DEBUG TEMPORÁRIO
      console.log("[PAGE_SLUG] Company ID que será passado para CompanyStories:", fetchedCompany?.id); // LOG DE DEBUG
      setCompany(fetchedCompany);
      setCompanyFooterData(fetchedCompany); // Definir os dados da empresa no contexto do rodapé

      if (fetchedCompany) {
        // DOCUMENTAÇÃO: onSnapshot atualiza dados da empresa em tempo real e sincroniza com o footer
        // Quando dados são salvos na dashboard, este listener atualiza automaticamente a página e o footer
        // OTIMIZAÇÃO DE CUSTO: Mantido onSnapshot para dados críticos (empresa) pois é essencial para UX
        // - Apenas 1 listener por visitante (baixo custo)
        // - Atualiza apenas quando há mudanças reais (não faz polling constante)
        const companyDocRef = doc(db, "users", fetchedCompany.id);
        const unsubscribeCompany = onSnapshot(companyDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("onSnapshot detectou mudança na empresa - dados do Firestore:", data); // DEBUG
            const updatedCompany: CompanyData = {
              id: docSnap.id,
              displayName: data.displayName || data.commercialName,
              commercialName: data.commercialName || data.displayName,
              photoURL: data.avatarUrl || data.photoURL || undefined,
              description: data.description || undefined,
              aboutUs: data.aboutUs || undefined,
              contactEmail: data.contactEmail || undefined,
              address: data.address || undefined,
              facebookUrl: data.facebookUrl || undefined,
              instagramUrl: data.instagramUrl || undefined,
              twitterUrl: data.twitterUrl || undefined,
              themeColor: data.themeColor || undefined,
              bannerURL: data.bannerURL || undefined,
            };
            console.log("CompanyData atualizado para o contexto:", updatedCompany); // DEBUG
            setCompany(updatedCompany);
            // Atualiza o contexto do footer para que as informações apareçam no footer da página pública
            setCompanyFooterData(updatedCompany);
            console.log("setCompanyFooterData chamado com:", updatedCompany); // DEBUG
          }
        }, (error) => {
          console.error("Erro ao carregar dados da empresa:", error);
        });
        // DOCUMENTAÇÃO: Listener para avaliações da empresa
        // OTIMIZAÇÃO DE CUSTO: Mantido onSnapshot para avaliações pois é crítico para UX
        // - Avaliações são eventos raros (não geram muitas leituras)
        // - Importante mostrar novas avaliações em tempo real
        const companyRatingsRef = collection(db, `users/${fetchedCompany.id}/ratings`);
        const unsubscribeRatings = onSnapshot(companyRatingsRef, (snapshot) => {
          // Normalizar: cada doc pode ter score (0-10), npsScore ou rating (1-5) — converter tudo para 0-10
          const scores010 = snapshot.docs
            .map((d) => {
              const data = d.data();
              const s = typeof data.score === "number" ? data.score : typeof data.npsScore === "number" ? data.npsScore : typeof data.rating === "number" ? Math.round(Number(data.rating) * 2) : null;
              return s;
            })
            .filter((s): s is number => typeof s === "number" && !Number.isNaN(s));
          if (scores010.length > 0) {
            const sum = scores010.reduce((acc, curr) => acc + curr, 0);
            const avg010 = sum / scores010.length;
            setAverageRating(avg010 / 2);
            setTotalRatings(scores010.length);
            const recommendCount = scores010.filter((r) => r >= 9).length;
            setRecommendationPercentage(Math.round((recommendCount / scores010.length) * 100));
          } else {
            setAverageRating(0);
            setTotalRatings(0);
            setRecommendationPercentage(null);
          }
        }, (error) => {
          console.error("Erro ao carregar avaliações da empresa:", error);
        });

        // DOCUMENTAÇÃO: Listener para enquetes da empresa
        // OTIMIZAÇÃO DE CUSTO: Mantido onSnapshot para enquetes pois é crítico para UX
        // - Votos e comentários devem aparecer em tempo real
        // - Apenas 1 listener por visitante, atualiza apenas quando há mudanças
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
                // Filtrar URLs de exemplo
                if (creatorAvatarUrl.includes('example.com')) {
                  creatorAvatarUrl = "https://www.gravatar.com/avatar/?d=mp";
                }
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

        return () => { 
          unsubscribe(); 
          unsubscribeRatings(); 
          unsubscribeCompany(); // Limpar o listener da empresa
        };
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
      setShowRatingModal(false); // Fechar modal após avaliar com sucesso
    }
    // Fechar modal também quando o usuário envia o contato (nota baixa) com sucesso
    if (type === 'success' && message === "Contato enviado. A empresa poderá entrar em contato para melhorar sua experiência.") {
      setShowRatingModal(false);
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
      const pollToUpdate = companyPolls.find(p => p.id === pollId);
      if (!pollToUpdate) {
        console.error("Enquete não encontrada para votação");
        return;
      }
      // A atualização real-time via onSnapshot se encarregará de atualizar o estado local
      await updateDoc(pollRef, {
        "options": pollToUpdate.options.map(opt =>
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
      <div
        className="relative flex flex-col items-center justify-center rounded-b-lg p-6 mb-6 shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 h-48 md:h-64 overflow-visible" // Adicionado overflow-visible
        style={company.bannerURL ? { backgroundImage: `url(${company.bannerURL})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}} // Fundo dinâmico
      >
        {company.bannerURL && (
          <div className="absolute inset-0 bg-black opacity-40 rounded-b-lg"></div>
        )}
        <div className="relative flex items-center w-full max-w-4xl z-10" style={{ overflow: 'visible' }}> {/* Adicionado overflow-visible */}
          {company.photoURL ? (
            <ExpandableImage
              src={company.photoURL}
              alt={company.commercialName || company.displayName || "Logo da empresa"}
              defaultSize={96}
              expandedSize={256}
              borderColor="white"
              showBorder={true}
              onExpansionChange={setIsProfileImageExpanded}
            />
          ) : (
            <div className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 text-2xl font-semibold border-4 border-white shadow-lg flex-shrink-0">
              {(company.commercialName || company.displayName)?.charAt(0)}
            </div>
          )}
          {!isProfileImageExpanded && (
            <div className="flex flex-col ml-4 flex-grow">
              {company.description && (
                 <p className="text-base text-purple-100 font-semibold italic font-permanent-marker drop-shadow-md">{company.description}</p>
              )}
            </div>
          )}

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

      {/* DOCUMENTAÇÃO: Container com stories e avaliação lado a lado
          - Stories à esquerda, avaliação à direita
          - Layout responsivo: coluna no mobile, linha no desktop
      */}
      <div className="w-full max-w-screen-xl mx-auto px-4 mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          {/* Stories da empresa */}
          <div className="flex-1 w-full md:w-auto">
            {company?.id && <CompanyStories companyId={company.id} />}
          </div>

          {/* DOCUMENTAÇÃO: Seção de Avaliação da Empresa - lado direito
              - Exibe avaliação média junto com o formulário de avaliação
              - Avaliação média é pública (todos podem ver)
              - Formulário de avaliação: apenas para visitantes (não para o dono da empresa)
              - O dono da empresa não pode se avaliar
          */}
          <div className="w-full md:w-auto md:min-w-[300px]">
            {user?.uid !== company?.id && (
              <div className="w-full">
                {/* Cabeçalho: título + estrelas + nota na mesma linha (quando há avaliações) */}
                {totalRatings > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Satisfação dos clientes</h3>
                    <div className="flex items-center gap-1.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const full = Math.floor(averageRating);
                        const remainder = averageRating - full;
                        const hasHalf = remainder >= 0.25 && remainder < 0.75;
                        if (i <= full) return <FontAwesomeIcon key={i} icon={faStar} className="text-lg" />;
                        if (i === full + 1 && hasHalf) return <FontAwesomeIcon key={i} icon={faStarHalfStroke} className="text-lg" />;
                        return <FontAwesomeIcon key={i} icon={faStar} className="text-lg text-gray-300 dark:text-gray-600" />;
                      })}
                    </div>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{averageRating.toFixed(1)}</span>
                  </div>
                ) : (
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 text-center">Satisfação dos clientes</h3>
                )}

                {/* Botão de recomendação + Botão Avalie esta empresa lado a lado */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  {totalRatings > 0 && recommendationPercentage !== null && (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 transition-colors">
                      <FontAwesomeIcon icon={faThumbsUp} className="text-white" />
                      <span>{recommendationPercentage}% recomendam esta empresa</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRatingModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-md hover:bg-indigo-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faStar} className="text-amber-400" />
                    <span>Avalie esta empresa</span>
                  </button>
                </div>

                {/* Modal de avaliação com estrelas */}
                {showRatingModal && company?.id && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setShowRatingModal(false)}
                  >
                    <div
                      className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-6 max-w-sm w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Avalie esta empresa</h4>
                        <button
                          type="button"
                          onClick={() => setShowRatingModal(false)}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                        >
                          <FontAwesomeIcon icon={faXmark} className="text-xl" />
                        </button>
                      </div>
                      <CompanyRatingInput companyId={company.id} onRatingSubmitted={handleShowNotification} />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* DOCUMENTAÇÃO: Exibir apenas avaliação média para o dono da empresa (sem formulário) */}
            {user?.uid === company?.id && totalRatings > 0 && (
              <div className="w-full">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Satisfação dos clientes</h3>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const full = Math.floor(averageRating);
                      const remainder = averageRating - full;
                      const hasHalf = remainder >= 0.25 && remainder < 0.75;
                      if (i <= full) return <FontAwesomeIcon key={i} icon={faStar} className="text-lg" />;
                      if (i === full + 1 && hasHalf) return <FontAwesomeIcon key={i} icon={faStarHalfStroke} className="text-lg" />;
                      return <FontAwesomeIcon key={i} icon={faStar} className="text-lg text-gray-300 dark:text-gray-600" />;
                    })}
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{averageRating.toFixed(1)}</span>
                </div>

                {recommendationPercentage !== null && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-md">
                    <FontAwesomeIcon icon={faThumbsUp} className="text-white" />
                    <span>{recommendationPercentage}% recomendam esta empresa</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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

