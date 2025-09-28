// src/app/context/AuthModalContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  openLoginModal: () => void;
  openSignupModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
  onOpenLogin?: () => void; // Callback para quando o modal de login é aberto
  onOpenSignup?: () => void; // Callback para quando o modal de cadastro é aberto
}

export function AuthModalProvider({ children, onOpenLogin, onOpenSignup }: AuthModalProviderProps) {
  const openLoginModal = () => {
    onOpenLogin?.();
  };

  const openSignupModal = () => {
    onOpenSignup?.();
  };

  return (
    <AuthModalContext.Provider value={{ openLoginModal, openSignupModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
