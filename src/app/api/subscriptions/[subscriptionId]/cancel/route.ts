import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/app/services/stripeService";
import { adminDb } from "@/lib/firebase-admin";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Busca assinatura no Stripe pelo metadata.companyId (fallback quando Firestore não tem stripeSubscriptionId). */
async function findStripeSubscriptionByCompanyId(
  stripe: Stripe,
  companyId: string
): Promise<Stripe.Subscription | null> {
  console.log(`[CANCEL_SUBSCRIPTION] Buscando assinatura no Stripe por companyId: ${companyId}`);
  const subscriptions = await stripe.subscriptions.list({ limit: 100 });
  console.log(`[CANCEL_SUBSCRIPTION] Total de assinaturas encontradas no Stripe: ${subscriptions.data.length}`);
  
  const found = subscriptions.data.find((sub) => {
    const metadataCompanyId = sub.metadata?.companyId;
    const match = metadataCompanyId === companyId;
    if (match) {
      console.log(`[CANCEL_SUBSCRIPTION] ✅ Assinatura encontrada por companyId:`, {
        stripeSubscriptionId: sub.id,
        status: sub.status,
        metadata: sub.metadata,
      });
    }
    return match;
  });
  
  if (!found) {
    console.warn(`[CANCEL_SUBSCRIPTION] ⚠️ Nenhuma assinatura encontrada no Stripe com metadata.companyId = ${companyId}`);
    console.log(`[CANCEL_SUBSCRIPTION] Assinaturas disponíveis (primeiras 5):`, 
      subscriptions.data.slice(0, 5).map(sub => ({
        id: sub.id,
        metadata: sub.metadata,
        status: sub.status,
      }))
    );
  }
  
  return found ?? null;
}

