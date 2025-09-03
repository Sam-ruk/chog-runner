'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Leaderboard from './Leaderboard';

interface ChogRunnerProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  submitScore: () => Promise<{ success: boolean; message: string } | void>;
  leaderboard: Array<{
    userId: number;
    username: string;
    walletAddress: string;
    score: number;
    gameId: number;
    gameName: string;
    rank: number;
  }>;
  globalWalletAddress: string | null;
  showDialog: (message: string) => void;
}

// Fallback textures
const createFallbackCanvas = (color: string, size = 64) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return canvas;
};

const ASSETS = {
  chog: { 
    texture: '/chog.png', 
    scaleX: 4,
    scaleY: 5.7,
    fallback: () => createFallbackCanvas('#4A90E2')
  },
  star: { 
    texture: '/star.png', 
    scale: 3, 
    effect: { points: 1 },
    fallback: () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 144 - 90) * Math.PI / 180;
        const x = 32 + Math.cos(angle) * 20;
        const y = 32 + Math.sin(angle) * 20;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
      }
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
  },
  chest: { 
    texture: '/chest.png', 
    scale: 3.5, 
    effect: { points: 2 },
    fallback: () => createFallbackCanvas('#8B4513')
  },
  spiky: { 
    texture: '/spiky.png', 
    scale: 3, 
    effect: { lives: -1 },
    fallback: () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.lineTo(48, 24);
      ctx.lineTo(56, 32);
      ctx.lineTo(48, 40);
      ctx.lineTo(32, 56);
      ctx.lineTo(16, 40);
      ctx.lineTo(8, 32);
      ctx.lineTo(16, 24);
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
  },
  uwu: { 
    texture: '/uwu.png', 
    scale: 1,
    fallback: () => createFallbackCanvas('#FF69B4')
  },
  monad: { 
    texture: '/monad.png',
    fallback: () => createFallbackCanvas('#9966CC')
  },
};

// Lanes
const LANE_WIDTH = 8;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

// Game tuning
const MAX_OBSTACLES = 12;
const BASE_SPEED = 0.04;
const SPEED_GROWTH = 0.00005;
const SPAWN_EVERY_MS = 450;
const Z_START = -80;
const Z_DESPAWN = 24;
const HIT_Z_NEAR = 1.8;

const TABLE = [
  { key: 'star', w: 0.6 },
  { key: 'chest', w: 0.2 },
  { key: 'spiky', w: 0.2 },
] as const;

function pickType() {
  const r = Math.random();
  let acc = 0;
  for (const t of TABLE) {
    acc += t.w;
    if (r <= acc) return t.key as keyof typeof ASSETS;
  }
  return 'star';
}

