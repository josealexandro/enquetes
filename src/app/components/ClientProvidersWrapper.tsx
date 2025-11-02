"use client";

import { AuthProvider } from "../context/AuthContext";
import { AuthModalProvider } from "../context/AuthModalContext";
import { CompanyFooterProvider } from "../context/CompanyFooterContext";
import Header from "./Header";
import Footer from "./Footer";
import { useState, ReactNode } from "react";

interface ClientProvidersWrapperProps {
  children: ReactNode;
}

export default function ClientProvidersWrapper({ children }: ClientProvidersWrapperProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <AuthProvider>
      <AuthModalProvider onOpenLogin={() => setShowLoginModal(true)} onOpenSignup={() => setShowSignupModal(true)}>
        <CompanyFooterProvider>
          <Header
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
            showSignupModal={showSignupModal}
            setShowSignupModal={setShowSignupModal}
          />
          <div className="mt-16">
            {children}
          </div>
          <Footer />
        </CompanyFooterProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
