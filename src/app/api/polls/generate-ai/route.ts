/**
 * POST /api/polls/generate-ai
 *
 * Gera uma enquete curta com OpenAI (apenas plano Pro).
 * Fluxo: verifica login (token) → verifica Pro → checa limite mensal → rate limit
 * → chama OpenAI (timeout + max_tokens) → valida resposta → incrementa contador (atômico) → cria enquete.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionByCompany } from "@/app/services/subscriptionService";
import { getIsAdminByCompanyId } from "@/lib/adminAuth";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import OpenAI from "openai";

const OPENAI_TIMEOUT_MS = 8000;
const MAX_TOKENS = 60;
const AI_POLLS_LIMIT_PER_MONTH = 10;
const RATE_LIMIT_SEC = 5;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Valida e sanitiza a resposta da IA. Pergunta máx 10 palavras, 2–4 opções. */
function validateAiPollResponse(parsed: unknown): { question: string; options: string[] } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const question = typeof o.question === "string" ? o.question.trim() : "";
  const rawOptions = Array.isArray(o.options) ? o.options : [];
  const options = rawOptions
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!question || question.split(/\s+/).length > 10) return null;
  if (options.length < 2 || options.length > 4) return null;
  return { question, options };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json(
        { message: "Firebase não está configurado.", error: "FIREBASE_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { companyId?: string; topic?: string };
    let uid: string | null = null;

    const authHeader = request.headers.get("Authorization");
    if (adminAuth) {
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { message: "É necessário estar logado. Envie o token em Authorization: Bearer <token>.", error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      const token = authHeader.slice(7);
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
      } catch {
        return NextResponse.json(
          { message: "Token inválido ou expirado. Faça login novamente.", error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    } else {
      uid = typeof body.companyId === "string" ? body.companyId : null;
    }
    if (!uid) {
      return NextResponse.json(
        { message: "É necessário estar logado.", error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const isAdmin = await getIsAdminByCompanyId(uid);
    const subscription = await getSubscriptionByCompany(uid);
    const isActive = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING";
    const isPro = subscription?.planSnapshot?.slug === "pro";
    if (!isAdmin && (!subscription || !isActive || !isPro)) {
      return NextResponse.json(
        { message: "Criação de enquete com IA está disponível apenas no plano Pro com assinatura ativa.", error: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { message: "Admin SDK não disponível.", error: "ADMIN_SDK_NOT_AVAILABLE" },
        { status: 500 }
      );
    }

    const userRef = adminDb.collection("users").doc(uid);

    const now = admin.firestore.Timestamp.now();
    const currentMonth = getCurrentMonth();

    const userSnap = await userRef.get();
    const userData = userSnap.data() ?? {};
    const aiUsage = (userData.aiUsage as { month?: string; count?: number } | undefined) ?? {};
    const usageMonth = aiUsage.month;
    const usageCount = typeof aiUsage.count === "number" ? aiUsage.count : 0;

    const effectiveCount = usageMonth === currentMonth ? usageCount : 0;
    if (effectiveCount >= AI_POLLS_LIMIT_PER_MONTH) {
      return NextResponse.json(
        {
          message: `Você atingiu o limite de ${AI_POLLS_LIMIT_PER_MONTH} enquetes com IA neste mês. Tente no próximo mês.`,
          error: "AI_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    const lastRequestAt = userData.lastAiPollRequestAt as admin.firestore.Timestamp | undefined;
    if (lastRequestAt) {
      const elapsed = now.toMillis() - lastRequestAt.toMillis();
      if (elapsed < RATE_LIMIT_SEC * 1000) {
        return NextResponse.json(
          {
            message: `Aguarde ${RATE_LIMIT_SEC} segundos entre cada geração.`,
            error: "RATE_LIMIT",
          },
          { status: 429 }
        );
      }
    }

    await userRef.update({
      lastAiPollRequestAt: now,
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        { message: "Serviço de IA não configurado.", error: "OPENAI_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 60) : "";
    const topicLine = topic
      ? `O tema ou assunto da enquete deve ser: ${topic}.\n`
      : "";

    const prompt = `${topicLine}Gere uma enquete curta em português do Brasil. Regras:
- Uma única pergunta com no máximo 10 palavras.
- Exatamente 3 ou 4 opções de resposta, cada uma curta (poucas palavras).
- Responda APENAS com um JSON válido, sem markdown, no formato: {"question":"Pergunta aqui","options":["Opção A","Opção B","Opção C"]}`;

    const completionPromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), OPENAI_TIMEOUT_MS);
    });

    let rawContent: string;
    try {
      const completion = await Promise.race([completionPromise, timeoutPromise]);
      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("Resposta vazia da IA");
      rawContent = content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao chamar IA";
      const errDetail = err instanceof Error ? err.message : String(err);
      if (msg === "timeout") {
        return NextResponse.json(
          { message: "A geração demorou muito. Tente novamente.", error: "TIMEOUT" },
          { status: 504 }
        );
      }
      const isQuotaExceeded = /429|quota|billing|exceeded/i.test(errDetail);
      return NextResponse.json(
        {
          message: isQuotaExceeded
            ? "Limite de uso da OpenAI atingido. Verifique seu plano e cobrança em platform.openai.com e tente novamente mais tarde."
            : "Não foi possível gerar a enquete. Tente novamente.",
          error: isQuotaExceeded ? "OPENAI_QUOTA_EXCEEDED" : "OPENAI_ERROR",
        },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned) as unknown;
    } catch {
      return NextResponse.json(
        { message: "Resposta da IA inválida. Tente novamente.", error: "INVALID_RESPONSE" },
        { status: 502 }
      );
    }

    const validated = validateAiPollResponse(parsed);
    if (!validated) {
      return NextResponse.json(
        {
          message: "A enquete gerada não atende aos critérios (pergunta até 10 palavras, 2 a 4 opções). Tente novamente.",
          error: "VALIDATION_FAILED",
        },
        { status: 502 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() ?? {};
        const current = (data.aiUsage as { month?: string; count?: number } | undefined) ?? {};
        const curMonth = current.month === currentMonth ? current.count ?? 0 : 0;
        if (curMonth >= AI_POLLS_LIMIT_PER_MONTH) {
          throw new Error("AI_LIMIT_REACHED");
        }
        tx.update(userRef, {
          aiUsage: {
            month: currentMonth,
            count: current.month === currentMonth ? (current.count ?? 0) + 1 : 1,
          },
        });
      });
    } catch (txErr) {
      if (txErr instanceof Error && txErr.message === "AI_LIMIT_REACHED") {
        return NextResponse.json(
          {
            message: `Você atingiu o limite de ${AI_POLLS_LIMIT_PER_MONTH} enquetes com IA neste mês.`,
            error: "AI_LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
      throw txErr;
    }

    const newCount = effectiveCount + 1;
    const usageRemaining = Math.max(0, AI_POLLS_LIMIT_PER_MONTH - newCount);

    return NextResponse.json(
      {
        success: true,
        question: validated.question,
        options: validated.options,
        usageRemaining,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GENERATE_AI]", error);
    return NextResponse.json(
      { message: "Erro ao gerar enquete. Tente novamente.", error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
