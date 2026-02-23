import { NextRequest, NextResponse } from "next/server";
import {
  CreateSubscriptionInput,
  createSubscription,
  getSubscriptionByCompany,
} from "@/app/services/subscriptionService";
import { getIsAdminByCompanyId } from "@/lib/adminAuth";
import { DEFAULT_PLANS } from "@/app/data/planSeeds";
import type { Subscription } from "@/app/types/subscription";
import { Timestamp } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    // Verificar se Firebase está configurado
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("[GET_SUBSCRIPTION] Firebase não está configurado");
      return NextResponse.json(
        { 
          message: "Firebase não está configurado. Verifique as variáveis de ambiente.",
          error: "FIREBASE_NOT_CONFIGURED"
        },
        { status: 500 }
      );
    }

    const companyId = request.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId é obrigatório para consultar a assinatura." },
        { status: 400 }
      );
    }

    console.log("[GET_SUBSCRIPTION] Buscando assinatura para companyId:", companyId);

    // ADMIN: Se o usuário está em ADMIN_EMAILS, retorna assinatura virtual (plano topo) para a UI mostrar acesso total
    const isAdmin = await getIsAdminByCompanyId(companyId);
    if (isAdmin) {
      const planPro = DEFAULT_PLANS.find((p) => p.slug === "pro") ?? DEFAULT_PLANS[DEFAULT_PLANS.length - 1];
      const now = Timestamp.now();
      const periodEnd = Timestamp.fromMillis(now.toMillis() + 365 * 24 * 60 * 60 * 1000);
      const virtualSubscription: Subscription = {
        id: "admin-virtual",
        companyId,
        companyName: "Conta demonstração",
        planId: planPro.id,
        planSnapshot: {
          slug: planPro.slug,
          name: planPro.name,
          price: planPro.price,
          currency: planPro.currency,
          billingPeriod: planPro.billingPeriod,
          limits: planPro.limits,
        },
        status: "ACTIVE",
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      };
      console.log("[GET_SUBSCRIPTION] Retornando assinatura virtual para conta admin.");
      return NextResponse.json({ subscription: virtualSubscription });
    }
    
    // CORREÇÃO: getSubscriptionByCompany agora usa Admin SDK quando disponível (webhook/API context)
    // Se Admin SDK não estiver disponível, usa Client SDK (pode dar erro de permissão)
    // Isso é normal - não ter assinatura não é erro, retornar null é válido
    const subscription = await getSubscriptionByCompany(companyId);
    
    console.log("[GET_SUBSCRIPTION] Assinatura encontrada:", subscription ? "sim" : "não");
    
    // Retornar null se não houver assinatura (não é erro, é estado válido)
    return NextResponse.json({ subscription: subscription ?? null });
  } catch (error) {
    console.error("[GET_SUBSCRIPTION] Erro detalhado:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Verificar se é erro de permissão do Firestore
    if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
      return NextResponse.json(
        { 
          message: "Erro de permissão ao acessar assinatura. Verifique as regras do Firestore.",
          error: "PERMISSION_DENIED",
          hint: "As regras do Firestore podem estar bloqueando o acesso à collection 'subscriptions'"
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        message: "Erro ao buscar assinatura.",
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateSubscriptionInput>;

    if (!body.companyId || !body.companyName || !body.planId) {
      return NextResponse.json(
        {
          message:
            "companyId, companyName e planId são obrigatórios para criar uma assinatura.",
        },
        { status: 400 }
      );
    }

    const subscriptionId = await createSubscription({
      companyId: body.companyId,
      companyName: body.companyName,
      planId: body.planId,
      paymentMethod: body.paymentMethod,
      pendingInvoiceId: body.pendingInvoiceId,
      status: body.status,
    });

    return NextResponse.json({ subscriptionId }, { status: 201 });
  } catch (error) {
    console.error("[POST_SUBSCRIPTION]", error);
    return NextResponse.json(
      { message: "Erro ao criar assinatura." },
      { status: 500 }
    );
  }
}


