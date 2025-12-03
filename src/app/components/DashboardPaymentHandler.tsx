"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function DashboardPaymentHandler() {
  const searchParams = useSearchParams();
  const { refreshUserData } = useAuth();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      console.log("Pagamento Stripe bem-sucedido, recarregando dados do usuário...");
      refreshUserData(); // Chamar a função para recarregar os dados
      // Opcional: remover o parâmetro 'payment' da URL para evitar recargas repetidas
      // const newSearchParams = new URLSearchParams(searchParams.toString());
      // newSearchParams.delete('payment');
      // router.replace(`?${newSearchParams.toString()}`, { shallow: true });
    }
  }, [searchParams, refreshUserData]);

  return null; // Este componente não renderiza nada visível
}
