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

const getRankBgClass = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-gold";
    case 2:
      return "bg-gradient-to-br from-gray-300 to-gray-500 shadow-silver";
    case 3:
      return "bg-gradient-to-br from-orange-300 to-orange-500 shadow-bronze";
    default:
      return "dark:bg-zinc-800 shadow-md";
  }
};

const getRankBorderClass = (rank: number) => {
  switch (rank) {
    case 1:
      return "border-yellow-500"; // Borda para ouro
    case 2:
      return "border-gray-500";   // Borda para prata
    case 3:
      return "border-orange-500";  // Borda para bronze
    default:
      return "border-transparent"; // Borda padrão
  }
};

const getTextColorClass = (rank: number) => {
  switch (rank) {
    case 1:
    case 2:
    case 3:
      return "text-black"; // Cor do texto para cards ranqueados
    default:
      return "dark:text-white"; // Cor padrão do texto para cards não ranqueados
  }
};

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
          className="relative z-10 w-full md:w-1/3 flex-shrink-0 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank2}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
            rankColor={getRankBgClass(2)}
            borderColor={getRankBorderClass(2)}
            textColorClass={getTextColorClass(2)}
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
          className="relative z-20 w-full md:w-1/3 flex-shrink-0 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank1}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
            rankColor={getRankBgClass(1)}
            borderColor={getRankBorderClass(1)}
            textColorClass={getTextColorClass(1)}
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
          className="relative z-0 w-full md:w-1/3 flex-shrink-0 md:-translate-y-0"
        >
          <PollCard
            poll={pollRank3}
            onVote={onVote}
            onDelete={onDelete}
            onCardClick={onCardClick}
            rankColor={getRankBgClass(3)}
            borderColor={getRankBorderClass(3)}
            textColorClass={getTextColorClass(3)}
          />
        </motion.div>
      )}
    </div>
  );
}
