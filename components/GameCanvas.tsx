
"use client"

import { useEffect, useRef, useState } from 'react';
import { type EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { FurboGameEngine } from '@/game/FurboGameEngine';

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

  useEffect(() => {
    if (!canvasRef.current) return;

    // Khởi tạo game engine
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

    return () => {
      gameEngineRef.current?.destroy();
    };
  }, []);

  // Update session state khi thay đổi
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

  // Register player function
  const registerPlayer = async () => {
    if (gameEngineRef.current && playerName) {
      const success = await gameEngineRef.current.registerPlayer();
      if (success) {
        console.log('Player registered successfully!');
      }
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-auto bg-gray-900 rounded-lg border-2 border-cyan-900/50 shadow-2xl shadow-cyan-900/20"
      />
      
      {!sessionState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
          <div className="text-center p-8">
            <div className="text-6xl mb-4 animate-pulse">🔗</div>
            <h3 className="text-2xl font-bold mb-2 text-cyan-300">Connect Fogo Session</h3>
            <p className="text-gray-300 mb-6">Connect to start playing gaslessly</p>
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold">
              Click Connect Button Above
            </div>
          </div>
        </div>
      )}
      
      {!isPlaying && sessionState && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="text-center bg-gray-900/80 p-8 rounded-xl">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-xl font-bold mb-4">Ready to Play!</p>
            <button
              onClick={registerPlayer}
              disabled={!playerName || playerName.length < 3}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold disabled:opacity-50"
            >
              Register & Start Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}