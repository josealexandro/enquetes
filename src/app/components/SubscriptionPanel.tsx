"use client";

import { useMemo, useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
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

const renderPlanLimits = (limits: PlanLimits) => {
  // DOCUMENTAÇÃO: Filtra limites para exibir apenas: pollsPerMonth, activePolls (se > 0) e commercialProfiles (se > 0)
  // Remove teamMembers e storageMb da exibição conforme solicitado
  // Enquetes ativas e perfis comerciais só aparecem se o valor for maior que 0
  const limitsToShow: Array<keyof PlanLimits> = [
    'pollsPerMonth', 
    ...(limits.activePolls > 0 ? (['activePolls'] as const) : []), 
    ...(limits.commercialProfiles > 0 ? (['commercialProfiles'] as const) : [])
  ];
  
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm text-gray-300">
      {limitsToShow.map((key) => (
        <div key={key} className="bg-gray-900/40 rounded-lg px-3 py-2">
          <dt className="text-gray-400">{limitLabels[key]}</dt>
          <dd className="font-semibold text-white">{limits[key]}</dd>
        </div>
      ))}
    </dl>
  );
};

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

const SubscriptionPanel = ({
  companyId,
  companyName,
}: SubscriptionPanelProps) => {
  const { plans, subscription, payments, loading, error, refetch } =
    useSubscriptionData(companyId, { enabled: !!companyId });

  const [alert, setAlert] = useState<AlertState | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Estado para contador de enquetes
  const [pollsCount, setPollsCount] = useState<{
    pollsLimit: number;
    pollsCreated: number;
    pollsRemaining: number;
  } | null>(null);

  const currentStatus =
    subscription?.status && statusStyles[subscription.status]
      ? statusStyles[subscription.status]
      : null;

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans]
  );

  // OTIMIZAÇÃO DE CUSTO: Buscar contador apenas quando necessário
  // - Quando a página carrega (companyId ou subscription muda)
  // - Quando o usuário clica em "Atualizar"
  // - NÃO fazer polling automático para evitar custos no Firebase
  useEffect(() => {
    if (!companyId) return;

    const fetchPollsCount = async () => {
      try {
        const response = await fetch(`/api/polls/count?companyId=${companyId}`, {
          cache: "no-store",
        });
        
        if (response.ok) {
          const data = await response.json();
          setPollsCount(data);
        } else {
          console.warn("Erro ao buscar contador de enquetes:", response.status);
        }
      } catch (error) {
        console.error("Erro ao buscar contador de enquetes:", error);
      }
    };

    // Buscar apenas uma vez quando companyId ou subscription mudar
    // NÃO fazer polling automático para economizar leituras do Firestore
    fetchPollsCount();
  }, [companyId, subscription]);
  
  // Função para atualizar contador manualmente (chamada quando usuário clica em "Atualizar")
  // EXEMPLO: Use esta função após criar uma enquete para atualizar o contador imediatamente
  const refreshPollsCount = async () => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/polls/count?companyId=${companyId}`, {
        cache: "no-store",
      });
      
      if (response.ok) {
        const data = await response.json();
        setPollsCount(data);
      }
    } catch (error) {
      console.error("Erro ao atualizar contador de enquetes:", error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;
    setShowCancelModal(false);
    setIsCancelling(true);
    setAlert(null);
    try {
      const response = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao cancelar.");
      setAlert({ type: "success", message: "Assinatura será cancelada ao final do período atual. Você continua com acesso até lá." });
      await refetch();
    } catch (err) {
      setAlert({ type: "error", message: err instanceof Error ? err.message : "Erro ao cancelar. Tente novamente." });
    } finally {
      setIsCancelling(false);
    }
  };

  const startCheckoutFlow = async (plan: Plan) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId: plan.id,
        companyId,
        companyName,
        successUrl: window.location.origin + "/dashboard?payment=success", // Redireciona para o dashboard com status de sucesso
        cancelUrl: window.location.origin + "/dashboard?payment=cancelled", // Redireciona para o dashboard com status de cancelamento
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(
        json?.message ||
          "Não foi possível iniciar o checkout do Stripe. Tente novamente."
      );
    }

    const data = (await res.json()) as { url: string };

    // Redireciona para o checkout hospedado do Stripe
    if (typeof window !== "undefined" && data.url) {
      window.location.href = data.url;
    }
  };

  const handlePlanSelection = async (plan: Plan) => {
    if (processingPlanId || subscription?.planId === plan.id) return;

    setProcessingPlanId(plan.id);
    setAlert(null);

    try {
      // Vai direto para o Stripe - a assinatura será criada pelo webhook após confirmação do pagamento
      await startCheckoutFlow(plan);

      // Não precisa mostrar alerta aqui, pois já está redirecionando
    } catch (err) {
      console.error("Erro ao selecionar plano:", err);
      setAlert({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível iniciar o checkout. Tente mais tarde.",
      });
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
              
              {/* EXIBIÇÃO DE ENQUETES RESTANTES */}
              {pollsCount && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400">Uso do plano</p>
                    <button
                      onClick={refreshPollsCount}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      title="Atualizar contador agora"
                    >
                      🔄 Atualizar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Clique em &quot;Atualizar&quot; para ver o contador mais recente
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Enquetes criadas:</span>
                      <span className="text-white font-semibold">
                        {pollsCount.pollsCreated} / {pollsCount.pollsLimit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Enquetes restantes:</span>
                      <span className={`font-bold ${
                        pollsCount.pollsRemaining === 0 
                          ? "text-red-400" 
                          : pollsCount.pollsRemaining <= 2 
                          ? "text-yellow-400" 
                          : "text-green-400"
                      }`}>
                        {pollsCount.pollsRemaining}
                      </span>
                    </div>
                    {/* Barra de progresso visual */}
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          pollsCount.pollsRemaining === 0
                            ? "bg-red-500"
                            : pollsCount.pollsRemaining <= 2
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (pollsCount.pollsCreated / pollsCount.pollsLimit) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Modal de confirmação de cancelamento */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCancelModal(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Cancelar assinatura?</h3>
            <p className="text-gray-300 text-sm mb-6">
              Sua assinatura será cancelada ao final do período atual. Você continuará com acesso até lá.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600"
              >
                Manter assinatura
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                className={`bg-gray-800 border rounded-2xl p-6 flex flex-col gap-4 min-w-0 overflow-hidden ${
                  subscription?.planId === plan.id
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "border-gray-700"
                }`}
              >
                <div className="min-w-0">
                  <h4 className="text-2xl font-semibold text-white truncate" title={plan.name}>{plan.name}</h4>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2" title={plan.description}>{plan.description}</p>
                </div>
                <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {/* DOCUMENTAÇÃO: Exibe preço atual e preço original riscado (se houver) para efeito de promoção */}
                  {plan.originalPrice && plan.originalPrice > plan.price ? (
                    <>
                      <span className="text-xl text-gray-500 line-through shrink-0">
                        {formatBRL(plan.originalPrice)}
                      </span>
                      <span className="text-2xl md:text-3xl font-bold text-white shrink-0">
                        {formatBRL(plan.price)}
                      </span>
                      <span className="text-gray-400 text-sm shrink-0">
                        /{plan.billingPeriod === "monthly" ? "mês" : "ano"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl md:text-3xl font-bold text-white shrink-0">
                        {formatBRL(plan.price)}
                      </span>
                      <span className="text-gray-400 text-sm shrink-0">
                        /{plan.billingPeriod === "monthly" ? "mês" : "ano"}
                      </span>
                    </>
                  )}
                </div>
                <ul className="text-sm text-gray-300 space-y-2 min-w-0">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 min-w-0">
                      <span className="text-cyan-400 mt-1 shrink-0">•</span>
                      <span className="min-w-0 break-words">{feature}</span>
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
        {/* Link discreto para cancelar assinatura: ao final da seção Planos disponíveis */}
        {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
          <div className="mt-6 pt-4 border-t border-gray-700 text-center">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={isCancelling}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors disabled:opacity-50"
            >
              {isCancelling ? "Cancelando..." : "Cancelar assinatura no final do período"}
            </button>
          </div>
        )}
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

