'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || 'https://testnet-rpc.monad.xyz']
    }
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com'
    }
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables');
  }

  console.log('Privy config:', {
    appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    rpcUrl: process.env.RPC_URL || 'https://testnet-rpc.monad.xyz',
  });

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        embeddedWallets: {
          createOnLogin: 'all-users', // Create embedded wallet for all users on first login
        },
        loginMethodsAndOrder: {
          primary: ['privy:cmd8euall0037le0my79qpz42'], // Monad Games ID
        },
        appearance: {
          theme: 'dark',
          showWalletLoginFirst: false, // Don't show wallet login first
          logo: undefined, // Remove Privy logo if you want
        },
        // Remove extra legal dialogs that might cause popups
        legal: {
          termsAndConditionsUrl: undefined,
          privacyPolicyUrl: undefined,
        },
        // Additional settings to reduce popup behavior
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}