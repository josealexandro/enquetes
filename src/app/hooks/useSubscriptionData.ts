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

      const plansJson = await plansResponse.json();
      setPlans(plansJson.plans ?? []);

      let subscriptionData: Subscription | null = null;
      if (subscriptionResponse) {
        const subscriptionJson = await subscriptionResponse.json();
        subscriptionData = subscriptionJson.subscription ?? null;
        setSubscription(subscriptionData);
      } else {
        setSubscription(null);
      }

      if (subscriptionData) {
        const paymentsResponse = await fetch(
          `/api/subscriptions/${subscriptionData.id}/payments`,
          { method: "GET", cache: "no-store" }
        );

        if (!paymentsResponse.ok) {
          throw new Error("Erro ao carregar pagamentos da assinatura.");
        }

        const paymentsJson = await paymentsResponse.json();
        setPayments(paymentsJson.payments ?? []);
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

