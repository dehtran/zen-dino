// =========================================================================
// Zen Dino — Game Engine & Synthesizer
// =========================================================================
// Welcome to the game code! This file contains all the rules for how the game 
// runs, how objects move (physics), and how things are drawn to the screen.

// We create a "class" called ZenDinoGame. Think of a class as a blueprint for 
// a machine. When the website loads, we build one of these machines and turn it on.
class ZenDinoGame {
    
    // The "constructor" is the setup phase. When our game machine is built, 
    // this code runs first to gather all the parts and set starting values.
    constructor() {
        // --- 1. GRABBING HTML ELEMENTS ---
        // We need to link our JavaScript code to the actual visual elements on the webpage.
        
        // Grab the blank drawing board we made in HTML.
        this.canvas = document.getElementById('game-canvas');
        
        // The 'context' (ctx) is the actual tool we use to draw 2D shapes on the canvas.
        // Think of `canvas` as the paper, and `ctx` as our paintbrush.
        this.ctx = this.canvas.getContext('2d');
        
        // Grab the text displays (Heads Up Display) so we can update the score later.
        this.currentScoreEl = document.getElementById('current-score');
        this.highScoreEl = document.getElementById('high-score');
        
        // Grab the menu screens (Overlays) so we can hide or show them.
        this.startOverlay = document.getElementById('start-overlay');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.statsOverlay = document.getElementById('stats-overlay');
        
        // Controls
        this.startBtn = document.getElementById('start-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.statsToggle = document.getElementById('stats-toggle');
        this.closeStatsBtn = document.getElementById('close-stats-btn');
        this.resetStatsBtn = document.getElementById('reset-stats-btn');
        this.audioToggle = document.getElementById('audio-toggle');
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Mobile Controls
        this.mobileControls = document.querySelector('.mobile-controls');
        this.jumpBtn = document.getElementById('jump-btn');
        this.duckBtn = document.getElementById('duck-btn');

        // Audio Icons
        this.audioOnIcon = document.getElementById('audio-on-icon');
        this.audioOffIcon = document.getElementById('audio-off-icon');

        // Theme Icons
        this.sunIcon = document.getElementById('sun-icon');
        this.moonIcon = document.getElementById('moon-icon');

        // Stats Display Elements
        this.statTotalRuns = document.getElementById('stat-total-runs');
        this.statTotalJumps = document.getElementById('stat-total-jumps');
        this.statMaxScore = document.getElementById('stat-max-score');
        this.statTotalDistance = document.getElementById('stat-total-distance');

        // iOS Tooltip
        this.iosInstallTooltip = document.getElementById('ios-install-tooltip');
        this.closeIosTooltipBtn = document.getElementById('close-ios-tooltip');

        // Game Settings & State
        this.gameState = 'START'; // START, PLAYING, GAMEOVER
        this.score = 0;
        this.highScore = 0;
        
        // --- 2. GAME PHYSICS & RULES ---
        // These constants define the rules of our game world. They never change during play.
        this.BASE_GRAVITY = 1600; // How fast you fall down (pixels per second squared)
        this.JUMP_FORCE = -550;   // Negative because moving UP on a screen means decreasing the Y coordinate
        this.DUCK_GRAVITY = 3200; // Make you fall super fast if you press down while in the air
        
        this.START_SPEED = 300;   // How fast the ground moves at the start
        this.MAX_SPEED = 700;     // The absolute maximum speed so the game isn't impossible
        this.SPEED_ACCEL = 4;     // How much faster the game gets every second
        
        this.GROUND_Y = 240;      // The invisible floor line where the dino runs
        
        // --- 3. CURRENT STATE ---
        // These variables will change constantly as the game is played.
        this.speed = this.START_SPEED;
        this.gravity = this.BASE_GRAVITY;
        this.isAudioMuted = false;
        this.theme = 'dark';
        
        // --- 4. THE DINOSAUR (PLAYER) ---
        // We create an object that holds all the information about our player at any given moment.
        this.dino = {
            x: 80,           // Starting position from the left side of the screen
            y: 0,            // Starting vertical position (will be calculated below)
            width: 32,       // Width of the hit-box (to check collisions)
            height: 48,      // Height of the hit-box
            vy: 0,           // "Velocity Y" - Current vertical speed. 0 means not moving up or down.
            isJumping: false,// True if the dino is currently in the air
            isDucking: false,// True if the player is holding the duck key
            jumpCount: 0,    // Tracks total jumps for stats
            runTimer: 0,
            feetState: 0,
            history: [] // For speed trail ghost afterimages
        };
        // Set the starting Y position so the dino rests exactly on top of our invisible floor.
        this.dino.y = this.GROUND_Y - this.dino.height;

        // Entities arrays
        this.obstacles = [];
        this.particles = [];
        this.clouds = [];
        this.groundDetails = [];
        
        // Spawning intervals
        this.obstacleSpawnTimer = 0;
        this.obstacleMinInterval = 1.2; // in seconds
        
        // Audio Synthesizer Context
        this.audioCtx = null;

        // Timers & Delta Time
        this.lastTime = 0;

        // Initialize Settings
        this.initTheme();
        this.initAudio();
        this.initStats();
        this.resizeCanvas();
        this.initEventListeners();
        this.checkIosInstallPrompt();
        
        // Draw initial static frame
        this.drawStaticFrame();
    }

    // High-DPI Resolution Setup
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // We set internal resolutions to match screen density
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale the canvas context
        this.ctx.scale(dpr, dpr);
        
        // Store logical dimensions
        this.logicalWidth = rect.width;
        this.logicalHeight = rect.height;
    }

