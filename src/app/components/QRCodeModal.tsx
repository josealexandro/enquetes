"use client";

import React from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export default function QRCodeModal({ isOpen, onClose, url, title }: QRCodeModalProps) {
  const downloadQRCode = () => {
    const svg = document.getElementById("qrcode-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qrcode-${title ? title.replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'poll'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl p-6 w-full max-w-sm relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              QR Code da Enquete
            </h3>

            <div className="bg-white p-4 rounded-lg shadow-inner mb-6">
              <QRCode
                id="qrcode-svg"
                value={url}
                size={200}
                level="H"
              />
            </div>
            
             <button
                onClick={downloadQRCode}
                className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Baixar QR Code
              </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

