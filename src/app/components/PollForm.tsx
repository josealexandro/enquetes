"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid"; // Instale com: npm install uuid

interface PollFormProps {
  onAddPoll?: (title: string, options: string[]) => void;
  onPollCreated?: () => void; // New prop for callback
}

export default function PollForm({ onAddPoll, onPollCreated }: PollFormProps) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

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

  const savePollToLocalStorage = (title: string, options: string[]) => {
    const existingPolls = JSON.parse(localStorage.getItem("polls") || "[]");

    const newPoll = {
      id: uuidv4(),
      title,
      options: options.map((opt) => ({
        id: uuidv4(),
        text: opt,
        votes: 0,
      })),
      creator: {
        name: "Usuário Anônimo",
        avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
      },
    };

    const updatedPolls = [...existingPolls, newPoll];
    localStorage.setItem("polls", JSON.stringify(updatedPolls));
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    try {
      onAddPoll?.(trimmedTitle, filteredOptions);
      setFeedbackMessage("Enquete criada com sucesso!");
      setFeedbackType("success");
      setTitle("");
      setOptions(["", ""]);
      setTimeout(() => {
        setFeedbackMessage(null);
        onPollCreated?.(); // Call the callback after poll creation
      }, 3000);
    } catch (error) {
      setFeedbackMessage("Erro ao criar enquete.");
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
            <button
              type="button"
              onClick={() => removeOption(idx)}
              className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addOption}
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
      >
        Adicionar Opção
      </button>

      <button
        type="submit"
        className="w-full px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-poppins font-bold shadow-md hover:scale-105 transition-transform duration-300"
      >
        Criar Enquete
      </button>
    </form>
  );
}