    initTheme() {
        const storedTheme = localStorage.getItem('zen-dino-theme');
        if (storedTheme) {
            this.theme = storedTheme;
        } else {
            this.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcons();
    }

    updateThemeIcons() {
        if (this.theme === 'dark') {
            this.sunIcon.classList.remove('hidden');
            this.moonIcon.classList.add('hidden');
        } else {
            this.sunIcon.classList.add('hidden');
            this.moonIcon.classList.remove('hidden');
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('zen-dino-theme', this.theme);
        this.updateThemeIcons();
        this.drawStaticFrame();
    }

    initAudio() {
        const storedMute = localStorage.getItem('zen-dino-mute');
        this.isAudioMuted = storedMute === 'true';
        this.updateAudioIcons();
    }

    updateAudioIcons() {
        if (this.isAudioMuted) {
            this.audioOnIcon.classList.add('hidden');
            this.audioOffIcon.classList.remove('hidden');
        } else {
            this.audioOnIcon.classList.remove('hidden');
            this.audioOffIcon.classList.add('hidden');
        }
    }

    toggleAudio() {
        this.isAudioMuted = !this.isAudioMuted;
        localStorage.setItem('zen-dino-mute', this.isAudioMuted);
        this.updateAudioIcons();
        
        // Initialize context on first click if not already done
        this.initAudioContext();
    }

    initAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // Web Audio Synthesizer Sound Effects
    playSound(type) {
        if (this.isAudioMuted) return;
        this.initAudioContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;

        if (type === 'jump') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            // Minimalist square-triangle hybrid sound
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
            
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'crash') {
            // Low synth rumbling crash sound
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.35);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
            
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'score') {
            // Synthesized pure 8-bit pentatonic chime
            const osc1 = this.audioCtx.createOscillator();
            const osc2 = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.setValueAtTime(880.00, now + 0.08); // A5
            
            osc2.frequency.setValueAtTime(783.99, now); // G5
            osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.25);
            osc2.stop(now + 0.25);
        }
    }

    // Stats Management
    initStats() {
        const stats = this.getStats();
        this.highScore = stats.maxScore;
        this.highScoreEl.innerText = String(this.highScore).padStart(5, '0');
    }

    getStats() {
        return {
            totalRuns: parseInt(localStorage.getItem('zd-total-runs') || '0'),
            totalJumps: parseInt(localStorage.getItem('zd-total-jumps') || '0'),
            maxScore: parseInt(localStorage.getItem('zd-max-score') || '0'),
            totalDistance: parseInt(localStorage.getItem('zd-total-distance') || '0')
        };
    }

    saveStats(runScore, runJumps) {
        const stats = this.getStats();
        
        const newTotalRuns = stats.totalRuns + 1;
        const newTotalJumps = stats.totalJumps + runJumps;
        const newMaxScore = Math.max(stats.maxScore, runScore);
        const newTotalDistance = stats.totalDistance + runScore;

        localStorage.setItem('zd-total-runs', newTotalRuns);
        localStorage.setItem('zd-total-jumps', newTotalJumps);
        localStorage.setItem('zd-max-score', newMaxScore);
        localStorage.setItem('zd-total-distance', newTotalDistance);

        this.highScore = newMaxScore;
        this.highScoreEl.innerText = String(this.highScore).padStart(5, '0');
    }

    populateStatsModal() {
        const stats = this.getStats();
        this.statTotalRuns.innerText = stats.totalRuns.toLocaleString();
        this.statTotalJumps.innerText = stats.totalJumps.toLocaleString();
        this.statMaxScore.innerText = stats.maxScore.toLocaleString();
        this.statTotalDistance.innerText = stats.totalDistance.toLocaleString() + 'm';
    }

    resetAllStats() {
        if (confirm('Are you sure you want to delete all lifetime statistics? This cannot be undone.')) {
            localStorage.setItem('zd-total-runs', '0');
            localStorage.setItem('zd-total-jumps', '0');
            localStorage.setItem('zd-max-score', '0');
            localStorage.setItem('zd-total-distance', '0');
            this.initStats();
            this.populateStatsModal();
        }
    }

    // Listeners for input controls
    initEventListeners() {
        // Theme and Audio button controls
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.audioToggle.addEventListener('click', () => this.toggleAudio());
        
        // Stats overlay toggles
        this.statsToggle.addEventListener('click', () => {
            if (this.gameState === 'PLAYING') return;
            this.populateStatsModal();
            this.statsOverlay.classList.add('active');
        });
        this.closeStatsBtn.addEventListener('click', () => {
            this.statsOverlay.classList.remove('active');
        });
        this.resetStatsBtn.addEventListener('click', () => this.resetAllStats());

        // iOS Tooltip close
        if (this.closeIosTooltipBtn) {
            this.closeIosTooltipBtn.addEventListener('click', () => {
                this.iosInstallTooltip.classList.add('hidden');
                localStorage.setItem('zd-ios-tooltip-dismissed', 'true');
            });
        }

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Prevent continuous fire keydown repeating

            if (this.gameState === 'PLAYING') {
                if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
                    e.preventDefault();
                    this.dinoJump();
                }
                if (e.code === 'ArrowDown') {
                    e.preventDefault();
                    this.dinoDuck(true);
                }
            } else if (this.gameState === 'START' && (e.code === 'Space' || e.code === 'ArrowUp')) {
                e.preventDefault();
                this.startGame();
            } else if (this.gameState === 'GAMEOVER' && (e.code === 'Space' || e.code === 'ArrowUp')) {
                e.preventDefault();
                this.startGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.gameState === 'PLAYING') {
                if (e.code === 'ArrowDown') {
                    e.preventDefault();
                    this.dinoDuck(false);
                }
            }
        });

        // Click/Touch starts
        this.startBtn.addEventListener('click', () => this.startGame());
        this.retryBtn.addEventListener('click', () => this.startGame());

        // Mobile Button controls
        this.jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.dinoJump();
        });
        this.jumpBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dinoJump();
        });

        this.duckBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.dinoDuck(true);
        });
        this.duckBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.dinoDuck(false);
        });
        this.duckBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.dinoDuck(true);
        });
        this.duckBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.dinoDuck(false);
        });

        // Full Screen Canvas Touch/Click Controls
        const handleCanvasTap = (yPos) => {
            if (this.gameState === 'START' || this.gameState === 'GAMEOVER') {
                this.startGame();
            } else if (this.gameState === 'PLAYING') {
                // If tapped upper half of the screen, jump. If lower half, duck.
                if (yPos < window.innerHeight / 2) {
                    this.dinoJump();
                } else {
                    this.dinoDuck(true);
                }
            }
        };

        const handleCanvasRelease = () => {
            if (this.gameState === 'PLAYING') {
                this.dinoDuck(false);
            }
        };

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                // Only prevent default if we're playing to avoid breaking scrolling elsewhere
                if (this.gameState === 'PLAYING') e.preventDefault(); 
                handleCanvasTap(e.touches[0].clientY);
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.gameState === 'PLAYING') e.preventDefault();
            handleCanvasRelease();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === 'PLAYING') e.preventDefault();
            handleCanvasTap(e.clientY);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.gameState === 'PLAYING') e.preventDefault();
            handleCanvasRelease();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawStaticFrame();
        });
    }

    // Dino Actions
    dinoJump() {
        if (!this.dino.isJumping && !this.dino.isDucking) {
            this.dino.vy = this.JUMP_FORCE;
            this.dino.isJumping = true;
            this.dino.jumpCount++;
            this.playSound('jump');
            this.emitJumpParticles();
        }
    }

    dinoDuck(state) {
        if (state) {
            this.dino.isDucking = true;
            // Lower bounding box height
            this.dino.height = 24;
            // Offset y coordinate so dino stays flat on ground if ducking while on ground
            if (!this.dino.isJumping) {
                this.dino.y = this.GROUND_Y - this.dino.height;
            } else {
                // If ducking in-air, accelerate downwards
                this.gravity = this.DUCK_GRAVITY;
            }
        } else {
            this.dino.isDucking = false;
            this.dino.height = 48;
            this.gravity = this.BASE_GRAVITY;
            // Put it back to ground levels if resting
            if (!this.dino.isJumping) {
                this.dino.y = this.GROUND_Y - this.dino.height;
            }
        }
    }

    // Game State Controls
    startGame() {
        this.initAudioContext();
        this.requestFullscreen();
        
        // Hide overlays
        this.startOverlay.classList.remove('active');
        this.gameOverOverlay.classList.remove('active');
        this.statsOverlay.classList.remove('active');
        
        // Reset game stats variables
        this.gameState = 'PLAYING';
        this.score = 0;
        this.speed = this.START_SPEED;
        this.gravity = this.BASE_GRAVITY;
        this.obstacleSpawnTimer = 0;
        
        // Reset Dino
        this.dino.y = this.GROUND_Y - 48;
        this.dino.vy = 0;
        this.dino.isJumping = false;
        this.dino.isDucking = false;
        this.dino.height = 48;
        this.dino.jumpCount = 0;
        
        // Reset entities
        this.obstacles = [];
        this.particles = [];
        this.clouds = [
            { x: 200, y: 60, scale: 0.8, speed: 10 },
            { x: 550, y: 100, scale: 1.2, speed: 15 },
            { x: 800, y: 40, scale: 0.6, speed: 8 }
        ];
        this.groundDetails = [
            { x: 50, w: 30 },
            { x: 250, w: 60 },
            { x: 450, w: 20 },
            { x: 650, w: 80 }
        ];

        // Trigger loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    endGame() {
        this.gameState = 'GAMEOVER';
        this.playSound('crash');
        this.emitCrashParticles();
        
        // Display score & save stats
        document.getElementById('final-score').innerText = String(Math.floor(this.score)).padStart(5, '0');
        const isNewBest = Math.floor(this.score) > this.highScore;
        const newBestIndicator = document.getElementById('new-high-score-indicator');
        
        if (isNewBest) {
            newBestIndicator.classList.remove('hidden');
        } else {
            newBestIndicator.classList.add('hidden');
        }
        
        this.saveStats(Math.floor(this.score), this.dino.jumpCount);
        
        // Show overlay
        this.gameOverOverlay.classList.add('active');
    }

    // Fullscreen and Platform Handlers
    requestFullscreen() {
        const docEl = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            try {
                if (docEl.requestFullscreen) {
                    docEl.requestFullscreen();
                } else if (docEl.webkitRequestFullscreen) { /* Safari */
                    docEl.webkitRequestFullscreen();
                }
            } catch (err) {
                console.log("Fullscreen request denied or not supported.", err);
            }
        }
    }

    checkIosInstallPrompt() {
        const isIos = () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        };
        const isStandalone = () => {
            return ('standalone' in window.navigator) && (window.navigator.standalone);
        };

        // If it's an iOS device, but not running in standalone PWA mode, and user hasn't dismissed it
        if (isIos() && !isStandalone()) {
            const dismissed = localStorage.getItem('zd-ios-tooltip-dismissed');
            if (!dismissed && this.iosInstallTooltip) {
                this.iosInstallTooltip.classList.remove('hidden');
            }
        }
    }

    // =========================================================================
    // CORE GAME LOOP (THE HEARTBEAT OF THE GAME)
    // =========================================================================
    // This function runs constantly, over and over again (usually 60 times a second).
    // It's like flipping through a flipbook to create animation. 
    // In every frame (or page of the flipbook), it calculates what changed (update) 
    // and then draws the new picture to the screen (draw).
    gameLoop(timestamp) {
        // If the game is paused or over, stop the flipbook.
        if (this.gameState !== 'PLAYING') return;

        // Calculate "Delta Time" (dt). This is the exact amount of time 
        // that passed since the last frame. We use time, not frames, to move things 
        // so that the game runs at the same speed on fast and slow computers.
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // If the player switches to another tab, time might freeze, creating a massive gap.
        // We "cap" the time skip so the dinosaur doesn't teleport across the screen when they return.
        const cappedDt = Math.min(dt, 0.1);

        // 1. UPDATE: Move the dinosaur, move obstacles, check if we hit anything.
        this.update(cappedDt);
        
        // 2. DRAW: Clear the canvas and paint the new frame with the updated positions.
        this.draw();

        // 3. REPEAT: Tell the browser to run this function again for the very next frame.
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    // Logic Update System
    update(dt) {
        // Increment Score based on speed/distance covered
        const lastScoreFloor = Math.floor(this.score / 100);
        this.score += this.speed * 0.05 * dt;
        this.currentScoreEl.innerText = String(Math.floor(this.score)).padStart(5, '0');

        // Play chime sound every 100 points
        if (Math.floor(this.score / 100) > lastScoreFloor) {
            this.playSound('score');
            this.currentScoreEl.classList.add('milestone');
            setTimeout(() => {
                this.currentScoreEl.classList.remove('milestone');
            }, 600);
        }

        // Gradually speed up
        if (this.speed < this.MAX_SPEED) {
            this.speed += this.SPEED_ACCEL * dt;
        }

        // 1. Dino Physics Update
        if (this.dino.isJumping) {
            this.dino.vy += this.gravity * dt;
            this.dino.y += this.dino.vy * dt;
            
            // Check landing
            const groundLimit = this.GROUND_Y - this.dino.height;
            if (this.dino.y >= groundLimit) {
                this.dino.y = groundLimit;
                this.dino.vy = 0;
                this.dino.isJumping = false;
                this.emitLandingSparks();
            }
        } else {
            // Legs running animation
            // Record history for speed trails
        if (this.speed > this.START_SPEED + 150) {
            this.dino.history.push({ x: this.dino.x, y: this.dino.y, isDucking: this.dino.isDucking });
            if (this.dino.history.length > 5) this.dino.history.shift();
        } else {
            this.dino.history = [];
        }

        // Aerodynamic wind lines while ducking
        if (this.dino.isDucking && Math.random() < 0.2) {
            this.emitWindLines();
        }

        this.dino.runTimer += dt * (this.speed / 10);
            if (this.dino.runTimer > 1) {
                this.dino.feetState = this.dino.feetState === 0 ? 1 : 0;
                this.dino.runTimer = 0;
                // Emit trailing dust trails while running
                if (Math.random() < 0.3) {
                    this.emitRunningParticle();
                }
            }
        }

        // 2. Spawn Obstacles
        this.obstacleSpawnTimer += dt;
        const speedIntervalModifier = (this.START_SPEED / this.speed); // spawn slightly faster as game goes faster
        const dynamicSpawnInterval = Math.max(1.1, this.obstacleMinInterval * speedIntervalModifier + Math.random() * 1.5);
        
        if (this.obstacleSpawnTimer >= dynamicSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }

        // 3. Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed * dt;
            
            // Update bird animation
            if (obs.type === 'bird') {
                obs.animTimer += dt * 8;
                obs.wingPos = Math.sin(obs.animTimer);
            }

            // AABB Collision Detection
            if (this.checkCollision(this.dino, obs)) {
                this.endGame();
                return;
            }

            // Remove offscreen obstacles
            if (obs.x + obs.width < -50) {
                this.obstacles.splice(i, 1);
            }
        }

        // 4. Update Background Decor & Details
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * dt;
            if (cloud.x < -100) {
                cloud.x = this.logicalWidth + 50;
                cloud.y = 40 + Math.random() * 80;
            }
        });

        this.groundDetails.forEach(line => {
            line.x -= this.speed * dt;
            if (line.x + line.w < -20) {
                line.x = this.logicalWidth + Math.random() * 100;
                line.w = 20 + Math.random() * 60;
            }
        });

        // 5. Update Particle System
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.useGravity) p.vy += 800 * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // Dynamic AABB Collision
    checkCollision(dino, obs) {
        // Tight padding offsets to make collision detection feel fair and forgiving to the user
        const paddingX = 4;
        const paddingY = 3;

        return (
            dino.x + paddingX < obs.x + obs.width - paddingX &&
            dino.x + dino.width - paddingX > obs.x + paddingX &&
            dino.y + paddingY < obs.y + obs.height - paddingY &&
            dino.y + dino.height - paddingY > obs.y + paddingY
        );
    }

    // Obstacle Spawning Logic
    spawnObstacle() {
        const r = Math.random();
        let obstacle = {};

        // Fetch colors from stylesheet based on theme dynamically
        const textStyle = getComputedStyle(document.documentElement);
        const obstacleColor = textStyle.getPropertyValue('--text-primary').trim();

        if (r < 0.4) {
            // Small Cactus Group
            const count = Math.random() < 0.6 ? 1 : 2;
            const w = count === 1 ? 16 : 28;
            obstacle = {
                type: 'cactus_small',
                x: this.logicalWidth + 50,
                y: this.GROUND_Y - 32,
                width: w,
                height: 32,
                color: obstacleColor,
                count: count
            };
        } else if (r < 0.75) {
            // Large Cactus Group
            const count = Math.random() < 0.7 ? 1 : (Math.random() < 0.7 ? 2 : 3);
            const w = count === 1 ? 22 : (count === 2 ? 40 : 54);
            obstacle = {
                type: 'cactus_large',
                x: this.logicalWidth + 50,
                y: this.GROUND_Y - 50,
                width: w,
                height: 50,
                color: obstacleColor,
                count: count
            };
        } else {
            // Flying Geometric Bird
            // Spawns at 3 possible heights: low (duckable), mid (jumpable), or high (run under)
            const heightTypes = [
                this.GROUND_Y - 60, // Low (Requires jumps or ducks depending on frame)
                this.GROUND_Y - 36, // Mid (Requires jump or slide/duck)
                this.GROUND_Y - 18  // High (Dino can duck under completely)
            ];
            const yPos = heightTypes[Math.floor(Math.random() * heightTypes.length)];
            
            obstacle = {
                type: 'bird',
                x: this.logicalWidth + 50,
                y: yPos,
                width: 32,
                height: 20,
                color: obstacleColor,
                animTimer: 0,
                wingPos: 0
            };
        }

        this.obstacles.push(obstacle);
    }

    // Particle Generation Factory
    emitRunningParticle() {
        const textStyle = getComputedStyle(document.documentElement);
        const normalColor = textStyle.getPropertyValue('--text-muted').trim();
        const accentColor = textStyle.getPropertyValue('--accent-color').trim();
        const particleColor = Math.random() < 0.15 ? accentColor : normalColor;
        this.particles.push({
            x: this.dino.x,
            y: this.GROUND_Y - 4,
            vx: -this.speed * 0.4 - Math.random() * 50,
            vy: -10 - Math.random() * 40,
            size: 1.5 + Math.random() * 3,
            life: 0.3 + Math.random() * 0.3,
            useGravity: false,
            color: particleColor
        });
    }

    
    emitLandingSparks() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.dino.x + 16,
                y: this.GROUND_Y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.2) * 100, // Mostly horizontal
                life: 1.0,
                maxLife: 1.0 + Math.random() * 0.5,
                color: document.documentElement.style.getPropertyValue('--accent-color').trim() || '#06b6d4',
                size: 2 + Math.random() * 3,
                type: 'spark'
            });
        }
    }

    emitWindLines() {
        this.particles.push({
            x: this.dino.x + 40 + Math.random() * 20,
            y: this.dino.y - 5 - Math.random() * 15,
            vx: -this.speed * 1.5,
            vy: 0,
            life: 1.0,
            maxLife: 1.0,
            color: document.documentElement.style.getPropertyValue('--accent-color').trim() || '#06b6d4',
            size: 2,
            width: 15 + Math.random() * 20,
            type: 'wind'
        });
    }

    drawPixelMap(ctx, map, scale, x, y, isDucking, feetState) {
        ctx.save();
        ctx.translate(x, y);
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[r].length; c++) {
                const p = map[r][c];
                // Draw pixels
                if (p === 'X' || p === 'E' || (p === 'L' && feetState === 0) || (p === 'R' && feetState === 1)) {
                    if (p === 'E') {
                        // Eye pulse logic
                        const time = Date.now() / 200;
                        ctx.globalAlpha = 0.5 + Math.sin(time) * 0.5;
                        ctx.fillStyle = document.documentElement.style.getPropertyValue('--accent-color').trim() || '#06b6d4';
                    } else {
                        ctx.globalAlpha = 1.0;
                    }
                    ctx.fillRect(c * scale, r * scale, scale, scale);
                    // Reset fillStyle to main color if it was the eye
                    if (p === 'E') {
                        ctx.globalAlpha = 1.0;
                        ctx.fillStyle = ctx.strokeStyle; 
                    }
                }
            }
        }
        ctx.restore();
    }

    emitJumpParticles() {
        const textStyle = getComputedStyle(document.documentElement);
        const normalColor = textStyle.getPropertyValue('--border-color').trim();
        const accentColor = textStyle.getPropertyValue('--accent-color').trim();
        for (let i = 0; i < 8; i++) {
            const particleColor = Math.random() < 0.4 ? accentColor : normalColor;
            this.particles.push({
                x: this.dino.x + 10 + Math.random() * 15,
                y: this.GROUND_Y - 2,
                vx: (Math.random() - 0.5) * 120,
                vy: -Math.random() * 60,
                size: 2 + Math.random() * 3,
                life: 0.4 + Math.random() * 0.3,
                useGravity: false,
                color: particleColor
            });
        }
    }

    emitCrashParticles() {
        const textStyle = getComputedStyle(document.documentElement);
        const particleColor = textStyle.getPropertyValue('--accent-color').trim();
        for (let i = 0; i < 24; i++) {
            this.particles.push({
                x: this.dino.x + this.dino.width / 2,
                y: this.dino.y + this.dino.height / 2,
                vx: (Math.random() - 0.5) * 350,
                vy: (Math.random() - 0.7) * 300,
                size: 3 + Math.random() * 5,
                life: 0.6 + Math.random() * 0.6,
                useGravity: true,
                color: particleColor
            });
        }
    }

    // Rendering Engine
    draw() {
        // Clear screen with current theme colors
        const style = getComputedStyle(document.documentElement);
        const bgVal = style.getPropertyValue('--bg-main').trim();
        this.ctx.fillStyle = bgVal;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        // Draw Ambient Particles / Background details
        this.drawBackground(style);

        // Draw Ground Line
        this.drawGround(style);

        // Draw Obstacles
        this.drawObstacles();

        // Draw Dino
        this.drawDino(style);

        // Draw Foreground FX Particles
        this.drawParticles();
    }

    // Draws a single static frame before game start
    drawStaticFrame() {
        this.draw();
    }

    drawBackground(style) {
        const cloudColor = style.getPropertyValue('--border-color').trim();
        
        // Draw minimalist clouds (floating horizontal pill outlines)
        this.ctx.strokeStyle = cloudColor;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            const w = 40 * cloud.scale;
            const h = 8 * cloud.scale;
            this.ctx.roundRect(cloud.x, cloud.y, w, h, h / 2);
            this.ctx.stroke();
        });
    }

    drawGround(style) {
        const groundColor = style.getPropertyValue('--text-muted').trim();
        const detailColor = style.getPropertyValue('--border-color').trim();

        // Main line
        this.ctx.strokeStyle = groundColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.GROUND_Y);
        this.ctx.lineTo(this.logicalWidth, this.GROUND_Y);
        this.ctx.stroke();

        // Moving ground dashes (speed indicator)
        this.ctx.strokeStyle = detailColor;
        this.ctx.lineWidth = 1;
        this.groundDetails.forEach(line => {
            this.ctx.beginPath();
            this.ctx.moveTo(line.x, this.GROUND_Y + 4);
            this.ctx.lineTo(line.x + line.w, this.GROUND_Y + 4);
            this.ctx.stroke();
        });
    }

    drawDino(style) {
        const dinoColor = style.getPropertyValue('--text-primary').trim();
        const accentColor = style.getPropertyValue('--accent-color').trim();
        
        this.ctx.fillStyle = dinoColor;
        this.ctx.strokeStyle = dinoColor; // using strokeStyle to store main color
        
        const scale = 4;
        
        // 8-bit T-Rex Maps (L=Left Leg, R=Right Leg, E=Eye)
        const runMap = [
            "         XXXXXX ",
            "        XEXXXXX ",
            "        XXXXXXX ",
            "        XXXX    ",
            " X      XXXXXX  ",
            " XX    XXXXX    ",
            " XXXXX XXXXX    ",
            "  XXXXXXXXX     ",
            "    XXXXXX      ",
            "     X  X       ",
            "     L  R       "
        ];
        
        const duckMap = [
            "                ",
            "                ",
            "                ",
            "                ",
            "             XXX",
            " X          XEXX",
            " XX        XXXXX",
            " XXXXXXXXXXXXX  ",
            "  XXXXXXXXXXX   ",
            "     X  X       ",
            "     L  R       "
        ];
        
        // Draw Ghosts (Speed Trails)
        if (this.dino.history && this.dino.history.length > 0) {
            for (let i = 0; i < this.dino.history.length; i++) {
                const ghost = this.dino.history[i];
                this.ctx.globalAlpha = (i + 1) * 0.05; // Faint to solid
                const mapToUse = ghost.isDucking ? duckMap : runMap;
                this.drawPixelMap(this.ctx, mapToUse, scale, ghost.x, ghost.y, ghost.isDucking, this.dino.feetState);
            }
            this.ctx.globalAlpha = 1.0;
        }

        // Draw Main Dino
        const mapToUse = this.dino.isDucking ? duckMap : runMap;
        // In jump, legs stay static (feetState=0)
        const currentFeetState = this.dino.isJumping ? 0 : this.dino.feetState;
        this.drawPixelMap(this.ctx, mapToUse, scale, this.dino.x, this.dino.y, this.dino.isDucking, currentFeetState);
    }

    drawObstacles() {
        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = obs.color;
            this.ctx.strokeStyle = obs.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([]);
            
            if (obs.type === 'cactus_small') {
                // Draw sleek minimalist vertical lines/rectangles
                for (let i = 0; i < obs.count; i++) {
                    const offset = i * 12;
                    this.ctx.beginPath();
                    this.ctx.roundRect(obs.x + offset, obs.y, 8, obs.height, 3);
                    this.ctx.fill();
                    // Small arms
                    this.ctx.fillRect(obs.x + offset - 4, obs.y + 10, 4, 4);
                    this.ctx.fillRect(obs.x + offset + 8, obs.y + 6, 4, 4);
                }
            } else if (obs.type === 'cactus_large') {
                // Draw slightly larger sleek geometric shapes
                for (let i = 0; i < obs.count; i++) {
                    const offset = i * 18;
                    this.ctx.beginPath();
                    this.ctx.roundRect(obs.x + offset, obs.y, 12, obs.height, 4);
                    this.ctx.fill();
                    // Cacti branches
                    this.ctx.fillRect(obs.x + offset - 6, obs.y + 14, 6, 5);
                    this.ctx.fillRect(obs.x + offset + 12, obs.y + 8, 6, 5);
                }
            } else if (obs.type === 'bird') {
                // Draw simple flying triangle bird
                const wingY = obs.wingPos > 0 ? -6 : 6;
                this.ctx.beginPath();
                // Body
                this.ctx.moveTo(obs.x, obs.y + 6);
                this.ctx.lineTo(obs.x + 22, obs.y);
                this.ctx.lineTo(obs.x + 32, obs.y + 6); // beak
                this.ctx.lineTo(obs.x + 22, obs.y + 12);
                this.ctx.closePath();
                this.ctx.fill();

                // Wing
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x + 12, obs.y + 6);
                this.ctx.lineTo(obs.x + 16, obs.y + 6 + wingY);
                this.ctx.lineTo(obs.x + 20, obs.y + 6);
                this.ctx.closePath();
                this.ctx.fill();
            }
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            // Fading opacity based on remaining life
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        // Reset opacity for subsequent drawings
        this.ctx.globalAlpha = 1.0;
    }
}

// Initialise Game on Window Load
window.addEventListener('load', () => {
    new ZenDinoGame();
});
