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

    // Utilizando a API Core V5 para criar uma Order fechada (closed: false)
    // Isso gera uma URL de checkout se configurado corretamente,
    // ou podemos usar a API de Orders para criar um pedido e pegar o "checkouts_url" se a conta tiver essa feature.
    // No entanto, a forma mais comum na V5 para "link de pagamento" style é criar um pedido com `closed: false`.
    
    const url = `${PAGARME_API_BASE.replace(/\/$/, "")}/orders`;

    const payload = {
      customer: {
        // Dados fictícios mínimos ou reais se tivermos
        name: companyName || "Cliente",
        email: "cliente@email.com", // Idealmente viria do request
      },
      items: [
        {
          amount: amount,
          description: `Assinatura ${companyName} - ${planId}`,
          quantity: 1,
          code: planId,
        },
      ],
      closed: false, // Importante para permitir pagamento posterior via link
      payment_method: "checkout", // Indica que queremos usar o checkout hospedado
      checkout: {
        expires_in: 120, // Expira em 120 minutos (exemplo)
        billing_address_editable: true,
        customer_editable: true,
        accepted_payment_methods: ["credit_card", "pix", "boleto"],
        success_url: "https://seusite.com/sucesso", // Idealmente configurável
        skip_checkout_success_page: false,
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

    let json;
    try {
      // Clonamos a resposta para tentar ler como JSON primeiro
      // Se falhar, tentamos ler o texto original (do clone ou da original se não lido)
      const responseClone = response.clone();
      try {
        json = await response.json();
      } catch {
        // Se não for JSON, tentamos ler como texto do clone para logar
        const text = await responseClone.text();
        console.error(
          "[PAGARME_PAYMENTLINK] Falha ao ler JSON de resposta. Corpo bruto:",
          text
        );
        throw new Error(
           `Resposta inválida do Pagar.me (Status ${response.status}). Corpo não é JSON.`
        );
      }
    } catch (err) {
      // Re-lançamos o erro para ser pego pelo catch externo
      throw err;
    }

    if (!response.ok) {
      console.error("[PAGARME_PAYMENTLINK] Erro ao criar payment link:", json);
      const detail =
        json?.message ||
        json?.errors?.[0]?.message ||
        JSON.stringify(json) ||
        "Erro desconhecido no gateway";
      return NextResponse.json(
        { message: `Erro no gateway: ${detail}` },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { 
        // Na API de Orders, a URL de checkout geralmente vem em "checkouts[0].payment_url" ou similar
        // Precisamos verificar a estrutura de resposta da V5 para Orders com checkout.
        // Geralmente é response.checkouts[0].payment_url
        url: json.checkouts?.[0]?.payment_url || json.checkouts?.[0]?.pay_url || "", 
        id: json.id as string 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PAGARME_PAYMENTLINK_POST]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: `Erro inesperado ao criar link de pagamento: ${errorMessage}` },
      { status: 500 }
    );
  }
}


