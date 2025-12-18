"use client"

import { useState, useEffect } from "react";
import { ExternalLink, Zap, Target, Skull, User, Trophy } from 'lucide-react';

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
      signature: '5KtPn1LjHd8f3',
      timestamp: Date.now() - 120000,
      message: 'Player registered successfully',
      details: 'New player joined the game'
    },
    {
      id: '2',
      type: 'move',
      status: 'confirmed',
      signature: '4GjPn2kHd9g4',
      timestamp: Date.now() - 90000,
      message: 'Move action confirmed',
      details: 'Position: (320, 480)'
    },
    {
      id: '3',
      type: 'shoot',
      status: 'confirmed',
      signature: '3HkPn3lHd0h5',
      timestamp: Date.now() - 60000,
      message: 'Shoot action confirmed',
      details: 'Bullet fired!'
    },
    {
      id: '4',
      type: 'kill',
      status: 'confirmed',
      signature: '2JlPn4mHd1i6',
      timestamp: Date.now() - 30000,
      message: 'Enemy killed! +100 points',
      details: 'Total kills: 5'
    },
    {
      id: '5',
      type: 'move',
      status: 'pending',
      timestamp: Date.now() - 5000,
      message: 'Move action sending...',
      details: 'Waiting for confirmation'
    },
  ]);

  const getTransactionIcon = (type: Transaction['type']) => {
    switch(type) {
      case 'move': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'shoot': return <Target className="w-5 h-5 text-purple-400" />;
      case 'kill': return <Skull className="w-5 h-5 text-red-400" />;
      case 'register': return <User className="w-5 h-5 text-green-400" />;
      case 'end_game': return <Trophy className="w-5 h-5 text-yellow-400" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
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
    return `https://fogoscan.com/tx/${signature}?cluster=testnet`;
  };

  return (
    <div className="bg-gradient-to-b from-gray-900/50 to-gray-900/20 rounded-xl p-4 border border-cyan-900/30 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-white">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          LIVE TRANSACTIONS
        </h3>
        <div className="text-xs px-2 py-1 rounded bg-gray-800/50 text-gray-300">
          {transactions.length} total
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
        {transactions.map((tx) => (
          <div 
            key={tx.id}
            className="p-3 rounded-lg bg-gray-900/40 border border-gray-700/50 hover:border-gray-600/70 transition-all"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gray-800/50">
                {getTransactionIcon(tx.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-white">{tx.message}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                    {getStatusText(tx.status)}
                  </span>
                </div>
                
                {tx.details && (
                  <div className="text-xs text-gray-400 mt-1">{tx.details}</div>
                )}
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">{formatTime(tx.timestamp)}</span>
                  
                  {tx.signature && (
                    <a 
                      href={getExplorerLink(tx.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Signature */}
            {tx.signature && (
              <div className="mt-2 pt-2 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="font-mono text-xs text-gray-300">
                    Signature: {tx.signature}...
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-800/50">
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-lg font-bold text-green-400">
              {transactions.filter(t => t.status === 'confirmed').length}
            </div>
            <div className="text-xs text-gray-400">Confirmed</div>
          </div>
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-lg font-bold text-yellow-400">
              {transactions.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-lg font-bold text-red-400">
              {transactions.filter(t => t.status === 'failed').length}
            </div>
            <div className="text-xs text-gray-400">Failed</div>
          </div>
          <div className="text-center p-2 bg-gray-900/40 rounded">
            <div className="text-lg font-bold text-white">
              {transactions.length}
            </div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>Each game action creates a blockchain transaction</p>
        <p className="mt-1">Click "View on Explorer" to see details</p>
      </div>
    </div>
  );
}
