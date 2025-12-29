/**
 * Valida e retorna uma URL de avatar válida, substituindo URLs de exemplo por um fallback
 * @param avatarUrl - URL do avatar a ser validada
 * @param fallbackUrl - URL de fallback caso a URL seja inválida (padrão: Gravatar)
 * @returns URL válida do avatar ou fallback
 */
export function getValidAvatarUrl(
  avatarUrl: string | null | undefined,
  fallbackUrl: string = "https://www.gravatar.com/avatar/?d=mp"
): string {
  if (!avatarUrl) {
    return fallbackUrl;
  }

  // Lista de hostnames que devem ser considerados inválidos/exemplo
  const invalidHostnames = ['example.com', 'example.org', 'localhost'];
  
  try {
    const url = new URL(avatarUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Verificar se o hostname está na lista de inválidos
    if (invalidHostnames.some(invalid => hostname.includes(invalid))) {
      return fallbackUrl;
    }
    
    return avatarUrl;
  } catch {
    // Se não for uma URL válida, retornar fallback
    return fallbackUrl;
  }
}


