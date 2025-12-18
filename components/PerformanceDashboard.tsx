"use client"

import { Trophy, Target, Zap, Users } from 'lucide-react';

interface Player {
  name: string;
  score: number;
  rank: number;
  wallet: string;
  kills: number;
  shots: number;
  accuracy: number;
}

export default function Leaderboard() {
  const players: Player[] = [
    { name: 'CryptoKing', score: 12500, rank: 1, wallet: '8gGP...9xY2', kills: 125, shots: 250, accuracy: 50 },
    { name: 'ShadowHunter', score: 9800, rank: 2, wallet: '5fDP...3zR8', kills: 98, shots: 196, accuracy: 50 },
    { name: 'BlazeWarrior', score: 7500, rank: 3, wallet: '2hKT...7pL1', kills: 75, shots: 150, accuracy: 50 },
    { name: 'NeoShooter', score: 5000, rank: 4, wallet: '9mNZ...4qW3', kills: 50, shots: 100, accuracy: 50 },
    { name: 'Phantom', score: 4200, rank: 5, wallet: '3rXP...8vB6', kills: 42, shots: 95, accuracy: 44.2 },
    { name: 'Vortex', score: 3800, rank: 6, wallet: '6tYQ...1sN9', kills: 38, shots: 120, accuracy: 31.7 },
    { name: 'You', score: 1250, rank: 7, wallet: 'Your...Wallet', kills: 12, shots: 25, accuracy: 48 },
  ];

  const globalStats = {
    totalPlayers: 12344,
    totalShots: 456278,
    enemiesKilled: 12345,
    gamesPlayed: 5678,
    totalScore: 45678900
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">GLOBAL LEADERBOARD</h3>
        </div>
        <p className="text-gray-400 text-sm">Updated in real-time from blockchain</p>
      </div>

      {/* Top Players */}
      <div className="space-y-3 mb-6 flex-1 overflow-y-auto no-scrollbar">
        {players.map((player) => (
          <div
            key={player.rank}
            className={`flex items-center p-4 rounded-xl transition-all hover:bg-gray-800/30 ${
              player.name === 'You' 
                ? 'bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30' 
                : 'bg-gray-900/20'
            } ${player.rank <= 3 ? 'scale-[1.02]' : ''}`}
          >
            {/* Rank */}
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg mr-4 ${
              player.rank === 1 ? 'bg-gradient-to-br from-yellow-500/30 to-amber-600/30 text-yellow-400 border border-yellow-500/30' :
              player.rank === 2 ? 'bg-gradient-to-br from-gray-400/30 to-gray-500/30 text-gray-300 border border-gray-500/30' :
              player.rank === 3 ? 'bg-gradient-to-br from-amber-700/30 to-orange-600/30 text-amber-400 border border-amber-500/30' :
              'bg-gray-800/50 text-gray-400'
            }`}>
              <span className="font-bold text-lg">#{player.rank}</span>
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold truncate ${
                  player.name === 'You' ? 'text-cyan-300' : 'text-white'
                }`}>
                  {player.name}
                </span>
                {player.name === 'You' && (
                  <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded-full">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {player.wallet}
              </div>
            </div>

            {/* Score & Stats */}
            <div className="text-right ml-4">
              <div className="text-xl font-bold text-yellow-400 mb-1">
                {player.score.toLocaleString()}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-red-400" />
                  <span>{player.kills}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span>{player.shots}</span>
                </div>
                <div className="text-green-400">
                  {player.accuracy}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Stats */}
      <div className="pt-6 border-t border-gray-700/50">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          GLOBAL STATS
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Total Players
            </div>
            <div className="text-xl font-bold text-cyan-400">
              {globalStats.totalPlayers.toLocaleString()}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Total Score
            </div>
            <div className="text-xl font-bold text-yellow-400">
              {(globalStats.totalScore / 1000000).toFixed(1)}M
            </div>
          </div>
          
          <div className="stat-card">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Enemies Killed
            </div>
            <div className="text-xl font-bold text-red-400">
              {globalStats.enemiesKilled.toLocaleString()}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Games Played
            </div>
            <div className="text-xl font-bold text-green-400">
              {globalStats.gamesPlayed.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            View Full Leaderboard →
          </button>
        </div>
      </div>
    </div>
  );
}
