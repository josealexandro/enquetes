
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe"; // Importando apenas os tipos do Stripe
import { handleCheckoutSessionCompleted, handleInvoicePaid, handleCustomerSubscriptionUpdated } from "@/app/services/stripeWebhookHandlers";
import { getStripe } from "@/app/services/stripeService"; // Importando a função para obter a instância

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("Webhook Error: Missing stripe-signature header");
    return new NextResponse("Webhook Error: Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) { // Alterado de 'any' para 'unknown'
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`Webhook Error: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  // Processando eventos
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.updated":
      await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
