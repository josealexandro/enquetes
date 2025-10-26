"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"; // Importar doc, updateDoc e deleteDoc
import { updateProfile } from "firebase/auth"; // Importar updateProfile do Firebase Auth
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar Firebase Storage
import PollForm from "./PollForm"; // Importar o PollForm
import PollCard from "./PollCard"; // Importar o PollCard
import { Poll } from "../types/poll"; // Importar a interface Poll
import { v4 as uuidv4 } from "uuid"; // Para gerar IDs únicos para as opções
import Image from "next/image"; // Importar o componente Image do Next.js

// Removido: Interfaces PollOption e PollToSave, e a função handleCreateCommercialPoll

const Dashboard = () => {
  const { user, loading, isMasterUser, firebaseAuthUser } = useAuth(); // Obter firebaseAuthUser
  const [activePollsCount, setActivePollsCount] = useState(0);
  const [userPolls, setUserPolls] = useState<Poll[]>([]); // Novo estado para as enquetes do usuário
  const [totalResponsesThisMonth, setTotalResponsesThisMonth] = useState(0); // Novo estado
  const [averageVotesPerPoll, setAverageVotesPerPoll] = useState(0); // Novo estado
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [editedCompanyName, setEditedCompanyName] = useState(user?.displayName || ""); // Novo estado para o nome da empresa editável
  const [imageFile, setImageFile] = useState<File | null>(null); // Estado para o arquivo de imagem selecionado
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // Estado para a URL de pré-visualização da imagem
  const [uploadingImage, setUploadingImage] = useState(false); // Estado para o status do upload da imagem
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // Inicializa editedCompanyName com o displayName do usuário quando o componente é montado ou o usuário muda
  useEffect(() => {
    if (user?.photoURL) {
      setImagePreviewUrl(user.photoURL);
    }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setFeedbackMessage("Tipo de arquivo inválido. Apenas JPG, PNG, GIF e WebP são permitidos.");
        setFeedbackType("error");
        setImageFile(null);
        setImagePreviewUrl(user?.photoURL || null); // Reverte para a imagem atual do usuário
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFeedbackMessage("A imagem é muito grande. O tamanho máximo permitido é 2MB.");
        setFeedbackType("error");
        setImageFile(null);
        setImagePreviewUrl(user?.photoURL || null); // Reverte para a imagem atual do usuário
        return;
      }
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file)); // Pré-visualização instantânea
      setFeedbackMessage(null); // Limpa feedback anterior
    } else {
      setImageFile(null);
      setImagePreviewUrl(user?.photoURL || null); // Reverte para a imagem atual do usuário
    }
  };

  const handleSaveProfile = async () => {
    if (!user || (!editedCompanyName.trim() && !imageFile)) {
      setFeedbackMessage("Nome da empresa ou imagem não pode estar vazio.");
      setFeedbackType("error");
      return;
    }

    if (uploadingImage) return; // Previne múltiplos envios

    let newPhotoURL: string | undefined = user?.photoURL || undefined;
    let updateRequired = false;

    if (editedCompanyName.trim() !== (user?.displayName || "")) {
      updateRequired = true;
    }

    if (imageFile) {
      setUploadingImage(true);
      try {
        const storage = getStorage();
        const imageRef = ref(storage, `profile_images/${user.uid}-${uuidv4()}-${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        newPhotoURL = await getDownloadURL(imageRef);
        setFeedbackMessage("Imagem enviada com sucesso!");
        setFeedbackType("success");
        updateRequired = true;
      } catch (error) {
        console.error("Erro ao fazer upload da imagem:", error);
        setFeedbackMessage("Erro ao fazer upload da imagem.");
        setFeedbackType("error");
        setImageFile(null); // Limpa o arquivo selecionado em caso de erro
        setImagePreviewUrl(user?.photoURL || null); // Reverte a pré-visualização
        return; // Interrompe o processo se o upload da imagem falhar
      } finally {
        setUploadingImage(false);
      }
    }

    if (!updateRequired) {
      setFeedbackMessage("Nenhuma alteração detectada para salvar.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    try {
      // 1. Atualizar no Firebase Auth
      if (firebaseAuthUser) {
        await updateProfile(firebaseAuthUser, { 
          displayName: editedCompanyName.trim(),
          photoURL: newPhotoURL,
        });
        await firebaseAuthUser.reload(); // Forçar a recarga do objeto User
      } else {
        console.error("Erro: firebaseAuthUser não está disponível para updateProfile.");
        setFeedbackMessage("Erro: Usuário não autenticado para atualizar o perfil.");
        setFeedbackType("error");
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }

      // 2. Opcional: Atualizar no Firestore se for um usuário comercial
      if (user?.uid) {
        const userDocRef = doc(db, "users", user.uid);
        const updateData: { displayName: string; photoURL?: string } = {
          displayName: editedCompanyName.trim(),
        };
        if (newPhotoURL) {
          updateData.photoURL = newPhotoURL;
        }
        await updateDoc(userDocRef, updateData);
      }
      setFeedbackMessage("Perfil atualizado com sucesso!");
      setFeedbackType("success");
      setImageFile(null); // Limpa o arquivo após o upload e salvamento

    } catch (error: unknown) { 
      if (error instanceof Error) {
        console.error("Erro ao atualizar perfil:", error.message); 
        setFeedbackMessage(error.message);
      } else {
        console.error("Erro desconhecido ao atualizar perfil:", error);
        setFeedbackMessage("Erro ao atualizar perfil.");
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
      <h2 className="text-3xl font-bold mb-6">Olá, {user?.displayName || "Empresa"}!</h2>

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
        <div className="space-y-4">
          {/* Seção de upload de imagem */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src={imagePreviewUrl || user?.photoURL || "/logoPrincipal.png"}
              alt="Pré-visualização do Avatar"
              width={128}
              height={128}
              className="rounded-full object-cover border-4 border-indigo-500 mb-4"
            />
            <label htmlFor="profile-image-upload" className="block text-gray-400 mb-2">Alterar Imagem de Perfil</label>
            <input
              id="profile-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(", ")}
              onChange={handleImageChange}
              className="w-full max-w-sm px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
            {uploadingImage && (
              <div className="flex items-center justify-center p-2 mt-2">
                <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-cyan-500">Enviando imagem...</span>
              </div>
            )}
            {feedbackMessage && feedbackType === "error" && (
              <div className="mt-2 p-3 rounded-md text-white bg-red-500">
                {feedbackMessage}
              </div>
            )}
          </div>

          {/* Seção de nome da empresa */}
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
                onClick={handleSaveProfile}
                disabled={uploadingImage} // Desabilita o botão enquanto a imagem está sendo carregada
                className={`px-4 py-2 bg-green-600 text-white font-bold rounded-lg transition duration-300 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                Salvar Alterações
              </button>
            </div>
            {feedbackMessage && feedbackType === "success" && (
              <div className="mt-2 p-3 rounded-md text-white bg-green-500">
                {feedbackMessage}
              </div>
            )}
          </div>
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