const ChogRunner: React.FC<ChogRunnerProps> = ({ score, setScore, lives, setLives, submitScore, leaderboard, globalWalletAddress, showDialog }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    textures: new Map<string, THREE.Texture>(),
    sprites: new Map<string, THREE.SpriteMaterial>(),
    player: null as THREE.Sprite | null,
    obstacles: [] as Array<THREE.Sprite & { userData: any }>,
    lastSpawn: 0,
    raf: 0 as number,
    running: false,
    speed: BASE_SPEED,
    targetLane: 1,
    currentLaneX: 0,
  });

  const [lane, setLane] = useState(1);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Scene setup
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });

    try {
      if ('outputColorSpace' in renderer) {
        (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
      } else {
        (renderer as any).outputEncoding = 3001;
      }
    } catch (e) {
      console.warn('Could not set color space:', e);
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd4ff, 0.4);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);

    const gradientTex = new THREE.CanvasTexture(makeGradient());
    scene.background = gradientTex;

    const roadW = LANE_WIDTH * 3 + 4;
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(roadW, 300),
      new THREE.MeshBasicMaterial({ color: 0x6a6a6a })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -20);
    scene.add(road);

    for (let i = 1; i <= 2; i++) {
      const x = -roadW / 2 + (roadW / 3) * i;
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.02, 300),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      divider.position.set(x, 0.01, -20);
      scene.add(divider);
    }

    const wallGeo = new THREE.BoxGeometry(1, 6, 300);
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xd087fa });
    const left = new THREE.Mesh(wallGeo, wallMat);
    left.position.set(-roadW / 2 - 0.5, 3, -20);
    const right = new THREE.Mesh(wallGeo, wallMat);
    right.position.set(roadW / 2 + 0.5, 3, -20);
    scene.add(left, right);

    game.current.scene = scene;
    game.current.camera = camera;
    game.current.renderer = renderer;
    game.current.currentLaneX = LANES[1];
    game.current.targetLane = 1;

    const onResize = () => {
      if (!canvasRef.current || !game.current.renderer || !game.current.camera) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      game.current.renderer.setSize(w, h, false);
      game.current.camera.aspect = w / h;
      game.current.camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener('resize', onResize);

    const initGame = async () => {
      try {
        await loadTextures();
        makePlayer();
        makeBackdropSprite();
        setLoading(false);
        renderOnce();
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setLoading(false);
        showDialog('Failed to initialize game. Using fallback assets.');
      }
    };
    
    initGame();

    function renderOnce() {
      if (!game.current.renderer || !game.current.scene || !game.current.camera) return;
      game.current.renderer.render(game.current.scene, game.current.camera);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      stopLoop();
      game.current.renderer?.dispose();
      game.current.scene = null;
      game.current.camera = null;
      game.current.renderer = null;
      game.current.player = null;
      game.current.obstacles = [];
      game.current.textures.clear();
      game.current.sprites.clear();
    };
  }, []);

  // Keyboard/touch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || over) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') move(-1);
      if (k === 'arrowright' || k === 'd') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, over]);

  useEffect(() => {
    game.current.targetLane = lane;
  }, [lane]);

  // Controls
  const move = (dir: -1 | 1) => {
    setLane((prev) => Math.max(0, Math.min(2, prev + dir)));
  };

  // Assets
  async function loadTextures() {
    const loader = new THREE.TextureLoader();
    const entries = Object.entries(ASSETS) as Array<[keyof typeof ASSETS, any]>;
    
    for (const [k, v] of entries) {
      try {
        const tex = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            v.texture,
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              resolve(t);
            },
            undefined,
            (err) => {
              console.warn(`Failed to load texture ${v.texture}, using fallback`);
              const fallbackCanvas = v.fallback();
              const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
              fallbackTex.colorSpace = THREE.SRGBColorSpace;
              resolve(fallbackTex);
            }
          );
        });
        
        game.current.textures.set(k, tex);
        const mat = new THREE.SpriteMaterial({ 
          map: tex, 
          transparent: true, 
          depthTest: true,
          alphaTest: 0.1
        });
        game.current.sprites.set(k, mat);
      } catch (error) {
        console.error(`Error processing texture ${k}:`, error);
        const fallbackCanvas = createFallbackCanvas('#ffffff');
        const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
        game.current.textures.set(k, fallbackTex);
        const mat = new THREE.SpriteMaterial({ 
          map: fallbackTex, 
          transparent: true, 
          depthTest: true 
        });
        game.current.sprites.set(k, mat);
      }
    }
  }

  function makePlayer() {
    const scene = game.current.scene!;
    
    if (game.current.player) {
      scene.remove(game.current.player);
      game.current.player = null;
    }
    
    const mat = game.current.sprites.get('chog');
    if (!mat) {
      console.error('Could not create player - no material found');
      showDialog('Could not create player - no material found.');
      return;
    }
    const s = new THREE.Sprite(mat.clone());
    const asset = ASSETS.chog;
    s.scale.set(asset.scaleX || 4, asset.scaleY || 4, 1);
    s.position.set(LANES[1], 2, 6);
    scene.add(s);
    game.current.player = s as any;
    game.current.currentLaneX = LANES[1];
    game.current.targetLane = 1;
    setLane(1);
  }

  function makeBackdropSprite() {
    const scene = game.current.scene!;
    const t = game.current.textures.get('monad');
    if (!t) {
      console.error('Monad texture not found');
      return;
    }

    const geometry = new THREE.PlaneGeometry(5.5, 5);
    const material = new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      fog: false,
    });
    const backdrop = new THREE.Mesh(geometry, material);
    const w = 5;
    const h = t.image && t.image.height ? (w * (t.image.height / t.image.width)) : w;
    backdrop.scale.set(w, h, 1);
    backdrop.position.set(0, 10, -100);
    backdrop.castShadow = false; 
    scene.add(backdrop);
  }

  // Game loop
  function loop(ts: number) {
    if (!game.current.running) return;
    const g = game.current;
    const { scene, camera, renderer, player } = g;
    if (!scene || !camera || !renderer || !player) return;

    if (g.lastSpawn === 0) g.lastSpawn = ts;
    if (ts - g.lastSpawn > SPAWN_EVERY_MS / (1 + (g.speed - BASE_SPEED) * 25)) {
      if (g.obstacles.length < MAX_OBSTACLES) spawnObstacle();
      g.lastSpawn = ts;
    }

    g.speed = Math.min(1.2, g.speed + SPEED_GROWTH);
    for (const o of g.obstacles) {
      o.position.z += g.speed * 5.5;
    }

    g.obstacles = g.obstacles.filter((o) => {
      if (o.position.z > Z_DESPAWN) {
        scene.remove(o);
        return false;
      }
      return true;
    });

    const targetX = LANES[g.targetLane];
    const lerpSpeed = 0.15;
    g.currentLaneX += (targetX - g.currentLaneX) * lerpSpeed;
    player.position.x = g.currentLaneX;

    for (let i = g.obstacles.length - 1; i >= 0; i--) {
      const o = g.obstacles[i];
      const zDistance = Math.abs(o.position.z - player.position.z);
      const playerLane = g.targetLane;
      const obstacleLane = o.userData.lane;
      const xDistance = Math.abs(player.position.x - o.position.x);
      
      const inSameLane = playerLane === obstacleLane;
      const closeHorizontally = xDistance < 2.0;
      const closeVertically = zDistance < HIT_Z_NEAR;
      
      if (inSameLane && closeHorizontally && closeVertically) {
        console.log(`Collision! Player lane: ${playerLane}, Obstacle lane: ${obstacleLane}, X dist: ${xDistance.toFixed(2)}, Z dist: ${zDistance.toFixed(2)}`);
        applyEffect(o.userData.effect);
        scene.remove(o);
        g.obstacles.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
    g.raf = requestAnimationFrame(loop);
  }

  function spawnObstacle() {
    const g = game.current;
    const scene = g.scene!;
    const key = pickType();
    const obstacleKey = (key === 'chog') ? 'star' : key;
    const mat = g.sprites.get(obstacleKey) || g.sprites.get('star')!;
    const s = new THREE.Sprite(mat.clone()) as THREE.Sprite & { userData: any };
    const laneIdx = (Math.random() * 3) | 0;
    const scale = (ASSETS as any)[obstacleKey]?.scale ?? 3;
    s.scale.set(scale, scale, 1);
    s.position.set(LANES[laneIdx], 1.6, Z_START);
    s.userData = { type: 'obstacle', lane: laneIdx, effect: (ASSETS as any)[obstacleKey]?.effect || {} };
    scene.add(s);
    g.obstacles.push(s);
  }

 function applyEffect(effect: { points?: number; lives?: number }) {
  if (effect.points) {
    setScore((prevScore: number) => prevScore + effect.points!); 
  }
  if (effect.lives) {
    setLives((prevLives: number) => {
      const newLives = Math.max(0, prevLives + effect.lives!); 
      if (newLives <= 0) {
        setTimeout(() => {
          setOver(true);
          stopLoop();
        }, 100); // Small delay
      }
      return newLives;
    });
  }
}

  function startLoop() {
    if (game.current.running) return;
    game.current.running = true;
    game.current.raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    game.current.running = false;
    if (game.current.raf) cancelAnimationFrame(game.current.raf);
  }

  function startGame() {
    setScore(0);
    setLives(3);
    setLane(1);
    setOver(false);
    setStarted(true);

    const g = game.current;
    g.speed = BASE_SPEED;
    g.lastSpawn = 0;
    g.targetLane = 1;
    g.currentLaneX = LANES[1];
    
    for (const o of g.obstacles) g.scene?.remove(o);
    g.obstacles = [];
    
    makePlayer();
    
    startLoop();
  }

  async function handleSubmitScore() {
    setSubmitting(true);

    if (!globalWalletAddress || globalWalletAddress.trim() === '') {
      showDialog('Please connect a wallet to submit your score.');
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitScore();
      setScore(0);
      setLives(3);
      setLane(1);
      
      const g = game.current;
      g.speed = BASE_SPEED;
      g.lastSpawn = 0;
      g.targetLane = 1;
      g.currentLaneX = LANES[1];
      
      for (const o of g.obstacles) g.scene?.remove(o);
      g.obstacles = [];
      
      makePlayer();
      
      if (result && 'success' in result && result.success) {
        showDialog(result.message + ' Game reset! You can play again or submit another score.');
      } else {
        showDialog('Score submission completed. Please check if it was successful.');
      }
      
    } catch (error: any) {
      showDialog(error.message || 'Failed to submit score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetGame() {
    if (!globalWalletAddress || globalWalletAddress.trim() === '') {
      showDialog('Please connect a wallet to play again.');
      return;
    }
    
    showDialog('');
    startGame();
  }

  function makeGradient() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, '#4B0082');
    g.addColorStop(1, '#D8BFD8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  return (
<div className="bg-gradient-to-br from-purple-200 via-blue-100 to-purple-300 text-gray-800 font-mono">
<div className="flex" style={{ height: 'calc(100vh - 8rem)' }}>
        {/* Sidebar - Leaderboard */}
        <Leaderboard leaderboard={leaderboard} globalWalletAddress={globalWalletAddress}/>

        {/* Main */}
        <div className="flex-1 flex flex-col">
<div className="flex-1 relative bg-black" style={{ height: 'calc(100vh - 8rem)' }}>
            <canvas ref={canvasRef} className="w-full h-full" />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-white text-xl font-bold" style={{ fontFamily: 'var(--font-jersey-15)' }}>Loading...</div>
              </div>
            )}

            {!started && !over && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="bg-gradient-to-br from-white/80 to-purple-200/80 p-6 rounded-xl border-2 border-purple-400 shadow-[0_0_20px_rgba(251,207,232,0.4)] max-w-sm text-center">
                  <h1 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700" style={{ fontFamily: 'var(--font-jersey-15)' }}>
                    CHOG RUNNER
                  </h1>
                 <div className="space-y-2 text-sm mb-4 text-black">
                    <div className="flex items-center gap-2 justify-center">
                      <img src="/star.png" alt="Star" className="w-6 h-6" />
                      <span>Star = +1 point</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <img src="/chest.png" alt="Chest" className="w-6 h-6" />
                      <span>Chest = +2 points</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <img src="/spiky.png" alt="Spiky" className="w-6 h-6" />
                      <span>Spiky = -1 life</span>
                    </div>
                  </div>
                  <div className="text-md mb-4 space-y-2 text-black">
                    <p><strong>Controls:</strong></p>
                    <p>← → or A D: Change lanes</p>
                    <p><strong>Note:</strong></p>
                    <p>Maintain 0.03 MON balance in signer wallet to submit scores (Fee = 0.02 MON).</p>
                  </div>
                  <button
                    onClick={startGame}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold px-4 py-2 rounded-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-400/50 disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-jersey-15)' }}
                  >
                    START
                  </button>
                </div>
              </div>
            )}

            {over && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="bg-gradient-to-br from-white/90 to-purple-200/90 p-6 rounded-xl border-2 border-purple-800 shadow-[0_0_20px_rgba(191,219,254,0.4)] max-w-sm text-center">
                  <h2 className="text-2xl font-bold mb-3 text-purple-700" style={{ fontFamily: 'var(--font-jersey-15)' }}>GAME OVER</h2>
                  <p className="text-lg mb-3 text-gray-700" style={{ fontFamily: 'var(--font-jersey-15)' }}>
                    Final Score: <span className="text-purple-700">{score}</span>
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={resetGame}
                      className="block w-full bg-gradient-to-r from-pink-400 to-pink-400 text-gray-800 font-bold px-4 py-2 rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
                      style={{ fontFamily: 'var(--font-jersey-15)' }}
                    >
                      TRY AGAIN
                    </button>
                    <button
                      onClick={handleSubmitScore}
                      disabled={submitting}
                      className="block w-full bg-gradient-to-r from-purple-400 to-purple-400 text-gray-800 font-bold px-4 py-2 rounded-full hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-jersey-15)' }}
                    >
                      {submitting ? 'Submitting...' : 'SUBMIT SCORE'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {started && !over && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <button
                  onMouseDown={() => move(-1)}
                  onTouchStart={() => move(-1)}
                  className="bg-transparent p-0 focus:outline-none shadow-[0_4px_6px_rgba(0,0,0,0)] hover:shadow-[0_6px_8px_rgba(0,0,0,0)] active:scale-95 transition-all"
                  style={{ 
                    backgroundImage: 'url(/left.png)', 
                    backgroundSize: 'contain', 
                    backgroundRepeat: 'no-repeat', 
                    width: '60px', 
                    height: '60px' 
                  }}
                >
                  <span className="sr-only">Left</span>
                </button>
                <button
                  onMouseDown={() => move(1)}
                  onTouchStart={() => move(1)}
                  className="bg-transparent p-0 focus:outline-none shadow-[0_4px_6px_rgba(0,0,0,0)] hover:shadow-[0_6px_8px_rgba(0,0,0,0)] active:scale-95 transition-all"
                  style={{ 
                    backgroundImage: 'url(/right.png)', 
                    backgroundSize: 'contain', 
                    backgroundRepeat: 'no-repeat', 
                    width: '60px', 
                    height: '60px' 
                  }}
                >
                  <span className="sr-only">Right</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChogRunner;