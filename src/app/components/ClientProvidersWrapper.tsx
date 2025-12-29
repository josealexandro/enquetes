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

  // DOCUMENTAÇÃO: Footer aparece em todas as páginas exceto dashboard
  // Na página pública da empresa, o footer usa dados da empresa via CompanyFooterContext
  const shouldShowFooter = !pathname?.startsWith("/dashboard");

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
          {/* CompaniesSection só aparece nas páginas principais, não nas páginas de empresas individuais */}
          {shouldShowFooter && !pathname?.startsWith("/empresa/") && <CompaniesSection />}
          {/* Footer aparece em todas as páginas exceto dashboard, usando dados da empresa quando disponível */}
          {shouldShowFooter && <Footer />}
        </CompanyFooterProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}
