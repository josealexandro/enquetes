import type { Config } from "tailwindcss";

// ============================================
// CONFIGURAÇÃO TAILWIND CSS - DARK MODE
// ============================================
// IMPORTANTE: darkMode: "class" significa que o Tailwind aplica estilos dark:*
// APENAS quando o elemento <html> tem a classe 'dark'
//
// COMO FUNCIONA:
//   1. JavaScript adiciona/remove classe 'dark' no <html> (via Header.tsx)
//   2. Tailwind detecta a classe e aplica estilos com prefixo 'dark:'
//   3. Exemplo: className="bg-white dark:bg-zinc-900"
//      - Sem classe 'dark': usa bg-white (branco)
//      - Com classe 'dark': usa bg-zinc-900 (escuro)
//
// ALTERNATIVAS NÃO USADAS:
//   - darkMode: "media" - respeitaria prefers-color-scheme (não queremos isso)
//   - darkMode: false - desabilitaria dark mode completamente
// ============================================

const config: Config = {
  darkMode: "class", // ✅ Habilita dark mode baseado na classe 'dark' no elemento <html>
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        gold: '0 10px 15px -3px rgba(252, 211, 77, 0.5), 0 4px 6px -2px rgba(252, 211, 77, 0.2)',
        silver: '0 10px 15px -3px rgba(209, 213, 219, 0.5), 0 4px 6px -2px rgba(209, 213, 219, 0.2)',
        bronze: '0 10px 15px -3px rgba(217, 119, 6, 0.5), 0 4px 6px -2px rgba(217, 119, 6, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;






































