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
  expandedSize = 256,
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

  const size = isExpanded 
    ? { width: '192px', height: '192px', minWidth: '192px', minHeight: '192px' }
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
      />
    </div>
  );
}

