'use client';

import Image from 'next/image';
import { useState, useEffect, ReactNode } from 'react';
import { usePrivy, CrossAppAccountWithMetadata, useWallets, useSignTransaction } from '@privy-io/react-auth';
import { createPublicClient, http, parseEther, formatUnits } from 'viem';

const MONAD_GAMES_CROSS_APP_ID = 'cmd8euall0037le0my79qpz42';
const CONTRACT_ADDRESS = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4';
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x6d6eD11fb83b202a04be03a4dd4548ace2addbf7';

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'totalScoreOfPlayer',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'totalTransactionsOfPlayer',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const publicClient = createPublicClient({
  chain: {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'] } },
    blockExplorers: { default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' } },
  },
  transport: http(),
});

interface LeaderboardEntry {
  userId: number;
  username: string;
  walletAddress: string;
  score: number;
  gameId: number;
  gameName: string;
  rank: number;
}

interface NavbarProps {
  children: (props: {
    score: number;
    setScore: React.Dispatch<React.SetStateAction<number>>; 
    lives: number;
    setLives: React.Dispatch<React.SetStateAction<number>>; 
    submitScore: () => Promise<void>;
    leaderboard: LeaderboardEntry[];
    globalWalletAddress: string | null;
    showDialog: (message: string) => void;
  }) => React.ReactNode;
}

export default function Navbar({ children }: NavbarProps) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [globalWalletAddress, setGlobalWalletAddress] = useState<string | null>(null);
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null);
  const [embeddedWalletBalance, setEmbeddedWalletBalance] = useState<string>('0');
  const [username, setUsername] = useState<string | null>(null);
  const [globalScore, setGlobalScore] = useState<number | null>(null);
  const [globalTransactions, setGlobalTransactions] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    // Mock data due to CORS
    { userId: 420, username: 'samk2', walletAddress: '0x76ED3aa770e06591f33a165e331560c43a71aA14', score: 80, gameId: 244, gameName: 'ChogRunner', rank: 1 },
    { userId: 421, username: 'player2', walletAddress: '0x1234567890abcdef1234567890abcdef12345678', score: 70, gameId: 244, gameName: 'ChogRunner', rank: 2 },
    { userId: 422, username: 'player3', walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12', score: 60, gameId: 244, gameName: 'ChogRunner', rank: 3 },
    { userId: 423, username: 'player4', walletAddress: '0x1111111111111111111111111111111111111111', score: 50, gameId: 244, gameName: 'ChogRunner', rank: 4 },
    { userId: 424, username: 'player5', walletAddress: '0x2222222222222222222222222222222222222222', score: 40, gameId: 244, gameName: 'ChogRunner', rank: 5 },
    { userId: 425, username: 'player6', walletAddress: '0x3333333333333333333333333333333333333333', score: 30, gameId: 244, gameName: 'ChogRunner', rank: 6 },
    { userId: 426, username: 'player7', walletAddress: '0x4444444444444444444444444444444444444444', score: 20, gameId: 244, gameName: 'ChogRunner', rank: 7 },
    { userId: 427, username: 'player8', walletAddress: '0x5555555555555555555555555555555555555555', score: 15, gameId: 244, gameName: 'ChogRunner', rank: 8 },
    { userId: 428, username: 'player9', walletAddress: '0x6666666666666666666666666666666666666666', score: 10, gameId: 244, gameName: 'ChogRunner', rank: 9 },
    { userId: 429, username: 'player10', walletAddress: '0x7777777777777777777777777777777777777777', score: 5, gameId: 244, gameName: 'ChogRunner', rank: 10 },
  ]);

  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const showDialog = (message: string) => {
    setDialog(message);
  };

  const closeDialog = () => {
    setDialog(null);
  };

  const fetchEmbeddedWalletBalance = async (address: string) => {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      setEmbeddedWalletBalance(formatUnits(balance, 18));
    } catch (err) {
      console.error('Error fetching embedded wallet balance:', err);
      setEmbeddedWalletBalance('0');
    }
  };

  useEffect(() => {
    if (!embeddedWalletAddress) return;

    fetchEmbeddedWalletBalance(embeddedWalletAddress);
    const interval = setInterval(() => {
      fetchEmbeddedWalletBalance(embeddedWalletAddress);
    }, 5000);

    return () => clearInterval(interval);
  }, [embeddedWalletAddress]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('https://monad-games-id-site.vercel.app/api/leaderboard?page=1&gameId=244&sortBy=scores');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      // showDialog('Failed to load leaderboard. Using mock data.');
    }
  };

  useEffect(() => {
    if (!ready || !authenticated || !user?.linkedAccounts?.length) {
      resetState();
      if (!authenticated) {
        showDialog('Please sign in with Monad Games ID.');
      }
      return;
    }

    setLoading(true);
    setDialog(null);

    const crossAppAccount: CrossAppAccountWithMetadata | undefined = user.linkedAccounts.find(
      account => account.type === 'cross_app' && account.providerApp?.id === MONAD_GAMES_CROSS_APP_ID
    ) as CrossAppAccountWithMetadata;

    if (crossAppAccount?.embeddedWallets?.length > 0) {
      const globalWallet = crossAppAccount.embeddedWallets[0].address;
      setGlobalWalletAddress(globalWallet);
      
      Promise.all([
        fetchUsername(globalWallet),
        fetchContractData(globalWallet),
        fetchLeaderboard(),
      ]).finally(() => setLoading(false));
    } else {
      showDialog('No Monad Games ID found. Please sign in with Monad Games ID.');
      setLoading(false);
    }

    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (embeddedWallet) {
      setEmbeddedWalletAddress(embeddedWallet.address);
    } else {
      // showDialog('Embedded wallet not found. Please try logging in again.');
      setLoading(false);
    }
  }, [ready, authenticated, user, wallets]);

  const resetState = () => {
    setGlobalWalletAddress(null);
    setEmbeddedWalletAddress(null);
    setEmbeddedWalletBalance('0');
    setUsername(null);
    setGlobalScore(null);
    setGlobalTransactions(null);
  };

  const fetchUsername = async (walletAddress: string) => {
    try {
      const res = await fetch(`https://monad-games-id-site.vercel.app/api/check-wallet?wallet=${walletAddress}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      
      const data = await res.json();
      if (data.hasUsername && data.user?.username) {
        setUsername(data.user.username);
      } else {
        showDialog('No username found. Please register a username.');
      }
    } catch (err) {
      console.error('Error fetching username:', err);
      showDialog('Failed to verify username.');
    }
  };

  const fetchContractData = async (walletAddress: string) => {
    try {
      const [score, transactions] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'totalScoreOfPlayer',
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'totalTransactionsOfPlayer',
          args: [walletAddress],
        }),
      ]);
      
      setGlobalScore(Number(score));
      setGlobalTransactions(Number(transactions));
    } catch (err) {
      console.error('Error fetching contract data:', err);
    }
  };

  const submitScore = async () => {
  if (!globalWalletAddress || !username) {
    showDialog('Sign in using Monad Games ID to submit scores.');
    return;
  }

  if (!embeddedWalletAddress) {
    showDialog('No embedded wallet found for signing transactions.');
    return;
  }

  setSubmitting(true);
  setDialog(null);

  try {
    const wallet = wallets.find(w => w.address.toLowerCase() === embeddedWalletAddress.toLowerCase());
    if (!wallet) {
      throw new Error('Embedded wallet not found in Privy wallets.');
    }

    await wallet.switchChain(10143);

    const balance = await publicClient.getBalance({ address: embeddedWalletAddress as `0x${string}` });
    const requiredAmount = parseEther('0.02');
    if (balance < requiredAmount) {
      throw new Error(`Insufficient balance. Need 0.02 MON, but you have ${formatUnits(balance, 18)} MON.`);
    }

    const transactionRequest = {
      to: ADMIN_ADDRESS as `0x${string}`,
      value: parseEther('0.02'),
    };

    const { signature } = await signTransaction(transactionRequest, {
      address: embeddedWalletAddress,
    });

    const paymentTxHash = await publicClient.sendRawTransaction({
      serializedTransaction: signature,
    });

    let receipt;
    let confirmAttempts = 0;
    const maxConfirmAttempts = 120;
    while (confirmAttempts < maxConfirmAttempts) {
      try {
        receipt = await publicClient.getTransactionReceipt({ hash: paymentTxHash });
        if (receipt && receipt.status === 'success') break;
        if (receipt && receipt.status === 'reverted') {
          throw new Error(`Payment transaction reverted. Check: https://testnet.monadexplorer.com/tx/${paymentTxHash}`);
        }
      } catch (err) {
        console.log(`Payment confirmation attempt ${confirmAttempts + 1} failed:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      confirmAttempts++;
    }

    if (!receipt) {
      throw new Error(`Payment transaction not confirmed within timeout. Check: https://testnet.monadexplorer.com/tx/${paymentTxHash}`);
    }

    const response = await fetch('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: globalWalletAddress,
        score,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit score.');
    }

    showDialog(`Score submitted! Signer: ${embeddedWalletAddress.slice(0, 6)}...${embeddedWalletAddress.slice(-4)}. Check: ${result.explorer}`);
    setTimeout(() => setDialog(null), 5000);

    await Promise.all([
      fetchContractData(globalWalletAddress),
      fetchLeaderboard(),
    ]);
  } catch (err: any) {
    console.error('Score submission error:', err);
    throw err; 
  } finally {
    setSubmitting(false);
  }
};

  const handleMonadGamesIDLogin = async () => {
    if (!ready) return;
    
    try {
      await login();
    } catch (err: any) {
      console.error('Login failed:', err);
      showDialog('Failed to sign in with Monad Games ID. Please try again.');
    }
  };

  const handleRegister = () => {
    const redirectUri = encodeURIComponent(window.location.origin);
    window.open(`https://monad-games-id-site.vercel.app/?redirect_uri=${redirectUri}`, '_blank');
  };

  const handleCopyAddress = (address: string | null) => {
    if (address) {
      navigator.clipboard.writeText(address)
        .then(() => {
          showDialog('Address copied!');
          setTimeout(() => setDialog(null), 2000);
        })
        .catch(() => showDialog('Failed to copy address.'));
    }
  };

  const renderAuthButton = () => {
  if (!ready || !authenticated) {
    return (
      <button
        className="text-lg flex items-center space-x-2 bg-black/30 hover:bg-black/50 text-white px-4 py-2 rounded"
        onClick={handleMonadGamesIDLogin}
      >
        <Image src="/wallet.png" alt="Wallet Icon" width={24} height={24} />
        <span style={{ fontFamily: 'var(--font-jersey-15)' }}>Sign in</span>
      </button>
    );
  }

  if (!username) {
    return (
      <button
        className="text-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        onClick={handleRegister}
        style={{ fontFamily: 'var(--font-jersey-15)' }}
      >
        Create ID
      </button>
    );
  }

  return (
    <button
      className="text-lg flex items-center space-x-2 bg-black/30 hover:bg-black/50 text-white px-4 py-2 rounded"
      onClick={logout}
    >
      <Image src="/wallet.png" alt="Wallet Icon" width={24} height={24} />
      <span style={{ fontFamily: 'var(--font-jersey-15)' }}>Disconnect</span>
    </button>
  );
};

  return (
    <>
      <nav
  className="fixed top-0 left-0 w-full h-38 min-h-16 bg-cover bg-center bg-no-repeat z-50"
  style={{ backgroundImage: "url('/bg.png')", backgroundColor: '#1E3A8A' }}
>
  <div className="container mx-auto px-4 py-2">
    {/* Game Title */}
    <div className="flex justify-between items-center mb-2">
      <span 
  className={`${!ready || !authenticated ? 'text-9xl' : 'text-3xl sm:text-6xl'} font-bold text-white`} 
  style={{ fontFamily: 'var(--font-jersey-15)' }}
>
  Chog Runner
</span>
      
      {/* Auth Section */}
      <div className="flex items-center space-x-2">
  {renderAuthButton()}
</div>
    </div>

    {/* Stats Row - Show only if signed in */}
    {globalWalletAddress && (
      <div className="flex flex-wrap justify-between items-start gap-6 text-white text-lg" style={{ fontFamily: 'var(--font-jersey-15)' }}>
        {/* Group 1: Score and Lives (Left-aligned) */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <span>Score: {score}</span>
            <div className="flex">
              {Array.from({ length: 3 }).map((_, i) => (
                <Image key={i} src="/pixelstar.png" alt="Star" width={20} height={20} />
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span>Lives: </span>
            <div className="flex">
              {Array.from({ length: lives }).map((_, i) => (
                <Image key={i} src="/pixelheart.png" alt="heart" width={20} height={20} />
              ))}
            </div>
          </div>
        </div>

        {/* Group 2: Global Score and Transactions (Left-aligned) */}
        <div className="flex flex-col space-y-1">
          {globalScore !== null && <span>Global Score: {globalScore}</span>}
          {globalTransactions !== null && <span>Transactions: {globalTransactions}</span>}
        </div>

        {/* Group 3: Signer and Balance (Left-aligned) */}
        {embeddedWalletAddress && (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-base">Signer: {embeddedWalletAddress.slice(0, 6)}...{embeddedWalletAddress.slice(-4)}</span>
              <button
                className="text-base bg-purple-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
                onClick={() => handleCopyAddress(embeddedWalletAddress)}
              >
                Copy
              </button>
            </div>
            <span className="text-base">Balance: {parseFloat(embeddedWalletBalance).toFixed(4)} MON</span>
          </div>
        )}

        {/* Group 4: Player and Game ID Wallet (Right-aligned) */}
        {globalWalletAddress && username && (
          <div className="flex flex-col space-y-1 text-right">
            <span>Player: {username}</span>
            <div className="flex items-center justify-end space-x-2">
              <span className="text-base">Game ID Wallet: {globalWalletAddress.slice(0, 6)}...{globalWalletAddress.slice(-4)}</span>
              <button
                className="text-base bg-purple-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded"
                onClick={() => handleCopyAddress(globalWalletAddress)}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</nav>

      {/* Dialog for errors/messages */}
      {dialog && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={closeDialog}
        >
          <div 
            className="bg-gradient-to-br from-white/90 to-purple-200/90 p-6 rounded-xl border-2 border-purple-400 shadow-[0_0_20px_rgba(251,207,232,0.4)] max-w-sm text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-xl"
              onClick={closeDialog}
            >
              ✕
            </button>
            <p className="text-lg text-gray-700" style={{ fontFamily: 'var(--font-jersey-15)' }}>
              {dialog}
            </p>
          </div>
        </div>
      )}
      
      <div className='pt-38'>
  {children({ score, setScore, lives, setLives, submitScore, leaderboard, globalWalletAddress, showDialog })}
</div>
    </>
  );
}