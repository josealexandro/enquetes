// src/app/components/CompanyRatingInput.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';

const NPS_CLIENT_ID_KEY = "nps_client_id";

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(NPS_CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `nps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(NPS_CLIENT_ID_KEY, id);
  }
  return id;
}

interface CompanyRatingInputProps {
  companyId: string;
  onRatingSubmitted: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CompanyRatingInput: React.FC<CompanyRatingInputProps> = ({ companyId, onRatingSubmitted }) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hasRated, setHasRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!companyId) return;

    const clientId = getOrCreateClientId();
    if (!clientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/nps?companyId=${encodeURIComponent(companyId)}&clientId=${encodeURIComponent(clientId)}`)
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Erro ao buscar avaliação");
        return res.json();
      })
      .then((data) => {
        if (data?.exists && typeof data.score === "number") {
          setUserScore(data.score);
          setSelectedScore(data.score);
          if (typeof data.comment === "string") setComment(data.comment);
          setHasRated(true);
        }
      })
      .catch((err) => console.error("Erro ao buscar avaliação:", err))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSubmit = async () => {
    if (selectedScore === null) {
      onRatingSubmitted("Escolha uma nota de 0 a 10 antes de enviar.", "info");
      return;
    }

    if (user?.uid === companyId) {
      onRatingSubmitted("Ação não permitida: Você não pode avaliar sua própria empresa.", "error");
      return;
    }

    const clientId = getOrCreateClientId();
    if (!clientId) {
      onRatingSubmitted("Não foi possível identificar seu dispositivo. Tente novamente.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          clientId,
          score: selectedScore,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        onRatingSubmitted(data.message ?? "Erro ao registrar sua avaliação. Tente novamente.", "error");
        return;
      }

      setUserScore(selectedScore);
      setHasRated(true);
      onRatingSubmitted("Sua avaliação foi registrada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      onRatingSubmitted("Erro ao registrar sua avaliação. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400 text-center">Carregando avaliação...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700 dark:text-zinc-300 text-center font-medium">
        De 0 a 10, quanto você recomendaria esta empresa para um amigo?
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((score) => (
          <motion.button
            key={score}
            type="button"
            onClick={() => setSelectedScore(score)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-9 h-9 rounded-full text-sm font-semibold flex items-center justify-center border transition-colors
              ${selectedScore === score
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
          >
            {score}
          </motion.button>
        ))}
      </div>

      {selectedScore !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Sua nota:{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{selectedScore}</span>
            </span>
            {/* Pequena indicação visual de estrelas aproximadas, sem interação */}
            <span className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => {
                const mapped = Math.max(1, Math.min(5, Math.round(selectedScore / 2)));
                return (
                  <FontAwesomeIcon
                    key={star}
                    icon={solidStar}
                    className={`text-[10px] ${star <= mapped ? "text-yellow-400" : "text-zinc-300 dark:text-zinc-700"}`}
                  />
                );
              })}
            </span>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="nps-comment"
              className="block text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              (Opcional) Conte brevemente por que você deu essa nota:
            </label>
            <textarea
              id="nps-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Escreva seu comentário (opcional)"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            Enviar avaliação
          </button>

          {hasRated && userScore !== null && (
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Sua última avaliação registrada foi{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{userScore}</span>.
              Você pode atualizar sua nota a qualquer momento.
            </p>
          )}
        </div>
      )}

      {selectedScore === null && hasRated && userScore !== null && (
        <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
          Sua última avaliação registrada foi{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">{userScore}</span>.
          Se quiser, escolha uma nova nota para atualizar.
        </p>
      )}
    </div>
  );
};

export default CompanyRatingInput;
