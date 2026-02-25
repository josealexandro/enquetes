import { PollOption } from "../types/poll";

// Interface para os resultados calculados
export interface PollStatistics {
  totalVotes: number;
  optionsWithStats: Array<{
    option: PollOption;
    percentage: number;
  }>;
  mostVoted: PollOption;
  leastVoted: PollOption;
  percentageDifference: number; // Diferença entre 1ª e 2ª opção
}

/**
 * Calcula estatísticas de uma enquete
 * DOCUMENTAÇÃO: Função pura que calcula total de votos, percentuais e rankings
 */
export function calculatePollStatistics(options: PollOption[]): PollStatistics {
  // Calcular total de votos
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);

  // Calcular percentual para cada opção
  const optionsWithStats = options.map((option) => ({
    option,
    percentage: totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0,
  }));

  // Ordenar por votos (maior para menor)
  const sortedOptions = [...optionsWithStats].sort(
    (a, b) => b.option.votes - a.option.votes
  );

  // Opção mais votada (1ª posição)
  const mostVoted = sortedOptions[0]?.option || options[0];

  // Opção menos votada (última posição)
  const leastVoted =
    sortedOptions[sortedOptions.length - 1]?.option || options[0];

  // Diferença percentual entre 1ª e 2ª opção
  const percentageDifference =
    sortedOptions.length >= 2
      ? sortedOptions[0].percentage - sortedOptions[1].percentage
      : 0;

  return {
    totalVotes,
    optionsWithStats: sortedOptions, // Já ordenado por votos
    mostVoted,
    leastVoted,
    percentageDifference,
  };
}

/**
 * Gera recomendações acionáveis com base nas estatísticas da enquete.
 * DOCUMENTAÇÃO: Retorna array de ações práticas; usa percentageDifference e totalVotes já calculados.
 */
function getRecommendations(stats: PollStatistics): string[] {
  const { totalVotes, mostVoted, leastVoted, percentageDifference, optionsWithStats } = stats;
  const recommendations: string[] = [];

  if (totalVotes === 0) return recommendations;

  const leastVotedPercentage = optionsWithStats.find((opt) => opt.option.id === leastVoted.id)?.percentage ?? 0;

  // Poucos votos: recomendar divulgar antes de decidir
  if (totalVotes < 5) {
    recommendations.push("Divulgar a enquete para mais pessoas antes de tomar decisões, para ter uma amostra mais representativa.");
    return recommendations;
  }

  // Disputa muito equilibrada (diferença ≤ 10%)
  if (stats.optionsWithStats.length >= 2 && percentageDifference <= 10) {
    recommendations.push("Segmentar a comunicação: destacar pontos fortes diferentes por canal ou público, em vez de uma mensagem única.");
    recommendations.push("Aprofundar com nova enquete ou entrevistas qualitativas para entender qual fator pesa mais na decisão.");
    recommendations.push("Aproveitar o equilíbrio na mensagem: reforçar que a oferta atende a múltiplas necessidades (ex.: bom custo-benefício e recursos).");
    return recommendations;
  }

  // Vantagem moderada (entre 10% e 30%)
  if (stats.optionsWithStats.length >= 2 && percentageDifference > 10 && percentageDifference <= 30) {
    recommendations.push(`Reforçar a opção "${mostVoted.text}" nas campanhas, mantendo a segunda opção como alternativa destacada.`);
    recommendations.push("Acompanhar se a preferência se mantém ao longo do tempo com novas medições.");
    return recommendations;
  }

  // Preferência clara (diferença > 30%)
  if (stats.optionsWithStats.length >= 2 && percentageDifference > 30) {
    recommendations.push(`Alinhar estratégia e comunicação à opção mais votada ("${mostVoted.text}"), pois há preferência clara do público.`);
    if (leastVotedPercentage < 10) {
      recommendations.push(`Investigar por que "${leastVoted.text}" teve pouca adesão: se é falta de divulgação ou se o público realmente prioriza outros fatores.`);
    }
    return recommendations;
  }

  return recommendations;
}

/**
 * Gera relatório textual automático baseado nas estatísticas
 * DOCUMENTAÇÃO: Função pura que gera texto interpretativo sem usar IA; inclui recomendações acionáveis ao final.
 */
export function generatePollReport(
  pollTitle: string,
  stats: PollStatistics
): string {
  const { totalVotes, mostVoted, leastVoted, percentageDifference } = stats;

  // Se não houver votos, retornar mensagem padrão
  if (totalVotes === 0) {
    return `A enquete "${pollTitle}" ainda não recebeu votos.`;
  }

  // Construir relatório
  let report = `## Relatório da Enquete: ${pollTitle}\n\n`;

  // Total de votos
  report += `**Total de votos:** ${totalVotes}\n\n`;

  // Opção mais votada
  const mostVotedPercentage = stats.optionsWithStats.find(
    (opt) => opt.option.id === mostVoted.id
  )?.percentage || 0;
  report += `**Opção mais votada:** "${mostVoted.text}" com ${mostVotedPercentage.toFixed(1)}% dos votos (${mostVoted.votes} votos).\n\n`;

  // Opção menos votada
  const leastVotedPercentage = stats.optionsWithStats.find(
    (opt) => opt.option.id === leastVoted.id
  )?.percentage || 0;
  report += `**Opção menos votada:** "${leastVoted.text}" com ${leastVotedPercentage.toFixed(1)}% dos votos (${leastVoted.votes} votos).\n\n`;

  // Interpretação da diferença percentual
  if (stats.optionsWithStats.length >= 2) {
    report += `**Análise:** `;
    if (percentageDifference > 30) {
      report += `Há uma preferência clara pela opção "${mostVoted.text}" (diferença de ${percentageDifference.toFixed(1)}% em relação à segunda opção).`;
    } else if (percentageDifference > 10) {
      report += `Há uma disputa equilibrada entre as opções, com "${mostVoted.text}" tendo uma vantagem moderada de ${percentageDifference.toFixed(1)}%.`;
    } else {
      report += `A disputa está muito equilibrada, com apenas ${percentageDifference.toFixed(1)}% de diferença entre as duas opções mais votadas.`;
    }
    report += `\n\n`;
  }

  // Análise da opção menos votada
  if (leastVotedPercentage < 5 && totalVotes > 20) {
    report += `**Observação:** A opção "${leastVoted.text}" teve baixa relevância (${leastVotedPercentage.toFixed(1)}%), indicando pouca preferência dos participantes.\n\n`;
  }

  // Recomendações acionáveis (lista numerada)
  const recommendations = getRecommendations(stats);
  if (recommendations.length > 0) {
    report += `### Recomendações\n\n`;
    recommendations.forEach((text, index) => {
      report += `${index + 1}. ${text}\n`;
    });
  }

  return report;
}

