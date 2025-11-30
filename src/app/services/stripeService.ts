import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover", // Alinhando com a versão da API no dashboard do Stripe
});

export default stripe;


