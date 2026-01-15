import * as admin from "firebase-admin";

/**
 * Firebase Admin SDK configuration
 * 
 * Este SDK é usado apenas no backend (API routes) e bypassa as regras de segurança
 * do Firestore, permitindo operações privilegiadas como criação de enquetes e
 * processamento de webhooks do Stripe.
 * 
 * IMPORTANTE: Este SDK NÃO é usado no frontend, apenas nas API routes do Next.js
 * 
 * Para configurar:
 * 1. Gere uma chave de service account no Firebase Console
 * 2. Adicione as variáveis de ambiente no .env.local
 * 3. Em desenvolvimento, pode funcionar sem credenciais (usando apenas projectId)
 */

// Inicializar Admin SDK apenas uma vez
if (!admin.apps.length) {
  try {
    // Opção 1: Usar variáveis de ambiente com credenciais (recomendado para produção)
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
      console.log("[FIREBASE_ADMIN] Inicializado com credenciais de service account");
    } 
    // Opção 2: Usar Application Default Credentials (ADC) - funciona no Firebase/Google Cloud
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("[FIREBASE_ADMIN] Inicializado com Application Default Credentials");
    }
    // Opção 3: Fallback para desenvolvimento - usar apenas projectId (pode funcionar em dev)
    else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.warn("[FIREBASE_ADMIN] Inicializado apenas com projectId (modo desenvolvimento). Configure credenciais para produção.");
    }
    else {
      throw new Error("Firebase Admin SDK não pode ser inicializado: faltam credenciais ou NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[FIREBASE_ADMIN] Erro ao inicializar Admin SDK:", errorMessage);
    // Log adicional para debugging
    if (errorMessage.includes("private key") || errorMessage.includes("PEM")) {
      console.error("[FIREBASE_ADMIN] Dica: Verifique se FIREBASE_ADMIN_PRIVATE_KEY está formatado corretamente no .env.local");
      console.error("[FIREBASE_ADMIN] A chave privada deve estar entre aspas duplas e manter os \\n literais");
    }
    // Não lançar erro aqui para não quebrar o app - será tratado quando usado
  }
}

// Exportar instâncias do Admin SDK
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

export default admin;

