import Stripe from "stripe";
// Removendo importação de Timestamp (não utilizada)
import {
  createSubscription,
  getSubscriptionByCompany,
  recordPayment,
  updateSubscriptionStatus,
  switchSubscriptionPlan,
  updateSubscriptionPeriodAndCancellation,
  addPollCreditToCompany,
  // Removendo getPlanById (não utilizada neste arquivo)
} from "@/app/services/subscriptionService";
import { SubscriptionStatus } from "@/app/types/subscription"; // Importando SubscriptionStatus

// Interface estendida para lidar com propriedades que podem não estar na tipagem padrão do Stripe
interface StripeSubscriptionExtended extends Stripe.Subscription {
  current_period_end?: number;
  current_period_start?: number;
  // Removido cancel_at_period_end, pois já existe em Stripe.Subscription
}

/**
 * Handler para o evento checkout.session.completed do Stripe
 * 
 * IMPORTANTE: Esta função é executada no backend (API route) e todas as operações
 * de escrita no Firestore usam Admin SDK automaticamente através das funções do
 * subscriptionService, que detectam o contexto e usam Admin SDK quando disponível.
 * 
 * Isso garante que os webhooks funcionem corretamente mesmo sem regras permissivas
 * do Firestore, pois o Admin SDK bypassa todas as regras de segurança.
 * 
 * Fluxo:
 * 1. Valida metadata da sessão
 * 2. Se for crédito avulso: adiciona crédito via addPollCreditToCompany (Admin SDK)
 * 3. Se for assinatura: cria/atualiza assinatura via createSubscription/switchSubscriptionPlan (Admin SDK)
 * 4. Registra pagamento via recordPayment (Admin SDK)
 * 
 * @param session - Sessão de checkout do Stripe
 */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { metadata, amount_total } = session; // Removendo stripeSubscriptionId

  if (!metadata || !metadata.companyId || !metadata.companyName) {
    console.error("Metadata da sessão de checkout incompleto:", metadata);
    throw new Error("Metadata da sessão de checkout incompleto.");
  }

  const { companyId, companyName } = metadata;
  const amount = amount_total ?? 0;

  // Lógica para pagamentos avulsos (crédito de enquete)
  // NOTA: addPollCreditToCompany usa Admin SDK automaticamente quando executado no backend
  if (metadata.type === "single_poll_credit") {
    await addPollCreditToCompany(companyId);
    // Opcional: registrar o pagamento como um pagamento avulso separado, se necessário
    console.log(`Crédito de enquete avulsa adicionado para a empresa ${companyId} via Checkout Session ${session.id}`);
    return; // Finaliza o processamento para este tipo de evento
  }

  // Lógica existente para assinaturas
  if (!metadata.planId) { // Agora, planId é esperado apenas para assinaturas
    console.error("Metadata da sessão de checkout de assinatura incompleto: planId ausente.", metadata);
    throw new Error("Metadata da sessão de checkout de assinatura incompleto.");
  }

  const { planId } = metadata; // Obtem planId aqui, pois ele é específico para assinaturas
  
  // NOTA: Todas as operações abaixo usam Admin SDK automaticamente quando executadas no backend
  // (createSubscription, switchSubscriptionPlan, updateSubscriptionStatus, recordPayment)
  let subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    // Criar nova assinatura (usa Admin SDK automaticamente)
    await createSubscription({
      companyId,
      companyName,
      planId,
      paymentMethod: "stripe",
      status: "ACTIVE",
    });
    subscription = await getSubscriptionByCompany(companyId);
    if (!subscription) {
      console.error("Falha ao criar assinatura após checkout session:", session.id);
      throw new Error("Não foi possível criar a assinatura após o checkout");
    }
  } else {
    // Se já existe, atualiza o plano e status (para o caso de troca de plano)
    // Usa Admin SDK automaticamente
    await switchSubscriptionPlan({
      subscriptionId: subscription.id,
      newPlanId: planId,
      actorId: "stripe_webhook",
      actorName: "Stripe Webhook",
    });
    await updateSubscriptionStatus(subscription.id, "ACTIVE", {
      actorId: "stripe_webhook",
      actorName: "Stripe Webhook",
      notes: `Plano atualizado via Checkout Session ${session.id}`,
    });
  }

  // Registra o pagamento (se for a primeira fatura, já é paga aqui)
  // Usa Admin SDK automaticamente
  await recordPayment({
    subscriptionId: subscription.id,
    invoiceId: session.id, // ID da sessão de checkout
    amount: amount,
    status: "PAID",
    gateway: "stripe",
    dueDate: new Date(),
    paidAt: new Date(),
    rawPayload: session as unknown as Record<string, unknown>,
  });

  console.log("Assinatura e pagamento processados via Stripe Checkout Session:", session.id);
}

