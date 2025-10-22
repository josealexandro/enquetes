"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext"; // Importar useAuth

interface SignupProps {
  onSwitchToLogin?: () => void;
  onSignupSuccessWithAccountType?: (accountType: 'personal' | 'commercial') => void; // Nova prop
}

export default function Signup({ onSwitchToLogin, onSignupSuccessWithAccountType }: SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); // Restaurado
  const [commercialName, setCommercialName] = useState(""); // Novo estado para nome comercial
  const [accountType, setAccountType] = useState<'personal' | 'commercial'>('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Restaurado
  // REMOVIDO: const [brandName, setBrandName] = useState("");
  // REMOVIDO: const [logoUrl, setLogoUrl] = useState("");
  // REMOVIDO: const [brandColor1, setBrandColor1] = useState("");
  // REMOVIDO: const [brandColor2, setBrandColor2] = useState("");
  // REMOVIDO: const [brandColor3, setBrandColor3] = useState("");
  // REMOVIDO: const [presentationText, setPresentationText] = useState("");
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

    // Validação de displayName apenas para contas pessoais
    if (accountType === 'personal' && displayName.trim().length < 3) {
      setError("O nome/apelido deve ter pelo menos 3 caracteres para contas pessoais.");
      setLoading(false);
      return;
    }

    // Validação de commercialName apenas para contas comerciais
    if (accountType === 'commercial' && commercialName.trim().length < 3) {
      setError("O nome comercial deve ter pelo menos 3 caracteres para contas comerciais.");
      setLoading(false);
      return;
    }

    try {
      const finalDisplayName = accountType === 'personal' ? displayName : email; // Usar email como nome para contas comerciais
      const finalAvatarFile = accountType === 'personal' ? avatarFile : null; // Nulo para contas comerciais

      await signup(email, password, finalDisplayName, accountType, 
        accountType === 'commercial' ? commercialName : null, // Passar commercialName se for conta comercial
        finalAvatarFile);
      // Chamar a nova prop com o accountType
      onSignupSuccessWithAccountType?.(accountType);
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

      {/* Opção de Tipo de Conta */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">🔘 Tipo de conta:</label>
        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-indigo-600 dark:text-indigo-400"
              name="accountType"
              value="personal"
              checked={accountType === 'personal'}
              onChange={() => setAccountType('personal')}
            />
            <span className="ml-2 text-zinc-700 dark:text-zinc-300">Pessoal</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-indigo-600 dark:text-indigo-400"
              name="accountType"
              value="commercial"
              checked={accountType === 'commercial'}
              onChange={() => setAccountType('commercial')}
            />
            <span className="ml-2 text-zinc-700 dark:text-zinc-300">Comercial</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-center">{error}</p>}
        
        {/* Campos para Conta Pessoal */}
        {accountType === 'personal' && (
          <>
            <input
              type="text"
              placeholder="Nome / Apelido"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
              required
            />
            
            <div>
              <label htmlFor="avatarUpload" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Foto de Perfil</label>
              <input
                type="file"
                id="avatarUpload"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                className="mt-1 block w-full text-zinc-900 dark:text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
              />
            </div>
          </>
        )}

        {/* Campos para Conta Comercial */}
        {accountType === 'commercial' && (
          <input
            type="text"
            placeholder="Nome da Empresa / Marca"
            value={commercialName}
            onChange={(e) => setCommercialName(e.target.value)}
            className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
            required
          />
        )}

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
        
        {/* REMOVIDO: Campos para Conta Comercial */}
        
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
