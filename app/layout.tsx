// app/layout.tsx
import type { ReactNode } from "react";
import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import "./globals.css";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Furbo Shooter - Fogo Mainnet Demo',
  description: 'Real-time blockchain shooter game on Fogo Mainnet',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen">
        <FogoSessionProvider
          network={Network.Mainnet}
          domain={process.env.NODE_ENV === "production" 
            ? "https://furbo-game.com" 
            : "http://localhost:3000"}
          tokens={[NATIVE_MINT.toBase58()]}
          defaultRequestedLimits={{
            [NATIVE_MINT.toBase58()]: 2_000_000_000n,
          }}
          enableUnlimited
        >
          {children}
        </FogoSessionProvider>
      </body>
    </html>
  );
}