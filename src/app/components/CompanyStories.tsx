"use client";

/**
 * Componente CompanyStories
 * 
 * DOCUMENTAÇÃO:
 * - Exibe stories de uma empresa em formato de bolhas circulares (estilo Instagram)
 * - Layout horizontal com scroll lateral no mobile
 * - Ao clicar em um story, abre modal simples com imagem + texto
 * - Filtra automaticamente stories expirados (expiresAt > now)
 * - Mostra máximo de 2 stories mais recentes
 * - Se não houver stories, mostra placeholder discreto
 * 
 * POSICIONAMENTO:
 * - Deve ser inserido entre o banner da empresa e os cards de métricas
 * - Não acoplado com avaliações ou enquetes
 * 
 * PROPS:
 * - companyId: ID da empresa para buscar stories
 */

import React, { useState, useEffect } from 'react';
import { Story } from '@/app/types/story';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface CompanyStoriesProps {
  companyId: string;
}

interface StoryModalProps {
  story: Story | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal para exibir um story completo
 * 
 * DOCUMENTAÇÃO:
 * - Exibe imagem em tamanho grande
 * - Mostra texto opcional abaixo da imagem
 * - Botão fechar no canto superior direito
 * - Fecha ao clicar fora do modal ou pressionar ESC
 */
const StoryModal: React.FC<StoryModalProps> = ({ story, isOpen, onClose }) => {
  useEffect(() => {
    // Fechar modal ao pressionar ESC
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll do body quando modal está aberto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!story || !isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-2xl w-full max-h-[90vh] bg-white dark:bg-zinc-800 rounded-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all"
            aria-label="Fechar"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>

          {/* Imagem do story */}
          <div className="relative w-full aspect-[9/16] max-h-[70vh] bg-gray-100 dark:bg-zinc-900">
            <Image
              src={story.imageUrl}
              alt={story.text || "Story"}
              fill
              className="object-contain"
              unoptimized={story.imageUrl?.includes('firebasestorage') || story.imageUrl?.includes('googleapis')}
            />
          </div>

          {/* Texto do story (se houver) */}
          {story.text && (
            <div className="p-4 bg-white dark:bg-zinc-800">
              <p className="text-gray-900 dark:text-gray-100 text-center text-lg">
                {story.text}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Componente principal CompanyStories
 */
const CompanyStories: React.FC<CompanyStoriesProps> = ({ companyId }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * DOCUMENTAÇÃO: Buscar stories ativos da empresa
   * - Chama API route /api/stories?companyId=xxx
   * - API já filtra stories expirados e limita a 2 mais recentes
   * - Atualiza estado local com stories recebidos
   */
  useEffect(() => {
    const fetchStories = async () => {
      if (!companyId) {
        console.log('[CompanyStories] companyId não fornecido, não buscando stories');
        setLoading(false);
        return;
      }

      console.log('[CompanyStories] Buscando stories para companyId:', companyId);

      try {
        setLoading(true);
        const response = await fetch(`/api/stories?companyId=${companyId}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CompanyStories] Erro ao buscar stories:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          setStories([]);
          return;
        }

        const data = await response.json();
        console.log('[CompanyStories] Resposta da API:', { success: data.success, storiesCount: data.stories?.length || 0 });
        
        if (data.success && data.stories && Array.isArray(data.stories)) {
          // DOCUMENTAÇÃO: Filtrar stories expirados no frontend também (segurança extra)
          const now = Timestamp.now();
          const activeStories = data.stories.filter((story: Story) => {
            // Converter Timestamp se necessário
            // A API pode retornar Timestamp do Firestore ou objeto serializado
            let expiresAtMillis = 0;
            
            if (story.expiresAt) {
              // Caso 1: Timestamp do Client SDK (tem método toMillis)
              if (typeof story.expiresAt.toMillis === 'function') {
                expiresAtMillis = story.expiresAt.toMillis();
              } 
              // Caso 2: Objeto serializado do Firestore (pode ter _seconds ou seconds)
              else if (typeof story.expiresAt === 'object' && story.expiresAt !== null) {
                const expiresAtObj = story.expiresAt as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number; toMillis?: () => number };
                // Tentar _seconds primeiro (formato Admin SDK serializado)
                if (expiresAtObj._seconds !== undefined) {
                  expiresAtMillis = expiresAtObj._seconds * 1000 + (expiresAtObj._nanoseconds || 0) / 1000000;
                } 
                // Tentar seconds (formato alternativo)
                else if (expiresAtObj.seconds !== undefined) {
                  expiresAtMillis = expiresAtObj.seconds * 1000 + (expiresAtObj.nanoseconds || 0) / 1000000;
                }
                // Tentar toMillis se for um Timestamp mas sem método (serializado)
                else if (typeof expiresAtObj.toMillis === 'function') {
                  expiresAtMillis = expiresAtObj.toMillis();
                }
              }
              // Caso 3: Já é um número (milissegundos)
              else if (typeof story.expiresAt === 'number') {
                expiresAtMillis = story.expiresAt;
              }
            }
            
            console.log('[CompanyStories] Debug timestamp:', {
              storyId: story.id,
              expiresAtOriginal: story.expiresAt,
              expiresAtMillis,
              expiresAtDate: expiresAtMillis > 0 ? new Date(expiresAtMillis).toLocaleString('pt-BR') : 'INVÁLIDO',
              nowMillis: now.toMillis(),
              nowDate: new Date(now.toMillis()).toLocaleString('pt-BR'),
            });
            
            const isActive = expiresAtMillis > 0 && expiresAtMillis > now.toMillis();
            
            // Log para debug
            if (!isActive) {
              console.log('[CompanyStories] Story expirado ignorado:', {
                storyId: story.id,
                expiresAt: expiresAtMillis > 0 ? new Date(expiresAtMillis).toLocaleString('pt-BR') : 'INVÁLIDO',
                now: new Date(now.toMillis()).toLocaleString('pt-BR'),
                expiresAtMillis,
                nowMillis: now.toMillis(),
              });
            }
            
            return isActive;
          });

          // Ordenar por createdAt (mais recente primeiro) e limitar a 2
          activeStories.sort((a: Story, b: Story) => {
            let aTime = 0;
            let bTime = 0;
            
            if (a.createdAt) {
              if (typeof a.createdAt.toMillis === 'function') {
                aTime = a.createdAt.toMillis();
              } else if (typeof a.createdAt === 'object' && a.createdAt !== null) {
                const createdAtObj = a.createdAt as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
                // Tentar _seconds primeiro (formato Admin SDK serializado)
                if (createdAtObj._seconds !== undefined) {
                  aTime = createdAtObj._seconds * 1000 + (createdAtObj._nanoseconds || 0) / 1000000;
                } else if (createdAtObj.seconds !== undefined) {
                  aTime = createdAtObj.seconds * 1000 + (createdAtObj.nanoseconds || 0) / 1000000;
                }
              }
            }
            
            if (b.createdAt) {
              if (typeof b.createdAt.toMillis === 'function') {
                bTime = b.createdAt.toMillis();
              } else if (typeof b.createdAt === 'object' && b.createdAt !== null) {
                const createdAtObj = b.createdAt as { _seconds?: number; seconds?: number; _nanoseconds?: number; nanoseconds?: number };
                // Tentar _seconds primeiro (formato Admin SDK serializado)
                if (createdAtObj._seconds !== undefined) {
                  bTime = createdAtObj._seconds * 1000 + (createdAtObj._nanoseconds || 0) / 1000000;
                } else if (createdAtObj.seconds !== undefined) {
                  bTime = createdAtObj.seconds * 1000 + (createdAtObj.nanoseconds || 0) / 1000000;
                }
              }
            }
            
            return bTime - aTime;
          });

          console.log('[CompanyStories] Stories ativos encontrados:', activeStories.length);
          setStories(activeStories.slice(0, 2));
        } else {
          console.log('[CompanyStories] Nenhum story retornado pela API ou resposta sem sucesso', data);
          setStories([]);
        }
      } catch (error) {
        console.error('[CompanyStories] Erro ao buscar stories:', error);
        setStories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();

    // DOCUMENTAÇÃO: Atualizar stories a cada 5 minutos para remover expirados
    // OTIMIZAÇÃO DE CUSTO: Intervalo aumentado de 1 minuto para 5 minutos para reduzir leituras do Firestore
    // Com 500 clientes: de 30.000 req/hora para 6.000 req/hora (redução de 80%)
    const interval = setInterval(fetchStories, 300000); // 5 minutos (300000ms)

    return () => clearInterval(interval);
  }, [companyId]);

  /**
   * DOCUMENTAÇÃO: Abrir modal ao clicar em um story
   */
  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  /**
   * DOCUMENTAÇÃO: Fechar modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStory(null);
  };

  // DOCUMENTAÇÃO: Log para debug
  useEffect(() => {
    console.log('[CompanyStories] Estado atual:', {
      companyId,
      loading,
      storiesCount: stories.length,
      stories: stories.map(s => ({
        id: s.id,
        expiresAt: s.expiresAt?.toMillis?.() ? new Date(s.expiresAt.toMillis()).toLocaleString('pt-BR') : 'N/A',
        isExpired: s.expiresAt?.toMillis?.() ? s.expiresAt.toMillis() < Date.now() : true,
      })),
    });
  }, [companyId, loading, stories]);

  // DOCUMENTAÇÃO: Se estiver carregando, não mostrar nada (ou mostrar skeleton)
  if (loading) {
    return null; // Ou retornar skeleton loader se preferir
  }

  // DOCUMENTAÇÃO: Se não houver stories, mostrar placeholder discreto ou nada
  if (stories.length === 0) {
    return null; // Placeholder removido para não poluir a UI
  }

  return (
    <>
      {/* DOCUMENTAÇÃO: Container de stories com scroll horizontal no mobile
          - Removido padding e max-width pois agora está dentro de um container pai
          - Mantido justify-center para centralizar stories quando sozinhos
      */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center">
          {/* DOCUMENTAÇÃO: Scrollbar-hide é uma classe custom que pode ser adicionada ao tailwind.config */}
          {stories.map((story) => {
            // DOCUMENTAÇÃO: Calcular se o story está próximo de expirar (últimas 2 horas)
            const now = Timestamp.now();
            const expiresAt = story.expiresAt?.toMillis?.() || 0;
            const timeLeft = expiresAt - now.toMillis();
            const hoursLeft = timeLeft / (1000 * 60 * 60);
            const isExpiringSoon = hoursLeft <= 2 && hoursLeft > 0;

            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0 cursor-pointer"
                onClick={() => handleStoryClick(story)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* DOCUMENTAÇÃO: Bolha circular do story (estilo Instagram) */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-indigo-500 shadow-lg">
                  {/* DOCUMENTAÇÃO: Indicador visual se está próximo de expirar */}
                  {isExpiringSoon && (
                    <div className="absolute inset-0 border-2 border-yellow-400 rounded-full animate-pulse z-10" />
                  )}
                  <Image
                    src={story.imageUrl}
                    alt={story.text || "Story"}
                    fill
                    className="object-cover"
                    unoptimized={story.imageUrl?.includes('firebasestorage') || story.imageUrl?.includes('googleapis')}
                  />
                </div>
                {/* DOCUMENTAÇÃO: Texto abaixo da bolha (opcional, truncado) */}
                {story.text && (
                  <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400 max-w-[80px] md:max-w-[96px] truncate">
                    {story.text}
                  </p>
                )}
              </motion.div>
            );
          })}
      </div>

      {/* DOCUMENTAÇÃO: Modal para exibir story completo */}
      <StoryModal
        story={selectedStory}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default CompanyStories;
