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

import Header from "./components/Header";
import Footer from "./components/Footer";
import { AuthProvider } from "./context/AuthContext";
import { AuthModalProvider } from "./context/AuthModalContext"; // Importar AuthModalProvider
import { useState } from "react"; // Importar useState

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* O script de tema foi movido para Header.tsx para gerenciamento centralizado */}
        
        <AuthProvider>
          <AuthModalProvider onOpenLogin={() => setShowLoginModal(true)} onOpenSignup={() => setShowSignupModal(true)}>
            <Header
              showLoginModal={showLoginModal}
              setShowLoginModal={setShowLoginModal}
              showSignupModal={showSignupModal}
              setShowSignupModal={setShowSignupModal}
            />
            {children}
            <Footer />
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
