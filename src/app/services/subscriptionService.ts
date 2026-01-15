import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// Validar se Firebase está configurado
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.warn("[subscriptionService] Firebase não está configurado. Algumas funcionalidades podem não funcionar.");
}
import { DEFAULT_PLANS } from "@/app/data/planSeeds";
import {
  Plan,
  PlanSlug,
  Subscription,
  SubscriptionStatus,
  Payment,
  PaymentStatus,
  SubscriptionAudit,
} from "@/app/types/subscription";

// Helper functions para criar referências de coleção apenas quando necessário
const getPlansCollection = () => collection(db, "plans");
const getSubscriptionsCollection = () => collection(db, "subscriptions");
const getPaymentsCollection = () => collection(db, "payments");
const getAuditCollection = () => collection(db, "subscription_audit");

const findPlanSeedById = (planId: string) =>
  DEFAULT_PLANS.find((plan) => plan.id === planId);

const findPlanSeedBySlug = (slug: PlanSlug) =>
  DEFAULT_PLANS.find((plan) => plan.slug === slug);

export async function ensureDefaultPlans() {
  try {
    // DOCUMENTAÇÃO: Atualiza os planos no Firestore com os dados mais recentes (incluindo originalPrice)
    // Usa merge: true para atualizar campos existentes e adicionar novos campos sem perder dados
    // IMPORTANTE: Garante que isActive seja sempre true para todos os planos padrão
    const tasks = DEFAULT_PLANS.map(async (plan) => {
      try {
        const ref = doc(getPlansCollection(), plan.id);
        // Garantir que isActive seja sempre true para planos padrão
        const planData = { ...plan, isActive: true };
        // DOCUMENTAÇÃO: merge: true garante que campos novos (como originalPrice) sejam adicionados
        await setDoc(ref, planData, { merge: true });
        console.log(`[ensureDefaultPlans] Plano ${plan.id} atualizado com isActive: true`);
      } catch (error) {
        console.error(`[ensureDefaultPlans] Erro ao criar/atualizar plano ${plan.id}:`, error);
        // Continua com os outros planos mesmo se um falhar
      }
    });

    await Promise.all(tasks);
    console.log("[ensureDefaultPlans] Todos os planos padrão foram atualizados no Firestore");
  } catch (error) {
    console.error("[ensureDefaultPlans] Erro geral:", error);
    throw error;
  }
}

export async function listPlans(): Promise<Plan[]> {
  try {
    // Tentar buscar planos com filtro de isActive (requer índice composto)
    const plansQuery = query(
      getPlansCollection(), 
      where("isActive", "==", true),
      orderBy("sortOrder", "asc")
    );
    const snapshot = await getDocs(plansQuery);
    if (snapshot.size > 0) {
      // DOCUMENTAÇÃO: Retorna planos ativos do Firestore (já atualizados por ensureDefaultPlans)
      const plans = snapshot.docs.map((docSnap) => docSnap.data() as Plan);
      console.log(`[listPlans] Encontrados ${plans.length} planos ativos no Firestore`);
      return plans;
    }
    // Se não encontrou planos ativos, tentar buscar todos e filtrar
    console.warn("[listPlans] Nenhum plano ativo encontrado com filtro, tentando buscar todos...");
  } catch (error) {
    // Erro pode ser por falta de índice composto - tentar fallback
    console.warn("[listPlans] Erro ao buscar planos com filtro (pode ser índice composto):", error);
  }
  
  // Fallback: buscar todos os planos e filtrar no código
  try {
    const plansQuery = query(getPlansCollection(), orderBy("sortOrder", "asc"));
    const snapshot = await getDocs(plansQuery);
    if (snapshot.size > 0) {
      const allPlans = snapshot.docs.map((docSnap) => docSnap.data() as Plan);
      // Filtrar planos ativos manualmente (isActive !== false garante que undefined também passa)
      const activePlans = allPlans.filter(plan => plan.isActive !== false);
      console.log(`[listPlans] Fallback: encontrados ${allPlans.length} planos, ${activePlans.length} ativos`);
      
      if (activePlans.length > 0) {
        return activePlans;
      }
    }
  } catch (fallbackError) {
    console.error("[listPlans] Fallback também falhou:", fallbackError);
  }
  
  // Último recurso: retornar planos padrão (todos ativos)
  console.warn("[listPlans] Retornando planos padrão do código");
  return DEFAULT_PLANS;
}

