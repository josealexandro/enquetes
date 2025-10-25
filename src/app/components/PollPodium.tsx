"use client";

import React from 'react';
import { Poll } from '../types/poll';
import PollCard from './PollCard';
import { motion } from 'framer-motion'; // Importar motion

interface PollPodiumProps {
  polls: Poll[];
  onVote: (pollId: string, optionId: string) => void;
  onDelete: (pollId: string) => void;
  onCardClick?: (isCardExpanded: boolean) => void;
}

export default function PollPodium({ polls, onVote, onDelete, onCardClick }: PollPodiumProps) {
  console.log("PollPodium: onVote prop recebida:", onVote); // Este log é crucial

  const pollRank1 = polls.find(poll => poll.rank === 1);
  const pollRank2 = polls.find(poll => poll.rank === 2);
  const pollRank3 = polls.find(poll => poll.rank === 3);

  console.log("Polls no PollPodium:", polls); // Adicionar este log para inspecionar os dados

  return (
    <div className="flex flex-col items-end justify-center space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-8">
      {/* Posição 2 (Prata) */}
      {pollRank2 && (
        <motion.div
          key={pollRank2.id} // Usar id direto
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 w-full md:w-1/3 flex-shrink-0 -translate-y-8 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank2}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
          />
        </motion.div>
      )}

      {/* Posição 1 (Ouro) */}
      {pollRank1 && (
        <motion.div
          key={pollRank1.id} // Usar id direto
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1.1 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="relative z-20 w-full md:w-1/3 flex-shrink-0 -translate-y-16 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank1}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
          />
        </motion.div>
      )}

      {/* Posição 3 (Bronze) */}
      {pollRank3 && (
        <motion.div
          key={pollRank3.id} // Usar id direto
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-0 w-full md:w-1/3 flex-shrink-0 -translate-y-8 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank3}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
          />
        </motion.div>
      )}
    </div>
  );
}
