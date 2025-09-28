import React, { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onLoginSuccess?.();
    } catch (err: unknown) { // Alterado de 'Error' para 'unknown'
      if (err instanceof Error) {
        setError(err.message || 'Erro ao fazer login. Tente novamente.');
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-zinc-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Entrar</h2>
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
        <input
          type="email"
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
