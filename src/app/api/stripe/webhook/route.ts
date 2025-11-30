
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe"; // Importando apenas os tipos do Stripe
import { handleCheckoutSessionCompleted, handleInvoicePaid, handleCustomerSubscriptionUpdated } from "@/app/services/stripeWebhookHandlers";
import stripe from "@/app/services/stripeService"; // Importando a instância configurada

// DESATIVA O BODY PARSER – ESSENCIAL PARA O STRIPE!!
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
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
