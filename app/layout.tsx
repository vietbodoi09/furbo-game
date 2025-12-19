import type { ReactNode } from "react";
import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import "./globals.css";
import { Orbitron, Inter } from 'next/font/google';

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

// 🔥 THÊM PROGRAM ID Ở ĐÂY
const FURBO_PROGRAM_ID = 'Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa';

export const metadata = {
  title: 'Furbo Shooter - Blockchain Game on Fogo',
  description: 'Real-time shooter game on Fogo Mainnet',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-black text-white overflow-x-hidden">
        <FogoSessionProvider
          network={Network.Testnet}
          domain={process.env.NODE_ENV === "production" 
            ? "https://furbocoin.meme" 
            : "http://localhost:3000"}
          tokens={[NATIVE_MINT.toBase58()]}
          defaultRequestedLimits={{
            [NATIVE_MINT.toBase58()]: 2_000_000_000n,
          }}
          enableUnlimited
          // 🔥 THÊM WHITELIST QUAN TRỌNG NÀY
          whitelist={[FURBO_PROGRAM_ID]}
          appearance={{
            theme: 'dark',
            colors: {
              primary: '#06b6d4',
              background: '#0a0a0a',
            }
          }}
        >
          {/* Background Effects */}
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/5 via-black to-black -z-10" />
          {/* 🔥 FIX GRID.SVG ERROR - THAY BẰNG CSS GRADIENT */}
          <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 -z-10" />
          
          <main className="relative z-10">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="fixed bottom-0 w-full py-3 text-center text-xs text-gray-500 border-t border-gray-800/30 bg-black/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4">
              Created by <span className="text-cyan-400">Catcake</span> • Gasless Gaming • Built on Fogo
            </div>
          </footer>
        </FogoSessionProvider>
      </body>
    </html>
  );
}
