interface GameHeaderProps {
  score: number;
  gameTime: number;
  kills: number;
  shots: number;
  isConnected: boolean;
  playerName?: string;
}

export default function GameHeader({ 
  score, 
  gameTime, 
  kills, 
  shots, 
  isConnected, 
  playerName 
}: GameHeaderProps) {
  return (
    <div className="w-full mb-6">
      {/* Status Bar */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isConnected 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20 text-green-400 border border-green-500/30' 
            : 'bg-gradient-to-r from-red-900/30 to-rose-900/20 text-red-400 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-medium">{isConnected ? 'Connected' : 'Not Connected'}</span>
          </div>
          
          {playerName && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/20 border border-cyan-500/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-cyan-300 text-sm font-medium">{playerName}</span>
            </div>
          )}
        </div>

        {/* Game Stats */}
        <div className="flex flex-wrap gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">SCORE</div>
            <div className="text-2xl font-bold text-yellow-400 font-[var(--font-orbitron)]">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">TIME</div>
            <div className="text-2xl font-bold text-green-400 font-[var(--font-orbitron)]">
              {gameTime}s
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">KILLS</div>
            <div className="text-2xl font-bold text-red-400 font-[var(--font-orbitron)]">
              {kills}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">SHOTS</div>
            <div className="text-2xl font-bold text-purple-400 font-[var(--font-orbitron)]">
              {shots}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Hint */}
      <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">← →</kbd>
            <span>Move Player</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">SPACE</kbd>
            <span>Shoot</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">P</kbd>
            <span>Pause Game</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">R</kbd>
            <span>Reset Game</span>
          </div>
        </div>
      </div>
    </div>
  );
}
