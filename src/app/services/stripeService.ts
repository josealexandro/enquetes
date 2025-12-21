import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Validar formato da chave do Stripe
if (stripeSecretKey && !stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
  console.error("⚠️ STRIPE_SECRET_KEY com formato inválido!");
  console.error("⚠️ A chave do Stripe deve começar com 'sk_test_' (teste) ou 'sk_live_' (produção)");
  console.error("⚠️ Chave fornecida começa com:", stripeSecretKey.substring(0, 5) + "...");
}

// Inicializar Stripe apenas se a chave estiver configurada
// Isso permite que o build funcione mesmo sem a chave configurada
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  try {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover", // Alinhando com a versão da API no dashboard do Stripe
    });
  } catch (error) {
    console.error("⚠️ Erro ao inicializar Stripe:", error);
    if (error instanceof Error && error.message.includes("Invalid API Key")) {
      console.error("⚠️ A chave do Stripe está inválida. Verifique se você copiou a chave correta do dashboard do Stripe.");
      console.error("⚠️ A chave deve começar com 'sk_test_' para modo de teste ou 'sk_live_' para produção.");
    }
  }
} else {
  console.warn("⚠️ STRIPE_SECRET_KEY não está configurada nas variáveis de ambiente!");
}

// Função helper para obter a instância do Stripe ou lançar erro se não estiver configurado
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe não está configurado. Adicione STRIPE_SECRET_KEY no arquivo .env.local"
    );
  }
  return stripe;
}

// Exportar a função getStripe como default para compatibilidade
// Isso permite que o código existente continue funcionando
// mas o erro só será lançado quando o Stripe for realmente usado
export default getStripe;


