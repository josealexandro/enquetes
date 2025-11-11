// src/app/components/Notification.tsx
"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface NotificationProps {
  message: string | null;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number; // Duração em milissegundos para a notificação desaparecer (default: 3000ms)
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  const bgColorClass = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    success: faCheckCircle,
    error: faTimesCircle,
    info: faInfoCircle,
  }[type];

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white flex items-center space-x-3 z-50 ${bgColorClass}`}
        >
          <FontAwesomeIcon icon={icon} className="text-xl" />
          <p className="font-medium">{message}</p>
          <button onClick={onClose} className="ml-auto text-white hover:text-gray-100">
            <FontAwesomeIcon icon={faTimesCircle} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
