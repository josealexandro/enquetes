// src/app/components/CompanyRatingInput.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';

interface CompanyRatingInputProps {
  companyId: string;
  onRatingSubmitted: (message: string, type: 'success' | 'error' | 'info') => void; // Callback para quando a avaliação for enviada
}

const CompanyRatingInput: React.FC<CompanyRatingInputProps> = ({ companyId, onRatingSubmitted }) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null); // Nota NPS escolhida (0-10)
  const [userScore, setUserScore] = useState<number | null>(null); // Nota NPS já salva para o usuário
  const [comment, setComment] = useState(""); // Comentário opcional
  const [hasRated, setHasRated] = useState(false); // Se o usuário já avaliou
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user || !companyId) return;

      setLoading(true);
      try {
        const ratingsRef = collection(db, `users/${companyId}/ratings`);
        const q = query(ratingsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const ratingDoc = querySnapshot.docs[0];
          const data = ratingDoc.data();
          // Se já existir npsScore, usa; senão, deriva de rating antigo (1-5) multiplicando por 2
          const existingScore: number | null =
            typeof data.npsScore === "number"
              ? data.npsScore
              : typeof data.rating === "number"
                ? Math.max(0, Math.min(10, Math.round((data.rating as number) * 2)))
                : null;

          if (existingScore !== null) {
            setUserScore(existingScore);
            setSelectedScore(existingScore);
          }

          if (typeof data.comment === "string") {
            setComment(data.comment);
          }

          setHasRated(true);
        }
      } catch (error) {
        console.error("Erro ao buscar avaliação do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRating();
  }, [user, companyId]);

  const handleSubmit = async () => {
    if (selectedScore === null) {
      onRatingSubmitted("Escolha uma nota de 0 a 10 antes de enviar.", "info");
      return;
    }

    if (!user) {
      alert("Você precisa estar logado para avaliar.");
      return;
    }

    if (user.uid === companyId) {
      onRatingSubmitted("Ação não permitida: Você não pode avaliar sua própria empresa.", "error");
      return;
    }

    // Mapear NPS (0-10) para rating em estrelas (1-5) para compatibilidade com a lógica existente
    const mappedStarRating = Math.max(1, Math.min(5, Math.round(selectedScore / 2)));

    setLoading(true);
    try {
      const ratingDocRef = doc(db, `users/${companyId}/ratings`, user.uid); // Usar UID do usuário como ID do documento
      await setDoc(
        ratingDocRef,
        {
          userId: user.uid,
          empresaId: companyId,
          rating: mappedStarRating,
          npsScore: selectedScore,
          score: selectedScore,
          comment: comment.trim() || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      ); // Usar merge para atualizar se já existir

      setUserScore(selectedScore);
      setHasRated(true);
      onRatingSubmitted("Sua avaliação foi registrada com sucesso!", "success"); // Usar a prop para notificação
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      onRatingSubmitted("Erro ao registrar sua avaliação. Tente novamente.", "error"); // Usar a prop para notificação
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
