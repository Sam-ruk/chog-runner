import React, { useEffect } from 'react';

interface LeaderboardEntry {
  userId: number;
  username: string;
  walletAddress: string;
  score: number;
  gameId: number;
  gameName: string;
  rank: number;
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  globalWalletAddress: string | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard, globalWalletAddress }) => {
  useEffect(() => {
    console.log('Leaderboard updated with', leaderboard.length, 'entries');
  }, [leaderboard]);

  const isCurrentPlayer = (walletAddress: string) => {
    return globalWalletAddress && 
           walletAddress.toLowerCase() === globalWalletAddress.toLowerCase();
  };

  return (
    <div className="w-80 bg-gradient-to-br from-purple-100 to-pink-100 p-4 border-r-4 border-purple-300 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-center text-purple-800" 
          style={{ fontFamily: 'var(--font-jersey-15)' }}>
        🏆 LEADERBOARD
      </h2>
      
      <div className="space-y-2 max-h-full overflow-y-auto">
        {leaderboard.map((player, index) => {
          const isCurrentUser = isCurrentPlayer(player.walletAddress);
          
          return (
            <div
              key={`${player.userId}-${player.score}-${index}`} 
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                isCurrentUser 
                  ? 'bg-gradient-to-r from-yellow-200 to-yellow-300 border-yellow-500 shadow-lg transform scale-105' 
                  : 'bg-white/70 border-purple-300 hover:bg-white/90'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-lg ${
                    index === 0 ? 'text-yellow-600' :
                    index === 1 ? 'text-gray-500' :
                    index === 2 ? 'text-amber-600' :
                    'text-purple-700'
                  }`} style={{ fontFamily: 'var(--font-jersey-15)' }}>
                    #{player.rank}
                  </span>
                  {index === 0 && <span className="text-xl">🥇</span>}
                  {index === 1 && <span className="text-xl">🥈</span>}
                  {index === 2 && <span className="text-xl">🥉</span>}
                </div>
                <span className="font-bold text-lg text-purple-700" 
                      style={{ fontFamily: 'var(--font-jersey-15)' }}>
                  {player.score}
                </span>
              </div>
              
              <div className="text-sm text-gray-700">
                <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-jersey-15)' }}>
                  {player.username}
                  {isCurrentUser && <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded">YOU</span>}
                </div>
                <div className="text-xs text-gray-500 truncate font-mono">
                  {player.walletAddress.slice(0, 8)}...{player.walletAddress.slice(-6)}
                </div>
              </div>
            </div>
          );
        })}
        
        {leaderboard.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🎮</div>
            <p style={{ fontFamily: 'var(--font-jersey-15)' }}>No scores yet!</p>
            <p className="text-sm">Be the first to submit a score!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;