export async function getSubscriptionByCompany(companyId: string) {
  try {
    if (!companyId || companyId.trim().length === 0) {
      console.error("[getSubscriptionByCompany] companyId inválido:", companyId);
      return null;
    }

    const subscriptionQuery = query(
      getSubscriptionsCollection(),
      where("companyId", "==", companyId),
      limit(1)
    );

    const snapshot = await getDocs(subscriptionQuery);
    if (!snapshot.docs.length) {
      return null;
    }

    const subscriptionData = snapshot.docs[0].data();
    
    // Garantir que os campos obrigatórios existam
    if (!subscriptionData) {
      console.error("[getSubscriptionByCompany] Dados da assinatura vazios");
      return null;
    }

    return subscriptionData as Subscription;
  } catch (error: any) {
    // Se for erro de permissão, retornar null em vez de lançar erro
    // Isso permite que a aplicação continue funcionando mesmo sem assinatura
    if (error?.code === 'permission-denied') {
      console.error("[getSubscriptionByCompany] Erro de permissão ao buscar assinatura:", error);
      return null;
    }
    // Re-lançar outros erros para que possam ser tratados adequadamente
    console.error("[getSubscriptionByCompany] Erro ao buscar assinatura:", error);
    throw error;
  }
}

export async function getPlanBySlug(slug: PlanSlug) {
  try {
    const slugQuery = query(getPlansCollection(), where("slug", "==", slug), limit(1));
    const snapshot = await getDocs(slugQuery);
    if (snapshot.docs.length) {
      return snapshot.docs[0].data() as Plan;
    }
  } catch (error) {
    console.error("getPlanBySlug fallback to DEFAULT_PLANS:", error);
  }

  return findPlanSeedBySlug(slug) ?? null;
}

export async function getPlanById(id: string): Promise<Plan | null> {
  try {
    const planDoc = await getDoc(doc(getPlansCollection(), id));
    if (planDoc.exists()) {
      return planDoc.data() as Plan;
    }
  } catch (error) {
    console.error("getPlanById fallback to DEFAULT_PLANS:", error);
  }
  return findPlanSeedById(id) ?? null;
}

export interface CreateSubscriptionInput {
  companyId: string;
  companyName: string;
  planId: string;
  paymentMethod?: string;
  status?: SubscriptionStatus;
  pendingInvoiceId?: string;
}

/**
 * Cria uma nova assinatura no Firestore
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param input - Dados da assinatura a ser criada
 * @returns ID da assinatura criada
 */
