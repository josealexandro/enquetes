"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import type { PagarmeCheckoutData } from "@/app/services/pagarmeService";
import { useSubscriptionData } from "@/app/hooks/useSubscriptionData";
import {
  Plan,
  PlanLimits,
  Subscription,
  SubscriptionStatus,
  Payment,
  PaymentStatus,
} from "@/app/types/subscription";

interface SubscriptionPanelProps {
  companyId: string;
  companyName: string;
}

type AlertType = "success" | "error" | "info";

interface AlertState {
  type: AlertType;
  message: string;
}

const limitLabels: Record<keyof PlanLimits, string> = {
  pollsPerMonth: "Enquetes/mês",
  activePolls: "Enquetes ativas",
  commercialProfiles: "Perfis comerciais",
  teamMembers: "Integrantes da equipe",
  storageMb: "Armazenamento (MB)",
};

const statusStyles: Record<
  SubscriptionStatus,
  { label: string; badge: string; message: string }
> = {
  TRIALING: {
    label: "Período de teste",
    badge: "bg-yellow-500/20 text-yellow-300",
    message: "Você está aproveitando os dias de teste deste plano.",
  },
  ACTIVE: {
    label: "Em dia",
    badge: "bg-green-500/20 text-green-300",
    message: "Tudo certo com sua assinatura. Próximo ciclo indicado abaixo.",
  },
  AWAITING_CONFIRMATION: {
    label: "Aguardando confirmação",
    badge: "bg-blue-500/20 text-blue-300",
    message:
      "Recebemos a solicitação e aguardamos a confirmação de pagamento do provedor.",
  },
  PAST_DUE: {
    label: "Pagamento em atraso",
    badge: "bg-orange-500/20 text-orange-300",
    message:
      "Detectamos atraso no pagamento. Atualize seus dados para evitar bloqueios.",
  },
  CANCELED: {
    label: "Cancelado",
    badge: "bg-red-500/20 text-red-300",
    message:
      "Esta assinatura foi cancelada. Escolha um plano para retomar o acesso.",
  },
};

const alertStyles: Record<AlertType, string> = {
  success: "bg-green-500/15 text-green-200 border-green-500/40",
  error: "bg-red-500/15 text-red-200 border-red-500/40",
  info: "bg-blue-500/15 text-blue-200 border-blue-500/40",
};

const paymentStatusStyles: Record<
  PaymentStatus,
  { label: string; badge: string }
> = {
  PENDING: {
    label: "Pendente",
    badge: "bg-gray-600 text-white",
  },
  AWAITING_CONFIRMATION: {
    label: "Aguardando",
    badge: "bg-blue-600 text-white",
  },
  PAID: {
    label: "Pago",
    badge: "bg-green-600 text-white",
  },
  FAILED: {
    label: "Falhou",
    badge: "bg-red-600 text-white",
  },
  REFUNDED: {
    label: "Estornado",
    badge: "bg-purple-600 text-white",
  },
};

const formatBRL = (valueInCents: number) =>
  (valueInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

type FirestoreTimestampLike =
  | Timestamp
  | Date
  | {
      seconds: number;
      nanoseconds: number;
      toDate?: () => Date;
    };

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    "nanoseconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number" &&
    typeof (value as { nanoseconds: unknown }).nanoseconds === "number"
  ) {
    const v = value as { seconds: number; nanoseconds: number };
    return new Timestamp(v.seconds, v.nanoseconds).toDate();
  }
  return null;
};

