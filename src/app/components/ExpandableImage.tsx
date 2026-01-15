"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ExpandableImageProps {
  src: string;
  alt: string;
  defaultSize?: number; // tamanho padrão em pixels
  expandedSize?: number; // tamanho expandido em pixels
  className?: string;
  borderColor?: string;
  showBorder?: boolean;
  onExpansionChange?: (isExpanded: boolean) => void; // Callback para quando a expansão mudar
}

export default function ExpandableImage({
  src,
  alt,
  defaultSize = 96,
  expandedSize = 512, // Aumentado de 256 para 512px para melhor qualidade
  className = "",
  borderColor = "white",
  showBorder = true,
  onExpansionChange,
}: ExpandableImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Usar useEffect para chamar o callback após a atualização do estado
  useEffect(() => {
    onExpansionChange?.(isExpanded);
  }, [isExpanded, onExpansionChange]);

  const getBorderClass = () => {
    if (!showBorder) return '';
    const colorMap: Record<string, string> = {
      'white': 'border-white',
      'indigo-500': 'border-indigo-500',
      'gray': 'border-gray-500',
    };
    return `border-4 ${colorMap[borderColor] || 'border-white'}`;
  };

  // Verificar se a imagem vem do Firebase Storage (contém 'firebasestorage' ou 'googleapis')
  const isFirebaseImage = src?.includes('firebasestorage') || src?.includes('googleapis') || src?.includes('firebase');
  
  // Tamanho do container quando expandido (deve corresponder exatamente ao expandedSize para evitar distorção)
  const size = isExpanded 
    ? { width: `${expandedSize}px`, height: `${expandedSize}px`, minWidth: `${expandedSize}px`, minHeight: `${expandedSize}px` }
    : { width: `${defaultSize}px`, height: `${defaultSize}px`, minWidth: `${defaultSize}px`, minHeight: `${defaultSize}px` };

  return (
    <div
      className={`rounded-full shadow-lg cursor-pointer transition-all duration-300 overflow-hidden ${
        isExpanded 
          ? 'z-50' 
          : 'hover:scale-110'
      } ${getBorderClass()} ${className}`}
      style={size}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(prev => !prev);
        }
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={isExpanded ? expandedSize : defaultSize}
        height={isExpanded ? expandedSize : defaultSize}
        className="w-full h-full object-cover"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        quality={100} // Qualidade máxima para melhor nitidez
        unoptimized={isFirebaseImage} // Desabilitar otimização para imagens do Firebase Storage
      />
    </div>
  );
}