export async function createSubscription(input: CreateSubscriptionInput) {
  // Buscar dados do plano (sempre usa Client SDK para leitura, pois é seguro)
  const planRef = doc(getPlansCollection(), input.planId);
  const planDoc = await getDoc(planRef);

  let planData: Plan | undefined;
  if (!planDoc.exists()) {
    planData = findPlanSeedById(input.planId);
    if (!planData) {
      throw new Error("Plano selecionado não encontrado.");
    }
    // Se Admin SDK disponível, usar para criar plano (webhook context)
    if (adminDb) {
      await adminDb.doc(`plans/${input.planId}`).set(planData, { merge: true });
    } else {
      await setDoc(planRef, planData, { merge: true });
    }
  } else {
    planData = planDoc.data() as Plan;
  }

  const now = Timestamp.now();
  const periodLengthInDays = planData.billingPeriod === "monthly" ? 30 : 365;
  const status = input.status ?? (planData.trialDays ? "TRIALING" : "AWAITING_CONFIRMATION");

  const subscriptionData = {
    id: "", // Será definido abaixo
    companyId: input.companyId,
    companyName: input.companyName,
    planId: planData.id,
    planSnapshot: {
      slug: planData.slug,
      name: planData.name,
      price: planData.price,
      currency: planData.currency,
      billingPeriod: planData.billingPeriod,
      limits: planData.limits,
    },
    status,
    startDate: adminDb ? admin.firestore.Timestamp.now() : now,
    currentPeriodStart: adminDb ? admin.firestore.Timestamp.now() : now,
    currentPeriodEnd: adminDb
      ? admin.firestore.Timestamp.fromMillis(now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000)
      : Timestamp.fromMillis(now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    paymentMethod: input.paymentMethod ?? null,
    pendingInvoiceId: input.pendingInvoiceId ?? null,
  };

  let subscriptionId: string;

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const subscriptionDocRef = adminDb.collection("subscriptions").doc();
    subscriptionId = subscriptionDocRef.id;
    subscriptionData.id = subscriptionId;
    await subscriptionDocRef.set(subscriptionData);
    console.log(`[createSubscription] Assinatura criada via Admin SDK: ${subscriptionId}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    const subscriptionRef = doc(getSubscriptionsCollection());
    subscriptionId = subscriptionRef.id;
    subscriptionData.id = subscriptionId;
    await setDoc(subscriptionRef, subscriptionData);
    console.log(`[createSubscription] Assinatura criada via Client SDK: ${subscriptionId}`);
  }

  await logSubscriptionChange({
    subscriptionId,
    actorId: input.companyId,
    actorName: input.companyName,
    toPlan: planData.slug,
    toStatus: status,
    notes: "Assinatura criada via dashboard.",
  });

  return subscriptionId;
}

/**
 * Atualiza o status de uma assinatura no Firestore
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param subscriptionId - ID da assinatura a ser atualizada
 * @param status - Novo status da assinatura
 * @param options - Opções adicionais (notas, ator, invoiceId)
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  options?: { notes?: string; actorId?: string; actorName?: string; invoiceId?: string }
) {
  let currentStatus: SubscriptionStatus;
  let subscriptionData: Subscription | null = null;

  // Buscar assinatura atual (sempre usa Client SDK para leitura, pois é seguro)
  const subscriptionRef = doc(getSubscriptionsCollection(), subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada.");
  }

  subscriptionData = subscriptionSnap.data() as Subscription;
  currentStatus = subscriptionData.status;

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const subscriptionDocRef = adminDb.doc(`subscriptions/${subscriptionId}`);
    await subscriptionDocRef.update({
      status,
      pendingInvoiceId: options?.invoiceId ?? null,
    });
    console.log(`[updateSubscriptionStatus] Status atualizado via Admin SDK: ${subscriptionId} -> ${status}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    await setDoc(
      subscriptionRef,
      { status, pendingInvoiceId: options?.invoiceId ?? null },
      { merge: true }
    );
    console.log(`[updateSubscriptionStatus] Status atualizado via Client SDK: ${subscriptionId} -> ${status}`);
  }

  await logSubscriptionChange({
    subscriptionId,
    actorId: options?.actorId ?? "system",
    actorName: options?.actorName ?? "Sistema",
    fromStatus: currentStatus,
    toStatus: status,
    notes: options?.notes,
  });
}

export interface RecordPaymentInput {
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  gateway: string;
  dueDate: Date;
  paidAt?: Date;
  failureReason?: string;
  rawPayload?: Record<string, unknown>;
}

/**
 * Registra um pagamento no Firestore
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param input - Dados do pagamento a ser registrado
 * @returns ID do pagamento registrado
 */
export async function recordPayment(input: RecordPaymentInput) {
  const paymentData: any = {
    id: "", // Será definido abaixo
    subscriptionId: input.subscriptionId,
    invoiceId: input.invoiceId,
    amount: input.amount,
    currency: "BRL",
    status: input.status,
    gateway: input.gateway,
    dueDate: adminDb
      ? admin.firestore.Timestamp.fromDate(input.dueDate)
      : Timestamp.fromDate(input.dueDate),
    paidAt: input.paidAt
      ? adminDb
        ? admin.firestore.Timestamp.fromDate(input.paidAt)
        : Timestamp.fromDate(input.paidAt)
      : null,
    failureReason: input.failureReason ?? null,
    rawPayload: input.rawPayload ?? null,
    createdAt: adminDb ? admin.firestore.Timestamp.now() : Timestamp.now(),
  };

  let paymentId: string;

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const paymentDocRef = adminDb.collection("payments").doc();
    paymentId = paymentDocRef.id;
    paymentData.id = paymentId;
    await paymentDocRef.set(paymentData);
    console.log(`[recordPayment] Pagamento registrado via Admin SDK: ${paymentId}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    const paymentRef = doc(getPaymentsCollection());
    paymentId = paymentRef.id;
    paymentData.id = paymentId;
    await setDoc(paymentRef, paymentData);
    console.log(`[recordPayment] Pagamento registrado via Client SDK: ${paymentId}`);
  }

  return paymentId;
}

export interface LogSubscriptionChangeInput {
  subscriptionId: string;
  actorId: string;
  actorName: string;
  fromPlan?: PlanSlug;
  toPlan?: PlanSlug;
  fromStatus?: SubscriptionStatus;
  toStatus?: SubscriptionStatus;
  notes?: string;
}

/**
 * Registra uma mudança de assinatura no log de auditoria
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param input - Dados da mudança a ser registrada
 */
export async function logSubscriptionChange(input: LogSubscriptionChangeInput) {
  // Criar createdAt com o tipo apropriado dependendo do contexto
  const createdAt = adminDb ? admin.firestore.Timestamp.now() : Timestamp.now();
  
  const auditData: any = {
    id: "", // Será definido abaixo
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    actorName: input.actorName,
    fromPlan: input.fromPlan,
    toPlan: input.toPlan,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    notes: input.notes,
    createdAt: createdAt as any, // Usar 'as any' para evitar conflito de tipos entre Admin SDK e Client SDK
  };

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const auditDocRef = adminDb.collection("subscription_audit").doc();
    auditData.id = auditDocRef.id;
    await auditDocRef.set(auditData);
    console.log(`[logSubscriptionChange] Mudança registrada via Admin SDK: ${auditData.id}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    const auditRef = doc(getAuditCollection());
    auditData.id = auditRef.id;
    await setDoc(auditRef, auditData);
    console.log(`[logSubscriptionChange] Mudança registrada via Client SDK: ${auditData.id}`);
  }
}

export interface SwitchSubscriptionPlanInput {
  subscriptionId: string;
  newPlanId: string;
  actorId: string;
  actorName: string;
}

/**
 * Altera o plano de uma assinatura existente
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param input - Dados para alteração do plano
 */
export async function switchSubscriptionPlan(input: SwitchSubscriptionPlanInput) {
  // Buscar assinatura atual (sempre usa Client SDK para leitura, pois é seguro)
  const subscriptionRef = doc(getSubscriptionsCollection(), input.subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada.");
  }

  const subscriptionData = subscriptionSnap.data() as Subscription;

  // Buscar novo plano (sempre usa Client SDK para leitura)
  const newPlanRef = doc(getPlansCollection(), input.newPlanId);
  const planSnap = await getDoc(newPlanRef);
  let planData: Plan | undefined;
  if (!planSnap.exists()) {
    planData = findPlanSeedById(input.newPlanId);
    if (!planData) {
      throw new Error("Novo plano não encontrado.");
    }
    // Se Admin SDK disponível, usar para criar plano (webhook context)
    if (adminDb) {
      await adminDb.doc(`plans/${input.newPlanId}`).set(planData, { merge: true });
    } else {
      await setDoc(newPlanRef, planData, { merge: true });
    }
  } else {
    planData = planSnap.data() as Plan;
  }

  const now = adminDb ? admin.firestore.Timestamp.now() : Timestamp.now();
  const periodLengthInDays = planData.billingPeriod === "monthly" ? 30 : 365;

  const updateData = {
    planId: planData.id,
    planSnapshot: {
      slug: planData.slug,
      name: planData.name,
      price: planData.price,
      currency: planData.currency,
      billingPeriod: planData.billingPeriod,
      limits: planData.limits,
    },
    status: "AWAITING_CONFIRMATION" as SubscriptionStatus,
    currentPeriodStart: now,
    currentPeriodEnd: adminDb
      ? admin.firestore.Timestamp.fromMillis(now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000)
      : Timestamp.fromMillis(now.toMillis() + periodLengthInDays * 24 * 60 * 60 * 1000),
    pendingInvoiceId: null,
    cancelAtPeriodEnd: false,
  };

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const subscriptionDocRef = adminDb.doc(`subscriptions/${input.subscriptionId}`);
    await subscriptionDocRef.update(updateData);
    console.log(`[switchSubscriptionPlan] Plano alterado via Admin SDK: ${input.subscriptionId}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    await setDoc(subscriptionRef, updateData, { merge: true });
    console.log(`[switchSubscriptionPlan] Plano alterado via Client SDK: ${input.subscriptionId}`);
  }

  await logSubscriptionChange({
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    actorName: input.actorName,
    fromPlan: subscriptionData.planSnapshot.slug,
    toPlan: planData.slug,
    fromStatus: subscriptionData.status,
    toStatus: "AWAITING_CONFIRMATION",
    notes: "Plano alterado via dashboard.",
  });
}

export async function listPaymentsBySubscription(subscriptionId: string) {
  // Consulta básica sem "orderBy" extra para evitar necessidade de índice composto.
  const paymentsQuery = query(
    getPaymentsCollection(),
    where("subscriptionId", "==", subscriptionId)
  );

  const snapshot = await getDocs(paymentsQuery);
  const items = snapshot.docs.map((docSnap) => docSnap.data() as Payment);

  // Ordena em memória por data de vencimento, mais recente primeiro.
  return items.sort((a, b) => b.dueDate.toMillis() - a.dueDate.toMillis());
}

export async function getPollsLimitForCompany(companyId: string): Promise<number> {
  const subscription = await getSubscriptionByCompany(companyId);
  
  // Obter créditos avulsos e tipo de conta do documento do usuário
  const userRef = doc(db, "users", companyId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;
  const extraPolls = userData?.extraPollsAvailable ?? 0;
  const accountType = userData?.accountType ?? 'personal';

  // Sem assinatura ativa → limite fixo baseado no tipo de conta + avulsos
  if (!subscription || subscription.status !== "ACTIVE") {
    // Contas comerciais têm apenas 1 enquete gratuita, contas pessoais têm 2
    const freeLimit = accountType === 'commercial' ? 1 : 2;
    return freeLimit + extraPolls; 
  }

  // Com assinatura ativa → limite do plano + avulsos
  return subscription.planSnapshot.limits.pollsPerMonth + extraPolls;
}

export async function consumePollCredit(companyId: string) {
  const userRef = doc(db, "users", companyId);
  await updateDoc(userRef, {
    extraPollsAvailable: increment(-1)
  });
  console.log(`Crédito de enquete consumido para o usuário ${companyId}.`);
}

/**
 * Conta quantas enquetes foram CRIADAS no período atual (não enquetes existentes)
 * 
 * IMPORTANTE: Esta função conta de poll_creation_logs, não de polls existentes.
 * Isso garante que o limite seja baseado em enquetes CRIADAS, não enquetes EXISTENTES.
 * 
 * EXEMPLO DE FUNCIONAMENTO:
 * - Usuário tem limite de 2 enquetes por mês
 * - Usuário cria 2 enquetes → countPollsCreatedInCurrentPeriod retorna 2
 * - Usuário tenta criar 3ª enquete → bloqueado (limite atingido)
 * - Usuário exclui 1 enquete → countPollsCreatedInCurrentPeriod AINDA retorna 2
 * - Usuário tenta criar enquete novamente → AINDA bloqueado (limite respeitado)
 * 
 * Por que isso é importante?
 * Sem essa lógica, o usuário poderia criar 2 enquetes, excluir 1, criar 1, excluir 1,
 * criar 1... infinitamente, burlando o limite. Com esta implementação, o limite é
 * baseado em criações, não em existências.
 * 
 * FALLBACK:
 * Se houver erro ao contar logs (ex: índice composto não criado), faz fallback para
 * contar enquetes existentes (comportamento antigo). Isso garante que a aplicação
 * continue funcionando mesmo se houver problemas com os logs.
 */
export async function countPollsCreatedInCurrentPeriod(companyId: string): Promise<number> {
  const subscription = await getSubscriptionByCompany(companyId);

  let periodStart: Timestamp;
  let periodEnd: Timestamp;

  if (!subscription || subscription.status !== "ACTIVE") {
    // Para contas públicas ou com assinatura inativa: contar enquetes no mês corrente
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    periodStart = Timestamp.fromDate(startOfMonth);
    periodEnd = Timestamp.fromDate(endOfMonth);
  } else {
    // Para contas com assinatura ativa: usar o período da assinatura
    if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
      console.warn("Assinatura ativa sem datas de período definidas. Retornando 0 enquetes.", companyId);
      return 0; // Fallback seguro
    }
    periodStart = subscription.currentPeriodStart;
    periodEnd = subscription.currentPeriodEnd;
  }

  // IMPORTANTE: Contar de poll_creation_logs em vez de polls existentes
  // Isso garante que o limite seja baseado em enquetes CRIADAS, não enquetes EXISTENTES
  // Assim, mesmo que o usuário exclua uma enquete, o limite continua sendo respeitado
  // 
  // SEGURANÇA: NUNCA fazer fallback para contar enquetes existentes, pois isso permite bypass
  // ao deletar enquetes. Se houver erro, retornar erro ou valor seguro, mas nunca contar
  // enquetes existentes.
  //
  // Usar Admin SDK quando disponível (backend) para garantir funcionamento mesmo sem request.auth
  try {
    // Tentar usar Admin SDK primeiro (se disponível - backend)
    if (adminDb) {
      const logsCollection = adminDb.collection("poll_creation_logs");
      const snapshot = await logsCollection
        .where("userId", "==", companyId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(periodStart.toDate()))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(periodEnd.toDate()))
        .get();
      return snapshot.size;
    }

    // Fallback para Client SDK (frontend ou se Admin SDK não disponível)
    const logsCollection = collection(db, "poll_creation_logs");
    const logsQuery = query(
      logsCollection,
      where("userId", "==", companyId),
      where("createdAt", ">=", periodStart),
      where("createdAt", "<=", periodEnd)
    );

    const snapshot = await getDocs(logsQuery);
    return snapshot.size;
  } catch (error: any) {
    // REMOVIDO: Fallback perigoso que contava enquetes existentes
    // Isso permitia bypass ao deletar enquetes
    // 
    // Se houver erro ao contar logs, logar o erro e retornar um valor seguro
    // que bloqueia criação (retornar um número alto) para garantir segurança
    console.error("[countPollsCreatedInCurrentPeriod] Erro ao contar logs de criação:", error);
    console.error("[countPollsCreatedInCurrentPeriod] Retornando valor alto para bloquear criação por segurança");
    
    // Retornar um número alto o suficiente para bloquear criação
    // Isso garante que se houver problema técnico, o sistema fica seguro (bloqueia)
    // em vez de inseguro (permite bypass)
    return 999; // Valor alto para garantir bloqueio em caso de erro
  }
}

/**
 * Adiciona créditos de enquete avulsa para uma empresa/usuário
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * 
 * @param companyId - ID da empresa/usuário
 * @param amount - Quantidade de créditos a adicionar (padrão: 1)
 */
export async function addPollCreditToCompany(companyId: string, amount: number = 1) {
  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const userDocRef = adminDb.doc(`users/${companyId}`);
    await userDocRef.update({
      extraPollsAvailable: admin.firestore.FieldValue.increment(amount),
    });
    console.log(`[addPollCreditToCompany] Crédito adicionado via Admin SDK para ${companyId}`);
    return;
  }

  // Fallback para Client SDK (contexto de frontend)
  const userRef = doc(db, "users", companyId);
  await updateDoc(userRef, { extraPollsAvailable: increment(amount) });
  console.log(`[addPollCreditToCompany] Crédito adicionado via Client SDK para ${companyId}`);
}

// Registra a criação de uma enquete no log
// Isso é usado para contar enquetes criadas no período, independentemente de terem sido excluídas
export async function recordPollCreation(userId: string, pollId: string) {
  try {
    const pollCreationLogsCollection = collection(db, "poll_creation_logs");
    await addDoc(pollCreationLogsCollection, {
      userId: userId,
      pollId: pollId,
      createdAt: serverTimestamp(),
    });
  } catch (error: any) {
    // Se falhar ao criar o log, não deve quebrar a criação da enquete
    // O log é importante para o limite, mas não é crítico para a funcionalidade básica
    console.error("Erro ao registrar log de criação de enquete (não crítico):", error);
    // Não re-lançar o erro para não quebrar o fluxo de criação da enquete
  }
}

export interface UpdateSubscriptionPeriodAndCancellationInput {
  subscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Atualiza o período e status de cancelamento de uma assinatura
 * 
 * IMPORTANTE: Esta função detecta automaticamente o contexto:
 * - Se Admin SDK estiver disponível (backend/webhooks): usa Admin SDK (bypassa regras do Firestore)
 * - Se não estiver disponível (frontend): usa Client SDK (respeita regras do Firestore)
 * 
 * Isso garante que webhooks do Stripe funcionem corretamente mesmo sem regras permissivas.
 * Esta função é chamada principalmente pelo webhook `customer.subscription.updated`.
 * 
 * @param input - Dados do período e cancelamento a serem atualizados
 */
export async function updateSubscriptionPeriodAndCancellation(input: UpdateSubscriptionPeriodAndCancellationInput) {
  // Buscar assinatura (sempre usa Client SDK para leitura, pois é seguro)
  const subscriptionRef = doc(getSubscriptionsCollection(), input.subscriptionId);
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) {
    throw new Error("Assinatura não encontrada para atualizar período/cancelamento.");
  }

  const updateData = {
    currentPeriodStart: adminDb
      ? admin.firestore.Timestamp.fromDate(input.currentPeriodStart)
      : Timestamp.fromDate(input.currentPeriodStart),
    currentPeriodEnd: adminDb
      ? admin.firestore.Timestamp.fromDate(input.currentPeriodEnd)
      : Timestamp.fromDate(input.currentPeriodEnd),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  };

  // Usar Admin SDK se disponível (contexto de backend/webhook)
  if (adminDb) {
    const subscriptionDocRef = adminDb.doc(`subscriptions/${input.subscriptionId}`);
    await subscriptionDocRef.update(updateData);
    console.log(`[updateSubscriptionPeriodAndCancellation] Período atualizado via Admin SDK: ${input.subscriptionId}`);
  } else {
    // Fallback para Client SDK (contexto de frontend)
    await setDoc(subscriptionRef, updateData, { merge: true });
    console.log(`[updateSubscriptionPeriodAndCancellation] Período atualizado via Client SDK: ${input.subscriptionId}`);
  }

  await logSubscriptionChange({
    subscriptionId: input.subscriptionId,
    actorId: "stripe_webhook",
    actorName: "Stripe Webhook",
    notes: "Período e status de cancelamento da assinatura atualizados via webhook Stripe.",
  });
}

