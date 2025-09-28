import React, { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";

interface SignupFormProps {
  onSignupSuccess?: () => void;
}

export default function SignupForm({ onSignupSuccess }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (displayName.trim().length < 3) {
      setError("O nome/apelido deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await signup(email, password, displayName);
      onSignupSuccess?.();
    } catch (err: Error) {
      setError(err.message || 'Erro ao cadastrar. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-zinc-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Criar Conta</h2>
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha</label>
        <input
          type="password"
          id="signup-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="signup-displayName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome / Apelido</label>
        <input
          type="text"
          id="signup-displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={3}
          className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}
