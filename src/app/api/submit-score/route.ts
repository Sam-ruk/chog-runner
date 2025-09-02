import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, encodeFunctionData, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/2_6PCYK5t8bMySPXeTYlc',
        'https://testnet-rpc.monad.xyz',
        'https://rpc.testnet.monad.xyz',
      ],
    },
  },
};

const CONTRACT_ADDRESS = '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4';
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0x6d6eD11fb83b202a04be03a4dd4548ace2addbf7';

const CONTRACT_ABI = [
  {
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'scoreAmount', type: 'uint256' },
      { name: 'transactionAmount', type: 'uint256' },
    ],
    name: 'updatePlayerData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export async function POST(request: NextRequest) {
  try {
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    if (!ADMIN_PRIVATE_KEY || !ADMIN_PRIVATE_KEY.match(/^0x[0-9a-fA-F]{64}$/)) {
      return NextResponse.json({ error: 'Invalid admin private key.' }, { status: 500 });
    }

    const adminAccount = privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`);
    if (adminAccount.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: 'Admin private key does not match admin address.' }, { status: 500 });
    }

    const body = await request.json();
    const { playerAddress, score } = body;

    if (!playerAddress?.match(/^0x[0-9a-fA-F]{40}$/)) {
      return NextResponse.json({ error: 'Invalid player address.' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: 'Invalid score. Must be a non-negative integer.' }, { status: 400 });
    }

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });

    const adminWalletClient = createWalletClient({
      account: adminAccount,
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });

    // Gas settings
    const baseFeePerGas = 50_000_000_000n;
    const priorityFeePerGas = 12_400_000_000n;
    const maxFeePerGas = baseFeePerGas + priorityFeePerGas;
    let gasLimit = 177_260n;

    try {
      gasLimit = await publicClient.estimateGas({
        account: adminAccount.address,
        to: CONTRACT_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'updatePlayerData',
          args: [playerAddress as `0x${string}`, BigInt(score), BigInt(1)],
        }),
        maxFeePerGas,
        maxPriorityFeePerGas: priorityFeePerGas,
      });
      gasLimit = (gasLimit * 120n) / 100n; // 20% buffer
    } catch (err) {
      console.warn('Gas estimation failed, using fallback gas limit:', err);
      gasLimit = 200_000n;
    }

    // Check admin balance
    const adminBalance = await publicClient.getBalance({ address: adminAccount.address });
    const estimatedCost = gasLimit * maxFeePerGas;
    if (adminBalance < estimatedCost) {
      return NextResponse.json({
        error: 'Admin wallet has insufficient balance for transaction.',
        balance: formatUnits(adminBalance, 18),
        required: formatUnits(estimatedCost, 18),
        explorer: `https://testnet.monadexplorer.com/address/${adminAccount.address}`,
      }, { status: 500 });
    }

    // Simulate and submit transaction
    await publicClient.simulateContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'updatePlayerData',
      args: [playerAddress as `0x${string}`, BigInt(score), BigInt(1)],
      account: adminAccount.address,
      gas: gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFeePerGas,
    });

    const nonce = await publicClient.getTransactionCount({
      address: adminAccount.address,
      blockTag: 'pending',
    });

    const txHash = await adminWalletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'updatePlayerData',
      args: [playerAddress as `0x${string}`, BigInt(score), BigInt(1)],
      gas: gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFeePerGas,
      nonce,
    });

    // Wait for confirmation
    let receipt;
    let confirmAttempts = 0;
    const maxConfirmAttempts = 120;
    while (confirmAttempts < maxConfirmAttempts) {
      try {
        receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        if (receipt && receipt.status === 'success') break;
        if (receipt && receipt.status === 'reverted') {
          return NextResponse.json({
            error: 'Score submission transaction reverted.',
            txHash,
            explorer: `https://testnet.monadexplorer.com/tx/${txHash}`,
          }, { status: 400 });
        }
      } catch (err) {
        console.log(`Confirmation attempt ${confirmAttempts + 1} failed:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      confirmAttempts++;
    }

    if (!receipt) {
      return NextResponse.json({
        error: 'Score submission transaction not confirmed within timeout.',
        txHash,
        explorer: `https://testnet.monadexplorer.com/tx/${txHash}`,
      }, { status: 202 });
    }

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Score submitted successfully',
      playerAddress,
      scoreAmount: score,
      transactionAmount: 1,
      explorer: `https://testnet.monadexplorer.com/tx/${txHash}`,
      leaderboard: 'https://monad-games-id-site.vercel.app/leaderboard',
    }, { status: 200 });

  } catch (error) {
    console.error('Score submission error:', error);
    return NextResponse.json({
      error: 'Failed to submit score.',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}