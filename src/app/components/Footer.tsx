import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons'; // Importar ícones de redes sociais
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'; // Importar ícone de envelope
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Importar usePathname para verificar a rota atual
import { useAuth } from "../context/AuthContext"; // Importar useAuth
import { useCompanyFooter } from "../context/CompanyFooterContext"; // Importar useCompanyFooter

export default function Footer() {
  const { user } = useAuth(); // Usar o hook useAuth para acessar o usuário
  const { companyFooterData } = useCompanyFooter(); // Usar o hook para acessar os dados do rodapé da empresa
  const pathname = usePathname(); // Obter a rota atual

  // DOCUMENTAÇÃO: Lógica para exibir dados no footer
  // - Página pública da empresa (/empresa/[slug]): usa companyFooterData (atualizado via onSnapshot)
  // - Outras páginas: usa null (valores padrão) para evitar mostrar dados da empresa na página principal
  const isCompanyPublicPage = pathname?.startsWith("/empresa/");
  const dataToUse = isCompanyPublicPage 
    ? companyFooterData // Dados da empresa na página pública
    : null; // Valores padrão em outras páginas
  
  // DEBUG: Log para verificar os dados que estão sendo usados
  if (isCompanyPublicPage) {
    console.log("Footer - Página pública da empresa detectada");
    console.log("Footer - pathname:", pathname);
    console.log("Footer - companyFooterData:", companyFooterData);
    console.log("Footer - user:", user);
    console.log("Footer - dataToUse:", dataToUse);
    console.log("Footer - aboutUs:", dataToUse?.aboutUs);
    console.log("Footer - contactEmail:", dataToUse?.contactEmail);
    console.log("Footer - address:", dataToUse?.address);
  }

  return (
    <footer className="w-full bg-zinc-800 text-white py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Seção 1: Sobre Nós */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Sobre Nós</h4>
          <p className="text-zinc-400 text-sm">
            {dataToUse?.aboutUs || `Tomar decisões no achismo custa caro. Foi a partir dessa constatação que criamos nossa plataforma. Somos uma solução digital focada em validação de decisões, criada para ajudar pessoas e empresas a transformarem opiniões em dados claros e acionáveis. Em vez de depender de suposições, nossa tecnologia permite testar ideias, medir preferências e entender cenários antes de agir.`}
          </p>
        </div>

        {/* Seção 2: Links Rápidos */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
          <ul className="space-y-2">
            <li><Link href="/" className="text-zinc-400 hover:text-white transition-colors duration-200">Início</Link></li>
            <li><Link href="/enquetes" className="text-zinc-400 hover:text-white transition-colors duration-200">Enquetes</Link></li>
            <li><Link href="#" className="text-zinc-400 hover:text-white transition-colors duration-200">Sobre</Link></li>
            <li><Link href="#" className="text-zinc-400 hover:text-white transition-colors duration-200">Contato</Link></li>
          </ul>
        </div>

        {/* Seção 3: Contato */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Contato</h4>
          <p className="text-zinc-400 text-sm flex items-center mb-2">
            <FontAwesomeIcon icon={faEnvelope} className="mr-2" /> {dataToUse?.contactEmail || "contato@pollapp.com"}
          </p>
          <p className="text-zinc-400 text-sm">{dataToUse?.address || "123 Rua Principal, Cidade, Estado"}</p>
        </div>

        {/* Seção 4: Redes Sociais */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Siga-nos</h4>
          <div className="flex space-x-4 mt-4 md:mt-0">
            {dataToUse?.facebookUrl && <a href={dataToUse.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faFacebookF} size="lg" /></a>}
            {dataToUse?.instagramUrl && <a href={dataToUse.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faInstagram} size="lg" /></a>}
            {dataToUse?.twitterUrl && <a href={dataToUse.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faTwitter} size="lg" /></a>}
            {(!dataToUse?.facebookUrl && !dataToUse?.instagramUrl && !dataToUse?.twitterUrl) && (
              <> {/* Default social media icons if no custom URLs are provided */}
                <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faFacebookF} size="lg" /></a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faInstagram} size="lg" /></a>
                <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faTwitter} size="lg" /></a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700 mt-8 pt-6 text-center text-zinc-500 text-sm">
        © {new Date().getFullYear()} Engaja. Todos os direitos reservados. Desenvolvido por Alexandro Fernandes.
      </div>
    </footer>
  );
}
