
"use client"

interface Player {
  name: string;
  score: number;
  rank: number;
  wallet: string;
  kills: number;
  shots: number;
}

export default function Leaderboard() {
  // Mock leaderboard data (in production, fetch from blockchain)
  const players: Player[] = [
    { name: 'Regulador', score: 12500, rank: 1, wallet: 'FgGP...', kills: 125, shots: 250 },
    { name: 'Distribuidor', score: 9800, rank: 2, wallet: 'FgGP...', kills: 98, shots: 196 },
    { name: 'Cryptotipio', score: 7500, rank: 3, wallet: 'FgGP...', kills: 75, shots: 150 },
    { name: 'NewPlayer', score: 5000, rank: 4, wallet: 'FgGP...', kills: 50, shots: 100 },
  ];

  const globalStats = {
    totalPlayers: 12344,
    totalShots: 456278,
    enemiesKilled: 12345,
    gamesPlayed: 5678
  };

  return (
    <div className="glass-panel p-6 h-full">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        LEADERBOARD
      </h3>
      
      {/* 🥇 PLAYERS LIST */}
      <div className="space-y-3 mb-8">
        {players.map((player) => (
          <div
            key={player.rank}
            className={`flex justify-between items-center p-4 rounded-lg transition-all ${
              player.name === 'NewPlayer' 
                ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30' 
                : 'bg-gray-900/30 hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank badge */}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                player.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                player.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                player.rank === 3 ? 'bg-amber-700/20 text-amber-400' :
                'bg-gray-700/20 text-gray-400'
              }`}>
                #{player.rank}
              </div>
              
              <div className="flex flex-col">
                <span className={`font-medium truncate max-w-[120px] ${
                  player.name === 'NewPlayer' ? 'text-cyan-300' : 'text-white'
                }`}>
                  {player.name}
                </span>
                <span className="text-xs text-gray-500">
                  {player.wallet}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <span className="font-bold text-yellow-400 text-lg block">
                {player.score.toLocaleString()}
              </span>
              <div className="flex gap-2 text-xs text-gray-500">
                <span>⚔️ {player.kills}</span>
                <span>🔫 {player.shots}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 📊 GLOBAL STATS */}
      <div className="pt-6 border-t border-gray-700/50">
        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span>
          GLOBAL STATS
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Total Players
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {globalStats.totalPlayers.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Total Shots
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {globalStats.totalShots.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Enemies Killed
            </div>
            <div className="text-2xl font-bold text-red-400">
              {globalStats.enemiesKilled.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-gray-900/30 p-4 rounded-lg">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">
              Games Played
            </div>
            <div className="text-2xl font-bold text-green-400">
              {globalStats.gamesPlayed.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}