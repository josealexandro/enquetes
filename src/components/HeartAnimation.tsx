"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeartAnimationProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
  originX: number; // Nova prop: posição X de origem
  originY: number; // Nova prop: posição Y de origem
}

const HeartAnimation: React.FC<HeartAnimationProps> = ({ isVisible, onAnimationComplete, originX, originY }) => {
  const [hearts, setHearts] = useState<{ id: number; delay: number }[]>([]);

  useEffect(() => {
    if (isVisible) {
      const newHearts = Array.from({ length: 10 }).map((_, i) => ({
        id: Date.now() + i,
        delay: i * 0.1, // Atraso para cada coração
      }));
      setHearts(newHearts);

      // Limpa os corações após a animação
      const timer = setTimeout(() => {
        setHearts([]);
        onAnimationComplete();
      }, 3500); // Ajustar para 3500ms (3.5s) para corresponder à nova duração da transição

      return () => clearTimeout(timer);
    }
  }, [isVisible, onAnimationComplete]);

  return (
    <div className="heart-animation-container absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -250, scale: 1 }} // Aumentar para -250 para ir ainda mais alto
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, delay: heart.delay, ease: "easeOut" }} // Aumentar para 3.5s para ir mais devagar
            onAnimationComplete={() => {
              // Pode ser útil para debug, mas a limpeza principal é feita pelo setTimeout
            }}
            className="absolute text-red-500"
            style={{
              left: `${originX + (Math.random() - 0.5) * 20}px`, // Usar originX e adicionar pequena variação
              top: `${originY + (Math.random() - 0.5) * 20}px`, // Usar originY e adicionar pequena variação
              fontSize: `${Math.random() * 15 + 15}px`, // Tamanho aleatório entre 15px e 30px (um pouco maiores)
            }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default HeartAnimation;
