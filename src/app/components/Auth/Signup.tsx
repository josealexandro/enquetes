"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth

interface SignupProps {
  onSignupSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function Signup({ onSignupSuccess, onSwitchToLogin }: SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); // Novo estado para o nome/apelido
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth(); // Usar o hook useAuth

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      await signup(email, password, displayName); // Chamar a função signup do AuthContext
      onSignupSuccess?.();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocorreu um erro desconhecido.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-lg mt-10">
      <h2 className="text-3xl font-poppins font-semibold text-center text-zinc-900 dark:text-white mb-6">
        Cadastre-se
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-center">{error}</p>}
        {/* Campo para Nome / Apelido */}
        <input
          type="text"
          placeholder="Nome / Apelido"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        <input
          type="password"
          placeholder="Confirmar Senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
          disabled={loading}
        >
          {loading ? "Carregando..." : "Cadastrar"}
        </button>
      </form>
      <p className="text-center text-zinc-600 dark:text-zinc-400 mt-4">
        Já tem uma conta? {" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-600 hover:underline"
        >
          Entrar
        </button>
      </p>
    </div>
  );
}
