"use client";

import { useState } from "react";
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
  const [accountType, setAccountType] = useState<'personal' | 'commercial'>('personal'); // Reintroduzir o estado para o tipo de conta
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Reintroduzir o estado para o arquivo de avatar
  const [brandName, setBrandName] = useState(""); // Reintroduzir estado para nome da marca
  const [logoUrl, setLogoUrl] = useState(""); // Reintroduzir estado para URL do logo
  const [brandColor1, setBrandColor1] = useState(""); // Reintroduzir estado para cor da marca 1
  const [brandColor2, setBrandColor2] = useState(""); // Reintroduzir estado para cor da marca 2
  const [brandColor3, setBrandColor3] = useState(""); // Reintroduzir estado para cor da marca 3
  const [presentationText, setPresentationText] = useState(""); // Reintroduzir estado para texto de apresentação
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

    if (displayName.trim().length < 3) {
      setError("O nome/apelido deve ter pelo menos 3 caracteres.");
      setLoading(false);
      return;
    }

    // Validação adicional para campos comerciais
    if (accountType === 'commercial') {
      if (brandName.trim().length < 3) {
        setError("O nome da marca deve ter pelo menos 3 caracteres.");
        setLoading(false);
        return;
      }
      // Adicione validações para logoUrl, brandColor, presentationText se necessário
    }

    try {
      await signup(email, password, displayName, accountType, avatarFile);
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
        {/* Campo para Nome / Apelido */}
        <input
          type="text"
          placeholder="Nome / Apelido"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          required
        />
        
        {/* Campo para Upload de Avatar */}
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
        
        {/* Campos para Conta Comercial */}
        {accountType === 'commercial' && (
          <div className="space-y-4 p-4 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900">
            <p className="font-semibold text-blue-800 dark:text-blue-200">Detalhes da Marca</p>
            <div>
              <label htmlFor="brandName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome da Marca</label>
              <input
                type="text"
                id="brandName"
                placeholder="Nome da sua marca"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                required={accountType === 'commercial'}
              />
            </div>
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL do Logo</label>
              <input
                type="text"
                id="logoUrl"
                placeholder="https://seulogo.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Cores da Marca (hex)</label>
              <div className="flex space-x-2 mt-1">
                <input
                  type="text"
                  placeholder="#RRGGBB"
                  value={brandColor1}
                  onChange={(e) => setBrandColor1(e.target.value)}
                  className="w-1/3 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
                <input
                  type="text"
                  placeholder="#RRGGBB"
                  value={brandColor2}
                  onChange={(e) => setBrandColor2(e.target.value)}
                  className="w-1/3 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
                <input
                  type="text"
                  placeholder="#RRGGBB"
                  value={brandColor3}
                  onChange={(e) => setBrandColor3(e.target.value)}
                  className="w-1/3 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="presentationText" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Texto de Apresentação</label>
              <textarea
                id="presentationText"
                placeholder="Apresente sua marca em poucas palavras..."
                rows={3}
                value={presentationText}
                onChange={(e) => setPresentationText(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        )}
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
