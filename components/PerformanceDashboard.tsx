"use client"

import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { PublicKey } from '@solana/web3.js';
import { Activity, Zap, Timer, CheckCircle, Clock, Cpu, Wallet, Database, TrendingUp, AlertCircle } from 'lucide-react';

interface PerformanceDashboardProps {
  sessionState?: EstablishedSessionState;
  performanceStats: {
    movesSent: number;
    shotsSent: number;
    killsSent: number;
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

  // Performance categories
  const performanceMetrics = [
    {
      title: "Transaction Speed",
      icon: <Zap className="w-4 h-4" />,
      value: `${performanceStats.avgConfirm}ms`,
      description: "Average confirmation time",
      color: "text-cyan-400",
      bgColor: "bg-cyan-900/20",
      barColor: "bg-cyan-500",
      barWidth: Math.min(100, (500 - performanceStats.avgConfirm) / 5) // Faster = longer bar
    },
    {
      title: "Success Rate",
      icon: <CheckCircle className="w-4 h-4" />,
      value: `${performanceStats.successRate.toFixed(1)}%`,
      description: "Transaction success rate",
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      barColor: "bg-green-500",
      barWidth: performanceStats.successRate
    },
    {
      title: "Chain Load",
      icon: <Activity className="w-4 h-4" />,
      value: `${performanceStats.chainSpeed}%`,
      description: "Current blockchain load",
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20",
      barColor: "bg-yellow-500",
      barWidth: performanceStats.chainSpeed
    },
    {
      title: "Network Latency",
      icon: <Timer className="w-4 h-4" />,
      value: `${performanceStats.pendingTx > 0 ? "High" : "Low"}`,
      description: `${performanceStats.pendingTx} pending TX`,
      color: performanceStats.pendingTx > 0 ? "text-amber-400" : "text-green-400",
      bgColor: performanceStats.pendingTx > 0 ? "bg-amber-900/20" : "bg-green-900/20",
      status: performanceStats.pendingTx > 0 ? "⚠️ Delayed" : "✅ Normal"
    }
  ];

  const transactionTypes = [
    { type: "Move Actions", count: performanceStats.movesSent, color: "bg-blue-500" },
    { type: "Shoot Actions", count: performanceStats.shotsSent, color: "bg-purple-500" },
    { type: "Kill Actions", count: performanceStats.killsSent, color: "bg-red-500" }
  ];

  const totalActions = performanceStats.movesSent + performanceStats.shotsSent + performanceStats.killsSent;

  return (
    <div className="glass-panel p-6 h-full flex flex-col space-y-6 overflow-y-auto">
      
      {/* 🔗 BLOCKCHAIN CONNECTION DETAILS */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-cyan-300">
          <Cpu className="w-5 h-5" />
          BLOCKCHAIN PERFORMANCE
        </h3>
        
        {sessionState ? (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">Connected to Fogo</span>
              </div>
              <div className="text-xs text-gray-400">Mainnet</div>
            </div>

            {/* Wallet & Session */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Wallet</span>
                </div>
                <div className="font-mono text-sm text-white truncate">
                  {formatPublicKey(sessionState.walletPublicKey)}
                </div>
              </div>
              
              <div className="bg-gray-900/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Session Key</span>
                </div>
                <div className="font-mono text-sm text-white truncate">
                  {formatPublicKey(sessionState.sessionPublicKey)}
                </div>
              </div>
            </div>

            {/* Gasless Status Badge */}
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-bold text-green-300">Gasless Mode Active</div>
                    <div className="text-xs text-green-400/80">No SOL required for transactions</div>
                  </div>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-900/30 rounded-lg">
            <div className="text-4xl mb-3 text-gray-600">🔌</div>
            <p className="text-gray-400">Not Connected</p>
            <p className="text-xs text-gray-500 mt-1">Connect wallet to view performance data</p>
          </div>
        )}
      </div>

      {/* 📊 PERFORMANCE METRICS */}
      <div>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5" />
          PERFORMANCE METRICS
        </h4>
        
        <div className="space-y-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className={`p-3 rounded-lg ${metric.bgColor} border border-gray-700/50`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="text-sm font-medium text-gray-300">{metric.title}</span>
                </div>
                <span className={`font-bold ${metric.color}`}>{metric.value}</span>
              </div>
              
              {metric.barWidth && (
                <div className="mb-2">
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${metric.barColor} transition-all duration-500`}
                      style={{ width: `${metric.barWidth}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-xs text-gray-400">
                <span>{metric.description}</span>
                {metric.status && (
                  <span className={metric.status.includes("Delayed") ? "text-amber-400" : "text-green-400"}>
                    {metric.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Breakdown */}
        <div className="mt-6">
          <h5 className="text-sm font-bold mb-3 text-gray-300">TRANSACTION BREAKDOWN</h5>
          <div className="space-y-2">
            {transactionTypes.map((tx, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tx.color}`}></div>
                  <span className="text-sm text-gray-300">{tx.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{tx.count}</span>
                  <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${tx.color}`}
                      style={{ width: `${totalActions > 0 ? (tx.count / totalActions * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-800">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total On-Chain Actions</span>
                <span className="font-bold text-white">{totalActions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎮 GAME PERFORMANCE */}
      <div>
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
          <Activity className="w-5 h-5" />
          GAME PERFORMANCE
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-gray-900/50 to-purple-900/20 p-4 rounded-lg border border-purple-500/20">
            <div className="text-gray-400 text-xs mb-1">FPS (Target)</div>
            <div className="text-2xl font-bold text-green-400">60/60</div>
            <div className="text-xs text-green-400 mt-1">✅ Optimal</div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900/50 to-blue-900/20 p-4 rounded-lg border border-blue-500/20">
            <div className="text-gray-400 text-xs mb-1">Render Time</div>
            <div className="text-2xl font-bold text-blue-400">12ms</div>
            <div className="text-xs text-blue-400 mt-1">⏱️ Fast</div>
          </div>
        </div>

        {/* Player Action Stats */}
        {chainData.isRegistered && (
          <div className="mt-4 bg-gradient-to-r from-gray-900/30 to-cyan-900/10 p-4 rounded-lg">
            <h5 className="text-sm font-bold mb-3 text-cyan-300">YOUR ACTION EFFICIENCY</h5>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Kill/Shot Ratio</span>
                <span className="font-bold text-green-400">
                  {chainData.playerShots > 0 
                    ? `${((chainData.playerKills / chainData.playerShots) * 100).toFixed(1)}%` 
                    : "0%"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Score per Kill</span>
                <span className="font-bold text-yellow-400">
                  {chainData.playerKills > 0 
                    ? Math.round(chainData.playerScore / chainData.playerKills) 
                    : "0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Actions per Minute</span>
                <span className="font-bold text-purple-400">
                  {totalActions > 0 ? Math.round(totalActions / 5) : "0"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ ALERTS & WARNINGS */}
      {performanceStats.pendingTx > 5 && (
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 mb-1">High Pending Transactions</div>
              <div className="text-sm text-amber-400/80">
                {performanceStats.pendingTx} transactions are pending confirmation.
                Game actions may be delayed until blockchain catches up.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📈 PERFORMANCE TIPS */}
      <div className="text-xs text-gray-500 space-y-2 pt-4 border-t border-gray-800/50">
        <div className="flex items-start gap-2">
          <div className="text-cyan-400">💡</div>
          <span>Lower confirmation time = better gaming experience</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-green-400">💡</div>
          <span>Success rate &gt; 95% indicates stable connection</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-purple-400">💡</div>
          <span>Each game action creates a blockchain transaction</span>
        </div>
      </div>
    </div>
  );
}
