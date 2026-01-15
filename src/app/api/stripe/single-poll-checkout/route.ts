import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/app/services/stripeService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  const { companyId, companyName, successUrl, cancelUrl, priceId } = await req.json();

  if (!companyId || !companyName || !successUrl || !cancelUrl || !priceId) {
    return new NextResponse("Dados incompletos para criar a sessão de checkout.", { status: 400 });
  }

  // Verificar se é conta comercial (contas comerciais não podem comprar enquete avulsa)
  try {
    const userRef = doc(db, "users", companyId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const accountType = userData?.accountType ?? 'personal';
      
      if (accountType === 'commercial') {
        return new NextResponse(
          "Contas comerciais não podem comprar enquetes avulsas. Assine um plano para criar mais enquetes.",
          { status: 403 }
        );
      }
    }
  } catch (error) {
    console.error("Erro ao verificar tipo de conta:", error);
    // Continuar o processamento em caso de erro na verificação
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
