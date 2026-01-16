import { Plan } from "@/app/types/subscription";

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan_basic",
    slug: "basic",
    name: "Basic",
    description: "Ideal para comerciantes que estão começando a coletar feedback.",
    // DOCUMENTAÇÃO: Preço atual do plano Basic
    price: 1990, // R$ 19,90 em centavos
    // DOCUMENTAÇÃO: Preço original riscado para efeito de promoção
    originalPrice: 2990, // R$ 29,90 em centavos (valor cortado para parecer promoção)
    currency: "BRL",
    billingPeriod: "monthly",
    // DOCUMENTAÇÃO: Price ID do Stripe - produto criado manualmente no dashboard (modo LIVE)
    stripePriceId: "price_1SngyARt7Er6J4QoDYzgDQUK",
    trialDays: 7,
    limits: {
      pollsPerMonth: 6, // DOCUMENTAÇÃO: Plano básico com 6 enquetes por mês
      activePolls: 3,
      commercialProfiles: 0, // DOCUMENTAÇÃO: Plano básico não tem página comercial
      teamMembers: 2,
      storageMb: 200,
    },
    features: [
      "Dashboard básico com estatísticas essenciais",
      "Templates de enquetes pré-definidos",
      "Suporte por e-mail em horário comercial",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "plan_medium",
    slug: "medium",
    name: "Medium",
    description: "Plano para empresas em crescimento que precisam de mais controle.",
    // DOCUMENTAÇÃO: Preço atual do plano Medium
    price: 3990, // R$ 39,90 em centavos
    // DOCUMENTAÇÃO: Preço original riscado para efeito de promoção
    originalPrice: 5990, // R$ 59,90 em centavos (valor cortado para parecer promoção)
    currency: "BRL",
    billingPeriod: "monthly",
    // DOCUMENTAÇÃO: Price ID do Stripe - produto criado manualmente no dashboard (modo LIVE)
    stripePriceId: "price_1Snh17Rt7Er6J4QoCdFLrWTs",
    trialDays: 7,
    limits: {
      pollsPerMonth: 14, // DOCUMENTAÇÃO: Plano Medium com 14 enquetes por mês
      activePolls: 10,
      commercialProfiles: 1, // DOCUMENTAÇÃO: Plano Medium com 1 perfil comercial
      teamMembers: 5,
      storageMb: 1000,
    },
    features: [
      "Tudo do Basic",
      "Personalização de temas e cores",
      // DOCUMENTAÇÃO: Exportação de resultados e suporte via chat removidos do plano Medium conforme solicitado
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "plan_pro",
    slug: "pro",
    name: "Pro",
    description:
      "Solução completa para redes ou marcas que dependem de insights em tempo real.",
    // DOCUMENTAÇÃO: Preço atual do plano Pro
    price: 7990, // R$ 79,90 em centavos
    // DOCUMENTAÇÃO: Preço original riscado para efeito de promoção
    originalPrice: 11990, // R$ 119,90 em centavos (valor cortado para parecer promoção)
    currency: "BRL",
    billingPeriod: "monthly",
    // DOCUMENTAÇÃO: Price ID do Stripe - produto criado manualmente no dashboard (modo LIVE)
    stripePriceId: "price_1Snh22Rt7Er6J4QoK3ycCCp8",
    trialDays: 14,
    limits: {
      pollsPerMonth: 50, // DOCUMENTAÇÃO: Plano Pro com 50 enquetes por mês
      activePolls: 50,
      commercialProfiles: 1, // DOCUMENTAÇÃO: Plano Pro com 1 perfil comercial
      teamMembers: 20,
      storageMb: 5000,
    },
    features: [
      "Tudo do Medium",
      "Relatórios visuais e profissionais: Apresente os resultados das suas enquetes com gráficos claros, tabelas organizadas e análises automáticas que facilitam a tomada de decisão e elevam a credibilidade dos seus dados.",
      "Exportação de resultados em PDF",
      // DOCUMENTAÇÃO: Relatórios avançados e API para BI substituídos por relatórios visuais e profissionais
      // Acesso multiunidade, workflows de aprovação, CSM dedicado e SLA customizado removidos do plano Pro
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "plan_teste",
    slug: "teste",
    name: "Plano Teste",
    description: "Plano de teste para validar o sistema de assinaturas e webhook.",
    price: 200, // R$ 2,00 em centavos
    currency: "BRL",
    billingPeriod: "monthly",
    // DOCUMENTAÇÃO: Price ID do Stripe - produto criado manualmente no dashboard (modo LIVE)
    stripePriceId: "price_1SqHooRt7Er6J4QoqpxgECFm",
    trialDays: 0,
    limits: {
      pollsPerMonth: 10, // 10 enquetes por mês
      activePolls: 5,
      commercialProfiles: 0,
      teamMembers: 1,
      storageMb: 100,
    },
    features: [
      "10 enquetes por mês",
      "Ideal para testar o sistema",
      "Dashboard básico",
    ],
    isActive: true,
    sortOrder: 0, // Aparece primeiro na lista
  },
];

