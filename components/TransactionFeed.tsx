"use client"

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

interface Transaction {
  id: string;
  type: 'move' | 'shoot' | 'kill' | 'register' | 'end_game';
  status: 'pending' | 'confirmed' | 'failed';
  signature?: string;
  timestamp: number;
  message: string;
  details?: string;
}

export default function TransactionFeed() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'register',
      status: 'confirmed',
      signature: '5KtPn1...jHd8f3',
      timestamp: Date.now() - 120000,
      message: 'Player registered successfully',
      details: 'wallet: FgGP...'
    },
    {
      id: '2',
      type: 'move',
      status: 'confirmed',
      signature: '4GjPn2...kHd9g4',
      timestamp: Date.now() - 90000,
      message: 'Move action confirmed',
      details: 'position: (320, 480)'
    },
    {
      id: '3',
      type: 'shoot',
      status: 'confirmed',
      signature: '3HkPn3...lHd0h5',
      timestamp: Date.now() - 60000,
      message: 'Shoot action confirmed',
      details: 'position: (350, 450)'
    },
    {
      id: '4',
      type: 'kill',
      status: 'confirmed',
      signature: '2JlPn4...mHd1i6',
      timestamp: Date.now() - 30000,
      message: 'Enemy killed! +100 points',
      details: 'total kills: 5'
    },
    {
      id: '5',
      type: 'move',
      status: 'pending',
      timestamp: Date.now() - 5000,
      message: 'Move action sending...',
    },
  ]);

  const getTransactionIcon = (type: Transaction['type']) => {
    switch(type) {
      case 'move': return '🚶';
      case 'shoot': return '🔫';
      case 'kill': return '💀';
      case 'register': return '👤';
      case 'end_game': return '🏁';
      default: return '📝';
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
    }
  };

  const getStatusText = (status: Transaction['status']) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'failed': return 'Failed';
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getExplorerLink = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=testnet`;
  };

  return (
    <div className="glass-panel p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-xl">📡</span>
          LIVE TRANSACTIONS
        </h3>
        <div className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
          {transactions.filter(t => t.status === 'pending').length} pending
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {transactions.map((tx) => (
          <div 
            key={tx.id}
            className="p-3 rounded-lg bg-gray-900/30 border border-gray-700/30 hover:border-gray-600/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{getTransactionIcon(tx.type)}</div>
                <div>
                  <div className="font-medium text-white">{tx.message}</div>
                  {tx.details && (
                    <div className="text-xs text-gray-400 mt-1">{tx.details}</div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                  {getStatusText(tx.status)}
                </span>
                <span className="text-xs text-gray-500">{formatTime(tx.timestamp)}</span>
              </div>
            </div>

            {/* Signature with Explorer Link */}
            {tx.signature && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="font-mono text-xs text-gray-300 truncate max-w-[120px]">
                    {tx.signature}
                  </span>
                </div>
                
                <a 
                  href={getExplorerLink(tx.signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 pt-4 border-t border-gray-800/50">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-2xl text-green-400">
              {transactions.filter(t => t.status === 'confirmed').length}
            </div>
            <div className="text-xs text-gray-400">Confirmed</div>
          </div>
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-2xl text-yellow-400">
              {transactions.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-2xl">
              {transactions.length}
            </div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span>🚶</span>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔫</span>
            <span>Shoot</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💀</span>
            <span>Kill</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👤</span>
            <span>Register</span>
          </div>
        </div>
      </div>
    </div>
  );
}
