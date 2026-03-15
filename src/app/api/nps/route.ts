import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const NPS_STORAGE_PATH = "users"; // users/{companyId}/ratings/{clientId}

/**
 * GET /api/nps?companyId=xxx&clientId=yyy
 * Retorna a avaliação existente para (companyId, clientId), se houver.
 * Usado pelo frontend para preencher o formulário e permitir atualização.
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
  const clientId = searchParams.get("clientId");

  if (!companyId?.trim() || !clientId?.trim()) {
    return NextResponse.json(
      { message: "companyId e clientId são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const ref = adminDb
      .collection(NPS_STORAGE_PATH)
      .doc(companyId)
      .collection("ratings")
      .doc(clientId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }

    const data = snap.data();
    const score =
      typeof data?.score === "number"
        ? data.score
        : typeof data?.npsScore === "number"
          ? data.npsScore
          : null;
    const comment =
      typeof data?.comment === "string" ? data.comment : undefined;

    return NextResponse.json({
      exists: true,
      score: score ?? undefined,
      comment: comment ?? undefined,
    });
  } catch (error) {
    console.error("[NPS GET]", error);
    return NextResponse.json(
      { message: "Erro ao buscar avaliação." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nps
 * Body: { companyId, clientId, score (0-10), comment? }
 * Garante 1 avaliação por empresa por dispositivo: doc id = clientId (setDoc merge = atualizar).
 */
export async function POST(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { message: "Backend não configurado." },
      { status: 503 }
    );
  }

  let body: { companyId?: string; clientId?: string; score?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { companyId, clientId, score, comment } = body;

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
  if (Number.isNaN(numScore) || numScore < 0 || numScore > 10) {
    return NextResponse.json(
      { message: "score deve ser um número entre 0 e 10." },
      { status: 400 }
    );
  }

  const trimmedComment =
    typeof comment === "string" ? comment.trim() || null : null;

  try {
    const rating = Math.max(1, Math.min(5, Math.round(numScore / 2)));
    const ratingRef = adminDb
      .collection(NPS_STORAGE_PATH)
      .doc(companyId)
      .collection("ratings")
      .doc(clientId);
    const companyRef = adminDb.collection(NPS_STORAGE_PATH).doc(companyId);

    await adminDb.runTransaction(async (tx) => {
      const [ratingSnap, companySnap] = await Promise.all([
        tx.get(ratingRef),
        tx.get(companyRef),
      ]);

      let oldScore0to10: number | null = null;
      if (ratingSnap.exists) {
        const d = ratingSnap.data();
        const s =
          typeof d?.score === "number"
            ? d.score
            : typeof d?.npsScore === "number"
              ? d.npsScore
              : typeof d?.rating === "number"
                ? Math.round(Number(d.rating) * 2)
                : null;
        if (s !== null && !Number.isNaN(s) && s >= 0 && s <= 10) oldScore0to10 = s;
      }

      const data = companySnap.data();
      let totalRatings = typeof data?.totalRatings === "number" && data.totalRatings >= 0 ? data.totalRatings : 0;
      let sumOfScores = typeof data?.sumOfScores === "number" && !Number.isNaN(data.sumOfScores) ? data.sumOfScores : 0;

      if (oldScore0to10 !== null) {
        sumOfScores = sumOfScores - oldScore0to10 + numScore;
      } else {
        totalRatings += 1;
        sumOfScores += numScore;
      }

      tx.set(ratingRef, {
        clientId,
        empresaId: companyId,
        score: numScore,
        npsScore: numScore,
        rating,
        comment: trimmedComment,
        createdAt: new Date(),
      }, { merge: true });

      tx.set(companyRef, { totalRatings, sumOfScores }, { merge: true });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NPS POST]", error);
    return NextResponse.json(
      { message: "Erro ao salvar avaliação." },
      { status: 500 }
    );
  }
}
