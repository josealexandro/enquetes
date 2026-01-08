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
 * Gera relatório textual automático baseado nas estatísticas
 * DOCUMENTAÇÃO: Função pura que gera texto interpretativo sem usar IA
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
    report += `**Observação:** A opção "${leastVoted.text}" teve baixa relevância (${leastVotedPercentage.toFixed(1)}%), indicando pouca preferência dos participantes.`;
  }

  return report;
}

