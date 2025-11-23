import { NextRequest, NextResponse } from "next/server";
import {
  CreateSubscriptionInput,
  createSubscription,
  getSubscriptionByCompany,
} from "@/app/services/subscriptionService";

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId é obrigatório para consultar a assinatura." },
        { status: 400 }
      );
    }

    const subscription = await getSubscriptionByCompany(companyId);
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("[GET_SUBSCRIPTION]", error);
    return NextResponse.json(
      { message: "Erro ao buscar assinatura." },
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


