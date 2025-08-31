'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function Navbar() {
  const [score, setScore] = useState(3); // Start with 3 for testing
  const [lives, setLives] = useState(3); // Example lives state

  // Placeholder action for wallet connection
  const handleWalletConnect = () => {
    console.log('Connect Wallet clicked! Add your wallet connection logic here.');
    // Example: connectWalletFunction()
  };

  return (
    <nav
      className="fixed top-0 left-0 w-full h-auto min-h-16 bg-cover bg-center bg-no-repeat z-50"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <div className="container mx-auto grid grid-cols-2 sm:flex sm:items-center justify-between py-2 px-2 sm:px-4">
        {/* Left Section (Chog Runner only on laptop, includes Score on mobile) */}
        <div className="col-span-1 flex flex-col items-start space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          {/* Chog Runner Title (Non-clickable) */}
          <span
            className="text-xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: 'var(--font-jersey-15)' }}
          >
            Chog Runner
          </span>
          {/* Score (visible only on mobile) */}
          <div className="flex items-center space-x-1 sm:space-x-2 sm:hidden">
            <span
              className="text-white text-sm sm:text-xl"
              style={{ fontFamily: 'var(--font-jersey-15)' }}
            >
              Score: {score}
            </span>
            <div className="flex">
              {score > 0 ? (
                Array.from({ length: Math.min(score, 5) }).map((_, i) => (
                  <Image
                    key={i}
                    src="/pixel-star.png"
                    alt="Star"
                    width={20}
                    height={20}
                    className="sm:w-6 sm:h-6"
                  />
                ))
              ) : (
                <span
                  className="text-white text-xs sm:text-sm"
                  style={{ fontFamily: 'var(--font-jersey-15)' }}
                >
                  No stars
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Section (Score and Lives on laptop) */}
        <div className="hidden sm:flex sm:items-center sm:space-x-4">
          {/* Score */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span
              className="text-white text-sm sm:text-xl"
              style={{ fontFamily: 'var(--font-jersey-15)' }}
            >
              Score: {score}
            </span>
            <div className="flex">
              {score > 0 ? (
                Array.from({ length: Math.min(score, 5) }).map((_, i) => (
                  <Image
                    key={i}
                    src="/pixel-star.png"
                    alt="Star"
                    width={20}
                    height={20}
                    className="sm:w-6 sm:h-6"
                  />
                ))
              ) : (
                <span
                  className="text-white text-xs sm:text-sm"
                  style={{ fontFamily: 'var(--font-jersey-15)' }}
                >
                  No stars
                </span>
              )}
            </div>
          </div>
          {/* Lives */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span
              className="text-white text-sm sm:text-xl"
              style={{ fontFamily: 'var(--font-jersey-15)' }}
            >
              Lives:
            </span>
            <div className="flex">
              {Array.from({ length: Math.min(lives, 3) }).map((_, i) => (
                <Image
                  key={i}
                  src="/pixel-heart.png"
                  alt="Heart"
                  width={20}
                  height={20}
                  className="sm:w-6 sm:h-6"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Section (Wallet Button and Lives on mobile) */}
        <div className="col-span-1 flex flex-col items-end space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
          {/* Connect Wallet Button */}
          <button
            className="text-sm sm:text-2xl flex items-center space-x-1 sm:space-x-2 bg-black/30 hover:bg-black/50 text-white px-2 sm:px-4 py-1 sm:py-2 rounded"
            onClick={handleWalletConnect}
          >
            <Image
              src="/wallet.png"
              alt="Wallet Icon"
              width={20}
              height={20}
              className="sm:w-6 sm:h-6"
            />
            <span style={{ fontFamily: 'var(--font-jersey-15)' }}>Connect</span>
          </button>
          {/* Lives (visible only on mobile) */}
          <div className="flex items-center space-x-1 sm:space-x-2 self-end sm:hidden">
            <span
              className="text-white text-sm sm:text-xl"
              style={{ fontFamily: 'var(--font-jersey-15)' }}
            >
              Lives:
            </span>
            <div className="flex">
              {Array.from({ length: Math.min(lives, 3) }).map((_, i) => (
                <Image
                  key={i}
                  src="/pixel-heart.png"
                  alt="Heart"
                  width={20}
                  height={20}
                  className="sm:w-6 sm:h-6"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}