class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        // Загружаем сохраненный цвет или используем цвет по умолчанию
        this.playerColor = parseInt(localStorage.getItem('playerColor')) || 0xff3366;
    }

    preload() {
        // Место для загрузки ассетов
    }

    create() {
        this.matter.world.setBounds(0, 0, 2000, window.innerHeight + 2000);

        this.score = 0;
        this.visitedPlatforms = new Set();
        this.platformIdCounter = 0;
        this.lastHeightScore = 0;
        
        this.platforms = [];
        const playerStartX = 150;
        const playerStartY = 800;

        // Создаем игрока с выбранным цветом
        this.playerSprite = this.add.rectangle(playerStartX, playerStartY, 40, 60, this.playerColor);
        this.player = this.matter.add.gameObject(this.playerSprite, {
            restitution: 0.2,
            friction: 0.05,
            label: 'player'
        });

        const startPlatform = this.addPlatform(playerStartX, playerStartY + 100);
        this.visitedPlatforms.add(startPlatform.id);

        this.addPlatform(300, 700);
        this.addPlatform(500, 600);
        this.addPlatform(700, 500);
        this.addPlatform(900, 400);
        this.addPlatform(1200, 450);
        this.addPlatform(500, 250);
        
        this.generateAdditionalPlatforms();

        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

        this.leftPressed = false;
        this.rightPressed = false;
        this.canJump = false;
        this.isDead = false;
        this.currentPlatform = null;

        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                const playerBody = this.player.body;
                let platformBody = null;
                
                if (pair.bodyA === playerBody) platformBody = pair.bodyB;
                else if (pair.bodyB === playerBody) platformBody = pair.bodyA;
                
                if (platformBody && pair.collision.normal.y < 0) {
                    this.canJump = true;
                    
                    this.tweens.add({
                        targets: this.playerSprite,
                        scaleY: 0.7, scaleX: 1.3,
                        yoyo: true, duration: 150, ease: 'Quad.easeOut'
                    });
                    
                    const platform = this.findPlatformByBody(platformBody);
                    if (platform && !this.visitedPlatforms.has(platform.id)) {
                        this.visitedPlatforms.add(platform.id);
                        this.addScore(10);
                        
                        this.tweens.add({
                            targets: platform.sprite, tint: 0x00ff88,
                            duration: 200, yoyo: true,
                            onComplete: () => { platform.sprite.tint = 0xffffff; }
                        });
                        
                        this.createScoreParticles(platform.sprite.x, platform.sprite.y);
                    }
                    this.currentPlatform = platform;
                }
            }
        });
        
        this.matter.world.on('collisionend', (event) => {
            for (const pair of event.pairs) {
                if (pair.bodyA === this.player.body || pair.bodyB === this.player.body) {
                    setTimeout(() => {
                        if (!this.isPlayerOnAnyPlatform()) {
                            this.canJump = false;
                            this.currentPlatform = null;
                        }
                    }, 50);
                }
            }
        });

        this.input.keyboard.on('keydown', (event) => {
            if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.leftPressed = true;
            if (event.code === 'ArrowRight' || event.code === 'KeyD') this.rightPressed = true;
            if (event.code === 'ArrowUp' || event.code === 'Space' || eventcode === 'KeyW') this.jump();
        });
        
        this.input.keyboard.on('keyup', (event) => {
            if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.leftPressed = false;
            if (event.code === 'ArrowRight' || event.code === 'KeyD') this.rightPressed = false;
        });
    }

    // Функция смены цвета игрока
    changePlayerColor(newColor) {
        this.playerColor = newColor;
        if (this.playerSprite) {
            this.playerSprite.fillColor = this.playerColor;
        }
        localStorage.setItem('playerColor', this.playerColor.toString());
    }

    generateAdditionalPlatforms() {
        for (let y = 100; y > -2000; y -= 150 + Math.random() * 100) {
            const x = 100 + Math.random() * 1800;
            this.addPlatform(x, y);
            
            if (Math.random() > 0.5) {
                const x2 = 100 + Math.random() * 1800;
                if (Math.abs(x2 - x) > 250) {
                    this.addPlatform(x2, y + (Math.random() - 0.5) * 50);
                }
            }
        }
    }

    findPlatformByBody(body) {
        return this.platforms.find(platform => platform.body === body);
    }

    isPlayerOnAnyPlatform() {
        const playerY = this.playerSprite.y;
        const playerX = this.playerSprite.x;
        
        for (const platform of this.platforms) {
            const platformTop = platform.sprite.y - 15;
            const platformBottom = platform.sprite.y + 15;
            const platformLeft = platform.sprite.x - 100;
            const platformRight = platform.sprite.x + 100;
            
            if (playerY >= platformTop - 35 && playerY <= platformBottom + 35 &&
                playerX >= platformLeft && playerX <= platformRight) {
                return true;
            }
        }
        return false;
    }

    addPlatform(x, y) {
        const platformId = this.platformIdCounter++;
        const platformSprite = this.add.rectangle(x, y, 200, 30, 0x00ff00);
        const platformGameObject = this.matter.add.gameObject(platformSprite, {
            isStatic: true, restitution: 0, friction: 1,
            label: `platform_${platformId}`
        });
        
        const platform = { id: platformId, sprite: platformSprite, body: platformGameObject.body };
        this.platforms.push(platform);
        return platform;
    }

    createScoreParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            const particle = this.add.circle(x, y, 5, 0xffff00);
            const angle = (Math.PI * 2 / 5) * i;
            const speed = 100 + Math.random() * 50;
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 50,
                alpha: 0, scale: 0.5, duration: 800, ease: 'Quad.easeOut',
                onComplete: () => { particle.destroy(); }
            });
        }
    }

    addScore(points) {
        this.score += points;
        this.updateScoreDisplay();
        
        const scoreElement = document.getElementById('scoreContainer');
        scoreElement.classList.remove('score-animation');
        void scoreElement.offsetWidth;
        scoreElement.classList.add('score-animation');
        
        const bestScore = parseInt(localStorage.getItem('bestScore') || '0');
        if (this.score > bestScore) {
            localStorage.setItem('bestScore', this.score.toString());
            document.getElementById('bestScoreValue').textContent = this.score;
            
            if (bestScore > 0) this.showNewRecord();
        }
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
    }

    showNewRecord() {
        const notification = document.createElement('div');
        notification.className = 'new-record';
        notification.textContent = '🏆 Новый рекорд! 🏆';
        document.body.appendChild(notification);
        setTimeout(() => { notification.remove(); }, 2000);
    }

    jump() {
        if (this.canJump && !this.isDead) {
            this.matter.body.setVelocity(this.player.body, { x: this.player.body.velocity.x, y: -15 });
            this.canJump = false;
            
            this.tweens.add({
                targets: this.playerSprite,
                scaleY: 1.3, scaleX: 0.7,
                yoyo: true, duration: 150, ease: 'Quad.easeOut'
            });
            
            if (this.currentPlatform) {
                this.tweens.add({
                    targets: this.currentPlatform.sprite,
                    scaleY: 0.9, yoyo: true, duration: 100, ease: 'Quad.easeOut'
                });
            }
        }
    }

    update() {
        if (this.isDead) return;

        const currentVelocity = this.player.body.velocity;
        let targetVelocityX = 0;

        if (this.leftPressed) {
            targetVelocityX = -5;
            this.playerSprite.scaleX = Math.abs(this.playerSprite.scaleX) * -1;
        } else if (this.rightPressed) {
            targetVelocityX = 5;
            this.playerSprite.scaleX = Math.abs(this.playerSprite.scaleX);
        } else {
            targetVelocityX = currentVelocity.x * 0.9;
        }

        this.matter.body.setVelocity(this.player.body, { x: targetVelocityX, y: currentVelocity.y });

        if (this.playerSprite.y > window.innerHeight + 1500) this.death();
        
        const heightScore = Math.max(0, Math.floor((800 - this.playerSprite.y) / 500));
        if (heightScore > this.lastHeightScore) {
            this.lastHeightScore = heightScore;
            this.addScore(50);
            this.cameras.main.flash(200, 255, 255, 100);
        }
    }

    death() {
        if (this.isDead) return;
        this.isDead = true;
        
        const bestScore = parseInt(localStorage.getItem('bestScore') || '0');
        if (this.score > bestScore) {
            localStorage.setItem('bestScore', this.score.toString());
        }
        
        this.tweens.add({
            targets: this.playerSprite,
            alpha: 0, rotation: Math.PI * 2, scale: 0.5, duration: 500,
            onComplete: () => {
                this.score = 0;
                this.updateScoreDisplay();
                this.scene.restart();
            }
        });
    }
}

