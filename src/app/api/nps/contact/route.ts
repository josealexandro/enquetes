import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

/**
 * GET /api/nps/contact?companyId=xxx
 * Lista contatos de clientes insatisfeitos (npsContacts) para a empresa.
 * Usado no dashboard para exibir contatos no painel de NPS.
 */
export async function GET(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { message: "Backend não configurado." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (!companyId || !companyId.trim()) {
    return NextResponse.json(
      { message: "companyId é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const contactsCol = adminDb
      .collection("users")
      .doc(companyId)
      .collection("npsContacts");

    const snapshot = await contactsCol.get();
    const contacts = snapshot.docs.map((doc) => {
      const data = doc.data() as {
        score?: number;
        contactName?: string | null;
        contactInfo?: string | null;
        message?: string | null;
        createdAt?: FirebaseFirestore.Timestamp | Date;
      };
      let createdAt: string | null = null;
      if (data.createdAt instanceof Date) {
        createdAt = data.createdAt.toISOString();
      } else if (data.createdAt && "toDate" in data.createdAt) {
        createdAt = data.createdAt.toDate().toISOString();
      }
      return {
        id: doc.id,
        score: typeof data.score === "number" ? data.score : null,
        contactName: data.contactName ?? null,
        contactInfo: data.contactInfo ?? null,
        message: data.message ?? null,
        createdAt,
      };
    });

    // Ordenar do mais recente para o mais antigo
    contacts.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[NPS CONTACT GET]", error);
    return NextResponse.json(
      { message: "Erro ao buscar contatos." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nps/contact
 * Body: { companyId, clientId, score, contactName?, contactInfo?, message? }
 *
 * Registra um contato de cliente insatisfeito (nota NPS <= 5) para a empresa.
 * Os dados ficam em users/{companyId}/npsContacts/{autoId}.
 */
export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { message: "Backend não configurado." },
      { status: 503 }
    );
  }

  let body: {
    companyId?: string;
    clientId?: string;
    score?: number;
    contactName?: string;
    contactInfo?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { companyId, clientId, score, contactName, contactInfo, message } = body;

  if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
    return NextResponse.json(
      { message: "companyId é obrigatório." },
      { status: 400 }
    );
  }

  if (!clientId || typeof clientId !== "string" || !clientId.trim()) {
    return NextResponse.json(
      { message: "clientId é obrigatório." },
      { status: 400 }
    );
  }

  const numScore = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(numScore)) {
    return NextResponse.json(
      { message: "score é obrigatório." },
      { status: 400 }
    );
  }

  const trimmedName =
    typeof contactName === "string" ? contactName.trim() || null : null;
  const trimmedInfo =
    typeof contactInfo === "string" ? contactInfo.trim() || null : null;
  const trimmedMessage =
    typeof message === "string" ? message.trim() || null : null;

  if (!trimmedName && !trimmedInfo && !trimmedMessage) {
    return NextResponse.json(
      { message: "Informe pelo menos um campo de contato." },
      { status: 400 }
    );
  }

  try {
    const contactsCol = adminDb
      .collection("users")
      .doc(companyId)
      .collection("npsContacts");

    await contactsCol.add({
      clientId,
      score: numScore,
      contactName: trimmedName,
      contactInfo: trimmedInfo,
      message: trimmedMessage,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NPS CONTACT POST]", error);
    return NextResponse.json(
      { message: "Erro ao salvar contato." },
      { status: 500 }
    );
  }
}

