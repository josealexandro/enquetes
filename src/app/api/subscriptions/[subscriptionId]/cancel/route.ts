import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/services/stripeService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * DOCUMENTAÇÃO: API Route para cancelar assinatura
 * 
 * Esta rota cancela a assinatura no Stripe, que por sua vez
 * atualiza o Firestore via webhook.
 * 
 * Fluxo:
 * 1. Busca a assinatura no Firestore pelo subscriptionId
 * 2. Busca a assinatura no Stripe usando o companyId do metadata
 * 3. Cancela a assinatura no Stripe (cancel_at_period_end = true)
 * 4. O webhook do Stripe atualiza automaticamente o Firestore
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

    if (!companyId) {
      return NextResponse.json(
        { message: "Assinatura sem companyId associado." },
        { status: 400 }
      );
    }

    // 2. Buscar assinatura no Stripe usando o companyId do metadata
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
    });

    // Encontrar a assinatura do Stripe que corresponde ao companyId
    const stripeSubscription = subscriptions.data.find(
      (sub) => sub.metadata?.companyId === companyId
    );

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

