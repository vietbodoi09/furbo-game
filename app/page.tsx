"use client"

import { useState, useRef, useEffect } from "react";
import { useSession, isEstablished, SessionButton } from "@fogo/sessions-sdk-react";
import { Play, Pause, RotateCcw, UserPlus, Target, Zap } from 'lucide-react';
import Leaderboard from "../components/Leaderboard";
import GameCanvas from "../components/GameCanvas";
import PerformanceDashboard from "../components/PerformanceDashboard";
import GameHeader from "../components/GameHeader";
import TransactionFeed from "../components/TransactionFeed";
import { FurboGameEngine } from "../lib/FurboGameEngine";

export default function GamePage() {
  const sessionState = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<FurboGameEngine | null>(null);
  
  // Game state
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Performance metrics
  const [performanceStats, setPerformanceStats] = useState({
    movesSent: 0,
    shotsSent: 0,
    killsSent: 0,
    avgConfirm: 0,
    successRate: 100,
    pendingTx: 0,
    chainSpeed: 95
  });
  
  // Chain data
  const [chainData, setChainData] = useState({
    playerScore: 0,
    playerKills: 0,
    playerShots: 0,
    playerName: "",
    isRegistered: false
  });

  // Transaction feed
  const [transactions, setTransactions] = useState<any[]>([]);

  // Initialize game engine
  useEffect(() => {
    if (canvasRef.current && !gameEngine) {
      const engine = new FurboGameEngine(
        canvasRef.current,
        isEstablished(sessionState) ? sessionState : undefined,
        {
          onScoreUpdate: (newScore) => setScore(newScore),
          onGameTimeUpdate: (time) => setGameTime(time),
          onPerformanceUpdate: (stats) => setPerformanceStats(stats),
          onChainUpdate: (data) => {
            setChainData(data);
            setIsRegistered(data.isRegistered || false);
            if (data.playerName) setPlayerName(data.playerName);
          },
          onTransactionComplete: (type, success, signature) => {
            console.log(`${success ? '✅' : '❌'} ${type} transaction`);
          },
          onTransactionFeedUpdate: (transaction) => {
            setTransactions(prev => [
              {
                id: Date.now().toString(),
                ...transaction,
                timestamp: Date.now()
              },
              ...prev.slice(0, 4) // Keep only 5 latest transactions
            ]);
          }
        }
      );
      
      setGameEngine(engine);
      return () => {
        engine.destroy();
        setGameEngine(null);
      };
    }
  }, [canvasRef.current, sessionState]);

  // Update session when changed
  useEffect(() => {
    if (gameEngine) {
      gameEngine.updateSession(isEstablished(sessionState) ? sessionState : undefined);
    }
  }, [sessionState, gameEngine]);

  // Player registration
  const handleRegister = async () => {
    if (!gameEngine || !playerName.trim()) return;
    
    gameEngine.setPlayerName(playerName);
    const success = await gameEngine.registerPlayer();
    
    if (success) {
      alert(`✅ Registered as: ${playerName}`);
    } else {
      alert("❌ Registration failed");
    }
  };

  // Game controls
  const handleStart = () => {
    if (gameEngine) {
      gameEngine.start();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (gameEngine) {
      gameEngine.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (gameEngine) {
      gameEngine.reset();
      setIsPlaying(false);
      setScore(0);
      setGameTime(0);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  FURBO SHOOTER
                </span>
              </h1>
              <p className="text-gray-400">
                Real-time blockchain shooter • Gasless gaming on Fogo Mainnet
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <SessionButton className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl font-bold transition-all duration-300 hover:scale-105" />
            </div>
          </div>

          <GameHeader
            score={score}
            gameTime={gameTime}
            kills={chainData.playerKills}
            shots={chainData.playerShots}
            isConnected={isEstablished(sessionState)}
            playerName={playerName}
          />
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Leaderboard */}
          <div className="lg:col-span-3">
            <Leaderboard />
          </div>
        
          {/* Center: Game Area */}
          <div className="lg:col-span-5">
            {/* Game Canvas Container */}
            <div className="mb-6 bg-gray-900/20 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
              {/* Game Stats Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">SCORE</div>
                    <div className="text-2xl font-bold text-yellow-400">{score}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">TIME</div>
                    <div className="text-2xl font-bold text-green-400">{gameTime}s</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider">KILLS</div>
                    <div className="text-2xl font-bold text-red-400">{chainData.playerKills || 0}</div>
                  </div>
                  {isRegistered && (
                    <div className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded-full">
                      <span className="text-cyan-300 font-medium">{playerName}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isEstablished(sessionState) ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-300">
                    {isEstablished(sessionState) ? '🟢 Connected' : '🔴 Disconnected'}
                  </span>
                </div>
              </div>
        
              {/* Game Canvas */}
              <GameCanvas
                sessionState={isEstablished(sessionState) ? sessionState : undefined}
                isPlaying={isPlaying}
                playerName={playerName}
                onScoreUpdate={setScore}
                onGameTimeUpdate={setGameTime}
                onPerformanceUpdate={setPerformanceStats}
                onChainDataUpdate={setChainData}
              />
        
              {/* Game Controls */}
              <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={isPlaying ? handlePause : handleStart}
                    disabled={!isEstablished(sessionState) || !isRegistered}
                    className="px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    {isPlaying ? "⏸️ PAUSE" : "🚀 START GAME"}
                  </button>
                  
                  <button 
                    onClick={handleReset}
                    className="px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    🔄 RESET
                  </button>
                </div>
                
                <div className="text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-lg">
                  🎮 CONTROLS: ← → Move | SPACE Shoot
                </div>
              </div>
            </div>
        
            {/* Registration Section */}
            <div className="bg-gradient-to-r from-gray-900/30 to-cyan-900/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-700/30">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                <span className="text-xl">📝</span>
                REGISTER PLAYER
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your gaming name (min 3 chars)"
                  className="flex-1 px-4 py-3 bg-black/50 border border-gray-700 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 text-white placeholder-gray-500"
                  maxLength={20}
                  disabled={isRegistered}
                />
                
                <button
                  onClick={handleRegister}
                  disabled={!isEstablished(sessionState) || playerName.length < 3 || isRegistered}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isRegistered ? "✅ REGISTERED" : "REGISTER NOW"}
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mt-3">
                {isRegistered 
                  ? `✅ Registered as ${playerName}! Your scores are saved on-chain.`
                  : "Register to save your score permanently on the blockchain!"}
              </p>
            </div>
          </div>
        
          {/* Right: Transaction Feed và Performance Dashboard */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Transaction Feed - Hiển thị real-time transactions */}
            <div className="h-[400px]">
              <TransactionFeed />
            </div>
            
            {/* Performance Dashboard - Thu gọn lại */}
            <div className="h-[400px]">
              <PerformanceDashboard 
                sessionState={isEstablished(sessionState) ? sessionState : undefined}
                performanceStats={performanceStats}
                chainData={chainData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
