"use client";

import React, { useState, useEffect } from "react";
import { useAuth, AuthContextType } from "../context/AuthContext";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore (ainda necessária para update/delete)
import { doc, updateDoc, deleteDoc } from "firebase/firestore"; // Importar doc, updateDoc e deleteDoc
import { updateProfile } from "firebase/auth"; // Importar updateProfile do Firebase Auth
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar Firebase Storage
import PollForm from "./PollForm"; // Importar o PollForm
import PollCard from "./PollCard"; // Importar o PollCard
import { Poll } from "../types/poll"; // Importar a interface Poll
import { v4 as uuidv4 } from "uuid"; // Para gerar IDs únicos para as opções
import Image from "next/image"; // Importar o componente Image do Next.js
import slugify from "@/utils/slugify"; // Importar a função slugify
import QRCode from "react-qr-code"; // Importar QRCode
// Removido: import { UserInfo, User } from "firebase/auth"; // Removido: UserInfo e User não são necessários aqui
// Removido: import { AuthContextType } from "../context/AuthContext"; // Removido: AuthContextType não é necessário ser importado diretamente para o tipo CustomUser

// O tipo de `user` vindo do `useAuth` já é o tipo correto, não precisamos redefini-lo aqui
type CustomUser = AuthContextType["user"];

interface DashboardProps {
  polls: Poll[];
  user: Exclude<CustomUser, null>; // Usar o tipo CustomUser e garantir que não é nulo
}

