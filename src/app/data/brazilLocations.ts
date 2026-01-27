/**
 * Lista de estados e regiões do Brasil
 * 
 * DOCUMENTAÇÃO:
 * - Usado para preencher campos de localização no cadastro e edição de perfil
 * - Regiões agrupam estados por área geográfica
 * - Estados listados com sigla e nome completo
 */

export interface State {
  sigla: string;
  nome: string;
  regiao: string;
}

export const BRAZIL_STATES: State[] = [
  // Região Norte
  { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
  
  // Região Nordeste
  { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  
  // Região Centro-Oeste
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  
  // Região Sudeste
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  
  // Região Sul
  { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
];

export const BRAZIL_REGIONS = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
];

/**
 * Função auxiliar para obter estados de uma região
 */
export function getStatesByRegion(region: string): State[] {
  return BRAZIL_STATES.filter(state => state.regiao === region);
}

/**
 * Função auxiliar para obter região de um estado
 */
export function getRegionByState(stateSigla: string): string | null {
  const state = BRAZIL_STATES.find(s => s.sigla === stateSigla);
  return state ? state.regiao : null;
}
