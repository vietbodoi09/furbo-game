"use client"

import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { PublicKey } from '@solana/web3.js';

interface PerformanceDashboardProps {
  sessionState?: EstablishedSessionState;
  performanceStats: {
    movesSent: number;
    shotsSent: number;
    avgConfirm: number;
    successRate: number;
    pendingTx: number;
    chainSpeed: number;
  };
  chainData: {
    playerScore: number;
    playerKills: number;
    playerShots: number;
    playerName: string;
    isRegistered: boolean;
  };
}

export default function PerformanceDashboard({ 
  sessionState, 
  performanceStats,
  chainData 
}: PerformanceDashboardProps) {
  
  const formatPublicKey = (key: PublicKey | string) => {
    const str = key.toString();
    return `${str.slice(0, 6)}...${str.slice(-4)}`;
  };

  // Performance indicators
  const getSpeedColor = (speed: number) => {
    if (speed > 80) return 'text-green-400';
    if (speed > 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col space-y-6">
      
      {/* 🔗 CONNECTION STATUS */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-cyan-300">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          FOGO SESSION
        </h3>
        
        {sessionState ? (
          <div className="space-y-4">
            {/* Wallet Info */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Wallet</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className="font-mono text-sm text-white bg-gray-900/50 p-2 rounded truncate">
                {formatPublicKey(sessionState.walletPublicKey)}
              </div>
            </div>

            {/* Session Info */}
            <div className="stat-card">
              <div className="text-gray-400 text-sm mb-2">Session Key</div>
              <div className="font-mono text-xs text-gray-300 bg-gray-900/50 p-2 rounded break-all">
                {sessionState.sessionPublicKey.toString()}
              </div>
            </div>

            {/* Gasless Status */}
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-green-400 text-lg">⚡</div>
                <div>
                  <div className="font-bold text-green-300">Gasless Mode Active</div>
                  <div className="text-xs text-green-400/80">No SOL required for transactions</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 text-gray-600">🔌</div>
            <p className="text-gray-400">Not Connected</p>
            <p className="text-xs text-gray-500 mt-1">Connect wallet to enable gasless mode</p>
          </div>
        )}
      </div>

      {/* 📊 PERFORMANCE METRICS */}
      <div>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          PERFORMANCE
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <div className="text-gray-400 text-xs mb-1">TX Speed</div>
            <div className={`text-2xl font-bold ${getSpeedColor(performanceStats.chainSpeed)}`}>
              {performanceStats.chainSpeed}%
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
                style={{ width: `${performanceStats.chainSpeed}%` }}
              />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="text-gray-400 text-xs mb-1">Success Rate</div>
            <div className={`text-2xl font-bold ${
              performanceStats.successRate > 95 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {performanceStats.successRate}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {performanceStats.movesSent + performanceStats.shotsSent} total TX
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="stat-card">
            <div className="text-gray-400 text-xs mb-1">Moves</div>
            <div className="text-xl font-bold text-cyan-400">{performanceStats.movesSent}</div>
          </div>
          
          <div className="stat-card">
            <div className="text-gray-400 text-xs mb-1">Shots</div>
            <div className="text-xl font-bold text-purple-400">{performanceStats.shotsSent}</div>
          </div>
        </div>

        {/* Pending Transactions */}
        {performanceStats.pendingTx > 0 && (
          <div className="mt-3 bg-gradient-to-r from-amber-900/20 to-orange-900/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-amber-400 animate-pulse">⏳</div>
                <span className="text-amber-300 font-medium">Pending TX</span>
              </div>
              <div className="text-amber-400 font-bold">{performanceStats.pendingTx}</div>
            </div>
          </div>
        )}
      </div>

      {/* 👤 PLAYER STATS */}
      <div className="flex-1">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-300">
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          PLAYER STATS
        </h4>
        
        {chainData.isRegistered ? (
          <div className="space-y-4">
            {/* Player Card */}
            <div className="stat-card bg-gradient-to-br from-cyan-900/10 to-blue-900/10 border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Player</div>
                  <div className="text-lg font-bold text-cyan-300">{chainData.playerName}</div>
                </div>
                <div className="text-green-400 text-2xl">✓</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-900/40 rounded-lg">
                <div className="text-xs text-gray-400">Score</div>
                <div className="text-xl font-bold text-yellow-400">{chainData.playerScore}</div>
              </div>
              
              <div className="text-center p-3 bg-gray-900/40 rounded-lg">
                <div className="text-xs text-gray-400">Kills</div>
                <div className="text-xl font-bold text-red-400">{chainData.playerKills}</div>
              </div>
              
              <div className="text-center p-3 bg-gray-900/40 rounded-lg">
                <div className="text-xs text-gray-400">Shots</div>
                <div className="text-xl font-bold text-purple-400">{chainData.playerShots}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-3xl mb-3 text-gray-600">👤</div>
            <p className="text-gray-400">Not Registered</p>
            <p className="text-xs text-gray-500 mt-1">Register to save stats on-chain</p>
          </div>
        )}
      </div>
    </div>
  );
}
