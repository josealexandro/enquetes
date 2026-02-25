"use client";

import React, { useState, useEffect } from "react";
import { useAuth, AuthContextType } from "../context/AuthContext";
import { db } from "@/lib/firebase"; // Importar a instância do Firestore (ainda necessária para update/delete)
import { doc, updateDoc, deleteDoc } from "firebase/firestore"; // Importar doc, updateDoc e deleteDoc (deleteDoc usado apenas para enquetes, stories usa API route)
import { updateProfile } from "firebase/auth"; // Importar updateProfile do Firebase Auth
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Importar Firebase Storage
import PollForm from "./PollForm"; // Importar o PollForm
import PollCard from "./PollCard"; // Importar o PollCard
import { Poll } from "../types/poll"; // Importar a interface Poll
import { v4 as uuidv4 } from "uuid"; // Para gerar IDs únicos para as opções
import Image from "next/image"; // Importar o componente Image do Next.js
import slugify from "@/utils/slugify"; // Importar a função slugify
import ExpandableImage from "./ExpandableImage"; // Importar componente de imagem expansível
import QRCode from "react-qr-code"; // Importar QRCode
import PollResults from "./PollResults"; // Importar componente de resultados de enquete
import { Story } from "../types/story"; // Importar tipo Story
import { CreateStoryInput } from "../types/story"; // Importar tipo CreateStoryInput
import { BRAZIL_REGIONS, getStatesByRegion } from "@/app/data/brazilLocations"; // Importar dados de localização
// Removido: import { UserInfo, User } from "firebase/auth"; // Removido: UserInfo e User não são necessários aqui
// Removido: import { AuthContextType } from "../context/AuthContext"; // Removido: AuthContextType não é necessário ser importado diretamente para o tipo CustomUser

// O tipo de `user` vindo do `useAuth` já é o tipo correto, não precisamos redefini-lo aqui
type CustomUser = AuthContextType["user"];

interface DashboardProps {
  polls: Poll[];
  user: Exclude<CustomUser, null>; // Usar o tipo CustomUser e garantir que não é nulo
}

/** Planos que têm acesso à análise de resultados (gráficos, relatório) no dashboard */
const PLANS_WITH_ANALYSIS = ["medium", "pro"];

/** URLs que não são imagens (ex.: link WhatsApp) não podem ser usadas no next/image */
function isInvalidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const host = new URL(url).hostname;
    return host === "wa.me" || host === "api.whatsapp.com";
  } catch {
    return true;
  }
}

