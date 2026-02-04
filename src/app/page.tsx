"use client";

import PollForm from "./components/PollForm";
import PollCard from "./components/PollCard";
import { Poll, PollOption } from "./types/poll"; // Importar PollOption aqui
// Removido: import { v4 as uuidv4 } from "uuid";
// import useLocalStorage from "./hooks/useLocalStorage"; // Remover useLocalStorage
import { useState, useMemo, useEffect, useRef, useCallback } from "react"; // Adicionar useEffect
import { useAuth } from "./context/AuthContext";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion"; // Importar AnimatePresence
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, orderBy, updateDoc, deleteDoc, doc, getDoc, Timestamp, limit, startAfter, getDocs, where, QueryDocumentSnapshot, DocumentData, arrayUnion } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import PollPodium from "./components/PollPodium";
import slugify from "@/utils/slugify";
import { BRAZIL_STATES } from "@/app/data/brazilLocations"; // Importar estados do Brasil para exibir nome completo

export default function Home() {
  // Separação dos estados das enquetes
  const [publicPolls, setPublicPolls] = useState<Poll[]>([]);
  const [commercialPolls, setCommercialPolls] = useState<Poll[]>([]);
  const [podiumPolls, setPodiumPolls] = useState<Poll[]>([]);
  
  // Controles de Paginação
  const [lastPublicDoc, setLastPublicDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastCommercialDoc, setLastCommercialDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMorePublic, setHasMorePublic] = useState(true);
  const [hasMoreCommercial, setHasMoreCommercial] = useState(true);
  const [loadingMorePublic, setLoadingMorePublic] = useState(false); // Novo loading para paginação
  const [loadingMoreCommercial, setLoadingMoreCommercial] = useState(false); // Novo loading para paginação

  const [loadingPolls, setLoadingPolls] = useState(true);
  const [deleteFeedbackMessage, setDeleteFeedbackMessage] = useState<string | null>(null);
  const [deleteFeedbackType, setDeleteFeedbackType] = useState<"success" | "error" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"recent" | "trending" | "mine" | "public" | "commercial">("recent");
  // DOCUMENTAÇÃO: Estado para filtro de cidade/localização
  const [citySearchQuery, setCitySearchQuery] = useState<string>(""); // Texto digitado na busca de cidade
  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string } | null>(null); // Cidade selecionada para filtro
  const [showCitySuggestions, setShowCitySuggestions] = useState(false); // Controla visibilidade das sugestões
  const citySearchRef = useRef<HTMLDivElement>(null); // Ref para detectar cliques fora do campo de busca
  const { user, isMasterUser } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const pollFormRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Função auxiliar para processar os dados da enquete
  const processPollData = async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const data = docSnap.data();
    const creatorData = data.creator || {};
    const creatorId = creatorData.id || data.createdBy;

    let creatorName = creatorData.name || creatorData.displayName || "Usuário Desconhecido";
    let creatorAvatarUrl = creatorData.avatarUrl || creatorData.photoURL || null;
    // Filtrar URLs de exemplo ou strings vazias
    if (!creatorAvatarUrl || creatorAvatarUrl === "" || creatorAvatarUrl.includes('example.com')) {
      creatorAvatarUrl = null; // Marcar como null para buscar do documento do usuário
    }
    let creatorCommercialName = creatorData.commercialName || undefined;
    let creatorThemeColor = creatorData.themeColor || undefined;

    // DOCUMENTAÇÃO: Verificar se os dados do criador estão completos
    // Considera completo apenas se tiver nome E avatarUrl válido (não vazio, não null, não exemplo)
    const hasValidAvatar = creatorAvatarUrl && 
                           creatorAvatarUrl !== "" && 
                           !creatorAvatarUrl.includes('example.com') &&
                           creatorAvatarUrl !== "https://www.gravatar.com/avatar/?d=mp";
    const hasCompleteCreatorData = (creatorData.name || creatorData.displayName) && hasValidAvatar;

    // Se os dados do criador não estão completos na enquete, buscar do documento do usuário
    if (creatorId && !hasCompleteCreatorData) {
      try {
        const userDocRef = doc(db, "users", creatorId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          creatorName = userData.name || userData.displayName || "Usuário";
          creatorAvatarUrl = userData.avatarUrl || userData.photoURL || "https://www.gravatar.com/avatar/?d=mp";
          // Filtrar URLs de exemplo
          if (creatorAvatarUrl.includes('example.com')) {
            creatorAvatarUrl = "https://www.gravatar.com/avatar/?d=mp";
          }
          creatorCommercialName = userData.commercialName || undefined;
          creatorThemeColor = userData.themeColor || undefined;
        }
      } catch (error) {
        // Erro ao buscar dados do criador não deve quebrar o processamento da enquete
        // Os dados já existentes na enquete serão usados como fallback
      }
    }
    
    const optionsWithIds = data.options.map((opt: PollOption) => ({
      ...opt,
      id: opt.id || Math.random().toString(36).substring(7)
    }));

    let pollCreatedAt = data.createdAt;
    if (pollCreatedAt && typeof pollCreatedAt.toDate !== 'function') {
      pollCreatedAt = new Timestamp(pollCreatedAt.seconds, pollCreatedAt.nanoseconds);
    } else if (!pollCreatedAt) {
      pollCreatedAt = Timestamp.now();
    }

    // Garantir que isCommercial seja boolean explícito (true ou false, nunca undefined)
    // IMPORTANTE: Se data.isCommercial for undefined, null, ou qualquer coisa que não seja exatamente true, será false
    const isCommercial = data.isCommercial === true;
    
    // Remover campos que vamos sobrescrever do spread para evitar conflitos
    // Usar variáveis descartáveis para evitar conflitos de nome
    const { 
      isCommercial: _isCommercialFromData, 
      options: _optionsFromData, 
      creator: _creatorFromData, 
      createdAt: _createdAtFromData, 
      ...restData 
    } = data;
    
    return {
      id: docSnap.id,
      ...restData, // Spread primeiro (não contém isCommercial, options, creator, createdAt)
      options: optionsWithIds, // Sobrescreve qualquer options que possa ter vindo do restData
      creator: {
        id: creatorId,
        name: creatorName,
        avatarUrl: creatorAvatarUrl || "https://www.gravatar.com/avatar/?d=mp", // Garantir fallback se ainda estiver null
        commercialName: creatorCommercialName,
        themeColor: creatorThemeColor,
      }, // Sobrescreve qualquer creator que possa ter vindo do restData
      isCommercial: isCommercial, // Sempre boolean explícito - definido DEPOIS do spread para garantir prioridade
      createdAt: pollCreatedAt, // Sobrescreve qualquer createdAt que possa ter vindo do restData
    } as Poll;
  };

  // Buscar Pódio (Separado) - Apenas enquetes públicas
  useEffect(() => {
    const fetchPodium = async () => {
      try {
        // Filtrar apenas enquetes públicas para o pódio
        const q = query(
          collection(db, "polls"), 
          where("isCommercial", "==", false),
          orderBy("likes", "desc"), 
          limit(3)
        );
        const snapshot = await getDocs(q);
        const polls = await Promise.all(snapshot.docs.map(processPollData));
        
        // Filtrar novamente para garantir que apenas públicas apareçam (isCommercial === false)
        const publicPolls = polls.filter(poll => poll.isCommercial === false);
        
        // Atribuir ranks
        const rankedPolls = publicPolls.map((poll, index) => ({
          ...poll,
          rank: index + 1
        }));
        setPodiumPolls(rankedPolls);
      } catch (error) {
        console.error("Erro ao carregar pódio:", error);
      }
    };
    fetchPodium();
  }, []);

  // Buscar Enquetes Iniciais (Paginadas)
  // Busca enquetes públicas e comerciais separadamente para exibição na página inicial
  const fetchInitialPolls = useCallback(async () => {
    setLoadingPolls(true);
    try {
      // Busca Públicas: enquetes não comerciais ordenadas por data de criação
      const qPublic = query(
        collection(db, "polls"), 
        where("isCommercial", "==", false),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      
      // Busca Comerciais: enquetes comerciais ordenadas por data de criação
      const qCommercial = query(
        collection(db, "polls"),
        where("isCommercial", "==", true),
        orderBy("createdAt", "desc"),
        limit(8)
      );

      // Executar ambas as queries em paralelo
      const [publicSnap, commercialSnap] = await Promise.all([
        getDocs(qPublic), 
        getDocs(qCommercial)
      ]);

      // Processar dados das enquetes (incluindo busca de dados do criador se necessário)
      const processedPublic = await Promise.all(publicSnap.docs.map(processPollData));
      const processedCommercial = await Promise.all(commercialSnap.docs.map(processPollData));

      // Filtrar novamente para garantir que apenas enquetes públicas/comerciais apareçam nas respectivas listas
      // Filtro rigoroso: apenas enquetes com isCommercial === false (não undefined, não null, não true)
      const filteredPublic = processedPublic.filter(poll => poll.isCommercial === false);
      // Filtro rigoroso: apenas enquetes com isCommercial === true (exatamente true)
      const filteredCommercial = processedCommercial.filter(poll => poll.isCommercial === true);

      setPublicPolls(filteredPublic);
      setCommercialPolls(filteredCommercial);

      // Salvar último documento para paginação
      setLastPublicDoc(publicSnap.docs[publicSnap.docs.length - 1] || null);
      setLastCommercialDoc(commercialSnap.docs[commercialSnap.docs.length - 1] || null);

      // Verificar se há mais documentos para carregar
      if (publicSnap.docs.length < 8) setHasMorePublic(false);
      if (commercialSnap.docs.length < 8) setHasMoreCommercial(false);

    } catch (error) {
      console.error("Erro ao carregar enquetes iniciais:", error);
    } finally {
      setLoadingPolls(false);
    }
  }, []);

  // Carregar Mais Públicas
  const loadMorePublic = async () => {
    if (!lastPublicDoc || loadingMorePublic) return;
    setLoadingMorePublic(true);
    try {
      const q = query(
        collection(db, "polls"),
        where("isCommercial", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastPublicDoc),
        limit(8)
      );
      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));
      
      // Filtrar novamente para garantir que apenas enquetes públicas apareçam (isCommercial === false)
      const filteredNewPolls = newPolls.filter(poll => poll.isCommercial === false);
      
      setPublicPolls(prev => [...prev, ...filteredNewPolls]);
      setLastPublicDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 8) setHasMorePublic(false);
    } catch (error) {
      console.error("Erro ao carregar mais públicas:", error);
    } finally {
      setLoadingMorePublic(false);
    }
  };

  // Carregar Mais Comerciais
  const loadMoreCommercial = async () => {
    if (!lastCommercialDoc || loadingMoreCommercial) return;
    setLoadingMoreCommercial(true);
    try {
      const q = query(
        collection(db, "polls"),
        where("isCommercial", "==", true),
        orderBy("createdAt", "desc"),
        startAfter(lastCommercialDoc),
        limit(8)
      );
      const snapshot = await getDocs(q);
      const newPolls = await Promise.all(snapshot.docs.map(processPollData));
      
      // Filtrar novamente para garantir que apenas enquetes comerciais apareçam (isCommercial === true)
      const filteredNewPolls = newPolls.filter(poll => poll.isCommercial === true);
      
      setCommercialPolls(prev => [...prev, ...filteredNewPolls]);
      setLastCommercialDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < 8) setHasMoreCommercial(false);
    } catch (error) {
      console.error("Erro ao carregar mais comerciais:", error);
    } finally {
      setLoadingMoreCommercial(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchInitialPolls();
  }, [fetchInitialPolls]);

  // DOCUMENTAÇÃO: Extrair cidades únicas das enquetes para sugestões
  const availableCities = useMemo(() => {
    const allPolls = [...publicPolls, ...commercialPolls];
    const citySet = new Set<string>(); // Set para armazenar chaves únicas "city-state"
    const cities: { city: string; state: string }[] = [];
    
    allPolls.forEach(poll => {
      if (poll.city && poll.state) {
        const key = `${poll.city.toLowerCase()}-${poll.state}`;
        if (!citySet.has(key)) {
          citySet.add(key);
          cities.push({ city: poll.city, state: poll.state });
        }
      }
    });
    
    // Ordenar alfabeticamente por cidade
    cities.sort((a, b) => a.city.localeCompare(b.city));
    
    return cities;
  }, [publicPolls, commercialPolls]);

  // DOCUMENTAÇÃO: Filtrar sugestões de cidade baseado no texto digitado
  const citySuggestions = useMemo(() => {
    if (!citySearchQuery.trim()) return [];
    
    const queryLower = citySearchQuery.toLowerCase().trim();
    return availableCities
      .filter(({ city }) => city.toLowerCase().includes(queryLower))
      .slice(0, 10); // Limitar a 10 sugestões
  }, [citySearchQuery, availableCities]);

  // DOCUMENTAÇÃO: Filtros (Nota: Paginação implementada apenas para 'recent' por enquanto)
  // Inclui filtro por cidade se selecionada
  const filteredPublicPolls = useMemo(() => {
    let currentList = [...publicPolls];
    
    // DOCUMENTAÇÃO: Filtrar por cidade se selecionada
    if (selectedCity) {
      currentList = currentList.filter(p => 
        p.city?.toLowerCase() === selectedCity.city.toLowerCase() && 
        p.state === selectedCity.state
      );
    }
    
    if (activeFilter === 'mine') {
      currentList = currentList.filter(p => user && p.creator.id === user.uid);
    }
    // Para 'trending', idealmente precisaria de nova busca no servidor. Mantendo client-side sorting do que já foi carregado por enquanto.
    if (activeFilter === 'trending') {
       currentList.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    }
    return currentList;
  }, [publicPolls, activeFilter, user, selectedCity]);

  const filteredCommercialPolls = useMemo(() => {
    let currentList = [...commercialPolls];
    
    // DOCUMENTAÇÃO: Filtrar por cidade se selecionada
    if (selectedCity) {
      currentList = currentList.filter(p => 
        p.city?.toLowerCase() === selectedCity.city.toLowerCase() && 
        p.state === selectedCity.state
      );
    }
    
    if (activeFilter === 'mine') {
      currentList = currentList.filter(p => user && p.creator.id === user.uid);
    }
    if (activeFilter === 'trending') {
       currentList.sort((a, b) => {
        const votesA = a.options.reduce((sum, option) => sum + option.votes, 0);
        const votesB = b.options.reduce((sum, option) => sum + option.votes, 0);
        return votesB - votesA;
      });
    }
    return currentList;
  }, [commercialPolls, activeFilter, user, selectedCity]);


  // Efeito para detectar cliques fora do formulário de enquete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pollFormRef.current && !pollFormRef.current.contains(event.target as Node)) {
        setShowPollForm(false); // Oculta o formulário se o clique foi fora
      }
    }

    if (showPollForm) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPollForm]);

  // DOCUMENTAÇÃO: Detectar cliques fora do campo de busca de cidade para fechar sugestões
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (citySearchRef.current && !citySearchRef.current.contains(event.target as Node)) {
        setShowCitySuggestions(false);
      }
    }

    if (showCitySuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCitySuggestions]);

  // Recarrega as enquetes após criar uma nova enquete
  // Atualiza a lista de enquetes e o pódio para refletir a nova enquete criada
  const handlePollCreated = async () => {
    // Pequeno delay para garantir que o Firestore processou a criação antes de recarregar
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Recarregar as enquetes após criar uma nova
    try {
      await fetchInitialPolls();
    } catch (error) {
      console.error("Erro ao recarregar enquetes após criação:", error);
    }
    
    // Recarregar o pódio caso a nova enquete seja pública
    // O pódio mostra as 3 enquetes públicas com mais likes
    try {
      const q = query(
        collection(db, "polls"), 
        where("isCommercial", "==", false),
        orderBy("likes", "desc"), 
        limit(3)
      );
      const snapshot = await getDocs(q);
      const polls = await Promise.all(snapshot.docs.map(processPollData));
      const publicPolls = polls.filter(poll => poll.isCommercial === false);
      const rankedPolls = publicPolls.map((poll, index) => ({
        ...poll,
        rank: index + 1
      }));
      setPodiumPolls(rankedPolls);
    } catch (error) {
      console.error("Erro ao recarregar pódio:", error);
    }
    
    // Mudar filtro para "mine" para mostrar as enquetes do usuário
    setActiveFilter("mine");
  };

  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    if (!user) {
      alert("Você precisa estar logado para votar.");
      return;
    }

    const pollToUpdate = publicPolls.find(p => p.id === pollId) || commercialPolls.find(p => p.id === pollId) || podiumPolls.find(p => p.id === pollId);
    if (!pollToUpdate) {
      console.error("handleVote (na página) - Enquete não encontrada:", pollId);
      return;
    }

    // Preparar as opções atualizadas para a UI otimista e para o Firestore
    const updatedOptionsForOptimisticUI = pollToUpdate.options.map((option) => {
      const isThisOptionVoted = option.id === optionId;
      const newOption = isThisOptionVoted ? { ...option, votes: option.votes + 1 } : option;
      return newOption;
    });

    // Preparar o array votedBy atualizado para a UI otimista e para o Firestore
    const updatedVotedByForOptimisticUI = user
      ? [...(pollToUpdate.votedBy || []), user.uid]
      : pollToUpdate.votedBy;

    // Helper function to update poll in a list
    const updatePollInList = (list: Poll[]) => list.map(poll => 
      poll.id === pollId 
        ? { ...poll, options: updatedOptionsForOptimisticUI, votedBy: updatedVotedByForOptimisticUI } 
        : poll
    );

    // Otimista: Atualiza a UI imediatamente nas listas onde a enquete existe
    if (publicPolls.some(p => p.id === pollId)) setPublicPolls(prev => updatePollInList(prev));
    if (commercialPolls.some(p => p.id === pollId)) setCommercialPolls(prev => updatePollInList(prev));
    if (podiumPolls.some(p => p.id === pollId)) setPodiumPolls(prev => updatePollInList(prev));

    try {
      const pollRef = doc(db, "polls", pollId);
      const isOwner = pollToUpdate.creator.id === user?.uid;
      
      // Preparar as opções atualizadas
      const updatedOptionsForFirestore = pollToUpdate.options.map(option => {
        const isThisOptionVoted = option.id === optionId;
        const newOption = isThisOptionVoted ? { ...option, votes: option.votes + 1 } : option;
        return newOption;
      });

      // Se for o dono da enquete, pode atualizar options e votedBy juntos
      if (isOwner) {
        const updatedVotedByForFirestore = user
          ? [...(pollToUpdate.votedBy || []), user.uid]
          : pollToUpdate.votedBy;
        
        await updateDoc(pollRef, {
          options: updatedOptionsForFirestore,
          votedBy: updatedVotedByForFirestore,
        });
      } else {
        // Se não for o dono, atualizar options e votedBy juntos
        // As regras do Firestore validam que apenas uma opção teve seu voto incrementado
        const updatedVotedByForFirestore = user
          ? [...(pollToUpdate.votedBy || []), user.uid]
          : pollToUpdate.votedBy;
        
        await updateDoc(pollRef, {
          options: updatedOptionsForFirestore,
          votedBy: updatedVotedByForFirestore,
        });
      }

    } catch (error: any) {
      console.error("Erro ao votar:", error);
      
      // Se o erro for de permissão, não mostrar erro ao usuário
      // O onSnapshot vai atualizar se funcionou
      if (error?.code === 'permission-denied') {
        return;
      }
      
      alert("Erro ao registrar voto. Tente novamente.");
      // Reverter a UI se o voto falhar
      const updateState = (prevPolls: Poll[]) =>
        prevPolls.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                options: poll.options.map((option) =>
                  option.id === optionId
                    ? { ...option, votes: option.votes - 1 }
                    : option
                ),
                votedBy: user ? (poll.votedBy || []).filter(uid => uid !== user.uid) : poll.votedBy,
              }
            : poll
        );
      
      setPublicPolls(updateState);
      setCommercialPolls(updateState);
    }
  }, [user, publicPolls, commercialPolls, podiumPolls]); // Atualizado dependências: Adicionado podiumPolls

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      alert("Você precisa estar logado para excluir enquetes.");
      return;
    }

    // Procura nas duas listas
    const pollToDelete = publicPolls.find(p => p.id === pollId) || commercialPolls.find(p => p.id === pollId);
    
    // Permitir exclusão se for o criador OU um usuário mestre
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      alert("Você não tem permissão para excluir esta enquete.");
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      
      // Remove da lista local
      setPublicPolls(prev => prev.filter(p => p.id !== pollId));
      setCommercialPolls(prev => prev.filter(p => p.id !== pollId));

      setDeleteFeedbackMessage("Enquete excluída com sucesso!");
      setDeleteFeedbackType("success");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
      setDeleteFeedbackMessage("Erro ao excluir enquete.");
      setDeleteFeedbackType("error");
      setTimeout(() => setDeleteFeedbackMessage(null), 3000);
    }
  };


  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-24 pt-20">
      {/* ============================================
          SEÇÃO DE BOAS-VINDAS
          ============================================
          IMPORTANTE: Textos usam classes customizadas (.welcome-text e .welcome-subtext)
          definidas no globals.css para garantir cores corretas em ambos os modos:
          
          Light mode:
            - Título: preto (#000000)
            - Subtítulos: preto (#000000)
          
          Dark mode:
            - Título: branco (#ffffff)
            - Subtítulos: cinza claro (#9ca3af - zinc-400)
          
          NOTA: NÃO usar style inline ou classes Tailwind diretas aqui.
          As classes customizadas garantem prioridade via !important.
          ============================================ */}
      <div className="max-w-3xl w-full text-center mb-6 mt-4"> {/* Ajustado mb-12 para mb-6 e mt-10 para mt-4 */}
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight animate-fade-in welcome-text">
          Bem-vindo ao Eng<span className="text-yellow-400">aja!</span>
        </h1>

        {deleteFeedbackMessage && (
        
        <div className={`p-3 rounded-md text-white mt-4 ${
            deleteFeedbackType === "success" ? "bg-green-500" : "bg-red-500"
          }`}>
            {deleteFeedbackMessage}
          </div>
        )}

        <p className="text-sm mt-2 welcome-subtext">
        Transforme a voz do cliente em decisões baseadas em dados.
        </p>
        <p className="text-sm mt-2 welcome-subtext">
          Um sistema profissional para sua empresa ouvir clientes e obter insights valiosos
        </p>
      </div>

      {/* Novo Pódio de Enquetes no Topo */}
      {podiumPolls.length > 0 && (
        <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl flex flex-col items-center gap-8 px-4">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-6 mb-16">Mais Votadas</h2> {/* Ajustado mb-6 para mb-16 */}
          <PollPodium 
            polls={podiumPolls}
            onVote={handleVote}
            onDelete={handleDeletePoll}
          />
        </div>
      )}

      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-7xl px-4 mt-4"> {/* Restaurado lg:max-w-7xl para desapertar os cards */}
        {!isClient ? (
          <p className="text-zinc-600 dark:text-zinc-400">Carregando conteúdo...</p>
        ) : (
          <>
            {/* Botão para criar enquete */}
            {!showPollForm && (
              <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-8 px-4 mx-auto"> {/* Adicionado mx-auto aqui */}
                <motion.button
                  onClick={() => setShowPollForm(true)}
                  className="w-full px-8 py-4 rounded-full bg-indigo-600 text-white text-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors duration-300 transform hover:scale-105 mb-8" // Botão preenche o novo pai, sem max-w e mx-auto
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Crie sua enquete!
                </motion.button>
              </div>
            )}

            {/* Renderizar PollForm condicionalmente */}
            {showPollForm && (
              <AnimatePresence>
                <motion.div
                  key="poll-form"
                  ref={pollFormRef} // Atribuir o ref ao contêiner do formulário
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full mb-8"
                >
                  <PollForm 
                    onPollCreated={() => { handlePollCreated(); setShowPollForm(false); }} 
                    isCommercial={user?.accountType === 'commercial'} 
                  />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="flex flex-wrap space-x-2 sm:space-x-4 gap-y-4 mb-8 justify-center"> {/* Centralizar botões de filtro e permitir quebra de linha */}
              {/* DOCUMENTAÇÃO: Campo de busca de cidade com sugestões */}
              <div className="relative" ref={citySearchRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Busque por cidade..."
                    value={citySearchQuery}
                    onChange={(e) => {
                      setCitySearchQuery(e.target.value);
                      setShowCitySuggestions(true);
                      if (e.target.value.trim() === "") {
                        setSelectedCity(null);
                      }
                    }}
                    onFocus={() => {
                      if (citySearchQuery.trim() && citySuggestions.length > 0) {
                        setShowCitySuggestions(true);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                      selectedCity 
                        ? "bg-green-600 text-white placeholder-white/70" 
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder-zinc-500 dark:placeholder-zinc-400"
                    } min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  {selectedCity && (
                    <button
                      onClick={() => {
                        setSelectedCity(null);
                        setCitySearchQuery("");
                        setShowCitySuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-zinc-200"
                      title="Limpar filtro"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* DOCUMENTAÇÃO: Dropdown com sugestões de cidade */}
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg z-50 border border-zinc-300 dark:border-zinc-700 min-w-[250px] max-h-[300px] overflow-y-auto">
                    <div className="p-2">
                      {citySuggestions.map((suggestion, index) => {
                        const stateName = BRAZIL_STATES.find(s => s.sigla === suggestion.state)?.nome || suggestion.state;
                        return (
                          <button
                            key={`${suggestion.city}-${suggestion.state}-${index}`}
                            onClick={() => {
                              setSelectedCity(suggestion);
                              setCitySearchQuery(`${suggestion.city} - ${stateName}`);
                              setShowCitySuggestions(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded text-sm text-zinc-700 dark:text-zinc-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            {suggestion.city} - {stateName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* DOCUMENTAÇÃO: Mensagem quando não há sugestões */}
                {showCitySuggestions && citySearchQuery.trim() && citySuggestions.length === 0 && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg z-50 border border-zinc-300 dark:border-zinc-700 min-w-[250px] p-4">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Nenhuma cidade encontrada com "{citySearchQuery}"
                    </p>
                  </div>
                )}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "recent" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("recent")}
              >
                Recentes
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "trending" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("trending")}
              >
                Em alta
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${activeFilter === "mine" ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"}`}
                onClick={() => setActiveFilter("mine")}
              >
                Minhas
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 bg-indigo-600 text-white hover:bg-indigo-700`}
                onClick={() => router.push('/enquetes')}
              >
                Ver Todas as Enquetes
              </motion.button>
            </div>

            {/* Novo layout de duas colunas para enquetes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-8">
              {/* Coluna de Enquetes Públicas */}
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 text-center">Enquetes Públicas</h2>
                {loadingPolls ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Carregando enquetes públicas...</p>
                ) : filteredPublicPolls.length === 0 ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Nenhuma outra enquete pública encontrada.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredPublicPolls.map((poll) => ( // Removido slice e otherPublicPolls
                        <PollCard
                          key={poll.id}
                          poll={poll}
                          onVote={handleVote}
                          onDelete={handleDeletePoll}
                          companySlug={poll.isCommercial && poll.creator.commercialName ? slugify(poll.creator.commercialName) : slugify(poll.creator.name)} // Usar commercialName para enquetes comerciais
                          enableCompanyLink={poll.isCommercial} // Habilitar link apenas para enquetes comerciais
                        />
                      ))}
                    </div>
                    {activeFilter === 'recent' && hasMorePublic && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMorePublic}
                          disabled={loadingMorePublic}
                          className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                          {loadingMorePublic ? "Carregando..." : "Carregar Mais"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Coluna de Enquetes Comerciais */}
              <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 text-center">Enquetes Comerciais</h2>
                {loadingPolls ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Carregando enquetes comerciais...</p>
                ) : filteredCommercialPolls.length === 0 ? (
                  <p className="text-zinc-600 dark:text-zinc-400 text-center">Nenhuma enquete comercial encontrada.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCommercialPolls.map((poll) => ( // Removido slice
                        <PollCard
                          key={poll.id}
                          poll={poll}
                          onVote={handleVote}
                          onDelete={handleDeletePoll}
                          companySlug={poll.isCommercial && poll.creator.commercialName ? slugify(poll.creator.commercialName) : slugify(poll.creator.name)} // Usar commercialName para enquetes comerciais
                          enableCompanyLink={poll.isCommercial} // Habilitar link apenas para enquetes comerciais
                          companyThemeColor={poll.isCommercial ? poll.creator.themeColor : undefined} // Passar themeColor apenas para enquetes comerciais
                        />
                      ))}
                    </div>
                    {activeFilter === 'recent' && hasMoreCommercial && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={loadMoreCommercial}
                          disabled={loadingMoreCommercial}
                          className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
                        >
                          {loadingMoreCommercial ? "Carregando..." : "Carregar Mais"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
