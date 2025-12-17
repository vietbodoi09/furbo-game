
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
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      
      {/* 🔗 SESSION INFO */}
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        🔗 FOGO SESSIONS
      </h3>

      {sessionState && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-900/50 to-cyan-900/20 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-bold">Connected</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Wallet:</span>
              <span className="font-mono text-cyan-300">
                {formatPublicKey(sessionState.walletPublicKey)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session:</span>
              <span className="font-mono text-purple-300">
                {formatPublicKey(sessionState.sessionPublicKey)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 📊 PERFORMANCE METRICS */}
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          ⚡ CHAIN PERFORMANCE
        </h4>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Moves Sent */}
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Moves Sent</div>
            <div className="text-2xl font-bold text-cyan-400">
              {performanceStats.movesSent}
            </div>
          </div>
          
          {/* Shots Sent */}
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Shots Sent</div>
            <div className="text-2xl font-bold text-purple-400">
              {performanceStats.shotsSent}
            </div>
          </div>
          
          {/* Avg Confirmation Time */}
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Avg Confirm</div>
            <div className="text-2xl font-bold text-green-400">
              {performanceStats.avgConfirm}ms
            </div>
          </div>
          
          {/* Success Rate */}
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-green-400">
              {performanceStats.successRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 🚀 CHAIN SPEED INDICATOR */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Chain Speed</span>
            <span className="text-cyan-400 font-bold">
              {performanceStats.chainSpeed.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500"
              style={{ width: `${performanceStats.chainSpeed}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Slow</span>
            <span>Fast</span>
            <span className="text-cyan-300">⚡ Extreme</span>
          </div>
        </div>

        {/* ⏳ PENDING TRANSACTIONS */}
        <div className="bg-gradient-to-r from-amber-900/20 to-red-900/20 p-4 rounded-lg border border-amber-500/20">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Pending TX</span>
            <span className={`text-xl font-bold ${
              performanceStats.pendingTx > 0 
                ? 'text-amber-400' 
                : 'text-green-400'
            }`}>
              {performanceStats.pendingTx}
            </span>
          </div>
        </div>
      </div>

      {/* 👤 PLAYER STATS */}
      <div className="mb-6">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          👤 PLAYER STATS
        </h4>
        
        {chainData.isRegistered ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Player:</span>
              <span className="text-cyan-300 font-bold">{chainData.playerName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/30 p-3 rounded">
                <div className="text-gray-400 text-xs">Score</div>
                <div className="text-lg font-bold text-yellow-400">
                  {chainData.playerScore}
                </div>
              </div>
              
              <div className="bg-gray-900/30 p-3 rounded">
                <div className="text-gray-400 text-xs">Kills</div>
                <div className="text-lg font-bold text-red-400">
                  {chainData.playerKills}
                </div>
              </div>
              
              <div className="bg-gray-900/30 p-3 rounded">
                <div className="text-gray-400 text-xs">Shots</div>
                <div className="text-lg font-bold text-purple-400">
                  {chainData.playerShots}
                </div>
              </div>
              
              <div className="bg-gray-900/30 p-3 rounded">
                <div className="text-gray-400 text-xs">Status</div>
                <div className="text-lg font-bold text-green-400">
                  ✅ Active
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <div className="text-3xl mb-2">👤</div>
            <p>Not registered yet</p>
            <p className="text-sm mt-1">Register to track stats on-chain</p>
          </div>
        )}
      </div>

      {/* 📜 TRANSACTION LOG */}
      <div className="flex-1 flex flex-col">
        <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
          📜 TRANSACTION LOG
        </h4>
        <div className="flex-1 bg-gray-900/30 rounded-lg p-4 overflow-y-auto">
          <div className="space-y-2 text-sm">
            <div className="text-green-400 py-1 border-b border-gray-800">
              [Connected] Fogo Session established
            </div>
            {chainData.isRegistered && (
              <div className="text-green-400 py-1 border-b border-gray-800">
                [Registered] Player: {chainData.playerName}
              </div>
            )}
            <div className="text-cyan-400 py-1 border-b border-gray-800">
              [Ready] Game engine initialized
            </div>
            <div className="text-gray-500 italic py-1">
              Waiting for game actions...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}