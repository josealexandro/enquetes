export function getContrastTextColor(hexColor: string): string {
  // Remove o '#' se estiver presente
  const cleanHex = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;

  // Converte a cor hexadecimal para RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Calcula a luminosidade (usando a fórmula W3C)
  const luminosity = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Retorna 'text-black' para cores claras e 'text-white' para cores escuras
  return luminosity > 0.5 ? "text-black" : "text-white";
}
