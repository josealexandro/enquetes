import { Plan } from "@/app/types/subscription";

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan_basic",
    slug: "basic",
    name: "Basic",
    description: "Ideal para comerciantes que estão começando a coletar feedback.",
    price: 5990, // R$ 59,90
    currency: "BRL",
    billingPeriod: "monthly",
    trialDays: 7,
    limits: {
      pollsPerMonth: 10,
      activePolls: 3,
      commercialProfiles: 1,
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
    price: 7990, // R$ 79,90
    currency: "BRL",
    billingPeriod: "monthly",
    trialDays: 7,
    limits: {
      pollsPerMonth: 40,
      activePolls: 10,
      commercialProfiles: 3,
      teamMembers: 5,
      storageMb: 1000,
    },
    features: [
      "Tudo do Basic",
      "Personalização de temas e cores",
      "Exportação de resultados (CSV/PDF)",
      "Suporte prioritário via chat",
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
    price: 15990, // R$ 159,90
    currency: "BRL",
    billingPeriod: "monthly",
    trialDays: 14,
    limits: {
      pollsPerMonth: 200,
      activePolls: 50,
      commercialProfiles: 10,
      teamMembers: 20,
      storageMb: 5000,
    },
    features: [
      "Tudo do Medium",
      "Relatórios avançados e API para BI",
      "Acesso multiunidade e workflows de aprovação",
      "CSM dedicado e SLA customizado",
    ],
    isActive: true,
    sortOrder: 3,
  },
];

