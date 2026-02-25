// src/app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { updateProfile, updatePassword, getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import Notification from "../components/Notification";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";

export default function ProfilePage() {
  const { user, loading: authLoading, firebaseAuthUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  // Estados para controlar visibilidade das senhas (mostrar/ocultar)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.accountType === 'commercial')) {
      router.push('/'); // Redireciona se não for um usuário público logado
    }
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user, authLoading, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setNotificationMessage("Por favor, selecione uma imagem válida.");
        setNotificationType("error");
        setTimeout(() => setNotificationMessage(null), 3000);
        return;
      }

      // Validar tamanho (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setNotificationMessage("A imagem deve ter no máximo 5MB.");
        setNotificationType("error");
        setTimeout(() => setNotificationMessage(null), 3000);
        return;
      }

      setAvatarFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuthUser || !user) return;

    setLoading(true);
    setUploadingAvatar(false);
    setNotificationMessage(null);

    try {
      let avatarUrl: string | null = user.avatarUrl || firebaseAuthUser.photoURL || null;

      // Upload de avatar se houver arquivo selecionado
      if (avatarFile) {
        setUploadingAvatar(true);
        try {
          const storage = getStorage();
          // Usar timestamp no nome do arquivo para evitar sobrescrever
          const timestamp = Date.now();
          const fileName = `${timestamp}-${avatarFile.name}`;
          const avatarRef = ref(storage, `avatars/${user.uid}/${fileName}`);
          
          // Upload do arquivo
          const snapshot = await uploadBytes(avatarRef, avatarFile, {
            contentType: avatarFile.type || 'image/png'
          });
          
          // Obter URL do arquivo
          avatarUrl = await getDownloadURL(snapshot.ref);
          setUploadingAvatar(false);
        } catch (uploadError: unknown) {
          setUploadingAvatar(false);
          console.error("Erro ao fazer upload do avatar:", uploadError);
          setNotificationMessage(`Erro ao fazer upload da imagem: ${uploadError instanceof Error ? uploadError.message : "Erro desconhecido"}`);
          setNotificationType("error");
          setLoading(false);
          return;
        }
      }

      // Preparar dados para atualização
      const updateData: { displayName?: string; photoURL?: string | null } = {};
      const firestoreUpdateData: { displayName?: string; avatarUrl?: string | null } = {};

      // Atualizar displayName
      if (displayName !== firebaseAuthUser.displayName) {
        updateData.displayName = displayName;
        firestoreUpdateData.displayName = displayName;
      }

      // Atualizar avatar se houver mudança
      if (avatarUrl && avatarUrl !== (user.avatarUrl || firebaseAuthUser.photoURL)) {
        updateData.photoURL = avatarUrl;
        firestoreUpdateData.avatarUrl = avatarUrl;
      }

      // Atualizar Firebase Auth
      if (Object.keys(updateData).length > 0) {
        await updateProfile(firebaseAuthUser, updateData);
      }

      // Atualizar Firestore
      if (Object.keys(firestoreUpdateData).length > 0) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, firestoreUpdateData);
        } catch (firestoreError: unknown) {
          const code = firestoreError && typeof firestoreError === "object" && "code" in firestoreError ? (firestoreError as { code: string }).code : undefined;
          if (code !== "permission-denied") {
            console.error("Erro ao atualizar perfil no Firestore:", firestoreError);
          }
        }
      }

      // Limpar estados do avatar
      setAvatarFile(null);
      setAvatarPreview(null);

      setNotificationMessage("Perfil atualizado com sucesso!");
      setNotificationType("success");
    } catch (error: unknown) {
      console.error("Erro ao atualizar perfil:", error);
      const code = error && typeof error === "object" && "code" in error ? (error as { code: string }).code : undefined;
      if (code === "permission-denied") {
        setNotificationMessage("Perfil atualizado com sucesso!");
        setNotificationType("success");
      } else {
        setNotificationMessage(`Erro ao atualizar perfil: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        setNotificationType("error");
      }
    } finally {
      setLoading(false);
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuthUser || !user) return;

    setLoading(true);
    setNotificationMessage(null);

    if (newPassword !== confirmNewPassword) {
      setNotificationMessage("As novas senhas não coincidem.");
      setNotificationType("error");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setNotificationMessage("A nova senha deve ter pelo menos 6 caracteres.");
      setNotificationType("error");
      setLoading(false);
      return;
    }

    try {
      getAuth();
      const credential = EmailAuthProvider.credential(firebaseAuthUser.email!, currentPassword);
      await reauthenticateWithCredential(firebaseAuthUser, credential);
      await updatePassword(firebaseAuthUser, newPassword);

      setNotificationMessage("Senha atualizada com sucesso!");
      setNotificationType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      console.error("Erro ao atualizar senha:", error);
      const err = error && typeof error === "object" && "code" in error ? (error as { code: string; message?: string }) : null;
      if (err?.code === "auth/wrong-password") {
        setNotificationMessage("Senha atual errada.");
      } else if (err?.code === "auth/requires-recent-login") {
        setNotificationMessage("Esta ação requer autenticação recente. Por favor, faça logout e login novamente.");
      } else {
        setNotificationMessage(`Erro ao atualizar senha: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
      setNotificationType("error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-zinc-900 text-white">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-zinc-900 text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Meu Perfil</h1>

      <div className="w-full max-w-md bg-zinc-800 p-8 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-6">Informações do Perfil</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Foto de Perfil */}
          <div>
            <label htmlFor="avatar" className="block text-zinc-300 text-sm font-bold mb-2">
              Foto de Perfil
            </label>
            <div className="flex items-center gap-4 mb-4">
              {/* Avatar atual ou preview */}
              {(avatarPreview || user?.avatarUrl || firebaseAuthUser?.photoURL) && (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-600">
                  <Image
                    src={avatarPreview || user?.avatarUrl || firebaseAuthUser?.photoURL || ""}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  disabled={loading || uploadingAvatar}
                />
                <p className="text-xs text-zinc-400 mt-1">Formatos aceitos: JPG, PNG, GIF (máx. 5MB)</p>
              </div>
            </div>
            {uploadingAvatar && (
              <p className="text-sm text-blue-400 mb-2">Enviando imagem...</p>
            )}
          </div>

          {/* Nome de Exibição */}
          <div>
            <label htmlFor="displayName" className="block text-zinc-300 text-sm font-bold mb-2">
              Nome de Exibição
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading || uploadingAvatar}
          >
            {loading || uploadingAvatar ? "Salvando..." : "Salvar Alterações"}
          </button>
        </form>
      </div>

      <div className="w-full max-w-md bg-zinc-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-6">Alterar Senha</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-zinc-300 text-sm font-bold mb-2">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 pr-10 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 focus:outline-none"
              >
                {showCurrentPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-zinc-300 text-sm font-bold mb-2">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 pr-10 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 focus:outline-none"
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-zinc-300 text-sm font-bold mb-2">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 pr-10 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Alterar Senha"}
          </button>
        </form>
      </div>

      <Notification
        message={notificationMessage}
        type={notificationType}
        onClose={() => setNotificationMessage(null)}
      />
    </div>
  );
}
