"use client"

import { useState, useRef, useEffect } from "react"; // ĐÃ THÊM
import { useSession, isEstablished, SessionButton } from "@fogo/sessions-sdk-react";
import Leaderboard from "@/components/Leaderboard";
import GameCanvas from "@/components/GameCanvas";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import { FurboGameEngine } from "@/components/FurboGameEngine"; // ĐÃ THÊM

export default function GamePage() {
  // 🔗 Session state
  const sessionState = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<FurboGameEngine | null>(null);
  
  // 🎮 Game state
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  
  // 📊 Performance metrics
  const [performanceStats, setPerformanceStats] = useState({
    movesSent: 0,
    shotsSent: 0,
    avgConfirm: 0,
    successRate: 100,
    pendingTx: 0,
    chainSpeed: 0
  });
  
  // ==============================================
  // 1️⃣ INITIALIZE GAME ENGINE
  // ==============================================
  useEffect(() => {
    if (canvasRef.current && !gameEngine) {
      console.log("🔄 Initializing FurboGameEngine...");
      
      const engine = new FurboGameEngine(
        canvasRef.current,
        isEstablished(sessionState) ? sessionState : undefined,
        {
          // 📈 Score updates - ĐÚNG VỚI GỐC
          onScoreUpdate: (newScore) => {
            setScore(newScore);
            console.log(`🎯 Score updated: ${newScore}`);
          },
          
          // ⏱️ Game time updates - ĐÚNG VỚI GỐC
          onGameTimeUpdate: (time) => {
            setGameTime(time);
            console.log(`⏰ Game time: ${time}s`);
          },
          
          // 📊 Performance metrics updates - ĐÚNG VỚI GỐC
          onPerformanceUpdate: (stats) => {
            setPerformanceStats(stats);
            console.log("📈 Performance updated:", stats);
          }
          // XÓA: onChainUpdate, onTransactionComplete (KHÔNG CÓ TRONG CLASS GỐC)
        }
      );
      
      setGameEngine(engine);
      console.log("✅ FurboGameEngine initialized!");
      
      // 🧹 Cleanup
      return () => {
        console.log("🧹 Cleaning up game engine...");
        engine.destroy();
        setGameEngine(null);
      };
    }
  }, [canvasRef.current, sessionState]);

  // ==============================================
  // 2️⃣ UPDATE SESSION WHEN CHANGED
  // ==============================================
  useEffect(() => {
    if (gameEngine) {
      console.log("🔗 Updating session in game engine...");
      gameEngine.updateSession(isEstablished(sessionState) ? sessionState : undefined);
    }
  }, [sessionState, gameEngine]);

  // ==============================================
  // 3️⃣ PLAYER REGISTRATION HANDLER - SỬA LẠI
  // ==============================================
  const handleRegister = () => {
    if (!playerName.trim() || playerName.length < 3) {
      alert("❌ Please enter a player name (min 3 characters)");
      return;
    }
    
    console.log(`👤 Player name set: ${playerName}`);
    setIsRegistered(true);
    alert(`✅ Registered as: ${playerName}`);
    // TODO: Thêm blockchain registration sau
  };

  // ==============================================
  // 4️⃣ GAME CONTROL HANDLERS - SỬA LẠI
  // ==============================================
  const handleStart = () => {
    if (gameEngine) {
      console.log("▶️ Starting game...");
      gameEngine.start();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (gameEngine) {
      console.log("⏸️ Pausing game...");
      gameEngine.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (gameEngine) {
      console.log("🔄 Resetting game...");
      setIsPlaying(false);
      setScore(0);
      setGameTime(0);
      // XÓA: gameEngine.reset() - KHÔNG CÓ METHOD NÀY
    }
  };

  // ==============================================
  // 🎮 RENDER GAME INTERFACE - SỬA ĐƠN GIẢN
  // ==============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* 🏆 HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              🎮 FURBO SHOOTER
            </h1>
            <p className="text-gray-400 mt-2">Real-time blockchain game on Fogo Mainnet</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full ${
              isEstablished(sessionState) 
                ? 'bg-green-900/30 text-green-400' 
                : 'bg-red-900/30 text-red-400'
            }`}>
              {isEstablished(sessionState) ? '🟢 Connected' : '🔴 Not Connected'}
            </div>
            <SessionButton />
          </div>
        </div>

        {/* 🎯 MAIN GAME LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 📊 LEFT PANEL - LEADERBOARD */}
          <div className="lg:col-span-3">
            <Leaderboard />
          </div>

          {/* 🎮 CENTER PANEL - GAME */}
          <div className="lg:col-span-6">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              
              {/* 🎪 GAME HEADER */}
              <div className="flex justify-between items-center mb-6">
                <div className="text-2xl font-bold space-x-6">
                  <span className="text-yellow-400">SCORE: {score}</span>
                  <span className="text-green-400">TIME: {gameTime}s</span>
                  {isRegistered && (
                    <span className="text-cyan-400">{playerName}</span>
                  )}
                </div>
              </div>

              {/* 🎨 GAME CANVAS */}
              <div className="relative mb-6">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full h-auto rounded-lg border-2 border-cyan-900/30 shadow-2xl shadow-cyan-900/20"
                />
                
                {/* ⚠️ CONNECTION OVERLAY */}
                {!isEstablished(sessionState) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4 animate-pulse">🔗</div>
                      <h3 className="text-2xl font-bold mb-2 text-cyan-300">
                        Connect Fogo Session
                      </h3>
                      <p className="text-gray-300 mb-6">
                        Connect wallet to play gaslessly on Fogo Mainnet
                      </p>
                      <div className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold">
                        Click "Connect" button above
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 🎛️ GAME CONTROLS */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={isPlaying ? handlePause : handleStart}
                    disabled={!isEstablished(sessionState) || !isRegistered}
                    className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    {isPlaying ? "⏸️ PAUSE" : "🚀 START GAME"}
                  </button>
                  
                  <button 
                    onClick={handleReset}
                    className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    🔄 RESET
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm text-center sm:text-left">
                  🎮 CONTROLS: ← → Move | SPACE Shoot
                </p>
              </div>
            </div>

            {/* 👤 PLAYER REGISTRATION */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mt-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                REGISTER PLAYER
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name (min 3 characters)"
                  className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white placeholder-gray-500"
                  maxLength={20}
                  disabled={isRegistered}
                />
                
                <button
                  onClick={handleRegister}
                  disabled={!isEstablished(sessionState) || playerName.length < 3 || isRegistered}
                  className="px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isRegistered ? "✅ REGISTERED" : "Register"}
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mt-3">
                {isRegistered 
                  ? `✅ Registered as ${playerName}!`
                  : "Register to play!"}
              </p>
            </div>
          </div>

          {/* 📈 RIGHT PANEL */}
          <div className="lg:col-span-3">
            <PerformanceDashboard 
              sessionState={isEstablished(sessionState) ? sessionState : undefined}
              performanceStats={performanceStats}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
