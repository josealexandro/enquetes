"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

interface LoginProps {
  onLoginSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export default function Login({ onLoginSuccess, onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Estado para controlar visibilidade da senha (mostrar/ocultar)
  const [showResetPassword, setShowResetPassword] = useState(false); // Estado para mostrar/ocultar formulário de recuperação
  const [resetEmail, setResetEmail] = useState(""); // Email para recuperação de senha
  const [resetMessage, setResetMessage] = useState<string | null>(null); // Mensagem de sucesso/erro na recuperação
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onLoginSuccess?.();
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error) { 
        const firebaseError = error as { code: string; message: string }; 
        switch (firebaseError.code) {
          case 'auth/invalid-credential':
            setError("Email ou senha incorretos.");
            break;
          case 'auth/user-disabled':
            setError("Esta conta foi desabilitada.");
            break;
          case 'auth/invalid-email':
            setError("Formato de email inválido.");
            break;
          default:
            setError("Ocorreu um erro ao fazer login. Tente novamente.");
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocorreu um erro desconhecido.");
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onLoginSuccess?.();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocorreu um erro ao fazer login com Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com recuperação de senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetMessage("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setResetEmail(""); // Limpar campo após sucesso
      // Fechar formulário após 3 segundos
      setTimeout(() => {
        setShowResetPassword(false);
        setResetMessage(null);
      }, 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setResetMessage(error.message);
      } else {
        setResetMessage("Erro ao enviar email de recuperação. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-lg mt-10">
      <h2 className="text-3xl font-poppins font-semibold text-center text-zinc-900 dark:text-white mb-6">
        Login
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60"
          >
            <span className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                Verifique os dados e tente novamente. Esqueceu a senha? Use &quot;Esqueci minha senha&quot; abaixo.
              </p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        {/* Campo de senha com ícone de mostrar/ocultar */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"} // Alterna entre text e password baseado no estado showPassword
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 pr-10 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
            required
          />
          {/* Botão para alternar visibilidade da senha - ícone muda conforme estado */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none"
          >
            {showPassword ? (
              // Ícone de olho fechado (senha visível)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              // Ícone de olho aberto (senha oculta)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {/* Link para recuperar senha */}
        <div className="text-right">
          <button
            type="button"
            onClick={() => {
              setShowResetPassword(!showResetPassword);
              setResetEmail(email); // Preencher com o email já digitado
              setResetMessage(null);
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
          disabled={loading}
        >
          {loading ? "Carregando..." : "Entrar"}
        </button>
      </form>

      {/* Formulário de recuperação de senha */}
      {showResetPassword && (
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-300 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Recuperar Senha
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>
          <form onSubmit={handleResetPassword} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
              required
            />
            {resetMessage && (
              <div
                role="alert"
                className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                  resetMessage.includes("enviado")
                    ? "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/60"
                    : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60"
                }`}
              >
                {resetMessage.includes("enviado") ? (
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                )}
                <p className={resetMessage.includes("enviado") ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                  {resetMessage}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail("");
                  setResetMessage(null);
                }}
                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">ou</span>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-4 w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-poppins font-medium shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>
      </div>
      
      <p className="text-center text-zinc-600 dark:text-zinc-400 mt-4">
        Não tem uma conta? {" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-indigo-600 hover:underline"
        >
          Cadastre-se
        </button>
      </p>
    </div>
  );
}
