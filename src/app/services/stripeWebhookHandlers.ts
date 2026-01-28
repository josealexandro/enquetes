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
import { SubscriptionStatus, PlanSlug } from "@/app/types/subscription"; // Importando SubscriptionStatus e PlanSlug
import { adminDb } from "@/lib/firebase-admin"; // Importar adminDb para verificação

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
  console.log(`[handleCheckoutSessionCompleted] Iniciando processamento da sessão ${session.id}`);
  const { metadata, amount_total, customer, subscription: stripeSubscriptionId } = session;

  console.log(`[handleCheckoutSessionCompleted] Metadata recebido:`, JSON.stringify(metadata));

  // CORREÇÃO 1: companyName NÃO é obrigatório no Stripe, mesmo que enviemos no checkout
  // O Stripe pode não preservar todos os metadados em alguns casos
  // Webhook NUNCA deve falhar por dados opcionais - sempre usar valor padrão
  if (!metadata || !metadata.companyId) {
    console.error("[handleCheckoutSessionCompleted] ERRO: Metadata da sessão de checkout incompleto (companyId ausente):", metadata);
    throw new Error("Metadata da sessão de checkout incompleto (companyId ausente).");
  }

  const companyId = metadata.companyId as string;
  // Usar valor padrão se companyName não vier no metadata (pode acontecer em alguns casos do Stripe)
  const companyName = (metadata.companyName as string) ?? "Empresa sem nome";
  const amount = amount_total ?? 0;
  console.log(`[handleCheckoutSessionCompleted] Processando para companyId: ${companyId}, companyName: ${companyName}, amount: ${amount}`);

  // Lógica para pagamentos avulsos (crédito de enquete)
  // NOTA: addPollCreditToCompany usa Admin SDK automaticamente quando executado no backend
  if (metadata.type === "single_poll_credit") {
    console.log(`[handleCheckoutSessionCompleted] Processando crédito avulso para ${companyId}`);
    await addPollCreditToCompany(companyId);
    console.log(`[handleCheckoutSessionCompleted] Crédito de enquete avulsa adicionado para a empresa ${companyId} via Checkout Session ${session.id}`);
    return; // Finaliza o processamento para este tipo de evento
  }

  // Lógica existente para assinaturas
  if (!metadata.planId) {
    console.error("[handleCheckoutSessionCompleted] ERRO: Metadata da sessão de checkout de assinatura incompleto: planId ausente.", metadata);
    throw new Error("Metadata da sessão de checkout de assinatura incompleto.");
  }

  const { planId } = metadata;
  console.log(`[handleCheckoutSessionCompleted] Processando assinatura: planId=${planId}, companyId=${companyId}`);
  
  // Verificar se Admin SDK está disponível
  if (!adminDb) {
    const errorMsg = "[handleCheckoutSessionCompleted] ERRO CRÍTICO: Admin SDK não está disponível! Verifique FIREBASE_ADMIN_PRIVATE_KEY na Vercel.";
    console.error(errorMsg);
    console.error("[handleCheckoutSessionCompleted] Variáveis de ambiente disponíveis:", {
      hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      hasNextPublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    throw new Error("Admin SDK não está disponível. Verifique FIREBASE_ADMIN_PRIVATE_KEY na Vercel.");
  }
  
  // CORREÇÃO 2: Webhook NUNCA deve falhar por regra de negócio depois que o pagamento foi confirmado
  // Se o plano não existir (renomeado, inativado, não inicializado), criar plano mínimo
  // Regra de ouro: Pagamento confirmado → registrar → ativar algo mínimo → nunca 500
  const { getPlanById } = await import("@/app/services/subscriptionService");
  let plan = await getPlanById(planId);
  
  if (!plan) {
    // Tentar buscar nos planos padrão (fallback)
    const { DEFAULT_PLANS } = await import("@/app/data/planSeeds");
    plan = DEFAULT_PLANS.find(p => p.id === planId) ?? null;
    
    if (!plan) {
      console.warn(`[handleCheckoutSessionCompleted] AVISO: Plano não encontrado (${planId}). Criando plano mínimo para não perder o pagamento.`);
      // Criar plano mínimo temporário para não perder o pagamento
      // Isso garante que o webhook sempre processe com sucesso
      // EXEMPLO: Se você precisar criar um plano dinâmico no futuro, use esta estrutura
      plan = {
        id: planId,
        slug: "basic" as PlanSlug, // Usar slug padrão
        name: `Plano ${planId}`,
        description: "Plano criado automaticamente pelo webhook",
        price: amount, // Usar valor pago como referência
        currency: "BRL",
        billingPeriod: "monthly",
        limits: {
          pollsPerMonth: 1, // Limite mínimo seguro
          activePolls: 1,
          commercialProfiles: 0,
          teamMembers: 1,
          storageMb: 100,
        },
        features: ["Plano criado automaticamente"],
        isActive: true,
        sortOrder: 99,
      };
      console.log(`[handleCheckoutSessionCompleted] Plano mínimo criado: ${plan.name}`);
    } else {
      console.log(`[handleCheckoutSessionCompleted] Plano encontrado nos planos padrão: ${plan.name}`);
    }
  } else {
    console.log(`[handleCheckoutSessionCompleted] Plano encontrado: ${plan.name} (${plan.slug})`);
  }
  
  // NOTA: Todas as operações abaixo usam Admin SDK automaticamente quando executadas no backend
  // (createSubscription, switchSubscriptionPlan, updateSubscriptionStatus, recordPayment)
  console.log(`[handleCheckoutSessionCompleted] Buscando assinatura existente para ${companyId}`);
  let subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    console.log(`[handleCheckoutSessionCompleted] Assinatura não existe. Criando nova assinatura para ${companyId}`);
    // Criar nova assinatura (usa Admin SDK automaticamente)
    // CORREÇÃO 4: Salvar IDs do Stripe ao criar assinatura
    // customer pode ser string (ID) ou objeto Customer - extrair ID corretamente
    const stripeCustomerId = typeof customer === 'string' ? customer : customer?.id;
    const subscriptionId = await createSubscription({
      companyId,
      companyName,
      planId,
      paymentMethod: "stripe",
      status: "ACTIVE",
      stripeCustomerId: stripeCustomerId ?? undefined,
      stripeSubscriptionId: typeof stripeSubscriptionId === 'string' ? stripeSubscriptionId : undefined,
    });
    console.log(`[handleCheckoutSessionCompleted] Assinatura criada com ID: ${subscriptionId}`, {
      stripeCustomerId: stripeCustomerId ?? 'não disponível',
      stripeSubscriptionId: typeof stripeSubscriptionId === 'string' ? stripeSubscriptionId : 'não disponível',
    });
    
    subscription = await getSubscriptionByCompany(companyId);
    if (!subscription) {
      console.error("[handleCheckoutSessionCompleted] ERRO: Falha ao criar assinatura após checkout session:", session.id);
      throw new Error("Não foi possível criar a assinatura após o checkout");
    }
    console.log(`[handleCheckoutSessionCompleted] Assinatura confirmada no banco: ${subscription.id}, status: ${subscription.status}`);
  } else {
    console.log(`[handleCheckoutSessionCompleted] Assinatura já existe (ID: ${subscription.id}). Atualizando plano e status.`);
    // Se já existe, atualiza o plano e status (para o caso de troca de plano)
    // Usa Admin SDK automaticamente
    await switchSubscriptionPlan({
      subscriptionId: subscription.id,
      newPlanId: planId,
      actorId: "stripe_webhook",
      actorName: "Stripe Webhook",
    });
    console.log(`[handleCheckoutSessionCompleted] Plano atualizado para ${planId}`);
    
    await updateSubscriptionStatus(subscription.id, "ACTIVE", {
      actorId: "stripe_webhook",
      actorName: "Stripe Webhook",
      notes: `Plano atualizado via Checkout Session ${session.id}`,
    });
    console.log(`[handleCheckoutSessionCompleted] Status atualizado para ACTIVE`);
  }

  // Registra o pagamento (se for a primeira fatura, já é paga aqui)
  // Usa Admin SDK automaticamente
  console.log(`[handleCheckoutSessionCompleted] Registrando pagamento: subscriptionId=${subscription.id}, amount=${amount}`);
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
  console.log(`[handleCheckoutSessionCompleted] Pagamento registrado com sucesso`);

  console.log(`[handleCheckoutSessionCompleted] SUCESSO: Assinatura e pagamento processados via Stripe Checkout Session ${session.id}`);
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

/**
 * Handler para o evento customer.subscription.deleted do Stripe
 *
 * Chamado quando a assinatura é efetivamente encerrada (ex.: ao fim do período após cancel_at_period_end).
 * Atualiza o Firestore para status CANCELED e remove cancelAtPeriodEnd.
 */
export async function handleCustomerSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const sub = stripeSubscription as StripeSubscriptionExtended;
  const { id: stripeSubscriptionId, metadata } = sub;

  if (!metadata || !metadata.companyId) {
    console.warn("Metadata da assinatura Stripe incompleto para subscription.deleted:", stripeSubscriptionId);
    return;
  }

  const companyId = metadata.companyId as string;
  const subscription = await getSubscriptionByCompany(companyId);

  if (!subscription) {
    console.warn("Assinatura não encontrada para companyId em subscription.deleted:", companyId);
    return;
  }

  await updateSubscriptionStatus(subscription.id, "CANCELED", {
    actorId: "stripe_webhook",
    actorName: "Stripe Webhook",
    notes: "Assinatura encerrada no Stripe (customer.subscription.deleted).",
  });

  await updateSubscriptionPeriodAndCancellation({
    subscriptionId: subscription.id,
    currentPeriodStart: new Date((sub.current_period_start ?? 0) * 1000),
    currentPeriodEnd: new Date((sub.current_period_end ?? 0) * 1000),
    cancelAtPeriodEnd: false,
  });

  console.log("Assinatura Stripe marcada como CANCELED no Firestore:", stripeSubscriptionId);
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


