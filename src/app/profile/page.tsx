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
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-zinc-300 text-sm font-bold mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
              required
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-zinc-300 text-sm font-bold mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              id="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-zinc-900 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
              required
            />
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
