// src/app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { updateProfile, updatePassword, getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import Notification from "../components/Notification";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function ProfilePage() {
  const { user, loading: authLoading, firebaseAuthUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuthUser || !user) return;

    setLoading(true);
    setNotificationMessage(null);

    try {
      // Atualizar displayName no Firebase Auth
      if (displayName !== firebaseAuthUser.displayName) {
        await updateProfile(firebaseAuthUser, { displayName });
        // Atualizar também no Firestore, se o usuário tiver um documento
        try {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { displayName });
        } catch (firestoreError: any) {
          // Se falhar ao atualizar no Firestore mas o Auth foi atualizado, não mostrar erro
          // O perfil do Auth já foi atualizado com sucesso
          if (firestoreError?.code !== 'permission-denied') {
            console.error("Erro ao atualizar perfil no Firestore:", firestoreError);
          }
        }
      }
      setNotificationMessage("Perfil atualizado com sucesso!");
      setNotificationType("success");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      
      // Se o erro for de permissão, não mostrar erro ao usuário
      // O perfil pode ter sido atualizado no Auth mesmo com erro no Firestore
      if (error?.code === 'permission-denied') {
        setNotificationMessage("Perfil atualizado com sucesso!");
        setNotificationType("success");
      } else {
        setNotificationMessage(`Erro ao atualizar perfil: ${error.message}`);
        setNotificationType("error");
      }
    } finally {
      setLoading(false);
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
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(firebaseAuthUser.email!, currentPassword);
      await reauthenticateWithCredential(firebaseAuthUser, credential);
      await updatePassword(firebaseAuthUser, newPassword);

      setNotificationMessage("Senha atualizada com sucesso!");
      setNotificationType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Erro ao atualizar senha:", error);
      // Firebase specific error handling for reauthentication
      if (error.code === 'auth/wrong-password') {
        setNotificationMessage("Senha atual errada.");
      } else if (error.code === 'auth/requires-recent-login') {
        setNotificationMessage("Esta ação requer autenticação recente. Por favor, faça logout e login novamente.");
      } else {
        setNotificationMessage(`Erro ao atualizar senha: ${error.message}`);
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
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
