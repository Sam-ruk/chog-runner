import React from 'react';

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
  return (
    <>
      {/* Desktop Leaderboard */}
      <div className="hidden lg:block w-80 bg-gradient-to-b from-pink-200/70 to-blue-100/70 backdrop-blur-sm border-r border-pink-300/50 p-4 overflow-y-auto max-h-[calc(100vh-8rem)] purple-scrollbar">
        <h2 className="text-3xl font-bold mb-4 text-center text-purple-700" style={{ fontFamily: 'var(--font-jersey-15)' }}>LEADERBOARD</h2>
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((player, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded-lg ${
                player.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-300/60 to-orange-300/60 border border-yellow-400/50'
                  : 'bg-pink-100/60 border border-pink-300/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{player.rank <= 3 ? (player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉') : ''}</span>
                <div>
                  <div className="text-xs text-gray-600">
                    {player.username || `${player.walletAddress.slice(0, 6)}...${player.walletAddress.slice(-4)}`}
                    {globalWalletAddress && player.walletAddress.toLowerCase() === globalWalletAddress.toLowerCase() && ' (you)'}
                  </div>
                  <div className="text-sm font-bold text-pink-800">{player.score.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-md font-bold text-purple-700">#{player.rank}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Leaderboard */}
      <div className="lg:hidden bg-gradient-to-r from-pink-200/70 to-blue-100/70 backdrop-blur-sm border-t border-pink-300/50 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto purple-scrollbar">
        <h2 className="text-lg font-bold mb-3 text-center text-purple-800" style={{ fontFamily: 'var(--font-jersey-15)' }}>LEADERBOARD</h2>
        <div className="flex overflow-x-auto gap-3 pb-2 purple-scrollbar">
          {leaderboard.slice(0, 10).map((player, index) => (
            <div
              key={index}
              className={`flex-shrink-0 p-3 rounded-lg min-w-[140px] text-center ${
                player.rank <= 3
                  ? 'bg-gradient-to-b from-yellow-300/60 to-orange-300/60 border border-yellow-400/50'
                  : 'bg-pink-100/60 border border-pink-300/50'
              }`}
            >
              <div className="text-2xl mb-1">{player.rank <= 3 ? (player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉') : ''}</div>
              <div className="text-xs text-gray-600 truncate">
                {player.username || `${player.walletAddress.slice(0, 6)}...${player.walletAddress.slice(-4)}`}
                {globalWalletAddress && player.walletAddress.toLowerCase() === globalWalletAddress.toLowerCase() && ' (you)'}
              </div>
              <div className="text-sm font-bold text-pink-800">{player.score.toLocaleString()}</div>
              <div className="text-xs text-blue-700">#{player.rank}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .purple-scrollbar::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .purple-scrollbar::-webkit-scrollbar-track {
          background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(216, 191, 216, 0.2));
          border-radius: 8px;
          box-shadow: inset 0 0 4px rgba(153, 102, 204, 0.3);
        }
        .purple-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #9966CC, #D8BFD8, #9966CC);
          border-radius: 8px;
          box-shadow: 
            0 0 8px rgba(153, 102, 204, 0.7),
            inset 0 0 4px rgba(255, 255, 255, 0.3);
          border: 1px solid rgba(153, 102, 204, 0.4);
        }
        .purple-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #B19CD9, #FFB6C1, #B19CD9);
          box-shadow: 
            0 0 12px rgba(153, 102, 204, 0.9),
            inset 0 0 6px rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
        }
        .purple-scrollbar::-webkit-scrollbar-corner {
          background: linear-gradient(45deg, rgba(153, 102, 204, 0.2), rgba(216, 191, 216, 0.3));
        }
      `}</style>
    </>
  );
};

export default Leaderboard;