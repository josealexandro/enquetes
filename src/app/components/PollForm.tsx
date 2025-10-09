"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface PollFormProps {
  onAddPoll?: (title: string, options: string[], category: string) => void;
  onPollCreated?: () => void; // New prop for callback
}

export default function PollForm({ onAddPoll, onPollCreated }: PollFormProps) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [category, setCategory] = useState("Geral"); // Novo estado para a categoria, com valor padrão
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  const categories = ["Geral", "Política", "Games", "Gastronomia", "Filme", "Esportes", "Tecnologia", "Educação", "Música"];

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => { // Tornar handleSubmit assíncrono
    e.preventDefault();

    const trimmedTitle = title.trim();
    const filteredOptions = options.map(opt => opt.trim()).filter(opt => opt !== "");
    const hasDuplicates = new Set(filteredOptions).size !== filteredOptions.length;

    if (!trimmedTitle) {
      setFeedbackMessage("O título da enquete não pode estar vazio.");
      setFeedbackType("error");
      return;
    }

    if (filteredOptions.length < 2) {
      setFeedbackMessage("A enquete precisa de pelo menos duas opções válidas.");
      setFeedbackType("error");
      return;
    }

    if (hasDuplicates) {
      setFeedbackMessage("As opções devem ser únicas.");
      setFeedbackType("error");
      return;
    }

    if (!category) {
      setFeedbackMessage("Por favor, selecione uma categoria para a enquete.");
      setFeedbackType("error");
      return;
    }

    try {
      if (onAddPoll) {
        await onAddPoll(trimmedTitle, filteredOptions, category); // Chamar onAddPoll e aguardar com a categoria
      }
      setFeedbackMessage("Enquete criada com sucesso!");
      setFeedbackType("success");
      setTitle("");
      setOptions(["", ""]);
      setCategory("Geral"); // Resetar categoria para o padrão
      setTimeout(() => {
        setFeedbackMessage(null);
        onPollCreated?.();
      }, 3000);
    } catch (error) {
      console.error("Erro ao criar enquete:", error);
      setFeedbackMessage("Erro ao criar enquete."); // Usar mensagem mais genérica, já que o erro pode vir do Firestore
      setFeedbackType("error");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-800 p-8 rounded-lg shadow-md space-y-4"
    >
      <h2 className="text-3xl font-poppins font-semibold text-center text-zinc-900 dark:text-white">
        Criar Nova Enquete
      </h2>

      {feedbackMessage && (
        <div className={`p-3 rounded-md text-white ${
          feedbackType === "success" ? "bg-green-500" : "bg-red-500"
        }`}>
          {feedbackMessage}
        </div>
      )}

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white"
        required
      >
        <option value="">Selecione uma categoria</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Título da Enquete"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
        required
      />

      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-2">
          <input
            type="text"
            placeholder={`Opção ${idx + 1}`}
            value={opt}
            onChange={(e) => handleOptionChange(idx, e.target.value)}
            className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
            required
          />
          {options.length > 2 && (
            <motion.button
              type="button"
              onClick={() => removeOption(idx)}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          )}
        </div>
      ))}

      <motion.button
        type="button"
        onClick={addOption}
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Adicionar Opção
      </motion.button>

      <motion.button
        type="submit"
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Criar Enquete
      </motion.button>
    </form>
  );
}
