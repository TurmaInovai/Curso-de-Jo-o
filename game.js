const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const mainMenu = document.getElementById('main-menu');
const gameOverMenu = document.getElementById('game-over');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('scoreDisplay');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const scoresBody = document.getElementById('scoresBody');
const livesDisplay = document.getElementById('lives-display');

// Assets
const shipImg = new Image();
shipImg.src = 'ship.png';

// Game Config and State
let width, height;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let frameCount = 0;
let difficultyMultiplier = 1;
let baseDifficulty = 1;

// Difficulty Selection
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        baseDifficulty = parseFloat(btn.dataset.diff);
    });
});

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
        this.size = 20;
        this.color = '#00f3ff';
        this.lives = 3;
        this.invincible = 0;
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

        if (this.invincible > 0) this.invincible--;

        // Partículas do motor (Rastros de Fogo)
        if (gameState === 'PLAYING') {
            const fireColors = ['#ff4500', '#ff8c00', '#ffd700', '#ff0000'];
            const color = fireColors[Math.floor(Math.random() * fireColors.length)];
            
            // Jato principal quando acelera
            if (keys.w || keys.ArrowUp || keys.s || keys.ArrowDown || keys.a || keys.ArrowLeft || keys.d || keys.ArrowRight) {
                for(let i=0; i<2; i++) {
                    particles.push(new Particle(this.x, this.y + this.size, 0, 2, color, 1.5));
                }
            }
            
            // Rastro constante
            if (Math.random() > 0.2) {
                particles.push(new Particle(this.x, this.y + this.size, 0, 1, color, 1));
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Rotacionar levemente baseado na velocidade lateral (efeito de inclinação)
        let tilt = this.vx * 0.05;
        ctx.rotate(tilt);

        // Efeito de piscar quando invicível
        if (this.invincible > 0 && Math.floor(frameCount / 5) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        if (shipImg.complete) {
            // Desenhar imagem da nave realista
            const ratio = shipImg.width / shipImg.height;
            const drawW = this.size * 5; 
            const drawH = drawW / ratio;
            
            // Usar blend mode 'screen' para remover o fundo preto da imagem sem criar brilho extra
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(shipImg, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.globalCompositeOperation = 'source-over'; 
        } else {
            // Backup caso a imagem demore a carregar
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.size * 1.5);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(0, this.size * 0.5);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
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
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.8;
        this.speed = this.size * 0.4;
        
        // Cores reais de estrelas
        const colors = ['#ffffff', '#e6f2ff', '#fffde6', '#ffffff', '#e1e1fb'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        this.brightness = Math.random();
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinkleDir = Math.random() > 0.5 ? 1 : -1;
    }
    update() {
        // Cintilação
        this.brightness += this.twinkleSpeed * this.twinkleDir;
        if (this.brightness > 1 || this.brightness < 0.3) this.twinkleDir *= -1;

        this.y += this.speed + (gameState === 'PLAYING' ? difficultyMultiplier * 1.5 : 0.5);
        if (this.y > height) {
            this.y = 0;
            this.x = Math.random() * width;
        }
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.brightness;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class SpaceBody {
    constructor(isPlanet = false) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.isPlanet = isPlanet;
        this.size = isPlanet ? Math.random() * 40 + 20 : Math.random() * 5 + 2;
        this.speed = this.isPlanet ? 0.2 : 0.1; // Bem devagar (Parallax profundo)
        this.color = isPlanet ? `hsl(${Math.random() * 360}, 30%, 40%)` : '#ffffff';
        this.opacity = isPlanet ? 0.4 : 0.2;
    }
    update() {
        this.y += this.speed + (gameState === 'PLAYING' ? difficultyMultiplier * 0.2 : 0.1);
        if (this.y > height + this.size * 2) {
            this.y = -this.size * 2;
            this.x = Math.random() * width;
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (this.isPlanet) {
            let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, this.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = this.color;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Nebula {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 400 + 300;
        const colors = [
            'rgba(75, 0, 130, 0.05)',  // Indigo
            'rgba(0, 0, 139, 0.05)',   // DarkBlue
            'rgba(139, 0, 139, 0.05)', // DarkMagenta
            'rgba(25, 25, 112, 0.05)'  // MidnightBlue
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.speed = 0.05;
    }
    update() {
        this.y += this.speed;
        if (this.y > height + this.size) {
            this.y = -this.size;
            this.x = Math.random() * width;
        }
    }
    draw() {
        ctx.save();
        let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, this.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.restore();
    }
}

class Boss {
    constructor() {
        this.width = 180;
        this.height = 100;
        this.x = width / 2 - this.width / 2;
        this.y = -this.height - 50; 
        this.targetY = 60;
        this.speedX = 3;
        this.shootTimer = 0;
        this.color = '#ff004c';
    }

    update() {
        // Entrada suave
        if (this.y < this.targetY) {
            this.y += 2;
        }

        // Movimento lateral
        this.x += this.speedX;
        if (this.x <= 0 || this.x + this.width >= width) {
            this.speedX *= -1;
        }

        // Atirar tiros laser
        this.shootTimer++;
        if (this.shootTimer > 40) { // Frequência do tiro
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        lasers.push(new Laser(this.x + this.width / 2, this.y + this.height));
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        
        // Corpo do Boss
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width * 0.5, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.1, this.y + this.height * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Olhos/Luzes do Boss
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.3, this.y + this.height * 0.4, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.7, this.y + this.height * 0.4, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 40;
        this.speedY = 10;
        this.color = '#00ff44'; // Laser venenoso/alienígena
    }

    update() {
        this.y += this.speedY;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.roundRect(this.x - this.width / 2, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.restore();
    }
}

// Global Variables
let player;
let asteroids = [];
let particles = [];
let stars = [];
let nebulae = [];
let spaceBodies = [];
let boss = null;
let lasers = [];

function init() {
    resize();
    player = new Player();
    for(let i=0; i<150; i++) stars.push(new Star());
    for(let i=0; i<5; i++) nebulae.push(new Nebula());
    for(let i=0; i<3; i++) spaceBodies.push(new SpaceBody(true)); // Planetas
    loop();
}

function createExplosion(x, y, color) {
    for(let i=0; i<40; i++) {
        particles.push(new Particle(x, y, 0, 0, color, 1.8));
    }
}

function checkCollisions() {
    if (player.invincible > 0) return;

    // Colisão Player x Meteoro
    for(let i=0; i<asteroids.length; i++) {
        let a = asteroids[i];
        let dx = a.x - player.x;
        let dy = a.y - player.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        // Colisão Baseada em Raio
        if (dist < player.size * 0.5 + a.size * 0.6) {
            takeDamage(a.x, a.y, a.color);
            return;
        }
    }

    // Colisão Player x Lasers do Boss
    for(let i=0; i<lasers.length; i++) {
        let l = lasers[i];
        if (player.x + player.size > l.x - l.width/2 && 
            player.x - player.size < l.x + l.width/2 &&
            player.y + player.size > l.y && 
            player.y - player.size < l.y + l.height) {
            takeDamage(l.x, l.y, l.color);
            lasers.splice(i, 1); // Remove o laser que atingiu
            return;
        }
    }
}

function takeDamage(x, y, color) {
    player.lives--;
    player.invincible = 120; // ~2 segundos a 60fps
    createExplosion(x, y, color);
    updateLivesDisplay();
    
    if (player.lives <= 0) {
        createExplosion(player.x, player.y, player.color);
        endGame();
    }
}

function updateLivesDisplay() {
    livesDisplay.innerText = '❤️'.repeat(Math.max(0, player.lives));
}

function loop() {
    requestAnimationFrame(loop);
    
    // Clear canvas com pequeno "rastro" para dar sensação de velocidade
    ctx.fillStyle = 'rgba(5, 5, 16, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Draw e Update Background Layers
    nebulae.forEach(n => {
        n.update();
        n.draw();
    });
    
    spaceBodies.forEach(sb => {
        sb.update();
        sb.draw();
    });

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    if (gameState === 'PLAYING') {
        frameCount++;
        
        // DIFICULDADE (VELOCIDADE) AUMENTANDO COM O TEMPO!
        difficultyMultiplier = baseDifficulty + (score / 500); 
        
        // Aviso de Chefão
        if (score >= 950 && score < 1000) {
            ctx.fillStyle = 'rgba(255, 0, 0, ' + (Math.sin(frameCount / 10) * 0.5 + 0.5) + ')';
            ctx.font = 'bold 30px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('AVISO: CHEFÃO SE APROXIMANDO!', width / 2, height / 2);
        }

        // Lógica do Boss (1000 a 1500 pontos)
        if (score >= 1000 && score < 1500) {
            if (!boss) boss = new Boss();
            boss.update();
            boss.draw();

            // Spawn de asteroides reduzido durante o boss
            if (frameCount % 60 === 0) {
                asteroids.push(new Asteroid());
            }
        } else {
            // Se passou de 1500 ou morreu, remove boss e limpa lasers
            if (boss) {
                boss = null;
                lasers = [];
            }
            
            // Spawn normal de Asteroides
            let spawnRate = Math.max(8, Math.floor(60 / (baseDifficulty * (1 + score/1000))));
            if (frameCount % spawnRate === 0) {
                asteroids.push(new Asteroid());
            }
        }

        // Update Lasers
        for (let i = lasers.length - 1; i >= 0; i--) {
            let l = lasers[i];
            l.update();
            l.draw();
            if (l.y > height) lasers.splice(i, 1);
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
    difficultyMultiplier = baseDifficulty;
    asteroids = [];
    particles = [];
    lasers = [];
    boss = null;
    scoreDisplay.innerText = score;
    player.reset();
    updateLivesDisplay();
}

function saveScore(newScore) {
    let scores = JSON.parse(localStorage.getItem('spaceDodgerScores') || '[]');
    scores.push(newScore);
    scores.sort((a, b) => b - a);
    scores = scores.slice(0, 5); // Top 5
    localStorage.setItem('spaceDodgerScores', JSON.stringify(scores));
}

function displayLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('spaceDodgerScores') || '[]');
    scoresBody.innerHTML = scores.map((s, i) => `
        <tr>
            <td>${i + 1}º</td>
            <td>${s}</td>
        </tr>
    `).join('') || '<tr><td colspan="2">Nenhum recorde ainda</td></tr>';
}

function endGame() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    gameOverMenu.classList.remove('hidden');
    finalScoreDisplay.innerText = score;
    saveScore(score);
    displayLeaderboard();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.onload = init;
