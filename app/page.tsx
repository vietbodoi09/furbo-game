"use client"

import { useState, useRef, useEffect } from "react";
import { useSession, isEstablished, SessionButton } from "@fogo/sessions-sdk-react";
import { Play, Pause, RotateCcw, UserPlus, Target, Zap } from 'lucide-react';
import Leaderboard from "../components/Leaderboard";
import GameCanvas from "../components/GameCanvas";
import PerformanceDashboard from "../components/PerformanceDashboard";
import GameHeader from "../components/GameHeader";
import TransactionFeed from "../components/TransactionFeed";

export default function GamePage() {
  const sessionState = useSession();
  
  // Game state - LÀM ĐƠN GIẢN
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Thêm ref để lưu engine từ GameCanvas
  const gameEngineRef = useRef<any>(null);
  
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

  // Player registration - CHỈ GỌI KHI CÓ ENGINE
  const handleRegister = async () => {
    if (!gameEngineRef.current || !playerName.trim()) {
      console.error("No game engine or invalid player name");
      return;
    }
    
    console.log("📝 Attempting to register player:", playerName);
    
    try {
      const success = await gameEngineRef.current.registerPlayer(playerName);
      
      if (success) {
        alert(`✅ Registered as: ${playerName}`);
        setIsRegistered(true);
      } else {
        alert("❌ Registration failed. Check console for details.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("❌ Registration error");
    }
  };

  // Game controls - GỌI QUA ENGINE REF
  const handleStart = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.start();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.reset();
      setIsPlaying(false);
      setScore(0);
      setGameTime(0);
    }
  };

  // Callback nhận engine từ GameCanvas
  const handleEngineReady = (engine: any) => {
    console.log("🎮 Game engine ready from GameCanvas");
    gameEngineRef.current = engine;
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

          {/* GameHeader component */}
          <div className="glass-panel p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="stat-card">
                <div className="text-xs text-gray-400 uppercase tracking-wider">SCORE</div>
                <div className="text-3xl font-bold text-yellow-400">{score}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-gray-400 uppercase tracking-wider">TIME</div>
                <div className="text-3xl font-bold text-green-400">{gameTime}s</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-gray-400 uppercase tracking-wider">KILLS</div>
                <div className="text-3xl font-bold text-red-400">{chainData.playerKills || 0}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-gray-400 uppercase tracking-wider">SHOTS</div>
                <div className="text-3xl font-bold text-blue-400">{chainData.playerShots || 0}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-gray-400 uppercase tracking-wider">STATUS</div>
                <div className={`text-lg font-bold ${isRegistered ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isRegistered ? `✅ ${playerName}` : 'Not Registered'}
                </div>
              </div>
            </div>
          </div>
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
        
              {/* Game Canvas Component - THÊM CALLBACKS */}
              <GameCanvas
                sessionState={isEstablished(sessionState) ? sessionState : undefined}
                isPlaying={isPlaying}
                playerName={playerName}
                onScoreUpdate={setScore}
                onGameTimeUpdate={setGameTime}
                onPerformanceUpdate={setPerformanceStats}
                onChainDataUpdate={setChainData}
                onEngineReady={handleEngineReady} // Thêm callback này
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
            {/* Transaction Feed */}
            <div className="h-[400px]">
              <div className="glass-panel h-full p-4">
                <h3 className="text-lg font-bold mb-4">📊 Transaction Feed</h3>
                <div className="space-y-2">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div key={tx.id} className="p-3 bg-gray-800/30 rounded-lg">
                        <div className="flex justify-between">
                          <span className={`font-medium ${
                            tx.status === 'confirmed' ? 'text-green-400' : 
                            tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{tx.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No transactions yet
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Performance Dashboard */}
            <div className="h-[400px]">
              <div className="glass-panel h-full p-4">
                <h3 className="text-lg font-bold mb-4">⚡ Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                    <div className="text-2xl font-bold text-green-400">
                      {performanceStats.successRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Avg Confirmation</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {performanceStats.avgConfirm}ms
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Moves</div>
                      <div className="text-xl">{performanceStats.movesSent}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Shots</div>
                      <div className="text-xl">{performanceStats.shotsSent}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