// === ЗАПУСК ИГРЫ И УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ===
window.addEventListener('DOMContentLoaded', () => {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#87ceeb',
        parent: 'game',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1.1 },
                debug: false
            }
        },
        scene: [MainScene],
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };

    // Находим все нужные элементы DOM
    const startButton = document.getElementById('startBtn');
    const skinButton = document.getElementById('skinBtn');
    const controlsDiv = document.getElementById('controls');
    const scoreContainer = document.getElementById('scoreContainer');
    const instructions = document.getElementById('instructions');
    const skinInventory = document.getElementById('skinInventory');
    const closeInventoryBtn = document.getElementById('closeInventoryBtn');
    const skinChoiceButtons = document.querySelectorAll('.skin-choice');
    
    let game = null; // Переменная для хранения экземпляра игры

    // --- Логика инвентаря ---
    skinButton.onclick = () => {
        skinInventory.classList.remove('hidden');
        startButton.classList.add('hidden');
        skinButton.classList.add('hidden');
        if(instructions) instructions.classList.add('hidden');
    };

    closeInventoryBtn.onclick = () => {
        skinInventory.classList.add('hidden');
        startButton.classList.remove('hidden');
        skinButton.classList.remove('hidden');
        if(instructions) instructions.classList.remove('hidden');
    };

    skinChoiceButtons.forEach(button => {
        button.onclick = () => {
            const colorValue = parseInt(button.dataset.color);
            // Просто сохраняем цвет. Он применится при следующем запуске игры.
            localStorage.setItem('playerColor', colorValue.toString());
            
            // Если игра уже запущена, меняем цвет на лету
            if (game) {
                const mainScene = game.scene.getScene('MainScene');
                if (mainScene) {
                    mainScene.changePlayerColor(colorValue);
                }
            }
        };
    });

    // Загружаем лучший результат из localStorage
    const bestScore = localStorage.getItem('bestScore') || '0';
    document.getElementById('bestScoreValue').textContent = bestScore;

    // --- Логика старта игры ---
    startButton.onclick = () => {
        // Скрываем меню
        startButton.style.display = 'none';
        skinButton.style.display = 'none';
        if(instructions) instructions.style.display = 'none';
        
        // Показываем игровой интерфейс
        controlsDiv.style.display = 'flex';
        scoreContainer.style.display = 'block';

        // Создаем и запускаем игру
        game = new Phaser.Game(config);

        // Настраиваем кнопки управления после готовности игры
        game.events.once('ready', () => {
            const mainScene = game.scene.getScene('MainScene');

            const leftButton = document.getElementById('left');
            const rightButton = document.getElementById('right');
            const jumpButton = document.getElementById('jump');

            const setupButton = (button, onPress, onRelease) => {
                button.addEventListener('mousedown', onPress);
                button.addEventListener('mouseup', onRelease);
                button.addEventListener('mouseleave', onRelease);
                button.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
                button.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
                button.addEventListener('touchcancel', (e) => { e.preventDefault(); onRelease(); });
            };

            setupButton(leftButton, () => { mainScene.leftPressed = true; }, () => { mainScene.leftPressed = false; });
            setupButton(rightButton, () => { mainScene.rightPressed = true; }, () => { mainScene.rightPressed = false; });
            setupButton(jumpButton, () => { mainScene.jump(); }, () => {});
        });
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            if (game) {
                game.scale.resize(window.innerWidth, window.innerHeight);
            }
        });
    };
});
