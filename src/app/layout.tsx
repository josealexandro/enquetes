"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

import { config, library } from '@fortawesome/fontawesome-svg-core';

config.autoAddCss = false;

import '@fortawesome/fontawesome-svg-core/styles.css';
import { faFacebookF, faTwitter, faLinkedinIn, faGithub } from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

library.add(faFacebookF, faTwitter, faLinkedinIn, faGithub, faEnvelope, faSun, faMoon);

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}> {/* Removido pt-16 */}
        {/* O script de tema foi movido para Header.tsx para gerenciamento centralizado */}
        
        <ClientProvidersWrapper> {/* Usar o novo componente wrapper */}
          {children}
        </ClientProvidersWrapper>
      </body>
    </html>
  );
}