const formatDate = (
  timestamp?: FirestoreTimestampLike | null
) => {
  const date = toDateSafe(timestamp);
  if (!date) return "—";
  return Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const getPlanCTA = (
  plan: Plan,
  subscription: Subscription | null,
  isProcessing: boolean
) => {
  if (subscription?.planId === plan.id) {
    return { label: "Plano atual", disabled: true };
  }

  if (isProcessing) {
    return { label: "Processando...", disabled: true };
  }

  if (!subscription) {
    return { label: "Assinar plano", disabled: false };
  }

  return { label: "Solicitar mudança", disabled: false };
};

const renderPlanLimits = (limits: PlanLimits) => (
  <dl className="grid grid-cols-2 gap-3 text-sm text-gray-300">
    {Object.entries(limits).map(([key, value]) => (
      <div key={key} className="bg-gray-900/40 rounded-lg px-3 py-2">
        <dt className="text-gray-400">{limitLabels[key as keyof PlanLimits]}</dt>
        <dd className="font-semibold text-white">{value}</dd>
      </div>
    ))}
  </dl>
);

const formatShortDate = (
  timestamp?: FirestoreTimestampLike | null
) => {
  const date = toDateSafe(timestamp);
  if (!date) return "—";
  return Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const renderPaymentRow = (payment: Payment) => {
  const status = paymentStatusStyles[payment.status];
  return (
    <tr key={payment.id} className="border-b border-gray-800">
      <td className="px-4 py-3 font-mono text-sm text-gray-300">
        {payment.invoiceId}
      </td>
      <td className="px-4 py-3 text-gray-200">{formatBRL(payment.amount)}</td>
      <td className="px-4 py-3 text-gray-300">
        {formatShortDate(payment.dueDate)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.badge}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300">{payment.gateway}</td>
      <td className="px-4 py-3 text-gray-400">
        {payment.paidAt ? formatShortDate(payment.paidAt) : "—"}
      </td>
    </tr>
  );
};

type PagarmeCheckoutSuccess = (data: PagarmeCheckoutData) => void;
type PagarmeCheckoutError = (err: unknown) => void;

declare global {
  interface Window {
    PagarMeCheckout?: {
      Checkout: new (options: {
        encryption_key: string;
        success: PagarmeCheckoutSuccess;
        error: PagarmeCheckoutError;
        close: () => void;
      }) => {
        open: (config: {
          amount: number;
          createToken: "true" | "false";
          customerData: "true" | "false";
          paymentMethods?: string;
        }) => void;
      };
    };
  }
}

const SubscriptionPanel = ({
  companyId,
  companyName,
}: SubscriptionPanelProps) => {
  const { plans, subscription, payments, loading, error, refetch } =
    useSubscriptionData(companyId, { enabled: !!companyId });

  const [alert, setAlert] = useState<AlertState | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const encryptionKey =
    process.env.NEXT_PUBLIC_PAGARME_ENCRYPTION_KEY ||
    process.env.PAGARME_ENCRYPTION_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.PagarMeCheckout) {
      setCheckoutReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.pagar.me/checkout/checkout.js";
    script.async = true;
    script.onload = () => setCheckoutReady(true);
    script.onerror = () => {
      console.error("Erro ao carregar o script do Pagar.me Checkout.");
      setCheckoutReady(false);
    };
    document.body.appendChild(script);
  }, []);

  const currentStatus =
    subscription?.status && statusStyles[subscription.status]
      ? statusStyles[subscription.status]
      : null;

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans]
  );

  const createOrSwitchSubscription = async (plan: Plan) => {
    const isSwitching = Boolean(subscription);
    const endpoint = isSwitching
      ? `/api/subscriptions/${subscription!.id}/plan`
      : "/api/subscriptions";
    const method = isSwitching ? "PATCH" : "POST";
    const payload = isSwitching
      ? {
          planId: plan.id,
          actorId: companyId,
          actorName: companyName,
        }
      : {
          planId: plan.id,
          companyId,
          companyName,
        };

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let backendMessage = "";
      try {
        const data = await response.json();
        backendMessage =
          typeof data?.message === "string" ? ` Detalhe: ${data.message}` : "";
      } catch {
        // ignore parse errors
      }
      throw new Error(
        `Falha ao registrar solicitação (código ${response.status}). Tente novamente.${backendMessage}`
      );
    }
  };

  const startCheckoutFlow = async (plan: Plan) => {
    if (
      typeof window === "undefined" ||
      !window.PagarMeCheckout ||
      !encryptionKey
    ) {
      // Fallback para o fluxo antigo caso o checkout não esteja disponível
      await createOrSwitchSubscription(plan);
      return;
    }

    const amount = plan.price;

    return new Promise<void>((resolve, reject) => {
      const checkout = new window.PagarMeCheckout!.Checkout({
        encryption_key: encryptionKey,
        success: async (data: PagarmeCheckoutData) => {
          try {
            const res = await fetch("/api/pagarme/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amount,
                planId: plan.id,
                companyId,
                companyName,
                subscriptionId: subscription?.id,
                checkoutData: data,
              }),
            });

            if (!res.ok) {
              const json = await res.json().catch(() => null);
              throw new Error(
                json?.message ||
                  "Não foi possível processar o pagamento. Tente novamente."
              );
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        },
        error: (err: unknown) => {
          console.error("Erro no Pagar.me Checkout:", err);
          reject(
            new Error(
              "Pagamento não foi concluído no gateway. Tente novamente."
            )
          );
        },
        close: () => {
          // Se o usuário apenas fechar o modal, consideramos como cancelado.
          if (!processingPlanId) return;
          setProcessingPlanId(null);
        },
      });

      checkout.open({
        amount,
        createToken: "true",
        customerData: "true",
        paymentMethods: "credit_card,boleto,pix",
      });
    });
  };

  const handlePlanSelection = async (plan: Plan) => {
    if (processingPlanId || subscription?.planId === plan.id) return;

    setProcessingPlanId(plan.id);
    setAlert(null);

    try {
      if (checkoutReady && encryptionKey) {
        await startCheckoutFlow(plan);
      } else {
        await createOrSwitchSubscription(plan);
      }

      setAlert({
        type: "success",
        message: checkoutReady && encryptionKey
          ? "Pagamento iniciado! Atualizaremos o plano após confirmação do gateway."
          : "Solicitação enviada! Em instantes você verá o status atualizado.",
      });

      await refetch();
    } catch (err) {
      console.error("Erro ao selecionar plano:", err);
      setAlert({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível enviar a solicitação. Tente mais tarde.",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 animate-pulse text-gray-400">
        Carregando planos e assinatura...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/15 text-red-100 border border-red-500/30 rounded-xl p-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <header className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-400">Plano atual</p>
            <h2 className="text-2xl font-semibold text-white">
              {subscription?.planSnapshot.name ?? "Nenhum plano ativo"}
            </h2>
          </div>
          {currentStatus && (
            <span className={`px-3 py-1 rounded-full text-sm ${currentStatus.badge}`}>
              {currentStatus.label}
            </span>
          )}
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-gray-300">
            <p>
              <span className="text-gray-400">Situação:</span>{" "}
              {currentStatus?.message ?? "Selecione um plano para começar."}
            </p>
            <p>
              <span className="text-gray-400">Próximo ciclo:</span>{" "}
              {formatDate(subscription?.currentPeriodEnd)}
            </p>
            <p>
              <span className="text-gray-400">Método de pagamento:</span>{" "}
              {subscription?.paymentMethod ?? "Será definido no checkout"}
            </p>
          </div>
          {subscription?.planSnapshot && (
            <div>
              <p className="text-gray-400 mb-2">Limites do plano</p>
              {renderPlanLimits(subscription.planSnapshot.limits)}
            </div>
          )}
        </div>
      </section>

      {alert && (
        <div className={`border rounded-xl px-4 py-3 ${alertStyles[alert.type]}`}>
          {alert.message}
        </div>
      )}

      <section>
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Planos disponíveis</h3>
            <p className="text-gray-400 text-sm">
              Compare recursos e escolha o melhor para o momento da sua empresa.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
          {sortedPlans.map((plan) => {
            const cta = getPlanCTA(plan, subscription, processingPlanId === plan.id);

            return (
              <article
                key={plan.id}
                className={`bg-gray-800 border rounded-2xl p-6 flex flex-col gap-4 ${
                  subscription?.planId === plan.id
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "border-gray-700"
                }`}
              >
                <div>
                  <h4 className="text-2xl font-semibold text-white">{plan.name}</h4>
                  <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                </div>
                <div>
                  <span className="text-3xl font-bold text-white">
                    {formatBRL(plan.price)}
                  </span>
                  <span className="text-gray-400 text-sm ml-2">
                    /{plan.billingPeriod === "monthly" ? "mês" : "ano"}
                  </span>
                </div>
                <ul className="text-sm text-gray-300 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-1">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {renderPlanLimits(plan.limits)}
                <button
                  onClick={() => handlePlanSelection(plan)}
                  disabled={cta.disabled}
                  className={`mt-auto w-full py-2 rounded-lg font-semibold transition ${
                    cta.disabled
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
                  }`}
                >
                  {cta.label}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Pagamentos recentes</h3>
            <p className="text-gray-400 text-sm">
              Acompanhamento dos últimos lançamentos da assinatura.
            </p>
          </div>
        </header>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="px-4 py-2 font-medium">Fatura</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Gateway</th>
                  <th className="px-4 py-2 font-medium">Pago em</th>
                </tr>
              </thead>
              <tbody>{payments.map(renderPaymentRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-400 text-sm bg-gray-900/40 rounded-lg px-4 py-6">
            {subscription
              ? "Ainda não registramos pagamentos para esta assinatura."
              : "Assine um plano para começar a acompanhar cobranças por aqui."}
          </div>
        )}
      </section>
    </div>
  );
};

export default SubscriptionPanel;

