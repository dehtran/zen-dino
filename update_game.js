const fs = require('fs');
let code = fs.readFileSync('/Users/dennistran/Antigravity Projects/zen-dino/game.js', 'utf8');

// 1. Add history array to dino constructor
code = code.replace(
    /runTimer: 0,\s*\/\/ A timer used to toggle the leg animation back and forth\n\s*feetState: 0\s*\/\/ Tracks which leg is currently forward \(0 or 1\)/,
    `runTimer: 0,\n            feetState: 0,\n            history: [] // For speed trail ghost afterimages`
);

// 2. Add history tracking and wind lines in update(dt)
code = code.replace(
    /this\.emitJumpParticles\(\); \/\/ Land particles/,
    `this.emitLandingSparks();`
);

code = code.replace(
    /this\.dino\.runTimer \+= dt \* \(this\.speed \/ 10\);/,
    `// Record history for speed trails
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

        this.dino.runTimer += dt * (this.speed / 10);`
);

// 3. Add emitLandingSparks and emitWindLines methods
const newParticleMethods = `
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
`;

code = code.replace(/emitJumpParticles\(\) \{/, newParticleMethods + '\n    emitJumpParticles() {');

// 4. Update Particle Drawing logic for 'spark' and 'wind'
const drawParticleLogic = `
            if (p.type === 'spark') {
                this.ctx.fillRect(p.x, p.y, p.size * 3, p.size / 2); // horizontal sparks
            } else if (p.type === 'wind') {
                this.ctx.fillRect(p.x, p.y, p.width, p.size); // sleek wind lines
            } else {
                this.ctx.fillRect(p.x, p.y, p.size, p.size);
            }
`;
code = code.replace(/this\.ctx\.fillRect\(p\.x, p\.y, p\.size, p\.size\);/, drawParticleLogic);


// 5. Rewrite drawDino
const newDrawDino = `    drawDino(style) {
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
    }`;

// Replace everything from drawDino(style) { to its end }
const drawDinoRegex = /    drawDino\(style\) \{[\s\S]*?this\.ctx\.restore\(\);\n    \}/;
code = code.replace(drawDinoRegex, newDrawDino);

fs.writeFileSync('/Users/dennistran/Antigravity Projects/zen-dino/game.js', code);
console.log("Updated game.js!");
