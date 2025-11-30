import { NextRequest, NextResponse } from "next/server";
import stripe from "@/app/services/stripeService";
import { getPlanById } from "@/app/services/subscriptionService"; // Assumindo que você tem um serviço para buscar planos

interface CreateCheckoutSessionBody {
  planId: string;
  companyId: string;
  companyName: string;
  successUrl: string; // URL para redirecionar após sucesso
  cancelUrl: string; // URL para redirecionar após cancelamento
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionBody;
    const { planId, companyId, companyName, successUrl, cancelUrl } = body;

    if (!planId || !companyId || !companyName || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { message: "Dados incompletos para criar a sessão de checkout." },
        { status: 400 }
      );
    }

    const plan = await getPlanById(planId); // Busca o plano no seu serviço de assinatura

    if (!plan) {
      return NextResponse.json(
        { message: "Plano não encontrado." },
        { status: 404 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.price, // Preço em centavos
            recurring: {
              interval: plan.billingPeriod === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription", // Para pagamentos recorrentes
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId,
        companyId,
        companyName,
      },
      // Opcional: Adicionar customer_email se disponível no frontend para pré-preencher
      // customer_email: 'customer@example.com',
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_POST] Erro ao criar sessão de checkout:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido ao criar sessão de checkout.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


