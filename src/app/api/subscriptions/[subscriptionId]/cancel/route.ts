import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/app/services/stripeService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Busca assinatura no Stripe pelo metadata.companyId (fallback quando Firestore não tem stripeSubscriptionId). */
async function findStripeSubscriptionByCompanyId(
  stripe: Stripe,
  companyId: string
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({ limit: 100 });
  const found = subscriptions.data.find((sub) => sub.metadata?.companyId === companyId);
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

  try {
    // 1. Buscar assinatura no Firestore
    const subscriptionRef = doc(db, "subscriptions", subscriptionId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      return NextResponse.json(
        { message: "Assinatura não encontrada." },
        { status: 404 }
      );
    }

    const subscription = subscriptionSnap.data();
    const companyId = subscription?.companyId;
    const stripeSubscriptionIdFromFirestore = subscription?.stripeSubscriptionId as string | undefined;

    if (!companyId) {
      return NextResponse.json(
        { message: "Assinatura sem companyId associado." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    let stripeSubscription: Stripe.Subscription | null;

    // Preferir stripeSubscriptionId do Firestore (mais confiável, evita paginação e ambiguidade)
    if (stripeSubscriptionIdFromFirestore) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionIdFromFirestore);
        if (sub.status === "canceled") {
          return NextResponse.json(
            { message: "Assinatura já está cancelada no Stripe." },
            { status: 400 }
          );
        }
        stripeSubscription = sub;
      } catch (e) {
        console.warn("[CANCEL_SUBSCRIPTION] stripeSubscriptionId do Firestore inválido, buscando por companyId:", e);
        stripeSubscription = await findStripeSubscriptionByCompanyId(stripe, companyId);
      }
    } else {
      stripeSubscription = await findStripeSubscriptionByCompanyId(stripe, companyId);
    }

    if (!stripeSubscription) {
      return NextResponse.json(
        { message: "Assinatura não encontrada no Stripe." },
        { status: 404 }
      );
    }

    // 3. Cancelar assinatura no Stripe (cancelar no final do período)
    await stripe.subscriptions.update(stripeSubscription.id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ 
      ok: true,
      message: "Assinatura será cancelada ao final do período atual."
    });
  } catch (error) {
    console.error("[CANCEL_SUBSCRIPTION]", error);
    return NextResponse.json(
      { message: "Erro ao cancelar assinatura." },
      { status: 500 }
    );
  }
}