const Dashboard = ({ polls, user }: DashboardProps) => {
  const { isMasterUser, firebaseAuthUser, refreshUserData } = useAuth(); // Obter isMasterUser, firebaseAuthUser e refreshUserData do contexto
  const [activePollsCount, setActivePollsCount] = useState(0);
  const [selectedPollForResults, setSelectedPollForResults] = useState<Poll | null>(null); // Estado para controlar qual enquete mostrar resultados
  const [qrCodeSize, setQrCodeSize] = useState(256); // Tamanho do QR Code (responsivo)
  
  // DOCUMENTAÇÃO: Ajustar tamanho do QR Code baseado no tamanho da tela
  useEffect(() => {
    const updateQrCodeSize = () => {
      setQrCodeSize(window.innerWidth < 640 ? 200 : 256);
    };
    updateQrCodeSize();
    window.addEventListener('resize', updateQrCodeSize);
    return () => window.removeEventListener('resize', updateQrCodeSize);
  }, []);
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
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null); // Estado para armazenar dados da assinatura
  // Novos estados para as informações do rodapé
  const [editedAboutUs, setEditedAboutUs] = useState(user.aboutUs || "");
  const [editedContactEmail, setEditedContactEmail] = useState(user.contactEmail || "");
  const [editedAddress, setEditedAddress] = useState(user.address || "");
  const [editedFacebookUrl, setEditedFacebookUrl] = useState(user.facebookUrl || "");
  const [editedInstagramUrl, setEditedInstagramUrl] = useState(user.instagramUrl || ""); // Antigo editedTwitterUrl
  const [editedTwitterUrl, setEditedTwitterUrl] = useState(user.twitterUrl || ""); // Antigo editedLinkedinUrl
  const [editedThemeColor, setEditedThemeColor] = useState(user.themeColor || "#6366f1"); // Novo estado para o tema de cor
  // DOCUMENTAÇÃO: Estados para localização (opcionais)
  const [editedRegion, setEditedRegion] = useState(user.region || "");
  const [editedState, setEditedState] = useState(user.state || "");
  const [editedCity, setEditedCity] = useState(user.city || "");
  // DOCUMENTAÇÃO: Estados para gerenciar stories
  const [stories, setStories] = useState<Story[]>([]); // Lista de stories ativos
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false); // Controla modal de criação
  const [newStoryImageUrl, setNewStoryImageUrl] = useState(""); // URL da imagem do novo story (para URL externa)
  const [storyImageFile, setStoryImageFile] = useState<File | null>(null); // Arquivo de imagem para upload
  const [storyImagePreviewUrl, setStoryImagePreviewUrl] = useState<string | null>(null); // Preview da imagem
  const [newStoryText, setNewStoryText] = useState(""); // Texto do novo story (opcional)
  const [creatingStory, setCreatingStory] = useState(false); // Estado de loading ao criar story
  const [uploadingStoryImage, setUploadingStoryImage] = useState(false); // Estado de upload da imagem
  const [storyFeedback, setStoryFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null); // Feedback de criação

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // Gerar o slug da empresa aqui para passar para o PollCard
  const companySlug = user?.commercialName ? slugify(user.commercialName) : undefined;

  // Análise (gráficos e relatório) só para planos Medium e Pro com assinatura ativa
  const canShowAnalysis = Boolean(
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    subscription.planSnapshot?.slug &&
    PLANS_WITH_ANALYSIS.includes(subscription.planSnapshot.slug)
  );

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
    // DOCUMENTAÇÃO: Inicializar campos de localização
    setEditedRegion(user?.region || "");
    setEditedState(user?.state || "");
    setEditedCity(user?.city || "");
    if (user?.commercialName) {
      const publicPageSlug = slugify(user.commercialName);
      setCompanyPublicPageUrl(`${window.location.origin}/empresa/${publicPageSlug}`);
    } else {
      setCompanyPublicPageUrl(""); // Limpa o URL se não houver nome comercial
    }
  }, [user]);

  // DOCUMENTAÇÃO: Buscar dados da assinatura para exibir botão de cancelar
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSubscription = async () => {
      try {
        const response = await fetch(`/api/subscriptions?companyId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error("Erro ao buscar assinatura:", error);
      }
    };

    fetchSubscription();
  }, [user]);

  // DOCUMENTAÇÃO: Buscar stories ativos da empresa
  // Todas as contas comerciais podem ter stories
  useEffect(() => {
    if (!user?.uid) return;

    const fetchStories = async () => {
      try {
        const response = await fetch(`/api/stories?companyId=${user.uid}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stories) {
            setStories(data.stories);
          } else {
            setStories([]);
          }
        } else {
          setStories([]);
        }
      } catch (error) {
        console.error("Erro ao buscar stories:", error);
        setStories([]);
      }
    };

    fetchStories();

    // DOCUMENTAÇÃO: Atualizar stories a cada 5 minutos para remover expirados
    // OTIMIZAÇÃO DE CUSTO: Intervalo aumentado de 1 minuto para 5 minutos para reduzir leituras do Firestore
    const interval = setInterval(fetchStories, 300000); // 5 minutos (300000ms)
    return () => clearInterval(interval);
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

    let newPhotoURL: string | undefined = user.photoURL || undefined;
    let updateRequired = false;
    const updateData: {
      displayName?: string;
      photoURL?: string;
      avatarUrl?: string; // Adicionar avatarUrl ao tipo
      aboutUs?: string;
      contactEmail?: string;
      address?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
      themeColor?: string;
      bannerURL?: string;
      // DOCUMENTAÇÃO: Campos de localização
      region?: string;
      city?: string;
      state?: string;
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
    // DOCUMENTAÇÃO: Verificar se campos de localização foram alterados
    if (editedRegion !== (user.region || "")) {
      updateRequired = true;
      updateData.region = editedRegion.trim() || undefined;
    }
    if (editedState !== (user.state || "")) {
      updateRequired = true;
      updateData.state = editedState.trim() || undefined;
    }
    if (editedCity !== (user.city || "")) {
      updateRequired = true;
      updateData.city = editedCity.trim() || undefined;
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

    let newBannerURL: string | undefined = user.bannerURL || undefined; // Novo: para o URL do banner
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

      // 2. Atualizar no Firestore
      // user é garantido como não nulo aqui
      const userDocRef = doc(db, "users", user.uid);
      
      // Garantir que apenas campos permitidos sejam enviados
      const firestoreUpdateData: Record<string, unknown> = {};
      
      // DOCUMENTAÇÃO: Atualiza displayName e commercialName juntos para contas comerciais
      // Isso garante que Header e outros componentes usem o nome correto
      if (editedCompanyName.trim() !== (user.displayName || "") && editedCompanyName.trim().length > 0) {
        if (editedCompanyName.trim().length > 100) {
          setFeedbackMessage("O nome da empresa não pode ter mais de 100 caracteres.");
          setFeedbackType("error");
          setTimeout(() => setFeedbackMessage(null), 3000);
          return;
        }
        firestoreUpdateData.displayName = editedCompanyName.trim();
        // Para contas comerciais, atualizar commercialName também (usado pelo Header)
        if (user.accountType === 'commercial') {
          firestoreUpdateData.commercialName = editedCompanyName.trim();
        }
      }
      
      if (newPhotoURL) {
        firestoreUpdateData.avatarUrl = newPhotoURL; // Salvar como avatarUrl no Firestore
      }
      if (newBannerURL) { // NOVO: Adicionar bannerURL ao updateData
        firestoreUpdateData.bannerURL = newBannerURL;
      }
      // Adicionar os novos campos ao firestoreUpdateData se tiverem sido alterados
      if (editedAboutUs !== (user.aboutUs || "")) {
        if (editedAboutUs.length > 1000) {
          setFeedbackMessage("O campo 'Sobre Nós' não pode ter mais de 1000 caracteres.");
          setFeedbackType("error");
          setTimeout(() => setFeedbackMessage(null), 3000);
          return;
        }
        firestoreUpdateData.aboutUs = editedAboutUs;
      }
      if (editedContactEmail !== (user.contactEmail || "")) {
        firestoreUpdateData.contactEmail = editedContactEmail;
      }
      if (editedAddress !== (user.address || "")) {
        firestoreUpdateData.address = editedAddress;
      }
      // DOCUMENTAÇÃO: Atualizar campos de localização se alterados
      if (editedRegion !== (user.region || "")) {
        firestoreUpdateData.region = editedRegion.trim() || null;
      }
      if (editedState !== (user.state || "")) {
        firestoreUpdateData.state = editedState.trim() || null;
      }
      if (editedCity !== (user.city || "")) {
        firestoreUpdateData.city = editedCity.trim() || null;
      }
      if (editedFacebookUrl !== (user.facebookUrl || "")) {
        firestoreUpdateData.facebookUrl = editedFacebookUrl;
      }
      if (editedInstagramUrl !== (user.instagramUrl || "")) {
        firestoreUpdateData.instagramUrl = editedInstagramUrl;
      }
      if (editedTwitterUrl !== (user.twitterUrl || "")) {
        firestoreUpdateData.twitterUrl = editedTwitterUrl;
      }
      if (editedThemeColor !== (user.themeColor || "#6366f1")) {
        firestoreUpdateData.themeColor = editedThemeColor;
      }
      // DOCUMENTAÇÃO: Atualizar campos de localização se alterados
      if (editedRegion !== (user.region || "")) {
        firestoreUpdateData.region = editedRegion.trim() || undefined;
      }
      if (editedState !== (user.state || "")) {
        firestoreUpdateData.state = editedState.trim() || undefined;
      }
      if (editedCity !== (user.city || "")) {
        firestoreUpdateData.city = editedCity.trim() || undefined;
      }

      // Só atualizar no Firestore se houver dados para atualizar
      if (Object.keys(firestoreUpdateData).length > 0) {
        console.log("Atualizando Firestore com:", firestoreUpdateData);
        await updateDoc(userDocRef, firestoreUpdateData);
        console.log("Firestore atualizado com sucesso");
        
        // IMPORTANTE: Pequeno delay para garantir que o Firestore processou a atualização
        // Isso garante que o onSnapshot no contexto detecte a mudança antes de forçar refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // IMPORTANTE: Forçar atualização dos dados do usuário no contexto
        // Isso garante que o Header e outros componentes sejam atualizados imediatamente
        // O onSnapshot também detecta mudanças automaticamente, mas este refresh garante atualização imediata
        await refreshUserData();
        console.log("refreshUserData concluído");
      }
      setFeedbackMessage("Perfil atualizado com sucesso!");
      setFeedbackType("success");
      setImageFile(null); // Limpa o arquivo após o upload e salvamento

    } catch (error: unknown) { 
      console.error("Erro completo ao atualizar perfil:", error);
      if (error instanceof Error) {
        console.error("Erro ao atualizar perfil:", error.message);
        // Verificar se é erro de permissão do Firestore
        if (error.message.includes('permission-denied') || error.message.includes('Permission denied')) {
          setFeedbackMessage("Erro de permissão: Verifique se você está logado e tem permissão para atualizar seu perfil.");
        } else {
          setFeedbackMessage(error.message);
        }
      } else {
        // Verificar se é um erro do Firestore
        const firestoreError = error && typeof error === "object" && "code" in error ? (error as { code: string }) : null;
        if (firestoreError?.code === "permission-denied") {
          setFeedbackMessage("Erro de permissão: Verifique se você está logado e tem permissão para atualizar seu perfil.");
        } else {
          console.error("Erro desconhecido ao atualizar perfil:", error);
          setFeedbackMessage("Erro ao atualizar perfil. Tente novamente.");
        }
      }
      setFeedbackType("error");
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // DOCUMENTAÇÃO: Função para lidar com seleção de imagem do story
  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setStoryFeedback({ message: "Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP.", type: "error" });
        return;
      }

      // Validar tamanho do arquivo
      if (file.size > MAX_FILE_SIZE) {
        setStoryFeedback({ message: "Arquivo muito grande. Tamanho máximo: 5MB.", type: "error" });
        return;
      }

      setStoryImageFile(file);
      setStoryImagePreviewUrl(URL.createObjectURL(file)); // Preview instantâneo
      setNewStoryImageUrl(""); // Limpar URL se houver
      setStoryFeedback(null); // Limpar feedback anterior
    } else {
      setStoryImageFile(null);
      setStoryImagePreviewUrl(null);
    }
  };

  // DOCUMENTAÇÃO: Função para criar um novo story
  // Valida assinatura ativa e limite (máximo 2) na API route
  // Faz upload da imagem se um arquivo foi selecionado
  const handleCreateStory = async () => {
    if (!user?.uid) {
      setStoryFeedback({ message: "Erro: Usuário não autenticado.", type: "error" });
      return;
    }

    // DOCUMENTAÇÃO: Validação de plano removida - todas as contas comerciais podem criar stories
    // Apenas verificar se está autenticado (já verificado acima)

    // Validar que há imagem (arquivo ou URL)
    if (!storyImageFile && !newStoryImageUrl.trim()) {
      setStoryFeedback({ message: "Selecione uma imagem ou forneça uma URL.", type: "error" });
      return;
    }

    if (newStoryText && newStoryText.length > 80) {
      setStoryFeedback({ message: "O texto não pode ter mais de 80 caracteres.", type: "error" });
      return;
    }

    setCreatingStory(true);
    setStoryFeedback(null);

    try {
      let finalImageUrl = newStoryImageUrl.trim();

      // DOCUMENTAÇÃO: Fazer upload da imagem se um arquivo foi selecionado
      if (storyImageFile) {
        setUploadingStoryImage(true);
        try {
          const storage = getStorage();
          const imageRef = ref(storage, `story_images/${user.uid}-${uuidv4()}-${storyImageFile.name}`);
          
          // DOCUMENTAÇÃO: Incluir metadata com contentType para passar nas regras do Storage
          const metadata = {
            contentType: storyImageFile.type,
          };
          
          await uploadBytes(imageRef, storyImageFile, metadata);
          finalImageUrl = await getDownloadURL(imageRef);
          setStoryFeedback({ message: "Imagem enviada com sucesso!", type: "success" });
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          setStoryFeedback({ message: "Erro ao fazer upload da imagem. Verifique se as regras do Storage foram publicadas no Firebase Console.", type: "error" });
          setUploadingStoryImage(false);
          setCreatingStory(false);
          return;
        } finally {
          setUploadingStoryImage(false);
        }
      }

      // DOCUMENTAÇÃO: Criar story com a URL da imagem (upload ou externa)
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: user.uid,
          imageUrl: finalImageUrl,
          text: newStoryText.trim() || undefined,
        } as CreateStoryInput & { companyId: string }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar story.");
      }

      // Limpar formulário e fechar modal
      setNewStoryImageUrl("");
      setStoryImageFile(null);
      setStoryImagePreviewUrl(null);
      setNewStoryText("");
      setShowCreateStoryModal(false);
      setStoryFeedback({ message: "Story criado com sucesso! Ele expirará em 24 horas.", type: "success" });

      // Atualizar lista de stories
      const storiesResponse = await fetch(`/api/stories?companyId=${user.uid}`);
      if (storiesResponse.ok) {
        const storiesData = await storiesResponse.json();
        if (storiesData.success && storiesData.stories) {
          setStories(storiesData.stories);
        }
      }
    } catch (error: unknown) {
      console.error("Erro ao criar story:", error);
      setStoryFeedback({ message: error instanceof Error ? error.message : "Erro ao criar story. Tente novamente.", type: "error" });
    } finally {
      setCreatingStory(false);
      setTimeout(() => setStoryFeedback(null), 5000);
    }
  };

  // DOCUMENTAÇÃO: Função para deletar um story
  // - Verifica autenticação do usuário
  // - Usa API route DELETE /api/stories para deletar (usa Admin SDK, bypassa regras do Firestore)
  // - Atualiza lista local após exclusão bem-sucedida
  const handleDeleteStory = async (storyId: string) => {
    if (!user?.uid) {
      console.error("[handleDeleteStory] Usuário não autenticado");
      setStoryFeedback({ 
        message: "Você precisa estar autenticado para excluir stories.", 
        type: "error" 
      });
      setTimeout(() => setStoryFeedback(null), 3000);
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este story?")) {
      return;
    }

    try {
      console.log("[handleDeleteStory] Tentando excluir story via API:", {
        storyId,
        userId: user.uid,
      });

      // DOCUMENTAÇÃO: Usar API route para deletar story
      // A API route usa Admin SDK que bypassa regras do Firestore
      const response = await fetch(`/api/stories?companyId=${user.uid}&storyId=${storyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Erro ao excluir story");
      }

      console.log("[handleDeleteStory] Story excluído com sucesso");
      
      // Atualizar lista local
      setStories(stories.filter(s => s.id !== storyId));
      setStoryFeedback({ message: "Story excluído com sucesso.", type: "success" });
    } catch (error: unknown) {
      console.error("[handleDeleteStory] Erro ao excluir story:", error);
      let errorMessage = "Erro ao excluir story. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "not-found") {
        errorMessage = "Story não encontrado. Pode já ter sido excluído.";
      }
      
      setStoryFeedback({ message: errorMessage, type: "error" });
    } finally {
      setTimeout(() => setStoryFeedback(null), 5000);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    // user é garantido como não nulo aqui
    const pollToUpdate = polls.find(p => p.id === pollId);
    if (!pollToUpdate) {
      console.error("Enquete não encontrada para o ID:", pollId);
      return;
    }

    try {
      // Usar API route com Admin SDK
      const response = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          optionId,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao registrar voto.");
      }

      // onSnapshot vai atualizar automaticamente, mas podemos mostrar feedback
      setFeedbackMessage("Voto registrado com sucesso!");
      setFeedbackType("success");
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error: unknown) {
      console.error("Erro ao votar:", error);
      setFeedbackMessage(error instanceof Error ? error.message : "Erro ao registrar voto. Tente novamente.");
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
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
      {/* Título principal - Responsivo para mobile/tablet/desktop */}
      {/* DOCUMENTAÇÃO: Título menor no mobile (text-2xl), intermediário no tablet (text-2xl), maior no desktop (text-3xl) */}
      <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-5 lg:mb-6">
        Olá, {user?.displayName || "Empresa"}!
      </h2>

      {/* Plano Comercial */}
      {/* DOCUMENTAÇÃO: Layout responsivo - coluna no mobile, linha em tablet/desktop */}
      {/* Ajuste para tablets: padding intermediário */}
      <div className="bg-gray-800 p-4 md:p-5 lg:p-6 rounded-lg shadow-md mb-4 md:mb-5 lg:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div className="w-full md:w-auto">
          <h3 className="text-lg md:text-lg lg:text-xl font-semibold mb-1 md:mb-0">Plano Comercial</h3>
          <p className="text-sm md:text-sm lg:text-base text-gray-400">{activePollsCount} enquetes ativas</p>
        </div>
        {/* DOCUMENTAÇÃO: Botões em coluna no mobile, linha em tablet/desktop */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
          {user?.accountType === 'commercial' && user?.commercialName && (
            <button
              onClick={() => setShowQrCodeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 md:py-2.5 lg:py-2.5 px-3 md:px-4 rounded-lg transition duration-300 text-xs md:text-sm lg:text-base w-full sm:w-auto"
            >
              Gerar QR Code
            </button>
          )}
          <button
            onClick={() => setShowCreatePollModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 md:py-2.5 lg:py-2.5 px-3 md:px-4 rounded-lg transition duration-300 text-xs md:text-sm lg:text-base w-full sm:w-auto"
          >
            Criar Enquete
          </button>
        </div>
      </div>

      {/* Minhas Enquetes */}
      {/* DOCUMENTAÇÃO: Padding responsivo - menor no mobile, intermediário no tablet, completo no desktop */}
      <div className="bg-gray-800 p-4 md:p-5 lg:p-6 rounded-lg shadow-md mb-4 md:mb-5 lg:mb-6">
        <h3 className="text-lg md:text-lg lg:text-xl font-semibold mb-3 md:mb-3.5 lg:mb-4">Minhas enquetes</h3>
        <div className="space-y-4">
          {polls.length === 0 ? (
            <p className="text-gray-400 text-sm md:text-sm lg:text-base text-center py-4">
              Você ainda não criou nenhuma enquete.
            </p>
          ) : (
            <>
              {/* DOCUMENTAÇÃO: Grid responsivo - 1 coluna no mobile, 2 no tablet, 3 no desktop */}
              {/* Ajuste para tablets: gap intermediário */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-3.5 lg:gap-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="relative">
                    <PollCard 
                      poll={poll} 
                      onVote={handleVote} 
                      onDelete={handleDeletePoll} 
                      companySlug={companySlug} // Passar o slug da empresa para o PollCard
                      companyThemeColor={user.themeColor || undefined} // Passar o tema de cor da empresa para o PollCard, convertendo null para undefined
                    />
                    {/* Botão para ver resultados - Responsivo */}
                    {/* DOCUMENTAÇÃO: Botão com tamanho intermediário no tablet */}
                    <button
                      onClick={() => setSelectedPollForResults(selectedPollForResults?.id === poll.id ? null : poll)}
                      className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 md:py-2.5 lg:py-2.5 px-3 md:px-3.5 lg:px-4 rounded-lg transition-colors text-xs md:text-xs lg:text-sm"
                    >
                      {selectedPollForResults?.id === poll.id ? "Ocultar Resultados" : "Ver Resultados"}
                    </button>
                  </div>
                ))}
              </div>
              {/* Exibir resultados da enquete selecionada (análise só para planos Medium e Pro) */}
              {selectedPollForResults && (
                <div className="mt-4 md:mt-5 lg:mt-6">
                  {canShowAnalysis ? (
                    <PollResults poll={selectedPollForResults} />
                  ) : (
                    <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 text-center">
                      <p className="text-gray-300 mb-2">Análise de resultados disponível nos planos Medium e Pro.</p>
                      <p className="text-sm text-gray-400">Acesse a aba Assinatura para fazer upgrade.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DOCUMENTAÇÃO: Seção de Stories
          - Visível para todas as contas comerciais
          - Todas as contas comerciais podem criar stories (Basic, Medium, Pro)
          - Máximo de 2 stories ativos por empresa
          - Stories expiram automaticamente após 24 horas
          - Exibe stories ativos e permite criar/deletar
      */}
      {user?.accountType === 'commercial' && (
        <div className="bg-gray-800 p-4 md:p-5 lg:p-6 rounded-lg shadow-md mb-4 md:mb-5 lg:mb-6">
          <div className="flex justify-between items-center mb-3 md:mb-3.5 lg:mb-4">
            <h3 className="text-lg md:text-lg lg:text-xl font-semibold">Stories</h3>
            {/* DOCUMENTAÇÃO: Todas as contas comerciais podem criar stories */}
            {subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIALING") ? (
              <button
                onClick={() => setShowCreateStoryModal(true)}
                disabled={stories.length >= 2}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 md:py-2.5 lg:py-2.5 px-3 md:px-4 rounded-lg transition duration-300 text-xs md:text-sm lg:text-base"
              >
                {stories.length >= 2 ? "Limite atingido (2 stories)" : "Criar Story"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setStoryFeedback({ 
                    message: "Você precisa ter uma assinatura ativa para criar stories.", 
                    type: "error" 
                  });
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 md:py-2.5 lg:py-2.5 px-3 md:px-4 rounded-lg transition duration-300 text-xs md:text-sm lg:text-base"
              >
                Criar Story
              </button>
            )}
          </div>
          
          {storyFeedback && (
            <div className={`mb-4 p-3 rounded-md text-white ${
              storyFeedback.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}>
              {storyFeedback.message}
            </div>
          )}

          {stories.length === 0 ? (
            <p className="text-gray-400 text-sm md:text-sm lg:text-base text-center py-4">
              Você ainda não criou nenhum story. Stories expiram após 24 horas.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map((story) => {
                // DOCUMENTAÇÃO: Converter expiresAt para milissegundos
                // Pode vir em diferentes formatos: Timestamp do Firestore, objeto com _seconds, ou número
                let expiresAtMillis = 0;
                if (story.expiresAt) {
                  if (typeof story.expiresAt.toMillis === 'function') {
                    // Formato Timestamp do Client SDK
                    expiresAtMillis = story.expiresAt.toMillis();
                  } else if (typeof story.expiresAt === 'object' && story.expiresAt !== null) {
                    // Formato do Admin SDK ou objeto serializado
                    const expiresAtObj = story.expiresAt as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
                    if (expiresAtObj._seconds !== undefined || expiresAtObj.seconds !== undefined) {
                      const seconds = expiresAtObj._seconds || expiresAtObj.seconds || 0;
                      const nanoseconds = expiresAtObj._nanoseconds || expiresAtObj.nanoseconds || 0;
                      expiresAtMillis = seconds * 1000 + nanoseconds / 1000000;
                    }
                  } else if (typeof story.expiresAt === 'number') {
                    // Já está em milissegundos
                    expiresAtMillis = story.expiresAt;
                  }
                }
                
                const now = Date.now();
                const hoursLeft = Math.max(0, (expiresAtMillis - now) / (1000 * 60 * 60));
                
                return (
                  <div key={story.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="relative w-full aspect-[9/16] max-h-64 mb-3 rounded-lg overflow-hidden">
                      {isInvalidImageUrl(story.imageUrl) ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-600 text-gray-400 text-sm text-center p-2">
                          Imagem inválida ou link (ex.: WhatsApp)
                        </div>
                      ) : (
                        <Image
                          src={story.imageUrl!}
                          alt={story.text || "Story"}
                          fill
                          className="object-cover"
                          unoptimized={story.imageUrl?.includes('firebasestorage') || story.imageUrl?.includes('googleapis')}
                        />
                      )}
                    </div>
                    {story.text && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">{story.text}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">
                        Expira em: {hoursLeft > 0 ? `${Math.floor(hoursLeft)}h` : "Expirado"}
                      </span>
                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal para criar story */}
          {showCreateStoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h4 className="text-xl font-semibold mb-4">Criar Novo Story</h4>
                
                <div className="space-y-4">
                  {/* DOCUMENTAÇÃO: Upload de imagem ou URL */}
                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">
                      Imagem do Story *
                    </label>
                    <div className="space-y-3">
                      {/* Input de arquivo para upload */}
                      <div>
                        <label htmlFor="story-image-upload" className="block text-gray-400 mb-2 text-xs">
                          Ou faça upload de uma imagem:
                        </label>
                        <input
                          id="story-image-upload"
                          type="file"
                          accept={ACCEPTED_IMAGE_TYPES.join(", ")}
                          onChange={handleStoryImageChange}
                          className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                        />
                        {uploadingStoryImage && (
                          <div className="flex items-center justify-center p-2 mt-2">
                            <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="ml-2 text-cyan-500 text-xs">Enviando imagem...</span>
                          </div>
                        )}
                        {storyImagePreviewUrl && (
                          <div className="mt-3">
                            <p className="text-gray-400 text-xs mb-2">Pré-visualização:</p>
                            <div className="relative w-full aspect-[9/16] max-h-48 rounded-lg overflow-hidden border-2 border-indigo-500">
                              <Image
                                src={storyImagePreviewUrl}
                                alt="Preview do Story"
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Separador OU */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-600"></div>
                        <span className="text-gray-500 text-xs">OU</span>
                        <div className="flex-1 h-px bg-gray-600"></div>
                      </div>

                      {/* Input de URL (alternativa) */}
                      <div>
                        <label htmlFor="story-image-url" className="block text-gray-400 mb-2 text-xs">
                          Ou forneça uma URL de imagem:
                        </label>
                        <input
                          id="story-image-url"
                          type="url"
                          value={newStoryImageUrl}
                          onChange={(e) => {
                            setNewStoryImageUrl(e.target.value);
                            setStoryImageFile(null);
                            setStoryImagePreviewUrl(null);
                          }}
                          placeholder="https://exemplo.com/imagem.jpg"
                          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2 text-sm">
                      Texto (opcional, máximo 80 caracteres)
                    </label>
                    <textarea
                      value={newStoryText}
                      onChange={(e) => setNewStoryText(e.target.value)}
                      maxLength={80}
                      rows={3}
                      placeholder="Digite um texto curto..."
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {newStoryText.length}/80 caracteres
                    </p>
                  </div>

                  {storyFeedback && storyFeedback.type === "error" && (
                    <div className="p-3 rounded-md bg-red-500 text-white text-sm">
                      {storyFeedback.message}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateStoryModal(false);
                      setNewStoryImageUrl("");
                      setStoryImageFile(null);
                      setStoryImagePreviewUrl(null);
                      setNewStoryText("");
                      setStoryFeedback(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateStory}
                    disabled={creatingStory || uploadingStoryImage || (!storyImageFile && !newStoryImageUrl.trim())}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition"
                  >
                    {uploadingStoryImage ? "Enviando imagem..." : creatingStory ? "Criando..." : "Criar Story"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estatísticas */}
      {/* DOCUMENTAÇÃO: Cards de estatísticas responsivos - padding e texto ajustados para mobile/tablet/desktop */}
      <div className="bg-gray-800 p-4 md:p-5 lg:p-6 rounded-lg shadow-md mb-4 md:mb-5 lg:mb-6">
        <h3 className="text-lg md:text-lg lg:text-xl font-semibold mb-3 md:mb-3.5 lg:mb-4">Estatísticas</h3>
        {/* DOCUMENTAÇÃO: Grid mantém 2 colunas mas com gap intermediário no tablet */}
        <div className="grid grid-cols-2 gap-3 md:gap-3.5 lg:gap-4">
          <div className="bg-gray-700 p-3 md:p-3.5 lg:p-4 rounded-lg text-center">
            <p className="text-xl md:text-xl lg:text-2xl font-bold mb-1">{totalMonthlyEngagement}</p>
            <p className="text-gray-400 text-xs md:text-xs lg:text-sm leading-tight">
              Engajamento total neste mês
            </p>
          </div>
          <div className="bg-gray-700 p-3 md:p-3.5 lg:p-4 rounded-lg text-center">
            <p className="text-xl md:text-xl lg:text-2xl font-bold mb-1">{averageVotesPerPoll.toFixed(1)}</p>
            <p className="text-gray-400 text-xs md:text-xs lg:text-sm leading-tight">
              Média de votos por enquete
            </p>
          </div>
        </div>
      </div>

      {/* Personalização */}
      {/* DOCUMENTAÇÃO: Seção de personalização com padding e espaçamentos responsivos */}
      {/* Ajuste para tablets: padding intermediário */}
      <div className="bg-gray-800 p-4 md:p-5 lg:p-6 rounded-lg shadow-md">
        <h3 className="text-lg md:text-lg lg:text-xl font-semibold mb-3 md:mb-3.5 lg:mb-4">Personalização</h3>
        <div className="space-y-4">
          {/* Seção de upload de imagem */}
          {/* DOCUMENTAÇÃO: Layout responsivo - imagem e inputs ajustados para mobile/tablet/desktop */}
          <div className="flex flex-col items-center mb-4 md:mb-5 lg:mb-6">
            <div className="mb-3 md:mb-3.5 lg:mb-4">
              <ExpandableImage
                src={imagePreviewUrl || user?.photoURL || "/logoPrincipal.png"}
                alt="Pré-visualização do Avatar"
                defaultSize={128}
                expandedSize={256}
                borderColor="indigo-500"
                showBorder={true}
              />
            </div>
            <label htmlFor="profile-image-upload" className="block text-gray-400 mb-2 text-sm md:text-sm lg:text-base">
              Alterar Imagem de Perfil
            </label>
            <input
              id="profile-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(", ")}
              onChange={handleImageChange}
              className="w-full max-w-sm px-3 md:px-3.5 lg:px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm md:text-sm lg:text-base file:mr-2 md:file:mr-3 lg:file:mr-4 file:py-1.5 md:file:py-1.5 lg:file:py-2 file:px-3 md:file:px-3.5 lg:file:px-4 file:rounded-full file:border-0 file:text-xs md:file:text-xs lg:file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
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
          {/* DOCUMENTAÇÃO: Input de banner responsivo - ajuste para tablets */}
          <div className="flex flex-col items-center mb-4 md:mb-5 lg:mb-6">
            <label htmlFor="banner-image-upload" className="block text-gray-400 mb-2 text-sm md:text-sm lg:text-base">
              Alterar Imagem do Banner
            </label>
            <input
              id="banner-image-upload"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(", ")}
              onChange={handleBannerChange}
              className="w-full max-w-sm px-3 sm:px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm sm:text-base file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
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
          {/* DOCUMENTAÇÃO: Inputs responsivos com padding e texto ajustados */}
          <div>
            <label htmlFor="companyName" className="block text-gray-400 mb-2 text-sm sm:text-base">
              Nome da empresa
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="companyName"
                value={editedCompanyName}
                onChange={(e) => setEditedCompanyName(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>
            {feedbackMessage && feedbackType === "success" && (
              <div className="mt-2 p-3 rounded-md text-white bg-green-500">
                {feedbackMessage}
              </div>
            )}

            {/* Campos de texto para as informações do rodapé */}
            {/* DOCUMENTAÇÃO: Todos os inputs com tamanhos responsivos */}
            <div className="mt-4 sm:mt-6">
              <label htmlFor="aboutUs" className="block text-gray-400 mb-2 text-sm sm:text-base">
                Sobre Nós
              </label>
              <textarea
                id="aboutUs"
                value={editedAboutUs}
                onChange={(e) => setEditedAboutUs(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm sm:text-base"
                rows={4}
              ></textarea>
            </div>
            <div className="mt-3 sm:mt-4">
              <label htmlFor="contactEmail" className="block text-gray-400 mb-2 text-sm sm:text-base">
                Email de Contato
              </label>
              <input
                type="email"
                id="contactEmail"
                value={editedContactEmail}
                onChange={(e) => setEditedContactEmail(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>
            <div className="mt-3 sm:mt-4">
              <label htmlFor="address" className="block text-gray-400 mb-2 text-sm sm:text-base">
                Endereço
              </label>
              <input
                type="text"
                id="address"
                value={editedAddress}
                onChange={(e) => setEditedAddress(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>
            
            {/* DOCUMENTAÇÃO: Campos de localização (opcionais)
                - Permite que o usuário informe/edite sua região, estado e cidade
                - Essas informações serão usadas nas enquetes criadas
            */}
            <div className="mt-3 sm:mt-4">
              <label className="block text-gray-400 mb-2 text-sm sm:text-base">
                Localização (opcional)
              </label>
              
              {/* Região */}
              <select
                value={editedRegion}
                onChange={(e) => {
                  setEditedRegion(e.target.value);
                  if (e.target.value !== editedRegion) {
                    setEditedState(""); // Resetar estado quando região mudar
                  }
                }}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base mb-2"
              >
                <option value="">Selecione a região</option>
                {BRAZIL_REGIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>

              {/* Estado */}
              <select
                value={editedState}
                onChange={(e) => setEditedState(e.target.value)}
                disabled={!editedRegion}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione o estado</option>
                {getStatesByRegion(editedRegion).map((st) => (
                  <option key={st.sigla} value={st.sigla}>
                    {st.nome} ({st.sigla})
                  </option>
                ))}
              </select>

              {/* Cidade */}
              <input
                type="text"
                placeholder="Cidade (opcional)"
                value={editedCity}
                onChange={(e) => setEditedCity(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>
            
            <div className="mt-3 sm:mt-4">
              <label className="block text-gray-400 mb-2 text-sm sm:text-base">Redes Sociais</label>
              <input
                type="url"
                placeholder="URL do Facebook"
                value={editedFacebookUrl}
                onChange={(e) => setEditedFacebookUrl(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-sm sm:text-base"
              />
              <input
                type="url"
                placeholder="URL do Instagram"
                value={editedInstagramUrl}
                onChange={(e) => setEditedInstagramUrl(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 text-sm sm:text-base"
              />
              <input
                type="url"
                placeholder="URL do Twitter"
                value={editedTwitterUrl}
                onChange={(e) => setEditedTwitterUrl(e.target.value)}
                className="w-full p-2.5 sm:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
              />
            </div>

            {/* Seletor de cor do tema */}
            <div className="mt-3 sm:mt-4">
              <label htmlFor="themeColor" className="block text-gray-400 mb-2 text-sm sm:text-base">
                Cor do Tema
              </label>
              <input
                type="color"
                id="themeColor"
                value={editedThemeColor}
                onChange={(e) => setEditedThemeColor(e.target.value)}
                className="w-full h-10 sm:h-12 rounded-lg bg-gray-700 border border-gray-600 cursor-pointer"
              />
            </div>

            {/* Botão Salvar Alterações */}
            {/* DOCUMENTAÇÃO: Botão responsivo com tamanho ajustado para mobile */}
            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={uploadingImage} // Desabilita o botão enquanto a imagem está sendo carregada
                className={`px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white font-bold rounded-lg transition duration-300 text-sm sm:text-base w-full sm:w-auto ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
              >
                Salvar Alterações
              </button>
            </div>

            {/* Removido: Botão "Ver Página Pública da Empresa" */}

          </div>
        </div>
      </div>

      {/* Modal de Criação de Enquete */}
      {/* DOCUMENTAÇÃO: Modal responsivo com padding ajustado para mobile */}
      {showCreatePollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 p-4 sm:p-8 rounded-lg shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreatePollModal(false)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-white text-xl sm:text-2xl z-10"
            >
              &times;
            </button>
            <PollForm isCommercial={user?.accountType === 'commercial'} onPollCreated={() => setShowCreatePollModal(false)} />
          </div>
        </div>
      )}

      {/* Modal do QR Code */}
      {/* DOCUMENTAÇÃO: Modal de QR Code responsivo - QR Code menor no mobile */}
      {showQrCodeModal && companyPublicPageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-4 sm:p-8 rounded-lg shadow-xl w-full max-w-sm relative flex flex-col items-center max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowQrCodeModal(false)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-800 hover:text-gray-600 text-xl sm:text-2xl z-10"
            >
              &times;
            </button>
            <Image
              src="/logoPrincipal.png"
              alt="PollApp Logo"
              width={80}
              height={80}
              className="mb-2 sm:w-[100px] sm:h-[100px]"
            />
            <div className="p-2 sm:p-4 bg-white rounded-lg shadow-inner">
              {/* DOCUMENTAÇÃO: QR Code responsivo - tamanho ajustado automaticamente */}
              <QRCode 
                value={companyPublicPageUrl} 
                size={qrCodeSize} 
                level="H" 
              />
            </div>
            <a
              href={companyPublicPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 sm:mt-4 text-indigo-600 hover:text-indigo-800 font-semibold text-sm sm:text-base text-center"
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
