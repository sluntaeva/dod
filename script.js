class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    // Место для загрузки ассетов
  }

  create() {
    // Устанавливаем границы мира
    this.matter.world.setBounds(0, 0, 2000, window.innerHeight + 2000);

    // Инициализация счета
    this.score = 0;
    this.visitedPlatforms = new Set(); // Хранит ID посещенных платформ
    this.platformIdCounter = 0; // Счетчик для уникальных ID платформ
    
    // Создаём массив для хранения платформ
    this.platforms = [];
    const playerStartX = 150;
    const playerStartY = 800;

    // Создаем спрайт и физический объект игрока
    this.playerSprite = this.add.rectangle(playerStartX, playerStartY, 40, 60, 0xff3366);
    this.player = this.matter.add.gameObject(this.playerSprite, {
        restitution: 0.2,
        friction: 0.05,
        label: 'player'
    });

    // Создаем стартовую платформу под игроком
    const startPlatform = this.addPlatform(playerStartX, playerStartY + 100);
    this.visitedPlatforms.add(startPlatform.id); // Помечаем стартовую платформу как посещенную

    // Добавляем остальные начальные платформы
    this.addPlatform(300, 700);
    this.addPlatform(500, 600);
    this.addPlatform(700, 500);
    this.addPlatform(900, 400);
    this.addPlatform(1200, 450);
    this.addPlatform(500, 250);
    
    // Генерируем дополнительные платформы для большей высоты
    this.generateAdditionalPlatforms();

    // Настраиваем камеру
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

    // --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ УПРАВЛЕНИЯ ---
    this.leftPressed = false;
    this.rightPressed = false;
    // -------------------------------------------

    // Игровые состояния
    this.canJump = false;
    this.isDead = false;
    this.currentPlatform = null; // Текущая платформа, на которой стоит игрок

    // Обработка столкновений
    this.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        const playerBody = this.player.body;
        let platformBody = null;
        
        // Определяем, какое тело является платформой
        if (pair.bodyA === playerBody) {
          platformBody = pair.bodyB;
        } else if (pair.bodyB === playerBody) {
          platformBody = pair.bodyA;
        }
        
        if (platformBody && pair.collision.normal.y < 0) {
          this.canJump = true;
          
          // Анимация сжатия при приземлении
          this.tweens.add({
            targets: this.playerSprite,
            scaleY: 0.7, scaleX: 1.3,
            yoyo: true, duration: 150, ease: 'Quad.easeOut'
          });
          
          // Проверяем, если это новая платформа
          const platform = this.findPlatformByBody(platformBody);
          if (platform && !this.visitedPlatforms.has(platform.id)) {
            this.visitedPlatforms.add(platform.id);
            this.addScore(10); // Добавляем 10 очков за новую платформу
            
            // Визуальный эффект на платформе
            this.tweens.add({
              targets: platform.sprite,
              tint: 0x00ff88,
              duration: 200,
              yoyo: true,
              onComplete: () => {
                platform.sprite.clearTint();
              }
            });
            
            // Эффект частиц при получении очков
            this.createScoreParticles(platform.sprite.x, platform.sprite.y);
          }
          
          this.currentPlatform = platform;
        }
      }
    });
    
    // Обработка окончания столкновений
    this.matter.world.on('collisionend', (event) => {
      for (const pair of event.pairs) {
        const playerBody = this.player.body;
        if (pair.bodyA === playerBody || pair.bodyB === playerBody) {
          // Проверяем, покинул ли игрок платформу
          setTimeout(() => {
            if (!this.isPlayerOnAnyPlatform()) {
              this.canJump = false;
              this.currentPlatform = null;
            }
          }, 50);
        }
      }
    });
  }

  generateAdditionalPlatforms() {
    // Генерируем платформы выше начальных
    for (let y = 100; y > -2000; y -= 150 + Math.random() * 100) {
      const x = 100 + Math.random() * 1800;
      this.addPlatform(x, y);
      
      // Иногда добавляем дополнительную платформу на той же высоте
      if (Math.random() > 0.5) {
        const x2 = 100 + Math.random() * 1800;
        if (Math.abs(x2 - x) > 250) { // Убедимся, что платформы не слишком близко
          this.addPlatform(x2, y + (Math.random() - 0.5) * 50);
        }
      }
    }
  }

  findPlatformByBody(body) {
    return this.platforms.find(platform => platform.body === body);
  }

  isPlayerOnAnyPlatform() {
    // Проверяем, стоит ли игрок на какой-либо платформе
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
        isStatic: true, 
        restitution: 0, 
        friction: 1,
        label: `platform_${platformId}`
    });
    
    const platform = {
        id: platformId,
        sprite: platformSprite,
        body: platformGameObject.body
    };
    
    this.platforms.push(platform);
    return platform;
  }

  createScoreParticles(x, y) {
    // Создаем визуальный эффект при получении очков
    for (let i = 0; i < 5; i++) {
      const particle = this.add.circle(x, y, 5, 0xffff00);
      const angle = (Math.PI * 2 / 5) * i;
      const speed = 100 + Math.random() * 50;
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 50,
        alpha: 0,
        scale: 0.5,
        duration: 800,
        ease: 'Quad.easeOut',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  addScore(points) {
    this.score += points;
    this.updateScoreDisplay();
    
    // Добавляем анимацию счета
    const scoreElement = document.getElementById('scoreContainer');
    scoreElement.classList.remove('score-animation');
    void scoreElement.offsetWidth; // Перезапуск анимации
    scoreElement.classList.add('score-animation');
    
    // Проверяем новый рекорд
    const bestScore = parseInt(localStorage.getItem('bestScore') || '0');
    if (this.score > bestScore) {
      localStorage.setItem('bestScore', this.score.toString());
      document.getElementById('bestScoreValue').textContent = this.score;
      
      // Показываем уведомление о новом рекорде
      if (this.score === bestScore + 10) { // Показываем только при первом превышении
        this.showNewRecord();
      }
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
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  jump() {
    if (this.canJump && !this.isDead) {
      this.matter.body.setVelocity(this.player.body, { x: this.player.body.velocity.x, y: -15 });
      this.canJump = false;
      
      // Анимация растяжения при прыжке
      this.tweens.add({
        targets: this.playerSprite,
        scaleY: 1.3, scaleX: 0.7,
        yoyo: true, duration: 150, ease: 'Quad.easeOut'
      });
      
      // Создаем эффект отталкивания от платформы
      if (this.currentPlatform) {
        this.tweens.add({
          targets: this.currentPlatform.sprite,
          scaleY: 0.9,
          yoyo: true,
          duration: 100,
          ease: 'Quad.easeOut'
        });
      }
    }
  }

  update() {
    if (this.isDead) return;

    const currentVelocity = this.player.body.velocity;
    let targetVelocityX = 0;

    // Управление движением
    if (this.leftPressed) {
      targetVelocityX = -5;
      this.playerSprite.scaleX = Math.abs(this.playerSprite.scaleX) * -1; // Поворот влево
    } else if (this.rightPressed) {
      targetVelocityX = 5;
      this.playerSprite.scaleX = Math.abs(this.playerSprite.scaleX); // Поворот вправо
    } else {
      targetVelocityX = currentVelocity.x * 0.9; // Плавное замедление
    }

    this.matter.body.setVelocity(this.player.body, { x: targetVelocityX, y: currentVelocity.y });

    // Проверка падения
    if (this.playerSprite.y > window.innerHeight + 1500) {
      this.death();
    }
    
    // Бонусные очки за высоту (каждые 500 пикселей вверх)
    const heightScore = Math.max(0, Math.floor((800 - this.playerSprite.y) / 500));
    if (heightScore > (this.lastHeightScore || 0)) {
      this.lastHeightScore = heightScore;
      this.addScore(50); // Бонус за высоту
      
      // Специальный эффект за достижение высоты
      this.cameras.main.flash(200, 255, 255, 100);
    }
  }

  death() {
    if (this.isDead) return;
    this.isDead = true;
    
    // Сохраняем результат
    const bestScore = parseInt(localStorage.getItem('bestScore') || '0');
    if (this.score > bestScore) {
      localStorage.setItem('bestScore', this.score.toString());
    }
    
    // Анимация смерти
    this.tweens.add({
      targets: this.playerSprite,
      alpha: 0,
      rotation: Math.PI * 2,
      scale: 0.5,
      duration: 500,
      onComplete: () => {
        // Сбрасываем счет перед перезапуском
        this.score = 0;
        this.updateScoreDisplay();
        this.scene.restart();
      }
    });
  }
}

// --- ГЛАВНЫЙ БЛОК ЗАПУСКА ИГРЫ И ОБРАБОТКИ КНОПОК ---
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

    const startButton = document.getElementById('startBtn');
    const controlsDiv = document.getElementById('controls');
    const scoreContainer = document.getElementById('scoreContainer');
    
    // Загружаем лучший результат
    const bestScore = localStorage.getItem('bestScore') || '0';
    document.getElementById('bestScoreValue').textContent = bestScore;

    startButton.onclick = () => {
        startButton.style.display = 'none';
        controlsDiv.style.display = 'flex';
        scoreContainer.style.display = 'block';

        // Создаем игру
        const game = new Phaser.Game(config);

        // --- НАДЕЖНЫЙ СПОСОБ ПОЛУЧИТЬ СЦЕНУ ---
        game.events.once('ready', () => {
            // Получаем сцену по ключу
            const mainScene = game.scene.getScene('MainScene');

            const leftButton = document.getElementById('left');
            const rightButton = document.getElementById('right');
            const jumpButton = document.getElementById('jump');

            // Универсальная функция настройки кнопки
            const setupButton = (button, action, onDown, onUp) => {
                button.addEventListener('mousedown', () => onDown(action));
                button.addEventListener('mouseup', () => onUp(action));
                button.addEventListener('mouseleave', () => onUp(action));
                button.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(action); });
                button.addEventListener('touchend', (e) => { e.preventDefault(); onUp(action); });
                button.addEventListener('touchcancel', (e) => { e.preventDefault(); onUp(action); });
            };

            const handlePointerDown = (action) => {
                if (action === 'left') mainScene.leftPressed = true;
                if (action === 'right') mainScene.rightPressed = true;
                if (action === 'jump') mainScene.jump();
            };

            const handlePointerUp = (action) => {
                if (action === 'left') mainScene.leftPressed = false;
                if (action === 'right') mainScene.rightPressed = false;
            };

            setupButton(leftButton, 'left', handlePointerDown, handlePointerUp);
            setupButton(rightButton, 'right', handlePointerDown, handlePointerUp);
            setupButton(jumpButton, 'jump', handlePointerDown, () => {});
            
            // Добавляем управление с клавиатуры
            const cursors = mainScene.input.keyboard.createCursorKeys();
            const spaceKey = mainScene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            const wasd = mainScene.input.keyboard.addKeys('W,A,S,D');
            
            mainScene.events.on('update', () => {
                // Обновляем состояние клавиш
                if (cursors.left.isDown || wasd.A.isDown) {
                    mainScene.leftPressed = true;
                } else if (cursors.right.isDown || wasd.D.isDown) {
                    mainScene.rightPressed = true;
                } else {
                    mainScene.leftPressed = false;
                    mainScene.rightPressed = false;
                }
                
                // Прыжок
                if (Phaser.Input.Keyboard.JustDown(cursors.up) || 
                    Phaser.Input.Keyboard.JustDown(spaceKey) || 
                    Phaser.Input.Keyboard.JustDown(wasd.W)) {
                    mainScene.jump();
                }
            });
        });
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            game.scale.resize(window.innerWidth, window.innerHeight);
        });
    };
});