/**
 * Handler para o evento invoice.paid do Stripe
 * 
 * IMPORTANTE: Esta função é executada no backend (API route) e todas as operações
 * de escrita no Firestore usam Admin SDK automaticamente através das funções do
 * subscriptionService, que detectam o contexto e usam Admin SDK quando disponível.
 * 
 * NOTA: Esta função depende de invoice.metadata.companyId. Se o metadata não estiver
 * presente, a função retorna silenciosamente (não lança erro).
 * 
 * @param invoice - Invoice do Stripe que foi paga
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { customer: stripeCustomerId, total, status, id: invoiceId } = invoice;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripeSubscriptionId = (invoice as any).subscription; // Usando 'any' para acessar a propriedade 'subscription'

  if (!stripeSubscriptionId || typeof stripeSubscriptionId !== 'string') {
    console.warn("Invoice paid event sem stripeSubscriptionId válido:", invoiceId);
    return;
  }

  // Buscar a assinatura interna pelo ID do Stripe (precisaremos de um novo campo no Firestore para isso)
  // Por enquanto, vamos assumir que o subscriptionId no Firestore é o mesmo do Stripe se existir
  // OU que podemos buscar pela companyId no metadata se a invoice tiver metadata
  let companyId: string | undefined;
  if (invoice.metadata?.companyId) {
    companyId = invoice.metadata.companyId as string;
  } else if (stripeCustomerId && typeof stripeCustomerId === 'string') {
    // Poderíamos buscar a companyId pelo customerId do Stripe se mapeado no Firestore
    // Por simplicidade, vamos pular isso por enquanto ou assumir que o checkoutSession já cuidou
  }

  if (!companyId) {
    console.warn("Não foi possível determinar companyId para invoice paga:", invoiceId);
    return;
  }

  const subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    console.error("Assinatura não encontrada para companyId na invoice paga:", companyId);
    return;
  }

  await updateSubscriptionStatus(subscription.id, "ACTIVE", {
    actorId: "stripe_webhook",
    actorName: "Stripe Webhook",
    notes: `Fatura ${invoiceId} paga. Status: ${status}`,
  });

  await recordPayment({
    subscriptionId: subscription.id,
    invoiceId: invoiceId,
    amount: total ?? 0,
    status: "PAID", // Assumindo PAID para invoice.paid
    gateway: "stripe",
    dueDate: new Date(invoice.due_date ? invoice.due_date * 1000 : Date.now()),
    paidAt: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()),
    rawPayload: invoice as unknown as Record<string, unknown>,
  });

  console.log("Invoice paga processada:", invoiceId);
}

/**
 * Handler para o evento customer.subscription.updated do Stripe
 * 
 * IMPORTANTE: Esta função é executada no backend (API route) e todas as operações
 * de escrita no Firestore usam Admin SDK automaticamente através das funções do
 * subscriptionService, que detectam o contexto e usam Admin SDK quando disponível.
 * 
 * Esta função atualiza:
 * - Status da assinatura (via updateSubscriptionStatus - Admin SDK)
 * - Período atual (currentPeriodStart/End - via updateSubscriptionPeriodAndCancellation - Admin SDK)
 * - Status de cancelamento (cancelAtPeriodEnd - via updateSubscriptionPeriodAndCancellation - Admin SDK)
 * 
 * NOTA: Esta função depende de subscription.metadata.companyId. Se o metadata não estiver
 * presente, a função retorna silenciosamente (não lança erro).
 * 
 * @param stripeSubscription - Assinatura do Stripe que foi atualizada
 */
export async function handleCustomerSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  // Usando a interface estendida para acessar as propriedades
  const sub = stripeSubscription as StripeSubscriptionExtended;
  const { id: stripeSubscriptionId, status, metadata } = sub;
  const currentPeriodEnd = sub.current_period_end;
  const currentPeriodStart = sub.current_period_start;
  const cancelAtPeriodEnd = sub.cancel_at_period_end; 

  if (!metadata || !metadata.companyId) {
    console.warn("Metadata da assinatura Stripe incompleto para atualização:", stripeSubscriptionId);
    return;
  }

  const companyId = metadata.companyId as string;
  const subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    console.error("Assinatura não encontrada para companyId na atualização Stripe:", companyId);
    return;
  }

  // newStatus foi movido para dentro da função mapStripeSubscriptionStatusToSubscriptionStatus, é usado lá

  await updateSubscriptionStatus(subscription.id, mapStripeSubscriptionStatusToSubscriptionStatus(status), {
    actorId: "stripe_webhook",
    actorName: "Stripe Webhook",
    notes: `Status da assinatura Stripe atualizado para: ${status}`,
  });

  if (typeof currentPeriodStart === 'undefined' || typeof currentPeriodEnd === 'undefined') {
    console.warn("Datas de período (start/end) são indefinidas para a assinatura Stripe:", stripeSubscriptionId);
    return;
  }

  // Atualizar datas de período e cancel_at_period_end
  await updateSubscriptionPeriodAndCancellation({
    subscriptionId: subscription.id,
    currentPeriodStart: new Date(currentPeriodStart * 1000),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    cancelAtPeriodEnd: cancelAtPeriodEnd,
  });

  console.log("Assinatura Stripe atualizada no Firestore:", stripeSubscriptionId);
}

// Helper para mapear status do Stripe para o seu sistema
function mapStripeSubscriptionStatusToSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus { // Alterado tipo de retorno para SubscriptionStatus
  switch (stripeStatus) {
    case "active":
      return "ACTIVE"; // Mapeado para ACTIVE
    case "past_due":
      return "PAST_DUE"; // Mapeado para PAST_DUE
    case "canceled":
      return "CANCELED"; // Mapeado para CANCELED
    case "trialing":
      return "TRIALING"; // Adicionado trialing
    default:
      return "AWAITING_CONFIRMATION"; // Default, pode ser ajustado
  }
}


