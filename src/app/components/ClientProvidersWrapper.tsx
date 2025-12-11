"use client";

import { useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "../context/AuthContext";
import { AuthModalProvider } from "../context/AuthModalContext";
import { CompanyFooterProvider } from "../context/CompanyFooterContext";
import Header from "./Header";
import Footer from "./Footer";
import CompaniesSection from "./CompaniesSection";

interface ClientProvidersWrapperProps {
  children: ReactNode;
}

export default function ClientProvidersWrapper({
  children,
}: ClientProvidersWrapperProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const pathname = usePathname();

  const shouldShowFooter = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/empresa/");

  return (
    <AuthProvider>
      <AuthModalProvider
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenSignup={() => setShowSignupModal(true)}
      >
        <CompanyFooterProvider>
          <Header
            showLoginModal={showLoginModal}
            setShowLoginModal={setShowLoginModal}
            showSignupModal={showSignupModal}
            setShowSignupModal={setShowSignupModal}
          />
          <div className="mt-16">{children}</div>
          {shouldShowFooter && <CompaniesSection />}
          {shouldShowFooter && <Footer />}
        </CompanyFooterProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
