
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins, Inter, Permanent_Marker } from "next/font/google"; // Adicionado Permanent_Marker
import "./globals.css";

// FontAwesome config removed as it is handled per component or in client wrapper if needed globally
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;

import ClientProvidersWrapper from "./components/ClientProvidersWrapper"; // Importar o novo ClientProvidersWrapper

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

// Definir a fonte Permanent Marker
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: ["400"], // Permanent Marker geralmente tem apenas um peso
  variable: "--font-permanent-marker",
});

export const metadata: Metadata = {
  title: "Engaja - Crie e Compartilhe Enquetes",
  description: "Crie enquetes personalizadas e compartilhe com seus amigos.",
  other: { "theme-color": "#ffffff" },
};

// Script que roda ANTES do React para evitar flash branco no header no iOS/Safari.
// O WebKit no iPhone demora mais para hidratar; sem isso, o header aparece branco até o JS rodar.
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var el = document.documentElement;
      if (theme === 'dark') {
        el.classList.add('dark');
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', '#27272a'); else {
          m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#27272a'; document.head.appendChild(m);
        }
      } else {
        el.classList.remove('dark');
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', '#ffffff'); else {
          m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#ffffff'; document.head.appendChild(m);
        }
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${geistSans.variable} ${geistMono.variable} ${permanentMarker.variable} antialiased`}> {/* Adicionado permanentMarker.variable */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ClientProvidersWrapper> {/* Usar o novo componente wrapper */}
          {children}
        </ClientProvidersWrapper>
      </body>
    </html>
  );
}
