import Stripe from "stripe";
// Removendo importação de Timestamp (não utilizada)
import {
  createSubscription,
  getSubscriptionByCompany,
  recordPayment,
  updateSubscriptionStatus,
  switchSubscriptionPlan,
  // Removendo getPlanById (não utilizada neste arquivo)
} from "@/app/services/subscriptionService";
import { PaymentStatus } from "@/app/types/subscription";

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { metadata, amount_total } = session; // Removendo stripeSubscriptionId

  if (!metadata || !metadata.planId || !metadata.companyId || !metadata.companyName) {
    console.error("Metadata da sessão de checkout incompleto:", metadata);
    throw new Error("Metadata da sessão de checkout incompleto.");
  }

  const { planId, companyId, companyName } = metadata;
  const amount = amount_total ?? 0;
  // const customerEmail = customer_details?.email || ""; // Não utilizada atualmente

  let subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    await createSubscription({
      companyId,
      companyName,
      planId,
      paymentMethod: "stripe",
      status: "ACTIVE",
    });
    subscription = (await getSubscriptionByCompany(companyId))!;
  } else {
    // Se já existe, atualiza o plano e status (para o caso de troca de plano)
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

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { customer: stripeCustomerId, total, status, id: invoiceId } = invoice;
  const stripeSubscriptionId = invoice.subscription; // Acessar a propriedade subscription corretamente

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

export async function handleCustomerSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  // Removendo cancel_at_period_end e newStatus da desestruturação e atribuição se não utilizadas
  const { id: stripeSubscriptionId, status, current_period_end, current_period_start, metadata } = stripeSubscription; // Removido cancel_at_period_end e newStatus

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

  // Atualizar datas de período e cancel_at_period_end
  await updateSubscriptionPeriodAndCancellation({
    subscriptionId: subscription.id,
    currentPeriodStart: new Date(current_period_start * 1000),
    currentPeriodEnd: new Date(current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, // Usando direto do objeto original
  });

  console.log("Assinatura Stripe atualizada no Firestore:", stripeSubscriptionId);
}

// Helper para mapear status do Stripe para o seu sistema
function mapStripeSubscriptionStatusToSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): PaymentStatus {
  switch (stripeStatus) {
    case "active":
      return "PAID";
    case "past_due":
      return "FAILED"; // Ou outro status que indique pagamento em atraso
    case "canceled":
      return "REFUNDED"; // Ou CANCELED
    // ... mapear outros status conforme necessário
    default:
      return "PENDING";
  }
}


