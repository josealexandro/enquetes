
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe"; // Importando apenas os tipos do Stripe
import { handleCheckoutSessionCompleted, handleInvoicePaid, handleCustomerSubscriptionUpdated } from "@/app/services/stripeWebhookHandlers";
import { getStripe } from "@/app/services/stripeService"; // Importando a função para obter a instância

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  console.log("[WEBHOOK] Recebida requisição de webhook do Stripe");
  
  // Verificar se STRIPE_WEBHOOK_SECRET está configurado
  if (!webhookSecret) {
    console.error("[WEBHOOK] ERRO CRÍTICO: STRIPE_WEBHOOK_SECRET não está configurado!");
    return new NextResponse("Webhook Error: STRIPE_WEBHOOK_SECRET não configurado", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[WEBHOOK] Erro: Missing stripe-signature header");
    return new NextResponse("Webhook Error: Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`[WEBHOOK] Evento recebido e validado: ${event.type} (ID: ${event.id})`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[WEBHOOK] Erro ao validar evento: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  // Processando eventos
  try {
    switch (event.type) {
      case "checkout.session.completed":
        console.log(`[WEBHOOK] Processando checkout.session.completed (ID: ${event.id})`);
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        console.log(`[WEBHOOK] checkout.session.completed processado com sucesso (ID: ${event.id})`);
        break;

      case "invoice.paid":
        console.log(`[WEBHOOK] Processando invoice.paid (ID: ${event.id})`);
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        console.log(`[WEBHOOK] invoice.paid processado com sucesso (ID: ${event.id})`);
        break;

      case "customer.subscription.updated":
        console.log(`[WEBHOOK] Processando customer.subscription.updated (ID: ${event.id})`);
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        console.log(`[WEBHOOK] customer.subscription.updated processado com sucesso (ID: ${event.id})`);
        break;

      default:
        console.log(`[WEBHOOK] Evento não tratado: ${event.type} (ID: ${event.id})`);
    }
  } catch (error: any) {
    console.error(`[WEBHOOK] ERRO ao processar evento ${event.type} (ID: ${event.id}):`, error);
    console.error(`[WEBHOOK] Stack trace:`, error?.stack);
    // Retornar 500 para que o Stripe reenvie o evento
    return new NextResponse(
      JSON.stringify({ 
        error: "Erro ao processar evento",
        message: error?.message || "Erro desconhecido"
      }), 
      { status: 500 }
    );
  }

  console.log(`[WEBHOOK] Evento ${event.type} processado com sucesso (ID: ${event.id})`);
  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