/**
 * DOCUMENTAÇÃO: API Route para cancelar assinatura
 * 
 * Esta rota cancela a assinatura no Stripe, que por sua vez
 * atualiza o Firestore via webhook.
 * 
 * Fluxo:
 * 1. Busca a assinatura no Firestore pelo subscriptionId
 * 2. Busca a assinatura no Stripe: usa stripeSubscriptionId do Firestore quando disponível; senão lista por metadata.companyId
 * 3. Cancela a assinatura no Stripe (cancel_at_period_end = true)
 * 4. O webhook customer.subscription.updated atualiza cancelAtPeriodEnd no Firestore; ao fim do período, customer.subscription.deleted define status CANCELED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await params;

  console.log(`[CANCEL_SUBSCRIPTION] Iniciando cancelamento para subscriptionId: ${subscriptionId}`);

  try {
    // 1. Buscar assinatura no Firestore
    console.log(`[CANCEL_SUBSCRIPTION] Buscando assinatura no Firestore: ${subscriptionId}`);

    // IMPORTANTE: em produção, use Admin SDK para evitar "Missing or insufficient permissions"
    let subscription: Record<string, unknown> | null = null;

    if (adminDb) {
      console.log(`[CANCEL_SUBSCRIPTION] Usando Admin SDK para ler assinatura`);
      const adminSnap = await adminDb.collection("subscriptions").doc(subscriptionId).get();

      if (!adminSnap.exists) {
        console.error(`[CANCEL_SUBSCRIPTION] Assinatura não encontrada no Firestore (Admin SDK): ${subscriptionId}`);
        return NextResponse.json(
          { message: "Assinatura não encontrada." },
          { status: 404 }
        );
      }

      subscription = adminSnap.data() ?? null;
    } else {
      // Fallback (útil em dev/local). Em produção pode falhar por regras.
      console.warn(`[CANCEL_SUBSCRIPTION] Admin SDK não disponível; usando Client SDK (pode falhar por permissões).`);
      const subscriptionRef = doc(db, "subscriptions", subscriptionId);
      const subscriptionSnap = await getDoc(subscriptionRef);

      if (!subscriptionSnap.exists()) {
        console.error(`[CANCEL_SUBSCRIPTION] Assinatura não encontrada no Firestore (Client SDK): ${subscriptionId}`);
        return NextResponse.json(
          { message: "Assinatura não encontrada." },
          { status: 404 }
        );
      }

      subscription = subscriptionSnap.data() ?? null;
    }

    if (!subscription) {
      console.error(`[CANCEL_SUBSCRIPTION] Dados da assinatura vazios: ${subscriptionId}`);
      return NextResponse.json(
        { message: "Assinatura inválida." },
        { status: 400 }
      );
    }
    const companyId = subscription?.companyId;
    const stripeSubscriptionIdFromFirestore = subscription?.stripeSubscriptionId as string | undefined;

    console.log(`[CANCEL_SUBSCRIPTION] Assinatura encontrada no Firestore:`, {
      subscriptionId,
      companyId,
      stripeSubscriptionId: stripeSubscriptionIdFromFirestore || "não definido",
      status: subscription?.status,
    });

    if (!companyId) {
      console.error(`[CANCEL_SUBSCRIPTION] Assinatura sem companyId: ${subscriptionId}`);
      return NextResponse.json(
        { message: "Assinatura sem companyId associado." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Se a assinatura no Firestore ainda não tem stripeSubscriptionId (casos antigos),
    // tentamos resolver automaticamente via email do usuário (sem edição manual no banco).
    let stripeSubscriptionIdResolved = stripeSubscriptionIdFromFirestore;

    if (!stripeSubscriptionIdResolved && adminDb) {
      try {
        const userSnap = await adminDb.collection("users").doc(companyId).get();
        const email = (userSnap.exists ? (userSnap.data() as Record<string, unknown>)?.email : undefined) as string | undefined;

        if (email) {
          console.log(`[CANCEL_SUBSCRIPTION] Tentando resolver stripeSubscriptionId via email do usuário: ${email}`);
          const customers = await stripe.customers.search({
            query: `email:'${email.replace(/'/g, "\\'")}'`,
            limit: 1,
          });

          const customerId = customers.data[0]?.id;
          if (customerId) {
            const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
            const candidate = subs.data.find((s) =>
              s.status === "active" || s.status === "trialing" || s.status === "past_due"
            );

            if (candidate) {
              stripeSubscriptionIdResolved = candidate.id;
              console.log(`[CANCEL_SUBSCRIPTION] ✅ stripeSubscriptionId resolvido automaticamente: ${stripeSubscriptionIdResolved}`);

              // Persistir o vínculo para próximos cancelamentos (Admin SDK bypass rules)
              await adminDb.collection("subscriptions").doc(subscriptionId).set(
                {
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: stripeSubscriptionIdResolved,
                },
                { merge: true }
              );
            } else {
              console.warn(`[CANCEL_SUBSCRIPTION] Não encontrei assinatura ativa para o customer ${customerId}`);
            }
          } else {
            console.warn(`[CANCEL_SUBSCRIPTION] Nenhum customer encontrado no Stripe para email: ${email}`);
          }
        } else {
          console.warn(`[CANCEL_SUBSCRIPTION] Email do usuário não encontrado em users/${companyId}; não foi possível resolver stripeSubscriptionId automaticamente.`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[CANCEL_SUBSCRIPTION] Falha ao tentar resolver stripeSubscriptionId automaticamente: ${msg}`);
      }
    }

    let stripeSubscription: Stripe.Subscription | null;

    // Preferir stripeSubscriptionId do Firestore (mais confiável, evita paginação e ambiguidade)
    if (stripeSubscriptionIdResolved) {
      console.log(`[CANCEL_SUBSCRIPTION] Tentando buscar assinatura no Stripe usando stripeSubscriptionId: ${stripeSubscriptionIdResolved}`);
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionIdResolved);
        console.log(`[CANCEL_SUBSCRIPTION] Assinatura encontrada no Stripe via stripeSubscriptionId:`, {
          id: sub.id,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
        });
        if (sub.status === "canceled") {
          console.warn(`[CANCEL_SUBSCRIPTION] Assinatura já está cancelada no Stripe: ${stripeSubscriptionIdResolved}`);
          return NextResponse.json(
            { message: "Assinatura já está cancelada no Stripe." },
            { status: 400 }
          );
        }
        stripeSubscription = sub;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.warn(`[CANCEL_SUBSCRIPTION] stripeSubscriptionId inválido (${stripeSubscriptionIdResolved}), buscando por companyId:`, errorMsg);
        stripeSubscription = await findStripeSubscriptionByCompanyId(stripe, companyId);
      }
    } else {
      console.log(`[CANCEL_SUBSCRIPTION] stripeSubscriptionId não encontrado no Firestore, buscando por companyId: ${companyId}`);
      stripeSubscription = await findStripeSubscriptionByCompanyId(stripe, companyId);
    }

    if (!stripeSubscription) {
      console.error(`[CANCEL_SUBSCRIPTION] Assinatura não encontrada no Stripe para companyId: ${companyId}`);
      return NextResponse.json(
        { message: "Assinatura não encontrada no Stripe." },
        { status: 404 }
      );
    }

    console.log(`[CANCEL_SUBSCRIPTION] Assinatura encontrada no Stripe, cancelando:`, {
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      current_cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    });

    // 3. Cancelar assinatura no Stripe (cancelar no final do período)
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: true,
    });

    // Tipagem do Stripe pode retornar Stripe.Response<Stripe.Subscription> (nem sempre expõe campos diretamente no tipo)
    const updatedSub = updatedSubscription as unknown as Stripe.Subscription;
    const currentPeriodEnd = (updatedSub as Stripe.Subscription).current_period_end;

    console.log(`[CANCEL_SUBSCRIPTION] ✅ Assinatura cancelada com sucesso no Stripe:`, {
      stripeSubscriptionId: updatedSub.id,
      cancel_at_period_end: updatedSub.cancel_at_period_end,
      current_period_end: typeof currentPeriodEnd === "number"
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : "não disponível",
    });

    return NextResponse.json({ 
      ok: true,
      message: "Assinatura será cancelada ao final do período atual.",
      stripeSubscriptionId: updatedSub.id,
      cancelAtPeriodEnd: updatedSub.cancel_at_period_end,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[CANCEL_SUBSCRIPTION] ❌ Erro ao cancelar assinatura:`, {
      subscriptionId,
      error: errorMsg,
      stack: errorStack,
    });
    return NextResponse.json(
      { 
        message: "Erro ao cancelar assinatura.",
        error: process.env.NODE_ENV === "development" ? errorMsg : undefined,
      },
      { status: 500 }
    );
  }
}

