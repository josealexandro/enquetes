import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/services/stripeService";

export async function POST(req: NextRequest) {
  const { companyId, companyName, successUrl, cancelUrl, priceId } = await req.json();

  if (!companyId || !companyName || !successUrl || !cancelUrl || !priceId) {
    return new NextResponse("Dados incompletos para criar a sessão de checkout.", { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // Mudança para "payment" para compra avulsa
      line_items: [
        {
          price: priceId, // ID do preço do produto "Criação de Enquete Avulsa"
          quantity: 1,
        },
      ],
      metadata: {
        companyId,
        companyName,
        type: "single_poll_credit", // Para identificar este tipo de pagamento no webhook
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: undefined, // Opcional: Stripe pode inferir se o usuário já tem conta
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Erro ao criar sessão de checkout para enquete avulsa:", error);
    return new NextResponse("Erro interno ao criar sessão de checkout.", { status: 500 });
  }
}
