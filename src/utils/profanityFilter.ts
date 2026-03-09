/**
 * Filtro simples de palavrões para comentários.
 * Verifica se o texto contém palavras da lista (comparação por palavra, case insensitive).
 */

const PALAVRAS_BLOQUEADAS = [
  "caralho", "porra", "merda", "puta", "putas", "viado", "viada", "foda", "foder", "fodido",
  "cu", "buceta", "vagabunda", "vagabundo", "arrombado", "arrombada", "desgraça",
  "cacete", "bosta", "corno", "corna", "piranha", "filho da puta", "fdp",
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "");
}

/**
 * Retorna true se o texto contiver alguma palavra bloqueada (como palavra inteira).
 */
export function contemPalavrao(texto: string): boolean {
  if (!texto || !texto.trim()) return false;
  const normalizado = normalizar(texto.trim());
  const palavras = normalizado.split(/\s+/);
  const bloqueadasNorm = PALAVRAS_BLOQUEADAS.map(normalizar);

  for (const p of palavras) {
    const limpa = p.replace(/[^a-z0-9\u00e0-\u00ff]/gi, "");
    if (!limpa) continue;
    const limpaNorm = normalizar(limpa);
    if (bloqueadasNorm.some((b) => !b.includes(" ") && b === limpaNorm)) return true;
  }
  for (const b of bloqueadasNorm) {
    if (b.includes(" ") && normalizado.includes(b)) return true;
  }
  return false;
}
