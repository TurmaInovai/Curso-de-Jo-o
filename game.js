const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const mainMenu = document.getElementById('main-menu');
const gameOverMenu = document.getElementById('game-over');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('scoreDisplay');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');

// Game Config and State
let width, height;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let frameCount = 0;
let difficultyMultiplier = 1;

// Input handling
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

function resize() {
    const container = document.getElementById('game-container');
    width = canvas.width = container.clientWidth;
    height = canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// Classes
class Player {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = width / 2;
        this.y = height - 100;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0.6;
        this.friction = 0.92;
        this.size = 18;
        this.color = '#00f3ff';
    }

    update() {
        // Acelerar com as teclas WASD/Setas
        if (keys.w || keys.ArrowUp) this.vy -= this.speed;
        if (keys.s || keys.ArrowDown) this.vy += this.speed;
        if (keys.a || keys.ArrowLeft) this.vx -= this.speed;
        if (keys.d || keys.ArrowRight) this.vx += this.speed;

        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;

        // Limites da tela
        this.x = Math.max(this.size, Math.min(width - this.size, this.x));
        this.y = Math.max(this.size, Math.min(height - this.size * 2, this.y));

        // Partículas do motor
        if ((keys.w || keys.ArrowUp) && Math.random() > 0.3) {
            particles.push(new Particle(this.x, this.y + this.size, 0, Math.random() * 3 + 2, '#00f3ff', 2));
        } else if (Math.random() > 0.7 && gameState === 'PLAYING') {
            particles.push(new Particle(this.x, this.y + this.size, 0, Math.random() * 2 + 1, '#00f3ff', 1.5));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Desenho do triângulo espacial
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 1.5);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(0, this.size * 0.5); // parte de trás arqueada (concava)
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
}

class Asteroid {
    constructor() {
        this.size = Math.random() * 25 + 15;
        this.x = Math.random() * (width - this.size * 2) + this.size;
        this.y = -this.size - 20;
        
        // MULTIPLICADOR DE DIFICULDADE (VELOCIDADE)
        this.speedY = (Math.random() * 2 + 3) * difficultyMultiplier; 
        this.speedX = (Math.random() - 0.5) * difficultyMultiplier;
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.color = Math.random() > 0.5 ? '#ff003c' : '#bc13fe';
        
        // Gerar formato irregular (asteroide)
        this.vertices = [];
        const verticesNum = Math.floor(Math.random() * 4 + 6);
        for(let i=0; i<verticesNum; i++) {
            const angle = (i / verticesNum) * Math.PI * 2;
            const radius = this.size * (0.7 + Math.random() * 0.3); // Variar o raio para deixar menos redondo
            this.vertices.push({x: Math.cos(angle) * radius, y: Math.sin(angle) * radius});
        }
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(10,10,10,0.9)';
        ctx.fill();

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, vx, vy, color, sizeMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6 + vx;
        this.vy = (Math.random() - 0.5) * 6 + vy;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
        this.color = color;
        this.size = (Math.random() * 3 + 2) * sizeMultiplier;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.95; // encolhe ao longo do tempo
    }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5;
        this.speed = this.size * 0.5;
        this.brightness = Math.random();
    }
    update() {
        // Background se move mais rapido dependendo do nível de dificuldade
        this.y += this.speed + (gameState === 'PLAYING' ? difficultyMultiplier * 1.5 : 0.5);
        if (this.y > height) {
            this.y = 0;
            this.x = Math.random() * width;
        }
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Global Variables
let player;
let asteroids = [];
let particles = [];
let stars = [];

function init() {
    resize();
    player = new Player();
    for(let i=0; i<150; i++) stars.push(new Star());
    loop();
}

function createExplosion(x, y, color) {
    for(let i=0; i<40; i++) {
        particles.push(new Particle(x, y, 0, 0, color, 1.8));
    }
}

function checkCollisions() {
    for(let i=0; i<asteroids.length; i++) {
        let a = asteroids[i];
        let dx = a.x - player.x;
        let dy = a.y - player.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        // Colisão Baseada em Raio. 0.8 dá uma pequena margem (hitbox mais amigável)
        if (dist < player.size * 0.7 + a.size * 0.8) {
            createExplosion(player.x, player.y, player.color);
            createExplosion(a.x, a.y, a.color);
            endGame();
            break;
        }
    }
}

function loop() {
    requestAnimationFrame(loop);
    
    // Clear canvas com pequeno "rastro" para dar sensação de velocidade
    ctx.fillStyle = 'rgba(5, 5, 16, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Draw e Update Stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    if (gameState === 'PLAYING') {
        frameCount++;
        
        // DIFICULDADE (VELOCIDADE) AUMENTANDO COM O TEMPO!
        difficultyMultiplier = 1 + (score / 500); // Aumenta ao progredir
        
        // Spawn de Asteroides fica mais rápido
        let spawnRate = Math.max(10, 60 - Math.floor(score / 50));

        if (frameCount % spawnRate === 0) {
            asteroids.push(new Asteroid());
        }

        // Pontuação passiva por desviar/sobreviver
        if (frameCount % 60 === 0) {
            score += 10;
            scoreDisplay.innerText = score;
        }

        player.update();
        player.draw();

        // Update Asteroids
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            a.update();
            a.draw();

            // Destroi asteroides fora da tela para poupar memória e dá ponto bônus
            if (a.y > height + a.size) {
                asteroids.splice(i, 1);
                score += 5; // Ponto bônus por passar
                scoreDisplay.innerText = score;
            }
        }

        checkCollisions();
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function startGame() {
    gameState = 'PLAYING';
    mainMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    score = 0;
    frameCount = 0;
    difficultyMultiplier = 1;
    asteroids = [];
    particles = [];
    scoreDisplay.innerText = score;
    player.reset();
}

function endGame() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    gameOverMenu.classList.remove('hidden');
    finalScoreDisplay.innerText = score;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.onload = init;