const Dashboard = ({ polls, user }: DashboardProps) => {
  const { isMasterUser, firebaseAuthUser } = useAuth(); // Obter isMasterUser e firebaseAuthUser do contexto
  const [activePollsCount, setActivePollsCount] = useState(0);
  // Removido: const [totalResponsesThisMonth, setTotalResponsesThisMonth] = useState(0); // Novo estado
  const [averageVotesPerPoll, setAverageVotesPerPoll] = useState(0); // Novo estado
  // Removido: const [totalCommercialCommentsThisMonth, setTotalCommercialCommentsThisMonth] = useState(0); // NOVO ESTADO
  const [totalMonthlyEngagement, setTotalMonthlyEngagement] = useState(0); // NOVO ESTADO: Engajamento total do mês
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [editedCompanyName, setEditedCompanyName] = useState(user.displayName || ""); // Novo estado para o nome da empresa editável
  const [imageFile, setImageFile] = useState<File | null>(null); // Estado para o arquivo de imagem selecionado
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // Estado para a URL de pré-visualização da imagem
  const [uploadingImage, setUploadingImage] = useState(false); // Estado para o status do upload da imagem
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null); // Novo estado para o arquivo de banner selecionado
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null); // Novo estado para a URL de pré-visualização do banner
  const [showQrCodeModal, setShowQrCodeModal] = useState(false); // Estado para controlar a visibilidade do modal QR Code
  const [companyPublicPageUrl, setCompanyPublicPageUrl] = useState(""); // Estado para armazenar o URL da página pública da empresa
  // Novos estados para as informações do rodapé
  const [editedAboutUs, setEditedAboutUs] = useState(user.aboutUs || "");
  const [editedContactEmail, setEditedContactEmail] = useState(user.contactEmail || "");
  const [editedAddress, setEditedAddress] = useState(user.address || "");
  const [editedFacebookUrl, setEditedFacebookUrl] = useState(user.facebookUrl || "");
  const [editedInstagramUrl, setEditedInstagramUrl] = useState(user.instagramUrl || ""); // Antigo editedTwitterUrl
  const [editedTwitterUrl, setEditedTwitterUrl] = useState(user.twitterUrl || ""); // Antigo editedLinkedinUrl
  const [editedThemeColor, setEditedThemeColor] = useState(user.themeColor || "#6366f1"); // Novo estado para o tema de cor

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // Gerar o slug da empresa aqui para passar para o PollCard
  const companySlug = user?.commercialName ? slugify(user.commercialName) : undefined;

  // Inicializa editedCompanyName com o displayName do usuário quando o componente é montado ou o usuário muda
  useEffect(() => {
    if (user?.photoURL) {
      setImagePreviewUrl(user.photoURL);
    }
    if (user?.bannerURL) { // Inicializa a pré-visualização do banner
      setBannerPreviewUrl(user.bannerURL);
    }
    if (user?.displayName) {
      setEditedCompanyName(user.displayName);
    } else {
      setEditedCompanyName(""); // Limpar se não houver usuário logado
    }
    // Inicializar os novos estados de informação do rodapé
    setEditedAboutUs(user?.aboutUs || "");
    setEditedContactEmail(user?.contactEmail || "");
    setEditedAddress(user?.address || "");
    setEditedFacebookUrl(user?.facebookUrl || "");
    setEditedInstagramUrl(user?.instagramUrl || "");
    setEditedTwitterUrl(user?.twitterUrl || "");
    if (user?.themeColor) { // Certifica-se de que user e themeColor existem antes de tentar slugify
      setEditedThemeColor(user.themeColor);
    }
    if (user?.commercialName) {
      const publicPageSlug = slugify(user.commercialName);
      setCompanyPublicPageUrl(`${window.location.origin}/empresa/${publicPageSlug}`);
    } else {
      setCompanyPublicPageUrl(""); // Limpa o URL se não houver nome comercial
    }
  }, [user]);

  // Efeito para contar enquetes ativas e calcular estatísticas quando as enquetes do usuário são atualizadas
  useEffect(() => {
    // user é garantido como não nulo aqui
    setActivePollsCount(polls.length);

    let totalVotes = 0;
    let monthlyResponses = 0; // Votos em enquetes criadas neste mês
    let monthlyCommercialComments = 0; // Comentários em enquetes comerciais criadas neste mês

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoMillis = oneMonthAgo.getTime(); // Obter os milissegundos da data de um mês atrás

    polls.forEach(poll => {
      const pollTotalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
      totalVotes += pollTotalVotes;

      // Comparar usando toMillis() para objetos Timestamp
      if (poll.createdAt && poll.createdAt.toMillis() >= oneMonthAgoMillis) {
        monthlyResponses += pollTotalVotes;
      }

      if (poll.isCommercial && poll.commentCount && poll.createdAt && poll.createdAt.toMillis() >= oneMonthAgoMillis) {
        monthlyCommercialComments += poll.commentCount;
      }
    });

    setAverageVotesPerPoll(polls.length > 0 ? totalVotes / polls.length : 0);
    setTotalMonthlyEngagement(monthlyResponses + monthlyCommercialComments); // Combina as duas métricas

    // Removido: o else para !user, pois user é garantido como não nulo
  }, [polls, user]);

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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setFeedbackMessage("Tipo de arquivo inválido para o banner. Apenas JPG, PNG, GIF e WebP são permitidos.");
        setFeedbackType("error");
        setBannerFile(null);
        setBannerPreviewUrl(user?.bannerURL || null); // Reverte para a imagem de banner atual do usuário
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFeedbackMessage("A imagem do banner é muito grande. O tamanho máximo permitido é 2MB.");
        setFeedbackType("error");
        setBannerFile(null);
        setBannerPreviewUrl(user?.bannerURL || null); // Reverte para a imagem de banner atual do usuário
        return;
      }
      setBannerFile(file);
      setBannerPreviewUrl(URL.createObjectURL(file)); // Pré-visualização instantânea
      setFeedbackMessage(null); // Limpa feedback anterior
    } else {
      setBannerFile(null);
      setBannerPreviewUrl(user?.bannerURL || null); // Reverte para a imagem de banner atual do usuário
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      console.error("Usuário não disponível ao tentar salvar o perfil.");
      setFeedbackMessage("Erro: Usuário não autenticado. Faça login novamente.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    if (!editedCompanyName.trim() && !imageFile) { // Removida a verificação !user
      setFeedbackMessage("Nome da empresa ou imagem não pode estar vazio.");
      setFeedbackType("error");
      return;
    }

    if (uploadingImage) return; // Previne múltiplos envios

    let newPhotoURL: string | undefined = user!.photoURL || undefined;
    let updateRequired = false;
    const updateData: {
      displayName?: string;
      photoURL?: string;
      aboutUs?: string;
      contactEmail?: string;
      address?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
      themeColor?: string;
      bannerURL?: string;
    } = {};

    if (editedCompanyName.trim() !== (user.displayName || "")) {
      updateRequired = true;
      updateData.displayName = editedCompanyName.trim();
    }

    // Verificar se um novo banner foi selecionado
    if (bannerFile) {
      updateRequired = true;
    }

    // Verificar se algum dos novos campos de rodapé foi alterado
    if (editedAboutUs !== (user.aboutUs || "")) {
      updateRequired = true;
      updateData.aboutUs = editedAboutUs;
    }
    if (editedContactEmail !== (user.contactEmail || "")) {
      updateRequired = true; 
      updateData.contactEmail = editedContactEmail;
    }
    if (editedAddress !== (user.address || "")) {
      updateRequired = true; 
      updateData.address = editedAddress;
    }
    if (editedFacebookUrl !== (user.facebookUrl || "")) {
      updateRequired = true; 
      updateData.facebookUrl = editedFacebookUrl;
    }
    if (editedInstagramUrl !== (user.instagramUrl || "")) {
      updateRequired = true; 
      updateData.instagramUrl = editedInstagramUrl;
    }
    if (editedTwitterUrl !== (user.twitterUrl || "")) {
      updateRequired = true; 
      updateData.twitterUrl = editedTwitterUrl;
    }
    if (editedThemeColor !== (user.themeColor || "#6366f1")) {
      updateRequired = true; 
      updateData.themeColor = editedThemeColor; // Adicionar themeColor ao updateData
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
        setImagePreviewUrl(user.photoURL || null); // Reverte a pré-visualização
        return; // Interrompe o processo se o upload da imagem falhar
      } finally {
        setUploadingImage(false);
      }
    }

    let newBannerURL: string | undefined = user!.bannerURL || undefined; // Novo: para o URL do banner
    if (bannerFile) {
      setUploadingImage(true); // Reutilizando o estado de uploading, pode ser bom ter um para banner
      try {
        const storage = getStorage();
        const bannerRef = ref(storage, `banner_images/${user.uid}-${uuidv4()}-${bannerFile.name}`);
        await uploadBytes(bannerRef, bannerFile);
        newBannerURL = await getDownloadURL(bannerRef);
        setFeedbackMessage("Banner enviado com sucesso!");
        setFeedbackType("success");
        updateRequired = true;
      } catch (error) {
        console.error("Erro ao fazer upload do banner:", error);
        setFeedbackMessage("Erro ao fazer upload do banner.");
        setFeedbackType("error");
        setBannerFile(null); // Limpa o arquivo selecionado em caso de erro
        setBannerPreviewUrl(user.bannerURL || null); // Reverte a pré-visualização
        return; // Interrompe o processo se o upload do banner falhar
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
      // user é garantido como não nulo aqui
      const userDocRef = doc(db, "users", user.uid);
      if (newPhotoURL) {
        updateData.avatarUrl = newPhotoURL; // Salvar como avatarUrl no Firestore
      }
      if (newBannerURL) { // NOVO: Adicionar bannerURL ao updateData
        updateData.bannerURL = newBannerURL;
      }
      // Adicionar os novos campos ao updateData se tiverem sido alterados
      if (editedAboutUs !== (user.aboutUs || "")) {
        updateData.aboutUs = editedAboutUs;
      }
      if (editedContactEmail !== (user.contactEmail || "")) {
        updateData.contactEmail = editedContactEmail;
      }
      if (editedAddress !== (user.address || "")) {
        updateData.address = editedAddress;
      }
      if (editedFacebookUrl !== (user.facebookUrl || "")) {
        updateData.facebookUrl = editedFacebookUrl;
      }
      if (editedInstagramUrl !== (user.instagramUrl || "")) {
        updateData.instagramUrl = editedInstagramUrl;
      }
      if (editedTwitterUrl !== (user.twitterUrl || "")) {
        updateData.twitterUrl = editedTwitterUrl;
      }
      if (editedThemeColor !== (user.themeColor || "#6366f1")) {
        updateData.themeColor = editedThemeColor; // Adicionar themeColor ao updateData
      }

      await updateDoc(userDocRef, updateData);
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
    // user é garantido como não nulo aqui
    const pollToUpdate = polls.find(p => p.id === pollId);
    if (!pollToUpdate) {
      console.error("Enquete não encontrada para o ID:", pollId);
      return;
    }

    // Otimista: Atualiza a UI imediatamente
    // Removido: setPolls para evitar conflitos com onSnapshot e simplificar o fluxo

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
      // setUserPolls((prevPolls) => // Removido: setUserPolls será atualizado automaticamente via onSnapshot
      //   prevPolls.map((poll) =>
      //     poll.id === pollId
      //       ? {
      //           ...poll,
      //           options: poll.options.map((option) =>
      //             option.id === optionId
      //               ? { ...option, votes: option.votes - 1 }
      //               : option
      //           ),
      //           votedBy: poll.isCommercial && user ? (poll.votedBy || []).filter(uid => uid !== user.uid) : poll.votedBy,
      //         }
      //       : poll
      //   )
      // );
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    // user é garantido como não nulo aqui
    const pollToDelete = polls.find(p => p.id === pollId);
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
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-semibold">Plano Comercial</h3>
            <p className="text-gray-400">{activePollsCount} enquetes ativas</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            {user?.accountType === 'commercial' && user?.commercialName && (
              <button
                onClick={() => setShowQrCodeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Gerar QR Code da Página Pública
              </button>
            )}
            <button
              onClick={() => setShowCreatePollModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              Criar nova enquete comercial
            </button>
          </div>
        </div>

      {/* Minhas Enquetes */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Minhas enquetes</h3>
        <div className="space-y-4">
          {polls.length === 0 ? (
            <p className="text-gray-400">Você ainda não criou nenhuma enquete.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {polls.map((poll) => (
                <PollCard 
                  key={poll.id} 
                  poll={poll} 
                  onVote={handleVote} 
                  onDelete={handleDeletePoll} 
                  companySlug={companySlug} // Passar o slug da empresa para o PollCard
                  companyThemeColor={user.themeColor || undefined} // Passar o tema de cor da empresa para o PollCard, convertendo null para undefined
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
            <p className="text-2xl font-bold">{totalMonthlyEngagement}</p>
            <p className="text-gray-400">Engajamento total neste mês</p>
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

          {/* Seção de upload de imagem de banner */}
          <div className="flex flex-col items-center mb-6">
            <label htmlFor="banner-image-upload" className="block text-gray-400 mb-2">Alterar Imagem do Banner</label>
            <input
              id="banner-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(", ")}
              onChange={handleBannerChange}
              className="w-full max-w-sm px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
            {bannerPreviewUrl && (
              <div className="mt-4 w-full max-w-sm">
                <p className="text-gray-400 text-sm mb-2">Pré-visualização do Banner:</p>
                <Image
                  src={bannerPreviewUrl}
                  alt="Pré-visualização do Banner"
                  width={400} // Ajuste o tamanho conforme necessário
                  height={150} // Ajuste o tamanho conforme necessário
                  objectFit="cover"
                  className="rounded-lg border-2 border-indigo-500"
                />
              </div>
            )}
            {/* Feedback de erro/sucesso para o banner, se necessário */}
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
            </div>
            {feedbackMessage && feedbackType === "success" && (
              <div className="mt-2 p-3 rounded-md text-white bg-green-500">
                {feedbackMessage}
              </div>
            )}

            {/* Campos de texto para as informações do rodapé */}
            <div className="mt-6">
              <label htmlFor="aboutUs" className="block text-gray-400 mb-2">Sobre Nós</label>
              <textarea
                id="aboutUs"
                value={editedAboutUs}
                onChange={(e) => setEditedAboutUs(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                rows={4}
              ></textarea>
            </div>
            <div className="mt-4">
              <label htmlFor="contactEmail" className="block text-gray-400 mb-2">Email de Contato</label>
              <input
                type="email"
                id="contactEmail"
                value={editedContactEmail}
                onChange={(e) => setEditedContactEmail(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="address" className="block text-gray-400 mb-2">Endereço</label>
              <input
                type="text"
                id="address"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-4">
              <label className="block text-gray-400 mb-2">Redes Sociais</label>
              <input
                type="url"
                placeholder="URL do Facebook"
                value={editedFacebookUrl}
                onChange={(e) => setEditedFacebookUrl(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <input
                type="url"
                placeholder="URL do Instagram"
                value={editedInstagramUrl}
                onChange={(e) => setEditedInstagramUrl(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <input
                type="url"
                placeholder="URL do Twitter"
                value={editedTwitterUrl}
                onChange={(e) => setEditedTwitterUrl(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Seletor de cor do tema */}
            <div className="mt-4">
              <label htmlFor="themeColor" className="block text-gray-400 mb-2">Cor do Tema</label>
              <input
                type="color"
                id="themeColor"
                value={editedThemeColor}
                onChange={(e) => setEditedThemeColor(e.target.value)}
                className="w-full h-12 rounded-lg bg-gray-700 border border-gray-600 cursor-pointer"
              />
            </div>

            {/* Botão Salvar Alterações movido para cá */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={uploadingImage} // Desabilita o botão enquanto a imagem está sendo carregada
                className={`px-6 py-3 bg-green-600 text-white font-bold rounded-lg transition duration-300 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                Salvar Alterações
              </button>
            </div>

            {/* Removido: Botão "Ver Página Pública da Empresa" */}

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

      {/* Modal do QR Code */}
      {showQrCodeModal && companyPublicPageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm relative flex flex-col items-center">
            <button
              onClick={() => setShowQrCodeModal(false)}
              className="absolute top-4 right-4 text-gray-800 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
            <Image
              src="/logoPrincipal.png"
              alt="PollApp Logo"
              width={100} // Ajuste o tamanho conforme necessário
              height={100} // Ajuste o tamanho conforme necessário
              className="mb-2"
            />
            <div className="p-4 bg-white rounded-lg shadow-inner">
              <QRCode value={companyPublicPageUrl} size={256} level="H" />
            </div>
            <a
              href={companyPublicPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Ir para a Página da Empresa
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
