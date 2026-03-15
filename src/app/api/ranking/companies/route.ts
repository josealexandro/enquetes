import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MIN_RATINGS = 3;

/**
 * GET /api/ranking/companies?limit=7
 * Retorna empresas (usuários comerciais) ordenadas por um score que combina
 * média e volume: scoreFinal = média * log(totalRatings + 1).
 * Exige no mínimo MIN_RATINGS avaliações para entrar no ranking.
 * Usa Admin SDK; não altera regras do Firestore.
 */
export async function GET(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { message: "Backend não configurado." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "7", 10) || 7, 1), 100);

  try {
    const usersSnap = await adminDb
      .collection("users")
      .where("accountType", "==", "commercial")
      .get();

    const companiesWithScores: {
      id: string;
      commercialName: string;
      displayName: string;
      avatarUrl: string | null;
      slug: string;
      averageScore: number;
      totalRatings: number;
      scoreFinal: number;
    }[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const companyId = userDoc.id;
      const commercialName =
        typeof userData.commercialName === "string" && userData.commercialName.trim()
          ? userData.commercialName.trim()
          : userData.displayName || userData.name || "Empresa";
      const displayName =
        typeof userData.displayName === "string"
          ? userData.displayName
          : commercialName;
      const avatarUrl =
        typeof userData.avatarUrl === "string" && userData.avatarUrl
          ? userData.avatarUrl
          : typeof userData.photoURL === "string"
            ? userData.photoURL
            : null;

      let totalRatings: number;
      let averageScore: number;

      const docTotal = userData.totalRatings;
      const docSum = userData.sumOfScores;
      const hasAggregates =
        typeof docTotal === "number" &&
        docTotal >= 0 &&
        typeof docSum === "number" &&
        !Number.isNaN(docSum);

      if (hasAggregates && docTotal > 0) {
        totalRatings = docTotal;
        averageScore = docSum / docTotal;
      } else {
        const ratingsSnap = await adminDb
          .collection("users")
          .doc(companyId)
          .collection("ratings")
          .get();

        const scores: number[] = [];
        ratingsSnap.docs.forEach((ratingDoc) => {
          const d = ratingDoc.data();
          const s =
            typeof d.score === "number"
              ? d.score
              : typeof d.npsScore === "number"
                ? d.npsScore
                : typeof d.rating === "number"
                  ? Math.round(Number(d.rating) * 2)
                  : null;
          if (s !== null && !Number.isNaN(s) && s >= 0 && s <= 10) {
            scores.push(s);
          }
        });

        totalRatings = scores.length;
        if (totalRatings > 0) {
          averageScore = scores.reduce((a, b) => a + b, 0) / totalRatings;
          const companyRef = adminDb.collection("users").doc(companyId);
          const sumOfScores = scores.reduce((a, b) => a + b, 0);
          companyRef.set({ totalRatings, sumOfScores }, { merge: true }).catch((err) => {
            console.warn("[RANKING] backfill aggregates failed for", companyId, err);
          });
        } else {
          continue;
        }
      }

      if (totalRatings < MIN_RATINGS) {
        continue;
      }

      const slug = slugify(commercialName);
      const scoreFinal = averageScore * Math.log(totalRatings + 1);

      companiesWithScores.push({
        id: companyId,
        commercialName,
        displayName,
        avatarUrl,
        slug,
        averageScore: Math.round(averageScore * 10) / 10,
        totalRatings,
        scoreFinal,
      });
    }

    companiesWithScores.sort((a, b) => b.scoreFinal - a.scoreFinal);
    const top = companiesWithScores.slice(0, limit);
    const companies = top.map(({ scoreFinal: _sf, ...c }) => c);

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[RANKING COMPANIES]", error);
    return NextResponse.json(
      { message: "Erro ao buscar ranking." },
      { status: 500 }
    );
  }
}
