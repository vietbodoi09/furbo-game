
interface GameHeaderProps {
  score: number;
  gameTime: number;
  isConnected: boolean;
}

export default function GameHeader({ score, gameTime, isConnected }: GameHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="text-2xl font-bold">
        <span className="text-yellow-400 mr-4">SCORE: {score}</span>
        <span className="text-green-400">TIME: {gameTime}s</span>
      </div>
      <div className={`px-4 py-2 rounded-full ${isConnected ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
      </div>
    </div>
  );
}