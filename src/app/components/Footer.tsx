import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faTwitter, faLinkedinIn, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-800 text-white py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Seção 1: Sobre Nós */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Sobre Nós</h4>
          <p className="text-zinc-400 text-sm">
            Crie e participe de enquetes de forma rápida e fácil. Sua opinião importa!
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
            <FontAwesomeIcon icon={faEnvelope} className="mr-2" /> contato@pollapp.com
          </p>
          <p className="text-zinc-400 text-sm">123 Rua Principal, Cidade, Estado</p>
        </div>

        {/* Seção 4: Redes Sociais */}
        <div className="col-span-1">
          <h4 className="text-lg font-semibold mb-4">Siga-nos</h4>
          <div className="flex space-x-4">
            <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faFacebookF} size="lg" /></a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faTwitter} size="lg" /></a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faLinkedinIn} size="lg" /></a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors duration-200"><FontAwesomeIcon icon={faGithub} size="lg" /></a>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700 mt-8 pt-6 text-center text-zinc-500 text-sm">
        © {new Date().getFullYear()} Poll App. Todos os direitos reservados. Desenvolvido por Alexandro Fernandes.
      </div>
    </footer>
  );
}
