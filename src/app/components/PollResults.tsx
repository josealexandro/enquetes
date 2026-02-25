"use client";

import { useRef, useState } from "react";
import { Poll } from "../types/poll";
import { calculatePollStatistics, generatePollReport } from "../utils/pollStats";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PollResultsProps {
  poll: Poll;
}

/**
 * Componente para exibir resultados de uma enquete comercial
 * DOCUMENTAÇÃO: Exibe gráfico simples, tabela e relatório textual
 * Permite exportar resultados em PDF
 */
export default function PollResults({ poll }: PollResultsProps) {
  // Ref para o elemento que será capturado para PDF
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Calcular estatísticas
  const stats = calculatePollStatistics(poll.options);

  // Gerar relatório
  const report = generatePollReport(poll.title, stats);

  // Cores para o gráfico (em hexadecimal para compatibilidade com html2canvas)
  // DOCUMENTAÇÃO: Usar cores hexadecimais diretas evita problemas com funções CSS modernas (lab, oklch)
  const colors = [
    "#6366f1", // indigo-500
    "#3b82f6", // blue-500
    "#10b981", // green-500
    "#eab308", // yellow-500
    "#ef4444", // red-500
    "#a855f7", // purple-500
  ];

  /**
   * Função para gerar gráfico de pizza em SVG
   * DOCUMENTAÇÃO: Cria gráfico de pizza simples usando SVG, compatível com PDF
   */
  const generatePieChart = () => {
    if (stats.totalVotes === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-zinc-500">
          <p>Sem votos para exibir</p>
        </div>
      );
    }

    const size = 200; // Tamanho do círculo
    const radius = size / 2 - 10; // Raio com margem
    const center = size / 2;
    let currentAngle = -90; // Começar no topo (-90 graus)

    // Calcular arcos para cada opção
    const arcs = stats.optionsWithStats.map((item, index) => {
      const percentage = item.percentage;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Converter ângulos para radianos
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calcular pontos do arco
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      
      // Flag para arco grande (maior que 180 graus)
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${center} ${center}`, // Mover para o centro
        `L ${x1} ${y1}`, // Linha para o início do arco
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arco
        'Z' // Fechar o caminho
      ].join(' ');

      currentAngle = endAngle; // Atualizar ângulo para próxima fatia

      return {
        path: pathData,
        color: colors[index % colors.length],
        percentage,
        option: item.option,
      };
    });

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="mb-4">
          {arcs.map((arc) => (
            <path
              key={arc.option.id}
              d={arc.path}
              fill={arc.color}
              stroke="#ffffff"
              strokeWidth="2"
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </svg>
        {/* Legenda do gráfico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
          {arcs.map((arc) => (
            <div key={arc.option.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: arc.color }}
              ></div>
              <span className="text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                {arc.option.text}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                {arc.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Exporta resultados da enquete em PDF
   * DOCUMENTAÇÃO: Usa iframe isolado para evitar erros com cores CSS modernas (lab, oklch)
   * O iframe cria um documento separado que não herda estilos do Tailwind
   */
  const handleExportPDF = async () => {
    if (!resultsRef.current) return;

    setIsExporting(true);

    try {
      // PASSO 1: Criar iframe invisível (documento isolado)
      // DOCUMENTAÇÃO: iframe não herda estilos globais do Tailwind, evitando erros de cores modernas
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px'; // Fora da tela
      iframe.style.left = '-10000px';
      iframe.style.width = resultsRef.current.offsetWidth + 'px';
      iframe.style.height = '2000px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      // Aguardar iframe carregar
      await new Promise((resolve) => {
        iframe.onload = resolve;
        iframe.src = 'about:blank';
      });
      
      // Acessar documento do iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Não foi possível acessar o documento do iframe');
      }
      
      // PASSO 2: Criar HTML limpo com cores HEX (sem Tailwind)
      // DOCUMENTAÇÃO: HTML criado do zero com apenas cores HEX inline, evitando cores CSS modernas
      const dateStr = new Date().toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "long", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      
      // Construir HTML completo com todas as cores em HEX
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #000000;
              padding: 24px;
            }
          </style>
        </head>
        <body>
          <div style="background: #ffffff; padding: 24px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                Resultados da Enquete
              </h2>
              <p style="font-size: 18px; color: #374151; margin-bottom: 8px;">${poll.title}</p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">
                Gerado em ${dateStr}
              </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0;">
                  ${stats.totalVotes}
                </p>
                <p style="font-size: 14px; color: #4b5563; margin: 4px 0 0 0;">
                  Total de Votos
                </p>
              </div>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 0;">
                  ${stats.mostVoted.votes}
                </p>
                <p style="font-size: 14px; color: #4b5563; margin: 4px 0 0 0;">
                  Mais Votada
                </p>
              </div>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 0;">
                  ${stats.leastVoted.votes}
                </p>
                <p style="font-size: 14px; color: #4b5563; margin: 4px 0 0 0;">
                  Menos Votada
                </p>
              </div>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb;">
                <p style="font-size: 24px; font-weight: bold; color: #9333ea; margin: 0;">
                  ${stats.percentageDifference.toFixed(1)}%
                </p>
                <p style="font-size: 14px; color: #4b5563; margin: 4px 0 0 0;">
                  Diferença 1ª/2ª
                </p>
              </div>
            </div>

            <!-- Gráfico de Pizza para PDF -->
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
              <h4 style="font-size: 18px; font-weight: 600; color: #2563eb; margin-bottom: 16px;">
                Distribuição de Votos (Gráfico de Pizza)
              </h4>
              <div style="display: flex; flex-direction: column; align-items: center;">
                <svg width="200" height="200" style="margin-bottom: 16px;">
                  ${(() => {
                    if (stats.totalVotes === 0) return '';
                    const radius = 90;
                    const center = 100;
                    let currentAngle = -90;
                    const arcs = stats.optionsWithStats.map((item, index) => {
                      const percentage = item.percentage;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const x1 = center + radius * Math.cos(startRad);
                      const y1 = center + radius * Math.sin(startRad);
                      const x2 = center + radius * Math.cos(endRad);
                      const y2 = center + radius * Math.sin(endRad);
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      // DOCUMENTAÇÃO: Usar concatenação de strings ao invés de template literals aninhados
                      const pathData = 'M ' + center + ' ' + center + ' L ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + largeArcFlag + ' 1 ' + x2 + ' ' + y2 + ' Z';
                      currentAngle = endAngle;
                      return { path: pathData, color: colors[index % colors.length], percentage, option: item.option };
                    });
                    return arcs.map((arc) => 
                      '<path d="' + arc.path + '" fill="' + arc.color + '" stroke="#ffffff" stroke-width="2" />'
                    ).join('');
                  })()}
                </svg>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; width: 100%; max-width: 400px;">
                  ${stats.optionsWithStats.map((item, index) => `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                      <div style="width: 16px; height: 16px; border-radius: 4px; background-color: ${colors[index % colors.length]};"></div>
                      <span style="color: #374151; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.option.text}</span>
                      <span style="color: #4b5563; font-weight: 500;">${item.percentage.toFixed(1)}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Gráfico de Barras para PDF -->
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
              <h4 style="font-size: 18px; font-weight: 600; color: #2563eb; margin-bottom: 16px;">
                Distribuição de Votos (Gráfico de Barras)
              </h4>
              ${stats.optionsWithStats.map((item, index) => `
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 4px;">
                    <span style="color: #374151; font-weight: 500;">${item.option.text}</span>
                    <span style="color: #4b5563;">${item.option.votes} votos (${item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div style="width: 100%; background-color: #e5e7eb; border-radius: 9999px; height: 24px; overflow: hidden;">
                    <div style="height: 100%; background-color: ${colors[index % colors.length]}; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; width: ${item.percentage}%;">
                      ${item.percentage > 5 ? `<span style="color: #ffffff; font-size: 12px; font-weight: 500;">${item.percentage.toFixed(0)}%</span>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
              <h4 style="font-size: 18px; font-weight: 600; color: #2563eb; margin-bottom: 16px;">
                Tabela de Resultados
              </h4>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #d1d5db;">
                    <th style="text-align: left; padding: 8px 16px; color: #374151; font-weight: 600;">Opção</th>
                    <th style="text-align: right; padding: 8px 16px; color: #374151; font-weight: 600;">Votos</th>
                    <th style="text-align: right; padding: 8px 16px; color: #374151; font-weight: 600;">Percentual</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.optionsWithStats.map((item, index) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px 16px; color: #1f2937;">
                        ${index === 0 ? '🥇 ' : ''}${item.option.text}
                      </td>
                      <td style="text-align: right; padding: 8px 16px; color: #1f2937;">${item.option.votes}</td>
                      <td style="text-align: right; padding: 8px 16px; color: #1f2937; font-weight: 500;">${item.percentage.toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h4 style="font-size: 18px; font-weight: 600; color: #16a34a; margin-bottom: 16px;">
                Relatório de Análise
              </h4>
              <pre style="white-space: pre-wrap; color: #374151; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0;">
${report}
              </pre>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Escrever HTML no iframe
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      // Aguardar renderização do HTML
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // PASSO 3: Capturar conteúdo do iframe como imagem
        // DOCUMENTAÇÃO: html2canvas captura o iframe isolado, sem estilos globais
        const iframeBody = iframeDoc.body;
        const canvas = await html2canvas(iframeBody, {
          backgroundColor: "#ffffff", // Fundo branco
          scale: 2, // Qualidade 2x
          logging: false,
          useCORS: true,
          allowTaint: false,
        });
        
        // Remover iframe após captura
        document.body.removeChild(iframe);
        
        // PASSO 4: Criar PDF com jsPDF
        // DOCUMENTAÇÃO: Converter imagem do canvas em PDF A4
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4"); // A4 vertical
        
        // Calcular dimensões para caber na página A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight); // -20 para margens
        const imgScaledWidth = imgWidth * ratio;
        const imgScaledHeight = imgHeight * ratio;
        const xOffset = (pdfWidth - imgScaledWidth) / 2; // Centralizar
        const yOffset = 10; // Margem superior

        // Adicionar imagem ao PDF
        pdf.addImage(imgData, "PNG", xOffset, yOffset, imgScaledWidth, imgScaledHeight);

        // Gerar nome do arquivo com data
        const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
        const sanitizedTitle = poll.title.replace(/[^a-z0-9\s]/gi, "_").substring(0, 30);
        const fileName = `Resultados_${sanitizedTitle}_${date}.pdf`;

        // Salvar PDF
        pdf.save(fileName);
      } catch (error) {
        // Remover iframe em caso de erro
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        throw error;
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md space-y-6">
      {/* Cabeçalho com título e botão de exportar */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Resultados: {poll.title}
        </h3>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExporting ? "Gerando PDF..." : "Exportar PDF"}
        </button>
      </div>

      {/* Área de resultados que será capturada para PDF */}
      {/* DOCUMENTAÇÃO: Esta div será capturada pelo html2canvas e convertida em PDF */}
      {/* A classe pdf-safe será adicionada dinamicamente durante a exportação para forçar cores compatíveis */}
      <div ref={resultsRef} id="pdf-export" className="space-y-6 bg-white p-6 border border-zinc-200">
        {/* Título para o PDF */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">
            Resultados da Enquete
          </h2>
          <p className="text-lg text-zinc-700">{poll.title}</p>
          <p className="text-sm text-zinc-500 mt-2">
            Gerado em {new Date().toLocaleDateString("pt-BR", { 
              day: "2-digit", 
              month: "long", 
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>

        {/* Estatísticas Resumidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-100 p-4 rounded-lg text-center border border-zinc-200">
            <p className="text-2xl font-bold text-indigo-600">
              {stats.totalVotes}
            </p>
            <p className="text-sm text-zinc-600">
              Total de Votos
            </p>
          </div>
          <div className="bg-zinc-100 p-4 rounded-lg text-center border border-zinc-200">
            <p className="text-2xl font-bold text-green-600">
              {stats.mostVoted.votes}
            </p>
            <p className="text-sm text-zinc-600">
              Mais Votada
            </p>
          </div>
          <div className="bg-zinc-100 p-4 rounded-lg text-center border border-zinc-200">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.leastVoted.votes}
            </p>
            <p className="text-sm text-zinc-600">
              Menos Votada
            </p>
          </div>
          <div className="bg-zinc-100 p-4 rounded-lg text-center border border-zinc-200">
            <p className="text-2xl font-bold text-purple-600">
              {stats.percentageDifference.toFixed(1)}%
            </p>
            <p className="text-sm text-zinc-600">
              Diferença 1ª/2ª
            </p>
          </div>
        </div>

        {/* Gráfico de Pizza */}
        {/* DOCUMENTAÇÃO: Gráfico de pizza simples usando SVG, compatível com PDF */}
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 mb-6">
          <h4 className="text-lg font-semibold text-indigo-600 mb-4">
            Distribuição de Votos (Gráfico de Pizza)
          </h4>
          {generatePieChart()}
        </div>

        {/* Gráfico de Barras Simples */}
        {/* DOCUMENTAÇÃO: Gráfico de barras horizontal para comparação visual */}
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
          <h4 className="text-lg font-semibold text-indigo-600 mb-4">
            Distribuição de Votos (Gráfico de Barras)
          </h4>
          <div className="space-y-3">
            {stats.optionsWithStats.map((item, index) => (
              <div key={item.option.id} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-700 font-medium">
                    {item.option.text}
                  </span>
                  <span className="text-zinc-600">
                    {item.option.votes} votos ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                {/* Barra de progresso simples */}
                {/* DOCUMENTAÇÃO: Usar style inline com cor hexadecimal para evitar problemas com html2canvas */}
                {/* Adicionar atributos data para identificação no clone */}
                <div className="w-full bg-zinc-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end pr-2"
                    data-graph-bar="true"
                    data-graph-index={index}
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  >
                    {item.percentage > 5 && (
                      <span className="text-white text-xs font-medium">
                        {item.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
          <h4 className="text-lg font-semibold text-blue-600 mb-4">
            Tabela de Resultados
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-300">
                  <th className="text-left py-2 px-4 text-zinc-700 font-semibold">
                    Opção
                  </th>
                  <th className="text-right py-2 px-4 text-zinc-700 font-semibold">
                    Votos
                  </th>
                  <th className="text-right py-2 px-4 text-zinc-700 font-semibold">
                    Percentual
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.optionsWithStats.map((item, index) => (
                  <tr
                    key={item.option.id}
                    className="border-b border-zinc-200"
                  >
                    <td className="py-2 px-4 text-zinc-900">
                      {index === 0 && (
                        <span className="text-yellow-500 mr-2">🥇</span>
                      )}
                      {item.option.text}
                    </td>
                    <td className="text-right py-2 px-4 text-zinc-900">
                      {item.option.votes}
                    </td>
                    <td className="text-right py-2 px-4 text-zinc-900 font-medium">
                      {item.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Relatório Textual */}
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
          <h4 className="text-lg font-semibold text-green-600 mb-4">
            Relatório de Análise
          </h4>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-zinc-700 font-sans text-sm leading-relaxed">
              {report}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
