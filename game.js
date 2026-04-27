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
const doubleSpeedCheck = document.getElementById('doubleSpeedCheck');

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
let doubleSpeedActived = false;

// Difficulty Selection
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        baseDifficulty = parseFloat(btn.dataset.diff);
    });
});

// Input handling
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, ' ': false };

function resize() {
    const container = document.getElementById('game-container');
    width = canvas.width = container.clientWidth;
    height = canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('keydown', e => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    }
});
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
        this.cooldown = 0;
    }

    shoot() {
        bullets.push(new Bullet(this.x, this.y - this.size));
        this.cooldown = 15;
        if (typeof playLaserSound === 'function') playLaserSound();
    }

    update() {
        if (keys[' '] && this.cooldown <= 0) {
            this.shoot();
        }
        if (this.cooldown > 0) this.cooldown--;

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

        // Partículas do motor (Rastros de Fogo)
        if (gameState === 'PLAYING') {
            const fireColors = ['#ff4500', '#ff8c00', '#ffd700', '#ff0000'];
            const color = fireColors[Math.floor(Math.random() * fireColors.length)];

            // Jato principal quando acelera
            let isMoving = false;
            if (keys.w || keys.ArrowUp || keys.s || keys.ArrowDown || keys.a || keys.ArrowLeft || keys.d || keys.ArrowRight) {
                isMoving = true;
                for (let i = 0; i < 2; i++) {
                    particles.push(new Particle(this.x, this.y + this.size, 0, 2, color, 1.5));
                }
            }

            if (typeof updateEngineSound === 'function') updateEngineSound(isMoving);

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
    constructor(isHuge = false) {
        this.isHuge = isHuge;
        let baseSize = isHuge ? width * 0.42 : Math.random() * 25 + 15;

        // Aumenta o tamanho depois de 750 pontos para novos meteoros
        if (!isHuge && score >= 750) {
            baseSize *= 1.8;
        }

        this.size = baseSize;

        if (isHuge) {
            // Fica no centro, forçando ir para o cantinho do mapa
            this.x = width / 2;
            this.y = -this.size - 50;
            this.speedY = 2.5;
            this.speedX = 0;
            this.color = '#ffaa00'; // Dourado forte/Laranja
        } else {
            this.x = Math.random() * (width - this.size * 2) + this.size;
            this.y = -this.size - 20;
            this.speedY = (Math.random() * 2 + 3) * difficultyMultiplier;
            this.speedX = (Math.random() - 0.5) * difficultyMultiplier;
            this.color = Math.random() > 0.5 ? '#ff003c' : '#bc13fe';
        }

        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;

        // Gerar formato irregular (asteroide)
        this.vertices = [];
        const verticesNum = Math.floor(Math.random() * 4 + 6);
        for (let i = 0; i < verticesNum; i++) {
            const angle = (i / verticesNum) * Math.PI * 2;
            // Meteoro gigante fica mais redondo pra hitbox melhor
            const radius = this.size * (isHuge ? (0.9 + Math.random() * 0.1) : (0.7 + Math.random() * 0.3));
            this.vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
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

// Global Variables
let player;
let asteroids = [];
let particles = [];
let stars = [];
let nebulae = [];
let spaceBodies = [];
let bullets = [];
let hasShownWarning = false;
let warningTimer = 0;
let hasSpawnedHugeMeteor = false;

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speedY = -12;
        this.radius = 4;
        this.color = '#00f3ff';
        this.markedForDeletion = false;
    }
    update() {
        this.y += this.speedY;
        if (this.y < -10) this.markedForDeletion = true;
        particles.push(new Particle(this.x, this.y + this.radius, 0, 1, this.color, 0.5));
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Audio Variables
let audioCtx;
let engineGain;
let engineFilter;
let noiseSource;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate for gain loss
    }

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 200;

    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0;

    noiseSource.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    noiseSource.start();
}

function playLaserSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function updateEngineSound(isMoving) {
    if (!engineGain || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    engineGain.gain.cancelScheduledValues(now);
    engineFilter.frequency.cancelScheduledValues(now);

    if (isMoving) {
        engineGain.gain.setTargetAtTime(0.5, now, 0.1);
        engineFilter.frequency.setTargetAtTime(800, now, 0.1);
    } else {
        engineGain.gain.setTargetAtTime(0.0, now, 0.2);
        engineFilter.frequency.setTargetAtTime(200, now, 0.2);
    }
}

function init() {
    resize();
    player = new Player();
    for (let i = 0; i < 150; i++) stars.push(new Star());
    for (let i = 0; i < 5; i++) nebulae.push(new Nebula());
    for (let i = 0; i < 3; i++) spaceBodies.push(new SpaceBody(true)); // Planetas
    loop();
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(x, y, 0, 0, color, 1.8));
    }
}

function checkCollisions() {
    // Colisão Bala x Meteoro
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let hit = false;

        for (let j = asteroids.length - 1; j >= 0; j--) {
            let a = asteroids[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < a.size * 0.8 + b.radius) {
                if (a.size <= 28) {
                    createExplosion(a.x, a.y, a.color);
                    asteroids.splice(j, 1);
                    score += doubleSpeedActived ? 20 : 10;
                    scoreDisplay.innerText = score;
                } else {
                    // Small explosion for deflected bullet
                    for (let k = 0; k < 10; k++) particles.push(new Particle(b.x, b.y, 0, 0, b.color, 0.8));
                }
                b.markedForDeletion = true;
                hit = true;
                break;
            }
        }
        if (hit) bullets.splice(i, 1);
    }

    // Colisão Player x Meteoro
    for (let i = 0; i < asteroids.length; i++) {
        let a = asteroids[i];
        let dx = a.x - player.x;
        let dy = a.y - player.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Colisão Baseada em Raio. Reduzido para limites mais precisos
        if (dist < player.size * 0.5 + a.size * 0.6) {
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

        // Fase de 750 pontos: Alerta na tela e aumenta os meteoros
        if (score >= 750 && !hasShownWarning) {
            hasShownWarning = true;
            warningTimer = 180; // pisca por 3 segundos
        }

        // Fase de 1250 pontos: Meteoro GIGANTE
        if (score >= 1250 && !hasSpawnedHugeMeteor) {
            hasSpawnedHugeMeteor = true;
            // Sumir com os asteróides pequenos e medianos
            asteroids = [];
            asteroids.push(new Asteroid(true));
        }

        // DIFICULDADE (VELOCIDADE) AUMENTANDO COM O TEMPO!
        difficultyMultiplier = (baseDifficulty + (score / 500)) * (doubleSpeedActived ? 2 : 1);

        // Spawn de Asteroides fica mais rápido
        let effectiveBaseDiff = doubleSpeedActived ? baseDifficulty * 2 : baseDifficulty;
        let spawnRate = Math.max(8, Math.floor(60 / (effectiveBaseDiff * (1 + score / 1000))));

        if (frameCount % spawnRate === 0) {
            // Só spawna asteróide se não houver um gigante na tela
            let isGiantOnScreen = asteroids.some(a => a.isHuge);
            if (!isGiantOnScreen) {
                asteroids.push(new Asteroid());
            }
        }

        // Pontuação passiva por desviar/sobreviver
        if (frameCount % 60 === 0) {
            score += doubleSpeedActived ? 20 : 10;
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
                score += doubleSpeedActived ? 10 : 5; // Ponto bônus por passar
                scoreDisplay.innerText = score;
            }
        }

        checkCollisions();

        // Update Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.update();
            b.draw();
            if (b.markedForDeletion) bullets.splice(i, 1);
        }

        // Renderizar Alerta
        if (warningTimer > 0) {
            warningTimer--;
            if (Math.floor(warningTimer / 15) % 2 === 0) {
                ctx.save();
                ctx.fillStyle = '#ff003c';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff003c';
                // Desenha os emojis
                ctx.font = '60px Arial';
                ctx.fillText("⚠️ ⚠️ ⚠️", width / 2, height / 2.5 - 40);
                // Desenha o texto
                ctx.font = 'bold 30px Orbitron';
                ctx.fillText("ALERTA: METEOROS MAIORES!", width / 2, height / 2.5 + 10);
                ctx.restore();
            }
        }
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
    initAudio();
    gameState = 'PLAYING';
    mainMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    score = 0;
    frameCount = 0;
    doubleSpeedActived = doubleSpeedCheck && doubleSpeedCheck.checked;
    difficultyMultiplier = baseDifficulty * (doubleSpeedActived ? 2 : 1);
    asteroids = [];
    particles = [];
    bullets = [];
    hasShownWarning = false;
    warningTimer = 0;
    hasSpawnedHugeMeteor = false;
    scoreDisplay.innerText = score;
    player.reset();
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
    if (typeof updateEngineSound === 'function') updateEngineSound(false);
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');

    // Mostra o planeta terra sendo atingido
    gameOverMenu.style.width = '100%';
    gameOverMenu.style.height = '100%';
    gameOverMenu.style.borderRadius = '0';
    gameOverMenu.style.backgroundImage = "url('earth_impact.png')";
    gameOverMenu.style.backgroundSize = "cover";
    gameOverMenu.style.backgroundPosition = "center";
    gameOverMenu.style.border = "none";
    gameOverMenu.style.display = "flex";
    gameOverMenu.style.flexDirection = "column";
    gameOverMenu.style.justifyContent = "center";
    gameOverMenu.style.alignItems = "center";

    // Ajusta o fundo para melhorar a leitura do menu
    gameOverMenu.style.backgroundColor = "rgba(0,0,0,0.6)";
    gameOverMenu.style.backgroundBlendMode = "darken";

    gameOverMenu.classList.remove('hidden');
    finalScoreDisplay.innerText = score;
    saveScore(score);
    displayLeaderboard();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.onload = init;
