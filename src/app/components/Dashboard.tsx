"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"; // Importar doc, updateDoc e deleteDoc
import { updateProfile } from "firebase/auth"; // Importar updateProfile do Firebase Auth
import PollForm from "./PollForm"; // Importar o PollForm
import PollCard from "./PollCard"; // Importar o PollCard
import { Poll } from "../types/poll"; // Importar a interface Poll
// import { v4 as uuidv4 } from "uuid"; // Para gerar IDs únicos para as opções

// Removido: Interfaces PollOption e PollToSave, e a função handleCreateCommercialPoll

const Dashboard = () => {
  const { user, loading, isMasterUser, firebaseAuthUser } = useAuth(); // Obter firebaseAuthUser
  const [activePollsCount, setActivePollsCount] = useState(0);
  const [userPolls, setUserPolls] = useState<Poll[]>([]); // Novo estado para as enquetes do usuário
  const [totalResponsesThisMonth, setTotalResponsesThisMonth] = useState(0); // Novo estado
  const [averageVotesPerPoll, setAverageVotesPerPoll] = useState(0); // Novo estado
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [editedCompanyName, setEditedCompanyName] = useState(user?.displayName || ""); // Novo estado para o nome da empresa editável
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  const companyNameDisplay = user?.displayName || "Empresa"; // Usado apenas para exibição inicial

  // Inicializa editedCompanyName com o displayName do usuário quando o componente é montado ou o usuário muda
  useEffect(() => {
    if (user?.displayName) {
      setEditedCompanyName(user.displayName);
    } else if (!user && !loading) {
      setEditedCompanyName(""); // Limpar se não houver usuário logado
    }
  }, [user, loading]);

  // Efeito para contar enquetes ativas e buscar as enquetes do usuário
  useEffect(() => {
    if (user && !loading) {
      const pollsCollection = collection(db, "polls");
      const q = query(pollsCollection, where("creator.id", "==", user.uid), orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setActivePollsCount(snapshot.size);
        const fetchedPolls = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            options: data.options,
            creator: data.creator,
            createdAt: data.createdAt,
            category: data.category,
            likes: data.likes || 0,
            likedBy: data.likedBy || [],
            dislikes: data.dislikes || 0,
            dislikedBy: data.dislikedBy || [],
            isCommercial: data.isCommercial || false,
          } as Poll;
        });
        setUserPolls(fetchedPolls);
      }, (error) => {
        console.error("Erro ao buscar enquetes:", error);
      });

      return () => unsubscribe();
    }
  }, [user, loading]);

  // Efeito para calcular estatísticas quando as enquetes do usuário são atualizadas
  useEffect(() => {
    if (userPolls.length > 0) {
      let totalVotes = 0;
      let pollsThisMonth = 0;
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      userPolls.forEach(poll => {
        const pollTotalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
        totalVotes += pollTotalVotes;

        // Para "Respostas neste mês", vamos considerar as enquetes criadas neste mês por simplicidade
        // Uma implementação mais precisa exigiria armazenar o timestamp de cada voto.
        if (poll.createdAt && (poll.createdAt as unknown as number) >= oneMonthAgo.getTime()) {
          pollsThisMonth += pollTotalVotes;
        }
      });

      setTotalResponsesThisMonth(pollsThisMonth);
      setAverageVotesPerPoll(totalVotes / userPolls.length);
    } else {
      setTotalResponsesThisMonth(0);
      setAverageVotesPerPoll(0);
    }
  }, [userPolls]);

  const handleSaveCompanyName = async () => {
    if (!user || !editedCompanyName.trim()) {
      setFeedbackMessage("Nome da empresa não pode estar vazio.");
      setFeedbackType("error");
      return;
    }

    try {
      // 1. Atualizar no Firebase Auth
      if (firebaseAuthUser) {
        await updateProfile(firebaseAuthUser, { displayName: editedCompanyName.trim() });
        await firebaseAuthUser.reload(); // Forçar a recarga do objeto User para obter o displayName atualizado
      } else {
        console.error("Erro: firebaseAuthUser não está disponível para updateProfile.");
        setFeedbackMessage("Erro: Usuário não autenticado para atualizar o perfil.");
        setFeedbackType("error");
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }

      // 2. Opcional: Atualizar no Firestore se for um usuário comercial
      // Isso é útil se o displayName for usado em outras partes da UI ou lógica baseada em Firestore
      if (user?.uid) {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { displayName: editedCompanyName.trim() });
      }
      setFeedbackMessage("Nome da empresa atualizado com sucesso!");
      setFeedbackType("success");
      // Forçar re-renderização do PollForm se o modal estiver aberto
      if (showCreatePollModal) {
        setShowCreatePollModal(false);
        setTimeout(() => setShowCreatePollModal(true), 10);
      }
      // O AuthContext deve reagir a `onAuthStateChanged` e atualizar o `user` automaticamente
    } catch (error: unknown) { // Use unknown e faça verificação de tipo
      if (error instanceof Error) {
        console.error("Erro ao atualizar nome da empresa:", error.message); // Logar apenas a mensagem
        setFeedbackMessage(error.message); // Usar a mensagem de erro diretamente
      } else {
        console.error("Erro desconhecido ao atualizar nome da empresa:", error);
        setFeedbackMessage("Erro ao atualizar nome da empresa.");
      }
      setFeedbackType("error");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      setFeedbackMessage("Você precisa estar logado para votar.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    const pollToUpdate = userPolls.find(p => p.id === pollId);
    if (!pollToUpdate) {
      console.error("Enquete não encontrada para o ID:", pollId);
      return;
    }

    // Atualização otimista da UI
    const updatedOptionsForOptimisticUI = pollToUpdate.options.map((option) =>
      option.id === optionId
        ? { ...option, votes: option.votes + 1 }
        : option
    );

    const updatedVotedByForOptimisticUI = pollToUpdate.isCommercial && user
      ? [...(pollToUpdate.votedBy || []), user.uid]
      : pollToUpdate.votedBy;

    setUserPolls((prevPolls) =>
      prevPolls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: updatedOptionsForOptimisticUI,
              votedBy: updatedVotedByForOptimisticUI,
            }
          : poll
      )
    );

    try {
      const pollRef = doc(db, "polls", pollId);
      const updatedOptionsForFirestore = pollToUpdate.options.map(option =>
        option.id === optionId ? { ...option, votes: option.votes + 1 } : option
      );
      const updatedVotedByForFirestore = pollToUpdate.isCommercial && user
        ? [...(pollToUpdate.votedBy || []), user.uid]
        : pollToUpdate.votedBy;

      await updateDoc(pollRef, {
        options: updatedOptionsForFirestore,
        ...(pollToUpdate.isCommercial && { votedBy: updatedVotedByForFirestore }),
      });

    } catch (error) {
      console.error("Erro ao votar:", error);
      setFeedbackMessage("Erro ao registrar voto. Tente novamente.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      // Reverter a UI se o voto falhar
      setUserPolls((prevPolls) =>
        prevPolls.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                options: poll.options.map((option) =>
                  option.id === optionId
                    ? { ...option, votes: option.votes - 1 }
                    : option
                ),
                votedBy: poll.isCommercial && user ? (poll.votedBy || []).filter(uid => uid !== user.uid) : poll.votedBy,
              }
            : poll
        )
      );
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!user) {
      setFeedbackMessage("Você precisa estar logado para excluir enquetes.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    const pollToDelete = userPolls.find(p => p.id === pollId);
    if (!pollToDelete || (pollToDelete.creator.id !== user.uid && !isMasterUser)) {
      setFeedbackMessage("Você não tem permissão para excluir esta enquete.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, "polls", pollId));
      setFeedbackMessage("Enquete excluída com sucesso!");
      setFeedbackType("success");
      // setUserPolls será atualizado automaticamente via onSnapshot
    } catch (error) {
      console.error("Erro ao excluir enquete:", error);
      setFeedbackMessage("Erro ao excluir enquete.");
      setFeedbackType("error");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <div className="dashboard-container">
      <h2 className="text-3xl font-bold mb-6">Olá, {companyNameDisplay}!</h2>

      {/* Plano Comercial */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Plano Comercial</h3>
          <p className="text-gray-400">{activePollsCount} enquetes ativas</p>
        </div>
        <button
          onClick={() => setShowCreatePollModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Criar nova enquete comercial
        </button>
      </div>

      {/* Minhas Enquetes */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Minhas enquetes</h3>
        <div className="space-y-4">
          {userPolls.length === 0 ? (
            <p className="text-gray-400">Você ainda não criou nenhuma enquete.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPolls.map((poll) => (
                <PollCard 
                  key={poll.id} 
                  poll={poll} 
                  onVote={handleVote} 
                  onDelete={handleDeletePoll} 
                  
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Estatísticas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold">{totalResponsesThisMonth}</p>
            <p className="text-gray-400">Respostas neste mês</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold">{averageVotesPerPoll.toFixed(1)}</p>
            <p className="text-gray-400">Média de votos por enquete</p>
          </div>
        </div>
      </div>

      {/* Personalização */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Personalização</h3>
        <div>
          <label htmlFor="companyName" className="block text-gray-400 mb-2">Nome da empresa</label>
          <div className="flex gap-2">
            <input
              type="text"
              id="companyName"
              value={editedCompanyName}
              onChange={(e) => setEditedCompanyName(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSaveCompanyName}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-300"
            >
              Salvar
            </button>
          </div>
          {feedbackMessage && (
            <div className={`mt-2 p-3 rounded-md text-white ${feedbackType === "success" ? "bg-green-500" : "bg-red-500"}`}>
              {feedbackMessage}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação de Enquete */}
      {showCreatePollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md relative">
            <button
              onClick={() => setShowCreatePollModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              &times;
            </button>
            <PollForm isCommercial={user?.accountType === 'commercial'} onPollCreated={() => setShowCreatePollModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
