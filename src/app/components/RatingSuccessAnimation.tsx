// src/app/components/RatingSuccessAnimation.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';

interface RatingSuccessAnimationProps {
  show: boolean;
  onAnimationComplete: () => void;
  starsCount?: number;
}

const RatingSuccessAnimation: React.FC<RatingSuccessAnimationProps> = ({ show, onAnimationComplete, starsCount = 5 }) => {
  const [stars, setStars] = useState<number[]>([]);

  useEffect(() => {
    if (show) {
      const newStars = Array.from({ length: starsCount }, (_, i) => i);
      setStars(newStars);
      const timer = setTimeout(() => {
        onAnimationComplete();
        setStars([]); // Limpa as estrelas após a animação
      }, 1500); // Tempo total da animação de cada estrela
      return () => clearTimeout(timer);
    }
  }, [show, starsCount, onAnimationComplete]);

  const starVariants = {
    hidden: { opacity: 0, y: 0, scale: 0.5 },
    visible: {
      opacity: [0, 1, 0.8, 0],
      y: [0, -100, -200, -300], // Sobe mais alto
      scale: [0.5, 1, 1.2, 0.8],
      transition: {
        duration: 1.5,
        ease: "easeOut", // Revertido para string para tentar resolver o erro de tipo
      },
    },
  };

  if (!show) return null;

  return (
    <AnimatePresence> {/* Adicionar AnimatePresence aqui */}
      {show && (
        <div className="fixed inset-0 pointer-events-none z-40 flex justify-center items-center overflow-hidden">
          {stars.map((_, index) => (
            <motion.div
              key={index}
              variants={starVariants}
              initial="hidden"
              animate="visible"
              style={{
                position: 'absolute',
                left: `calc(50% + ${Math.random() * 80 - 40}px)`,
                bottom: '40%',
                fontSize: `${18 + Math.random() * 10}px`,
                color: 'gold',
              }}
              transition={{ delay: index * 0.1, ...starVariants.visible.transition }}
            >
              <FontAwesomeIcon icon={solidStar} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default RatingSuccessAnimation;
