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
  console.log("[STRIPE_CHECKOUT_POST] Iniciando criação de sessão de checkout");
  
  try {
    // Verificar se Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[STRIPE_CHECKOUT_POST] ERRO: STRIPE_SECRET_KEY não configurada");
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

    console.log("[STRIPE_CHECKOUT_POST] Dados recebidos:", {
      planId,
      companyId,
      companyName: companyName?.substring(0, 20) + "...", // Log parcial por segurança
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
    });

    if (!planId || !companyId || !companyName || !successUrl || !cancelUrl) {
      console.error("[STRIPE_CHECKOUT_POST] ERRO 400: Dados incompletos", {
        hasPlanId: !!planId,
        hasCompanyId: !!companyId,
        hasCompanyName: !!companyName,
        hasSuccessUrl: !!successUrl,
        hasCancelUrl: !!cancelUrl,
      });
      return NextResponse.json(
        { message: "Dados incompletos para criar a sessão de checkout." },
        { status: 400 }
      );
    }

    console.log(`[STRIPE_CHECKOUT_POST] Buscando plano com ID: ${planId}`);
    const plan = await getPlanById(planId);

    if (!plan) {
      console.error(`[STRIPE_CHECKOUT_POST] ERRO 404: Plano não encontrado para ID: ${planId}`);
      return NextResponse.json(
        { message: "Plano não encontrado." },
        { status: 404 }
      );
    }

    console.log(`[STRIPE_CHECKOUT_POST] Plano encontrado: ${plan.name}, preço: ${plan.price}, moeda: ${plan.currency}`);

    // Validar se o plano tem preço válido
    if (!plan.price || plan.price <= 0) {
      console.error(`[STRIPE_CHECKOUT_POST] ERRO 400: Plano com preço inválido. Preço: ${plan.price}`);
      return NextResponse.json(
        { message: "Plano com preço inválido." },
        { status: 400 }
      );
    }

    // Validar currency
    const currency = (plan.currency || "BRL").toLowerCase();
    if (!["brl", "usd", "eur"].includes(currency)) {
      console.error(`[STRIPE_CHECKOUT_POST] ERRO 400: Moeda inválida: ${currency}`);
      return NextResponse.json(
        { message: `Moeda inválida: ${currency}. Use BRL, USD ou EUR.` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    
    // DOCUMENTAÇÃO: Se o plano tem stripePriceId, usa o preço existente no Stripe
    // Caso contrário, cria produto/preço dinamicamente
    const lineItems = plan.stripePriceId
      ? [
          {
            price: plan.stripePriceId, // Usa o Price ID do Stripe
            quantity: 1,
          },
        ]
      : [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: plan.name,
                description: plan.description || "",
              },
              unit_amount: plan.price, // Preço em centavos
              recurring: {
                interval: (plan.billingPeriod === "monthly" ? "month" : "year") as "month" | "year",
              },
            },
            quantity: 1,
          },
        ];

    console.log(`[STRIPE_CHECKOUT_POST] Criando sessão no Stripe`, {
      hasStripePriceId: !!plan.stripePriceId,
      mode: "subscription",
      currency,
      price: plan.price,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
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

    console.log(`[STRIPE_CHECKOUT_POST] Sessão criada com sucesso: ${session.id}`);

    if (!session.url) {
      console.error("[STRIPE_CHECKOUT_POST] Stripe retornou sessão sem URL");
      return NextResponse.json(
        { message: "Erro ao gerar URL de checkout. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT_POST] ERRO ao criar sessão de checkout:", error);
    
    // Log detalhado do erro
    if (error instanceof Error) {
      console.error("[STRIPE_CHECKOUT_POST] Mensagem de erro:", error.message);
      console.error("[STRIPE_CHECKOUT_POST] Stack trace:", error.stack);
    }
    
    // Tratamento específico para erros do Stripe
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type?: string; message?: string; code?: string; param?: string };
      console.error("[STRIPE_CHECKOUT_POST] Erro do Stripe:", {
        type: stripeError.type,
        message: stripeError.message,
        code: stripeError.code,
        param: stripeError.param,
      });
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { 
            message: `Erro na configuração do Stripe: ${stripeError.message || 'Dados inválidos'}`,
            error: stripeError.type,
            code: stripeError.code,
            param: stripeError.param,
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


