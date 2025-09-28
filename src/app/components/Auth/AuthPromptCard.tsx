import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthPromptCardProps {
  message: string;
  onClose: () => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
  autoCloseDelay?: number; // Tempo em ms para fechar automaticamente (opcional)
}

export default function AuthPromptCard({
  message,
  onClose,
  onLoginClick,
  onSignupClick,
  autoCloseDelay = 5000,
}: AuthPromptCardProps) {
  useEffect(() => {
    if (autoCloseDelay) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 text-white p-6 rounded-lg shadow-xl z-50 max-w-sm w-full border border-indigo-500"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white transition-colors duration-200"
          aria-label="Fechar"
        >
          &times;
        </button>
        <p className="text-lg font-semibold mb-4 text-center">{message}</p>
        <div className="flex justify-center space-x-4">
          <motion.button
            onClick={onLoginClick}
            className="px-6 py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Entrar
          </motion.button>
          <motion.button
            onClick={onSignupClick}
            className="px-6 py-2 rounded-full bg-gray-200 text-zinc-800 font-medium hover:bg-gray-300 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cadastre-se
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
