/**
 * ADMIN: Conta demo/admin para demonstração da aplicação
 *
 * Quem é admin é definido pela variável de ambiente ADMIN_EMAILS (apenas servidor).
 * Lista de e-mails separados por vírgula, ex: "admin@engaaja.com.br,demo@engaaja.com.br"
 * Não usar NEXT_PUBLIC_ para não expor a lista no frontend.
 *
 * Quando o usuário é admin:
 * - GET /api/subscriptions retorna uma assinatura virtual (plano topo, ACTIVE)
 * - POST /api/polls/validate e POST /api/polls/create ignoram limite de enquetes
 *
 * Se ADMIN_EMAILS não estiver definida ou estiver vazia, ninguém é considerado admin.
 * Em caso de erro ao ler o usuário (doc não existe, sem email), retorna false (não quebra a aplicação).
 */

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Verifica se o usuário (companyId = uid do Firebase) é admin conforme ADMIN_EMAILS.
 * Usado apenas em API routes (server-side). Não expõe a lista de e-mails.
 * Busca o e-mail no Firestore (users/{uid}) e, se não houver, no Firebase Auth (fallback).
 */
export async function getIsAdminByCompanyId(companyId: string): Promise<boolean> {
  const adminEmailsRaw = process.env.ADMIN_EMAILS;
  if (!adminEmailsRaw || typeof adminEmailsRaw !== "string" || adminEmailsRaw.trim() === "") {
    return false;
  }

  const adminEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  if (adminEmails.length === 0) return false;

  let userEmail: string | null = null;

  try {
    // 1) Tentar e-mail no documento do Firestore (users/{uid})
    if (adminDb) {
      const userSnap = await adminDb.collection("users").doc(companyId).get();
      if (userSnap.exists) {
        userEmail = (userSnap.data()?.email as string) ?? null;
      }
    }
    if (!userEmail) {
      const userRef = doc(db, "users", companyId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userEmail = (userSnap.data()?.email as string) ?? null;
      }
    }
    // 2) Fallback: buscar e-mail no Firebase Auth (sempre tem para usuários logados)
    if (!userEmail && adminAuth) {
      const userRecord = await adminAuth.getUser(companyId);
      userEmail = userRecord.email ?? null;
    }
  } catch {
    // Em qualquer erro (permissão, rede, etc.), não considerar admin e não quebrar
    return false;
  }

  if (!userEmail || typeof userEmail !== "string") return false;
  return adminEmails.includes(userEmail.trim().toLowerCase());
}
