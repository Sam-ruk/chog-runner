'use client';

import Navbar from './components/Navbar';
import ChogRunner from './components/ChogRunner';

export default function Home() {
  return (
    <Navbar>
      {({ score, setScore, lives, setLives, submitScore, leaderboard, globalWalletAddress, showDialog }) => (
        <ChogRunner
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          submitScore={submitScore}
          leaderboard={leaderboard}
          globalWalletAddress={globalWalletAddress}
          showDialog={showDialog}
        />
      )}
    </Navbar>
  );
}