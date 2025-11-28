import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";

const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
const PAGARME_API_BASE =
  process.env.PAGARME_API_BASE || "https://api.pagar.me/core/v5";

if (!PAGARME_API_KEY) {
  console.warn(
    "[PAGARME_PAYMENTLINK] PAGARME_API_KEY não configurada. Links reais não serão criados."
  );
}

interface CreatePaymentLinkBody {
  amount: number; // em centavos
  planId: string;
  companyId: string;
  companyName: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!PAGARME_API_KEY) {
      return NextResponse.json(
        { message: "Chave do Pagar.me não configurada." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as CreatePaymentLinkBody;
    const { amount, planId, companyId, companyName } = body;

    if (!amount || !planId || !companyId || !companyName) {
      return NextResponse.json(
        { message: "Dados incompletos para criar o link de pagamento." },
        { status: 400 }
      );
    }

    const url = `${PAGARME_API_BASE.replace(/\/$/, "")}/paymentlinks`;

    const payload = {
      type: "order",
      name: `Assinatura ${companyName} - ${planId}`,
      payment_settings: {
        // Para simplificar a validação, por enquanto aceitamos apenas cartão.
        accepted_payment_methods: ["credit_card"],
        credit_card_settings: {
          operation_type: "auth_and_capture",
          // A API exige alguma configuração de parcelamento/brand_installments.
          // Aqui configuramos apenas 1x sem juros.
          installments: [
            {
              number: 1,
              total: amount,
            },
          ],
        },
      },
      cart_settings: {
        items: [
          {
            code: planId,
            name: `Plano ${planId}`,
            amount,
            default_quantity: 1,
          },
        ],
      },
      metadata: {
        planId,
        companyId,
        companyName,
      },
    };

    const authHeader = `Basic ${Buffer.from(`${PAGARME_API_KEY}:`).toString(
      "base64"
    )}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error("[PAGARME_PAYMENTLINK] Erro ao criar payment link:", json);
      return NextResponse.json(
        { message: "Erro ao criar link de pagamento no gateway." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { url: json.url as string, id: json.id as string },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PAGARME_PAYMENTLINK_POST]", error);
    return NextResponse.json(
      { message: "Erro inesperado ao criar link de pagamento." },
      { status: 500 }
    );
  }
}


