import { useCallback, useEffect, useState } from "react";
import { Plan, Subscription, Payment } from "@/app/types/subscription";

interface UseSubscriptionDataOptions {
  enabled?: boolean;
}

interface UseSubscriptionDataResult {
  plans: Plan[];
  subscription: Subscription | null;
  payments: Payment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscriptionData(
  companyId?: string,
  options: UseSubscriptionDataOptions = {}
): UseSubscriptionDataResult {
  const { enabled = true } = options;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plansRequest = fetch("/api/plans", {
        method: "GET",
        cache: "no-store",
      });
      const subscriptionRequest =
        companyId && companyId.length > 0
          ? fetch(`/api/subscriptions?companyId=${companyId}`, {
              method: "GET",
              cache: "no-store",
            })
          : null;

      const [plansResponse, subscriptionResponse] = await Promise.all([
        plansRequest,
        subscriptionRequest,
      ]);

      // Verificar se a resposta dos planos é OK antes de fazer parse
      if (!plansResponse.ok) {
        const errorText = await plansResponse.text();
        console.error("Erro ao buscar planos:", plansResponse.status, errorText);
        // CORREÇÃO: Não falhar completamente - usar planos padrão como fallback
        // A API /api/plans sempre retorna algo, mas se falhar, usar DEFAULT_PLANS
        console.warn("Usando planos padrão devido a erro na API");
        const { DEFAULT_PLANS } = await import("@/app/data/planSeeds");
        setPlans(DEFAULT_PLANS);
      } else {
        const plansJson = await plansResponse.json();
        setPlans(plansJson.plans ?? []);
      }

      let subscriptionData: Subscription | null = null;
      if (subscriptionResponse) {
        // Verificar se a resposta da assinatura é OK antes de fazer parse
        if (!subscriptionResponse.ok) {
          const errorText = await subscriptionResponse.text();
          console.error("Erro ao buscar assinatura:", subscriptionResponse.status, errorText);
          
          // CORREÇÃO: Se for erro 403 (permissão) ou 500, pode ser problema de configuração
          // Mas não lançar erro aqui - apenas logar e continuar sem assinatura
          // Não ter assinatura é um estado válido (usuário ainda não assinou)
          if (subscriptionResponse.status === 403) {
            console.warn("Erro de permissão ao buscar assinatura. Verifique se Admin SDK está configurado na Vercel.");
          }
          // Não lançar erro - apenas definir como null (usuário pode não ter assinatura ainda)
          setSubscription(null);
        } else {
          const subscriptionJson = await subscriptionResponse.json();
          subscriptionData = subscriptionJson.subscription ?? null;
          setSubscription(subscriptionData);
        }
      } else {
        setSubscription(null);
      }

      if (subscriptionData) {
        try {
          const paymentsResponse = await fetch(
            `/api/subscriptions/${subscriptionData.id}/payments`,
            { method: "GET", cache: "no-store" }
          );

          if (!paymentsResponse.ok) {
            // CORREÇÃO: Não falhar completamente se pagamentos não carregarem
            // Apenas logar e continuar sem pagamentos (não é crítico)
            console.warn("Erro ao carregar pagamentos da assinatura:", paymentsResponse.status);
            setPayments([]);
          } else {
            const paymentsJson = await paymentsResponse.json();
            setPayments(paymentsJson.payments ?? []);
          }
        } catch (paymentError) {
          // CORREÇÃO: Não lançar erro se pagamentos falharem - não é crítico
          console.warn("Erro ao buscar pagamentos (não crítico):", paymentError);
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Erro ao carregar planos/assinatura:", err);
      setError("Não foi possível carregar os dados de assinatura.");
    } finally {
      setLoading(false);
    }
  }, [companyId, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    plans,
    subscription,
    payments,
    loading,
    error,
    refetch: fetchData,
  };
}

