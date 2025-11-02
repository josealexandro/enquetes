"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { CompanyData } from "@/app/empresa/[slug]/page"; // Importar CompanyData do tipo que já definimos

interface CompanyFooterContextType {
  companyFooterData: CompanyData | null;
  setCompanyFooterData: (data: CompanyData | null) => void;
}

const CompanyFooterContext = createContext<CompanyFooterContextType | undefined>(undefined);

export function CompanyFooterProvider({ children }: { children: ReactNode }) {
  const [companyFooterData, setCompanyFooterData] = useState<CompanyData | null>(null);

  // Opcional: Efeito para limpar os dados do rodapé da empresa quando o componente é desmontado
  // Isso pode ser útil se você quiser garantir que o rodapé global volte ao estado padrão
  // quando você sai de uma página de perfil de empresa.
  useEffect(() => {
    return () => setCompanyFooterData(null);
  }, []);

  return (
    <CompanyFooterContext.Provider value={{ companyFooterData, setCompanyFooterData }}>
      {children}
    </CompanyFooterContext.Provider>
  );
}

export function useCompanyFooter() {
  const context = useContext(CompanyFooterContext);
  if (context === undefined) {
    throw new Error("useCompanyFooter must be used within a CompanyFooterProvider");
  }
  return context;
}
