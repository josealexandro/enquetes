"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface DashboardPaymentHandlerProps {
  onPaymentSuccess?: () => void;
}

export default function DashboardPaymentHandler({ onPaymentSuccess }: DashboardPaymentHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUserData, user } = useAuth();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success' && user?.uid) {
      console.log("Pagamento Stripe bem-sucedido, verificando assinatura...");
      setIsCheckingSubscription(true);
      
      // Recarregar dados do usuário primeiro
      refreshUserData();

      // Verificar se a assinatura foi ativada (aguardar webhook processar)
      const checkSubscriptionStatus = async () => {
        const maxAttempts = 10; // 10 tentativas
        const delay = 1000; // 1 segundo entre tentativas
        let attempts = 0;

        const checkSubscription = async (): Promise<boolean> => {
          try {
            const response = await fetch(`/api/subscriptions?companyId=${user.uid}`, {
              method: "GET",
              cache: "no-store",
            });

            if (!response.ok) {
              return false;
            }

            const data = await response.json();
            const subscription = data.subscription;

            // Se a assinatura existe e está ativa, confirmar sucesso
            if (subscription && subscription.status === "ACTIVE") {
              return true;
            }

            return false;
          } catch (error) {
            console.error("Erro ao verificar assinatura:", error);
            return false;
          }
        };

        // Fazer polling até confirmar ou esgotar tentativas
        while (attempts < maxAttempts) {
          attempts++;
          
          const isActive = await checkSubscription();
          
          if (isActive) {
            console.log("Assinatura confirmada como ativa!");
            setSubscriptionConfirmed(true);
            setIsCheckingSubscription(false);
            
            // Chamar callback se fornecido
            onPaymentSuccess?.();
            
            // Recarregar dados do usuário novamente para garantir sincronização
            await refreshUserData();

            // Remover parâmetro da URL após confirmar
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams.toString());
              newSearchParams.delete('payment');
              const newUrl = newSearchParams.toString() 
                ? `${window.location.pathname}?${newSearchParams.toString()}`
                : window.location.pathname;
              router.replace(newUrl, { scroll: false });
            }, 5000); // Remover após 5 segundos
            
            return;
          }

          // Aguardar antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Se chegou aqui, não conseguiu confirmar após todas as tentativas
        console.warn("Não foi possível confirmar assinatura após múltiplas tentativas");
        setIsCheckingSubscription(false);
      };

      checkSubscriptionStatus();
    }
  }, [searchParams, user, refreshUserData, router, onPaymentSuccess]);

  // Expor estado para componente pai se necessário
  useEffect(() => {
    if (subscriptionConfirmed) {
      // O componente pai pode usar onPaymentSuccess para mostrar a mensagem
    }
  }, [subscriptionConfirmed]);

  return null; // Este componente não renderiza nada visível
}
