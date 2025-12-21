import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/services/stripeService";
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
    // Verificar se Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[STRIPE_CHECKOUT_POST] STRIPE_SECRET_KEY não configurada");
      return NextResponse.json(
        { 
          message: "Stripe não está configurado. Verifique as variáveis de ambiente.",
          error: "STRIPE_SECRET_KEY missing"
        },
        { status: 500 }
      );
    }

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

    // Validar se o plano tem preço válido
    if (!plan.price || plan.price <= 0) {
      return NextResponse.json(
        { message: "Plano com preço inválido." },
        { status: 400 }
      );
    }

    // Validar currency
    const currency = (plan.currency || "BRL").toLowerCase();
    if (!["brl", "usd", "eur"].includes(currency)) {
      return NextResponse.json(
        { message: `Moeda inválida: ${currency}. Use BRL, USD ou EUR.` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: plan.name,
              description: plan.description || "",
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

    if (!session.url) {
      console.error("[STRIPE_CHECKOUT_POST] Stripe retornou sessão sem URL");
      return NextResponse.json(
        { message: "Erro ao gerar URL de checkout. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_POST] Erro ao criar sessão de checkout:", error);
    
    // Tratamento específico para erros do Stripe
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type?: string; message?: string };
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { 
            message: `Erro na configuração do Stripe: ${stripeError.message || 'Dados inválidos'}`,
            error: stripeError.type
          },
          { status: 400 }
        );
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido ao criar sessão de checkout.";
    return NextResponse.json({ 
      message: errorMessage,
      hint: "Verifique se STRIPE_SECRET_KEY está configurada corretamente no .env.local"
    }, { status: 500 });
  }
}


