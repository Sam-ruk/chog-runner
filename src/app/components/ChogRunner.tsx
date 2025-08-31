"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// Mock leaderboard data
const mockLeaderboard = [
  { wallet: "0x1234...abcd", score: 15420, rank: 1 },
  { wallet: "0x5678...efgh", score: 12340, rank: 2 },
  { wallet: "0x9abc...ijkl", score: 9876, rank: 3 },
  { wallet: "0xdef0...mnop", score: 8765, rank: 4 },
  { wallet: "0x2468...qrst", score: 7654, rank: 5 },
  { wallet: "0x1357...uvwx", score: 6543, rank: 6 },
  { wallet: "0x9753...yzab", score: 5432, rank: 7 },
  { wallet: "0x1111...wxyz", score: 4321, rank: 8 },
  { wallet: "0x2222...pqrs", score: 3210, rank: 9 },
  { wallet: "0x3333...tuvw", score: 2100, rank: 10 },
];

const ChogRunner = () => {
  const canvasRef = useRef(null);
  const gameRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    characterGroup: null,
    obstacles: [],
    animationId: null,
    lastSpawn: 0,
    isInitialized: false,
    isLoaded: false,
    keys: {}
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('intro');
  const [currentLane, setCurrentLane] = useState(1);
  const [speed, setSpeed] = useState(0.1);

  const speedRef = useRef(0.01);
  const laneRef = useRef(1);
  const LANE_WIDTH = 8;
  const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

  // Create fallback textures
  const createFallbackTexture = (color) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  };

  const createGradientCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#4B0082');
    gradient.addColorStop(1, '#D8BFD8');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const initGame = useCallback(() => {
    if (!canvasRef.current || gameRef.current.isInitialized) {
      return;
    }

    const game = gameRef.current;
    try {
      game.isInitialized = true;
      console.log("Initializing game...");

      // Scene setup
      game.scene = new THREE.Scene();
      game.scene.fog = new THREE.Fog(0xc8a2c8, 20, 120);

      // Camera setup
      game.camera = new THREE.PerspectiveCamera(
        75,
        canvasRef.current.clientWidth / canvasRef.current.clientHeight,
        0.1,
        1000
      );
      game.camera.position.set(0, 12, 15);
      game.camera.lookAt(0, 3, 0);

      // Renderer setup
      game.renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current, 
        antialias: true 
      });
      game.renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      game.renderer.shadowMap.enabled = true;
      game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Background
      const gradientTexture = new THREE.CanvasTexture(createGradientCanvas());
      game.scene.background = gradientTexture;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xc8a2c8, 0.6);
      game.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xc8a2c8, 0.9);
      directionalLight.position.set(0, 30, 10);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      game.scene.add(directionalLight);

      createTrack();
      loadCharacter(() => {
        console.log("Character loaded, starting game loop");
        game.isLoaded = true;
      });

      console.log("Game initialized successfully");
    } catch (error) {
      console.error("Error initializing game:", error);
      game.isInitialized = false;
    }
  }, []);

  const createTrack = () => {
    const game = gameRef.current;
    
    // Walls
    const wallGeometry = new THREE.BoxGeometry(2, 8, 200);
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0xc8a2c8,
      emissive: 0xc8a2c8,
      emissiveIntensity: 0.3,
    });
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-14, 4, 0);
    leftWall.castShadow = true;
    game.scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(14, 4, 0);
    rightWall.castShadow = true;
    game.scene.add(rightWall);
    
    // Road
    const roadGeometry = new THREE.PlaneGeometry(24, 200);
    const roadMaterial = new THREE.MeshLambertMaterial({
      color: 0x2a2a2a,
      transparent: true,
      opacity: 0.9
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, 0);
    road.receiveShadow = true;
    game.scene.add(road);
    
    // Lane dividers
    for (let i = 0; i < 2; i++) {
      const dividerGeometry = new THREE.BoxGeometry(0.2, 0.05, 200);
      const dividerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
      divider.position.set(LANE_POSITIONS[i] + LANE_WIDTH/2, 0.02, 0);
      game.scene.add(divider);
    }

    // Background monad logo (fallback if texture fails)
    const monadGeometry = new THREE.SphereGeometry(5, 16, 16);
    const monadMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      emissive: 0xc8a2c8,
      emissiveIntensity: 0.2
    });
    const monad = new THREE.Mesh(monadGeometry, monadMaterial);
    monad.position.set(0, 8, -60);
    game.scene.add(monad);
  };

  const loadCharacter = (onLoad) => {
    const game = gameRef.current;
    game.characterGroup = new THREE.Group();
    
    // Create character using geometry (fallback approach)
    const chogGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const chogMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xc8a2c8,
      emissiveIntensity: 0.4,
      shininess: 50
    });
    const chogSprite = new THREE.Mesh(chogGeometry, chogMaterial);
    chogSprite.position.set(0, 1.5, 0);
    chogSprite.castShadow = true;
    game.characterGroup.add(chogSprite);

    // Aura effect
    const auraGeometry = new THREE.SphereGeometry(2.2, 16, 8);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xc8a2c8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.position.set(0, 1.5, 0);
    game.characterGroup.add(aura);

    game.characterGroup.position.set(LANE_POSITIONS[laneRef.current], 0, 5);
    game.scene.add(game.characterGroup);
    
    console.log("Character created with fallback geometry");
    onLoad();
  };

  const spawnObstacle = () => {
    const game = gameRef.current;
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random();
    
    let color, effect;
    
    if (type < 0.6) { // Red = +1 point
      color = 0xff0000;
      effect = { points: 1 };
    } else if (type < 0.8) { // Blue = +100 points
      color = 0x0000ff;
      effect = { points: 100 };
    } else { // Green = -1 life
      color = 0x00ff00;
      effect = { lives: -1 };
    }

    const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
    const obstacleMaterial = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3
    });
    
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(LANE_POSITIONS[lane], 1, -60);
    obstacle.castShadow = true;
    obstacle.userData = { type: 'obstacle', lane, effect };
    
    game.obstacles.push(obstacle);
    game.scene.add(obstacle);
  };

  const checkCollisions = () => {
    const game = gameRef.current;
    if (!game.characterGroup || game.obstacles.length === 0) return;

    const playerBox = new THREE.Box3().setFromObject(game.characterGroup);

    for (let i = game.obstacles.length - 1; i >= 0; i--) {
      const obstacle = game.obstacles[i];
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);

      if (playerBox.intersectsBox(obstacleBox)) {
        const effect = obstacle.userData.effect;

        if (effect.points !== undefined) {
          setScore(prev => prev + effect.points);
        }
        if (effect.lives !== undefined) {
          setLives(prev => {
            const newLives = prev + effect.lives;
            if (newLives <= 0) {
              setGameState('gameOver');
              return 0;
            }
            return newLives;
          });
        }

        // Remove obstacle
        game.scene.remove(obstacle);
        obstacle.geometry.dispose();
        obstacle.material.dispose();
        game.obstacles.splice(i, 1);
      }
    }
  };

  const gameLoop = useCallback((timestamp) => {
    const game = gameRef.current;
    
    if (!game.scene || !game.camera || !game.renderer) {
      console.warn("Missing game components");
      return;
    }

    // Always render
    game.renderer.render(game.scene, game.camera);
    
    // Game logic only when playing
    if (gameState === 'playing' && game.isLoaded && game.characterGroup) {
      // Spawn obstacles
      if (!game.lastSpawn) game.lastSpawn = timestamp;
      
      if (timestamp - game.lastSpawn > 1000) { // Spawn every 1 second
        spawnObstacle();
        game.lastSpawn = timestamp;
      }

      // Update speed
      speedRef.current = Math.min(speedRef.current + 0.0001, 0.2);
      setSpeed(speedRef.current);

      // Move obstacles
      game.obstacles.forEach(obj => {
        obj.position.z += speedRef.current * 10;
        obj.rotation.y += 0.05;
      });

      // Remove obstacles that are too far
      game.obstacles = game.obstacles.filter(obj => {
        if (obj.position.z > 20) {
          game.scene.remove(obj);
          obj.geometry.dispose();
          obj.material.dispose();
          return false;
        }
        return true;
      });

      // Update character position
      const targetX = LANE_POSITIONS[laneRef.current];
      const currentX = game.characterGroup.position.x;
      game.characterGroup.position.x = THREE.MathUtils.lerp(currentX, targetX, 0.15);

      // Character animation
      game.characterGroup.rotation.y += 0.02;

      // Check collisions
      checkCollisions();
    }
    
    // Continue loop
    game.animationId = requestAnimationFrame(gameLoop);
  }, [gameState]);

  const handleInput = useCallback((direction) => {
    if (gameState !== 'playing') return;
    
    if (direction === 'left') {
      const newLane = Math.max(0, currentLane - 1);
      setCurrentLane(newLane);
      laneRef.current = newLane;
    } else if (direction === 'right') {
      const newLane = Math.min(2, currentLane + 1);
      setCurrentLane(newLane);
      laneRef.current = newLane;
    }
  }, [gameState, currentLane]);

  const handleKeyDown = useCallback((e) => {
    switch(e.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        e.preventDefault();
        handleInput('left');
        break;
      case 'arrowright':
      case 'd':
        e.preventDefault();
        handleInput('right');
        break;
    }
  }, [handleInput]);

  // Initialize game
  useEffect(() => {
    if (canvasRef.current && !gameRef.current.isInitialized) {
      initGame();
    }
  }, [initGame]);

  // Start game loop
  useEffect(() => {
    if (gameRef.current.isInitialized && !gameRef.current.animationId) {
      gameRef.current.animationId = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop, gameState]);

  // Keyboard controls
  useEffect(() => {
    if (gameState === 'playing') {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameState, handleKeyDown]);

  // Cleanup
  useEffect(() => {
    return () => {
      const game = gameRef.current;
      if (game.animationId) {
        cancelAnimationFrame(game.animationId);
      }
      
      if (game.scene) {
        game.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      if (game.renderer) {
        game.renderer.dispose();
      }
    };
  }, []);

  const getMedalEmoji = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  const startGame = () => {
    const game = gameRef.current;
    
    // Reset game state
    setScore(0);
    setLives(3);
    setSpeed(0.01);
    setCurrentLane(1);
    speedRef.current = 0.01;
    laneRef.current = 1;
    game.lastSpawn = 0;
    
    // Clear obstacles
    game.obstacles.forEach(obj => {
      if (game.scene) game.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    game.obstacles = [];
    
    // Reset character position
    if (game.characterGroup) {
      game.characterGroup.position.x = LANE_POSITIONS[1];
    }
    
    setGameState('playing');
  };

  const resetGame = () => {
    startGame();
  };

  const goToMainMenu = () => {
    const game = gameRef.current;
    
    // Clear obstacles
    game.obstacles.forEach(obj => {
      if (game.scene) game.scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });
    game.obstacles = [];
    
    // Reset state
    setScore(0);
    setLives(3);
    setCurrentLane(1);
    setSpeed(0.01);
    speedRef.current = 0.01;
    laneRef.current = 1;
    setGameState('intro');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-pink-100 to-purple-300 text-gray-800 overflow-hidden">
      <div className="flex h-screen flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-80 bg-gradient-to-b from-purple-200/70 to-pink-100/70 backdrop-blur-sm border-r border-purple-300/50 p-4 flex flex-col">
          <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">
            CHOG RUNNER
          </h1>
          <div className="flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold mb-2 text-center text-purple-700">LEADERBOARD</h2>
            <div className="space-y-2">
              {mockLeaderboard.map((player, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    player.rank <= 3 
                      ? 'bg-gradient-to-r from-yellow-300/60 to-orange-300/60 border border-yellow-400/50' 
                      : 'bg-purple-100/60 border border-purple-300/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getMedalEmoji(player.rank)}</span>
                    <div>
                      <div className="text-xs text-gray-600">{player.wallet}</div>
                      <div className="text-sm font-bold text-purple-800">{player.score.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-700">#{player.rank}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Intro Dialog */}
          {gameState === 'intro' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="bg-gradient-to-br from-white/95 to-purple-200/95 p-6 rounded-xl border-2 border-purple-400 shadow-2xl max-w-md text-center">
                <h2 className="text-3xl font-bold mb-4 text-purple-700">CHOG RUNNER</h2>
                <div className="space-y-3 text-sm mb-6 text-gray-700">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Red = +1 point</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Blue = +100 points (rare!)</span>
                  </div>
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Green = -1 life</span>
                  </div>
                </div>
                <div className="text-sm mb-6 text-gray-600 bg-gray-100/50 p-3 rounded-lg">
                  <p className="font-bold mb-1">Controls:</p>
                  <p>← → Arrow Keys or A/D: Change lanes</p>
                  <p>Touch buttons on mobile</p>
                </div>
                <button
                  onClick={startGame}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 py-3 rounded-full hover:scale-105 transition-all duration-300 shadow-lg text-lg"
                >
                  START GAME
                </button>
              </div>
            </div>
          )}

          {/* Game Over Dialog */}
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-gradient-to-br from-white/95 to-purple-200/95 p-6 rounded-xl border-2 border-red-400 shadow-2xl max-w-sm text-center">
                <h2 className="text-3xl font-bold mb-3 text-red-600">GAME OVER</h2>
                <p className="text-xl mb-6 text-gray-700">
                  Final Score: <span className="text-purple-700 font-bold">{score.toLocaleString()}</span>
                </p>
                <div className="space-y-3">
                  <button
                    onClick={resetGame}
                    className="block w-full bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    PLAY AGAIN
                  </button>
                  <button
                    onClick={goToMainMenu}
                    className="block w-full bg-gradient-to-r from-gray-400 to-gray-600 text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    MAIN MENU
                  </button>
                  <button
                    className="block w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 font-bold px-6 py-3 rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    SUBMIT SCORE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game HUD */}
          {(gameState === 'playing' || gameState === 'gameOver') && (
            <div className="bg-gradient-to-r from-purple-200/70 to-pink-100/70 backdrop-blur-sm border-b border-purple-300/50 p-3 flex justify-between items-center">
              <div className="flex items-center gap-6 text-lg text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-bold">{score.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: lives }).map((_, i) => (
                    <span key={i} className="text-red-500">❤️</span>
                  ))}
                </div>
                <div className="text-sm">
                  Speed: {(speed * 50).toFixed(1)}x
                </div>
                <div className="text-sm">
                  Lane: {currentLane + 1}
                </div>
              </div>
              <button 
                onClick={goToMainMenu}
                className="bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold px-4 py-2 rounded-full hover:scale-105 transition-all duration-300 shadow-lg"
              >
                MENU
              </button>
            </div>
          )}

          {/* Game Canvas */}
          <div className="flex-1 relative bg-black">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full"
              style={{ display: 'block' }}
            />
            
            {/* Mobile Controls */}
            {gameState === 'playing' && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleInput('left');
                  }}
                  onClick={() => handleInput('left')}
                  className="w-16 h-16 bg-purple-500/80 text-white text-2xl rounded-full active:scale-90 transition-all duration-200 shadow-lg border-2 border-white/50"
                >
                  ←
                </button>
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleInput('right');
                  }}
                  onClick={() => handleInput('right')}
                  className="w-16 h-16 bg-purple-500/80 text-white text-2xl rounded-full active:scale-90 transition-all duration-200 shadow-lg border-2 border-white/50"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* Debug info (remove in production) */}
          {gameState === 'playing' && (
            <div className="absolute top-20 left-4 text-white bg-black/50 p-2 rounded text-xs">
              <div>Obstacles: {gameRef.current.obstacles?.length || 0}</div>
              <div>Loaded: {gameRef.current.isLoaded ? 'Yes' : 'No'}</div>
              <div>Initialized: {gameRef.current.isInitialized ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChogRunner;