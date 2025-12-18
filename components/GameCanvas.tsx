"use client"

import { useEffect, useRef, useState } from 'react';
import { type EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { FurboGameEngine } from '@/lib/FurboGameEngine';

interface GameCanvasProps {
  sessionState?: EstablishedSessionState;
  isPlaying: boolean;
  playerName?: string;
  onScoreUpdate: (score: number) => void;
  onGameTimeUpdate: (time: number) => void;
  onPerformanceUpdate: (stats: any) => void;
  onChainDataUpdate?: (data: any) => void;
}

export default function GameCanvas({ 
  sessionState, 
  isPlaying,
  playerName,
  onScoreUpdate,
  onGameTimeUpdate,
  onPerformanceUpdate,
  onChainDataUpdate
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<FurboGameEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game engine
    gameEngineRef.current = new FurboGameEngine(
      canvasRef.current,
      sessionState,
      {
        onScoreUpdate,
        onGameTimeUpdate,
        onPerformanceUpdate,
        onChainUpdate: onChainDataUpdate || (() => {})
      }
    );

    setIsInitialized(true);

    return () => {
      gameEngineRef.current?.destroy();
      setIsInitialized(false);
    };
  }, []);

  // Update session state
  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateSession(sessionState);
    }
  }, [sessionState]);

  // Update player name
  useEffect(() => {
    if (gameEngineRef.current && playerName) {
      gameEngineRef.current.setPlayerName(playerName);
    }
  }, [playerName]);

  // Play/pause game
  useEffect(() => {
    if (gameEngineRef.current) {
      if (isPlaying) {
        gameEngineRef.current.start();
      } else {
        gameEngineRef.current.pause();
      }
    }
  }, [isPlaying]);

  const registerPlayer = async () => {
    if (gameEngineRef.current && playerName) {
      const success = await gameEngineRef.current.registerPlayer();
      if (success) {
        console.log('✅ Player registered successfully!');
      }
    }
  };

  const startGame = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start();
    }
  };

  return (
    <div className="relative">
      {/* Game Container */}
      <div className="relative bg-gradient-to-br from-gray-900/50 to-black/50 rounded-2xl border border-cyan-900/30 p-2 shadow-2xl shadow-cyan-900/10">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-auto rounded-xl border border-cyan-900/50"
        />
        
        {/* Connection Required Overlay */}
        {!sessionState && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-xl backdrop-blur-sm">
            <div className="text-center p-8 max-w-md">
              <div className="text-6xl mb-6 animate-bounce">🔗</div>
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Wallet Required
              </h3>
              <p className="text-gray-300 mb-6">
                Connect your wallet to play gas-free using Fogo Sessions
              </p>
              <div className="inline-flex flex-col items-center gap-2">
                <div className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-bold animate-pulse">
                  Click "Connect Wallet" Above
                </div>
                <p className="text-xs text-gray-500">
                  No gas fees • Instant transactions • On-chain leaderboard
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Overlay */}
        {sessionState && !playerName && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
            <div className="text-center p-8 max-w-md">
              <div className="text-5xl mb-6">👤</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Register Player</h3>
              <p className="text-gray-300 mb-6">
                Choose a name to appear on the global leaderboard
              </p>
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg p-6">
                <p className="text-green-300 mb-4">
                  🎯 Your scores will be saved on-chain
                </p>
                <p className="text-sm text-gray-400">
                  Registration is free and takes 2 seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Game Paused Overlay */}
        {sessionState && playerName && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm">
            <div className="text-center bg-gray-900/80 p-8 rounded-2xl border border-cyan-500/30">
              <div className="text-4xl mb-4">⏸️</div>
              <p className="text-xl font-bold mb-4 text-cyan-300">Game Paused</p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                ▶️ CONTINUE GAME
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Status */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-300">
              {isInitialized ? 'Game Ready' : 'Loading...'}
            </span>
          </div>
          <div className="text-gray-500">|</div>
          <div className="text-cyan-400">
            {sessionState ? '🟢 Gasless Mode Active' : '🔴 Connect for Gasless'}
          </div>
        </div>
        
        <div className="text-gray-400">
          FPS: 60 • Resolution: 800×600
        </div>
      </div>
    </div>
  );
}
