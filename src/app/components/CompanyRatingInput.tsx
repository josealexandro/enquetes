// src/app/components/CompanyRatingInput.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';

interface CompanyRatingInputProps {
  companyId: string;
  onRatingSubmitted: (message: string, type: 'success' | 'error' | 'info') => void; // Callback para quando a avaliação for enviada
}

const CompanyRatingInput: React.FC<CompanyRatingInputProps> = ({ companyId, onRatingSubmitted }) => {
  const [currentRating, setCurrentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0); // Avaliação atual do usuário
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
          setUserRating(data.rating);
          setCurrentRating(data.rating); // Define a visualização inicial
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

  const handleStarClick = async (ratingValue: number) => {
    if (!user) {
      alert("Você precisa estar logado para avaliar.");
      return;
    }

    setLoading(true);
    try {
      const ratingDocRef = doc(db, `users/${companyId}/ratings`, user.uid); // Usar UID do usuário como ID do documento
      await setDoc(ratingDocRef, {
        userId: user.uid,
        rating: ratingValue,
        createdAt: serverTimestamp(),
      }, { merge: true }); // Usar merge para atualizar se já existir

      setUserRating(ratingValue);
      setCurrentRating(ratingValue);
      setHasRated(true);
      onRatingSubmitted("Sua avaliação foi registrada com sucesso!", "success"); // Usar a prop para notificação
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      onRatingSubmitted("Erro ao registrar sua avaliação. Tente novamente.", "error"); // Usar a prop para notificação
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hasRated ? userRating : currentRating;

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400 text-center">Carregando avaliação...</div>;
  }

  return (
    <div className="flex items-center justify-center space-x-1">
      {[1, 2, 3, 4, 5].map((starValue) => (
        <motion.span
          key={starValue}
          className="cursor-pointer"
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => handleStarClick(starValue)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FontAwesomeIcon
            icon={starValue <= (hoverRating || displayRating) ? solidStar : regularStar}
            className={`text-2xl ${starValue <= (hoverRating || displayRating) ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-600'}`}
          />
        </motion.span>
      ))}
      {hasRated && <p className="ml-2 text-gray-600 dark:text-gray-300">({userRating} estrelas)</p>}
    </div>
  );
};

export default CompanyRatingInput;
