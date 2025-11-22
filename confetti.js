// Confetti animation system
class Confetti {
  constructor() {
    this.colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    this.particles = [];
    this.isActive = false;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
  }

  // Initialize the canvas
  init() {
    // Create canvas if it doesn't exist
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none'; // Allow clicks through canvas
      this.canvas.style.zIndex = '9999'; // High z-index to be on top
      this.ctx = this.canvas.getContext('2d');
      document.body.appendChild(this.canvas);
    }

    // Set canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  // Resize canvas to match window size
  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  // Start the animation
  start(particleCount = 700) { // さらに増量: 500→700
    if (this.isActive) return; // Already running

    this.init();
    this.isActive = true;
    this.particles = [];
    
    // さらにカラフルな色を追加
    this.colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', 
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', 
      '#FF5722', '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', 
      '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', 
      '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3',
      '#FFE0B2', '#FFCCBC', '#FFD700', '#FFA500', '#FF69B4',
      '#00FFFF', '#8A2BE2', '#7FFF00', '#DC143C', '#00BFFF',
      '#1E90FF', '#DB7093', '#32CD32', '#FF00FF', '#800080',
      '#FF1493', '#00FF7F', '#B0C4DE', '#00FF00', '#BA55D3'
    ];

    // 紙吹雪の種類をさらに追加
    const particleTypes = ['rect', 'circle', 'star', 'heart', 'diamond', 'triangle', 'crown'];
    
    // 打ち上げ方向を前方と両側からの3方向に
    const launchSides = [
      { x: this.canvas.width * 0.2, angle: -Math.PI/2 - Math.PI/4 },
      { x: this.canvas.width * 0.5, angle: -Math.PI/2 },
      { x: this.canvas.width * 0.8, angle: -Math.PI/2 + Math.PI/4 }
    ];

    // 画面を明るくするフラッシュエフェクト
    this.flashScreen();

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      // 左右どちらから発射するか
      const launch = launchSides[Math.floor(Math.random() * launchSides.length)];
      
      // 紙吹雪の種類
      const particleType = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      
      // 大きさをよりバラバラに
      const size = Math.random() * 18 + 5; // さらに大きく: 5-20→5-23
      
      // キラキラ効果の確率を上げる
      const hasGlitter = Math.random() > 0.6; // 40%の確率でキラキラ効果
      
      this.particles.push({
        x: launch.x + (Math.random() * 100 - 50), // 発射地点を少しランダムに
        y: this.canvas.height + 20, // 画面下から打ち上げ
        size: size,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speed: Math.random() * 12 + 10, // さらにスピードアップ: 8-18→10-22
        angle: launch.angle + (Math.random() * Math.PI/4 - Math.PI/8), // 少しランダムな方向に
        rotation: Math.random() * 0.5 - 0.25, // 回転をさらに強く
        rotationSpeed: Math.random() * 0.06 - 0.03, // 回転速度をさらに上げる
        gravity: 0.12 + Math.random() * 0.15, // 軽めに調整して長く滞空
        opacity: 1,
        type: particleType,
        glitter: hasGlitter,
        hue: 0, // 色相回転用（キラキラ効果）
        hueSpeed: Math.random() * 5,
        // トレイル効果（残像）を追加
        trail: hasGlitter && Math.random() > 0.5,
        trailLength: Math.floor(Math.random() * 3) + 2,
        pulseScale: Math.random() > 0.7, // 拍動エフェクト
        pulseSpeed: 0.05 + Math.random() * 0.1
      });
    }

    // 追加の紙吹雪を時間差で4回発射
    setTimeout(() => {
      if (this.isActive) {
        // センターからの発射（1回目）
        for (let i = 0; i < 200; i++) {
          this.particles.push({
            x: this.canvas.width * 0.5 + (Math.random() * 200 - 100),
            y: this.canvas.height + 20,
            size: Math.random() * 15 + 5,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            speed: Math.random() * 10 + 8,
            angle: -Math.PI/2 + (Math.random() * Math.PI/2 - Math.PI/4),
            rotation: Math.random() * 0.4 - 0.2,
            rotationSpeed: Math.random() * 0.04 - 0.02,
            gravity: 0.12 + Math.random() * 0.12,
            opacity: 1,
            type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
            glitter: Math.random() > 0.5,
            hue: 0,
            hueSpeed: Math.random() * 4,
            trail: Math.random() > 0.7,
            trailLength: Math.floor(Math.random() * 3) + 1
          });
        }
        
        // フラッシュ効果再発動
        this.flashScreen(0.2);
      }
    }, 250);
    
    setTimeout(() => {
      if (this.isActive) {
        // 全体に散らばせて発射（2回目）
        for (let i = 0; i < 150; i++) {
          this.particles.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * (this.canvas.height/2),
            size: Math.random() * 12 + 4,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            speed: Math.random() * 6 + 2,
            angle: Math.random() * Math.PI * 2,
            rotation: Math.random() * 0.3 - 0.15,
            rotationSpeed: Math.random() * 0.03 - 0.015,
            gravity: 0.08 + Math.random() * 0.08,
            opacity: 1,
            type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
            glitter: Math.random() > 0.6,
            hue: 0,
            hueSpeed: Math.random() * 3
          });
        }
      }
    }, 600);
    
    setTimeout(() => {
      if (this.isActive) {
        // 上部から落下（3回目）
        for (let i = 0; i < 100; i++) {
          this.particles.push({
            x: Math.random() * this.canvas.width,
            y: 0, // 上から落下
            size: Math.random() * 10 + 3,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            speed: Math.random() * 3 + 1,
            angle: Math.PI/2 + (Math.random() * 0.5 - 0.25), // 下向き
            rotation: Math.random() * 0.2 - 0.1,
            rotationSpeed: Math.random() * 0.02 - 0.01,
            gravity: 0.05 + Math.random() * 0.05,
            opacity: 0.9,
            type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
            glitter: Math.random() > 0.7,
            hue: 0,
            hueSpeed: Math.random() * 2
          });
        }
        
        // フラッシュ効果再発動
        this.flashScreen(0.15);
      }
    }, 1000);
    
    setTimeout(() => {
      if (this.isActive) {
        // 最後の大きな放出（4回目）
        for (let i = 0; i < 250; i++) {
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 100;
          
          this.particles.push({
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
            size: Math.random() * 14 + 4,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            speed: Math.random() * 8 + 3,
            angle: angle, // 全方向に発射
            rotation: Math.random() * 0.4 - 0.2,
            rotationSpeed: Math.random() * 0.04 - 0.02,
            gravity: 0.03 + Math.random() * 0.04, // 非常に軽く
            opacity: 0.95,
            type: particleTypes[Math.floor(Math.random() * particleTypes.length)],
            glitter: Math.random() > 0.5,
            hue: 0,
            hueSpeed: Math.random() * 4,
            trail: Math.random() > 0.6,
            trailLength: Math.floor(Math.random() * 4) + 2,
            pulseScale: Math.random() > 0.6,
            pulseSpeed: 0.05 + Math.random() * 0.1
          });
        }
        
        // 最後の強いフラッシュ
        this.flashScreen(0.3);
      }
    }, 1500);

    // Start animation loop
    this.animate();
    
    // Auto stop after 8 seconds (さらに長く)
    setTimeout(() => this.stop(), 8000);
  }
  
  // 画面全体をフラッシュさせる効果
  flashScreen(intensity = 0.25) {
    // フラッシュ用のオーバーレイを作成
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = intensity;
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.5s ease';
    flash.style.zIndex = '9998'; // キャンバスより下
    
    document.body.appendChild(flash);
    
    // フェードアウト
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => {
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash);
        }
      }, 500);
    }, 100);
  }

  // Animation loop
  animate() {
    if (!this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    let stillActive = false;
    
    for (const particle of this.particles) {
      // Move particle
      particle.x += Math.cos(particle.angle) * particle.speed;
      particle.y += Math.sin(particle.angle) * particle.speed + particle.gravity;
      particle.angle += particle.rotation;
      particle.rotationSpeed *= 0.99;
      particle.speed *= 0.97;
      particle.gravity *= 1.01;
      particle.size *= 0.99;
      
      // キラキラ効果を持つ粒子の色相を回転させる
      if (particle.glitter) {
        particle.hue += particle.hueSpeed;
        if (particle.hue >= 360) particle.hue = 0;
      }
      
      // 拍動エフェクト（サイズが周期的に変化）
      if (particle.pulseScale) {
        particle.pulsePhase = (particle.pulsePhase || 0) + particle.pulseSpeed;
        particle.scaleFactor = 1 + Math.sin(particle.pulsePhase) * 0.2; // サイズを±20%変化
      } else {
        particle.scaleFactor = 1;
      }
      
      // Fade out particles when they reach the bottom
      if (particle.y > this.canvas.height * 0.8) {
        particle.opacity -= 0.02;
      }
      
      // Draw particle if still visible
      if (particle.opacity > 0 && particle.size > 1) {
        // トレイル（残像）効果の描画
        if (particle.trail) {
          for (let i = 1; i <= particle.trailLength; i++) {
            const trailOpacity = particle.opacity * (1 - i / (particle.trailLength + 1)) * 0.6;
            const trailSize = particle.size * (1 - i * 0.15);
            const trailDistance = i * 3;
            
            if (trailSize > 0.5) {
              this.ctx.save();
              this.ctx.globalAlpha = trailOpacity;
              
              // 残像用の色（グラデーション）
              const trailColor = particle.glitter 
                ? this.colors[Math.floor(Math.random() * this.colors.length)]
                : particle.color;
              this.ctx.fillStyle = trailColor;
              
              // 移動方向の逆に残像を描画
              const trailX = particle.x - Math.cos(particle.angle) * trailDistance;
              const trailY = particle.y - Math.sin(particle.angle) * trailDistance;
              
              this.ctx.translate(trailX, trailY);
              this.ctx.rotate(particle.angle);
              this.ctx.scale(0.8, 0.8); // 残像は少し小さく
              
              // 残像も同じ形で描画
              this.drawParticleShape(particle, trailSize);
              
              this.ctx.restore();
            }
          }
        }
        
        // メインの粒子を描画
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity;
        
        // キラキラ効果用の色設定
        if (particle.glitter) {
          // より多彩な色の変化
          this.ctx.fillStyle = this.colors[Math.floor(Math.random() * this.colors.length)];
        } else {
          this.ctx.fillStyle = particle.color;
        }
        
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.angle);
        
        // 拍動エフェクトの適用
        if (particle.pulseScale) {
          this.ctx.scale(particle.scaleFactor, particle.scaleFactor);
        }
        
        // 粒子タイプに応じて異なる形状を描画
        this.drawParticleShape(particle, particle.size);
        
        this.ctx.restore();
        stillActive = true;
      }
    }
    
    // Continue animation if particles are still visible
    if (stillActive) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }
  
  // 粒子の形状を描画する関数（種類に応じて描画メソッドを切り替え）
  drawParticleShape(particle, size) {
    switch (particle.type) {
      case 'rect':
        // 長方形の紙吹雪
        this.ctx.fillRect(-size / 2, -size / 4, size, size / 2);
        break;
        
      case 'circle':
        // 円形の紙吹雪
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'star':
        // 星形の紙吹雪
        this.drawStar(0, 0, size / 2, 5);
        break;
        
      case 'heart':
        // ハート形の紙吹雪
        this.drawHeart(0, 0, size / 2);
        break;
        
      case 'diamond':
        // ダイヤモンド形の紙吹雪
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size / 2);
        this.ctx.lineTo(size / 2, 0);
        this.ctx.lineTo(0, size / 2);
        this.ctx.lineTo(-size / 2, 0);
        this.ctx.closePath();
        this.ctx.fill();
        break;
        
      case 'triangle':
        // 三角形の紙吹雪
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size / 2);
        this.ctx.lineTo(size / 2, size / 2);
        this.ctx.lineTo(-size / 2, size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        break;
        
      case 'crown':
        // 王冠風の紙吹雪
        this.drawCrown(0, 0, size / 2);
        break;
        
      default:
        // デフォルトは長方形
        this.ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    }
  }
  // 星形を描画するヘルパー関数
  drawStar(cx, cy, radius, points = 5) {
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? radius : radius / 2;
      const angle = (i * Math.PI) / points;
      const x = cx + r * Math.sin(angle);
      const y = cy + r * Math.cos(angle);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  // ハート形を描画するヘルパー関数
  drawHeart(cx, cy, radius) {
    const width = radius * 2;
    const height = radius * 2;
    this.ctx.beginPath();
    const topCurveHeight = height * 0.3;
    this.ctx.moveTo(cx, cy + height / 4);
    // 左上のカーブ
    this.ctx.bezierCurveTo(
      cx, cy, 
      cx - width / 2, cy, 
      cx - width / 2, cy - topCurveHeight
    );
    // 左側のカーブ
    this.ctx.bezierCurveTo(
      cx - width / 2, cy - height / 2, 
      cx, cy - height / 2, 
      cx, cy
    );
    // 右側のカーブ
    this.ctx.bezierCurveTo(
      cx, cy - height / 2, 
      cx + width / 2, cy - height / 2, 
      cx + width / 2, cy - topCurveHeight
    );
    // 右上のカーブ
    this.ctx.bezierCurveTo(
      cx + width / 2, cy, 
      cx, cy, 
      cx, cy + height / 4
    );
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  // 王冠型を描画するヘルパー関数
  drawCrown(cx, cy, radius) {
    const width = radius * 2;
    const height = radius * 1.5;
    
    this.ctx.beginPath();
    // 王冠の下部
    this.ctx.moveTo(cx - width/2, cy + height/3);
    this.ctx.lineTo(cx + width/2, cy + height/3);
    
    // 王冠の右側
    this.ctx.lineTo(cx + width/2, cy);
    
    // 右の小さな突起
    this.ctx.lineTo(cx + width/3, cy - height/5);
    this.ctx.lineTo(cx + width/4, cy);
    
    // 中央の大きな突起
    this.ctx.lineTo(cx, cy - height/2);
    
    // 左の小さな突起
    this.ctx.lineTo(cx - width/4, cy);
    this.ctx.lineTo(cx - width/3, cy - height/5);
    
    // 王冠の左側
    this.ctx.lineTo(cx - width/2, cy);
    
    this.ctx.closePath();
    this.ctx.fill();
    
    // 装飾（オプション）
    if (radius > 10) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - height/4, radius/6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // Stop the animation
  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove canvas after animation stops
    if (this.canvas) {
      setTimeout(() => {
        if (this.canvas && this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
          this.canvas = null;
          this.ctx = null;
        }
      }, 100);
    }
  }
}

// Create singleton instance
const confetti = new Confetti();

// Function to trigger confetti with sound and notification
function celebrateOrder() {
  // Start the visual confetti - ここでパーティクル数を増量・カスタマイズして更に華やかに
  confetti.start(700); // 粒子数を大幅に増量 (300 → 700)
  
  // Play upbeat celebration sound with cheerful music
  // Base64エンコードされた明るいリズムの効果音データ
  // 以下は明るく元気なサウンドエフェクトです
  const cheerfulSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAEYgDMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAWQAAAAAAAABGJknX2LAAAAAAD/+9DEAAAIkAN5tBAAJMXH7z81kFDkqmRqW5MUISiIhgCxkwoA4D/E4zgPnAcZPnOLgPqA+Dlj5wf8Dg/+oHwfP///U/rB9wOcHx//AOCsYSFQAAFkDIAEwRQYgZM1aGUmYK0JGaYGwuGwHZgyGgGGgCgAegimCYDAJAS7IkCoxf+K8w4D/+gKVsF7LOOU/yp7O2+bx5Ofi5mgz5OcRUcJbGLGAoFQuBWf//5cEAQD/pv8UAEFQaG9YAAwSQMJoGxh/C5mmrOUGLKO2ZBQNhheQ3MgAAiAoTDDAwAwBzA+QRy5/xR/53+UMUiPO5Z///uYXwgECOkAUF////4UgHf4qlh8JQPAeAwAADJ1AAYgQw7y7LqB3Qe0PMzPDK0i0hWAwgDYKwNFgOAcAwIAaESf5H/D/NdWVyjGLOyX////rLxwWCfXHQBGCwMWaMA4D////+O51qiiZJBZJxpHIGCgHGAEAMYIIYJ9cF1AxQOeDvDrJrYyZgNYGQARBwgjoFkaCoRB/oj/B9nK0eHY5YMP/////iZFlRXJVAOB1LC0KBIMBgIf/////43HvPJNNBIkKkXkgwsA0wCgBzAhAhNpQ0oGAAo4NgM0mU+5cAFQGsAiDxAHgLJoLhEH+yP8G2UrTQfyPKDD/////kXNMXUTTRAWjMlhKy6fAwEA4CAMBgOf/////HRJq0mGdQsxYUoKAKMAUAIwFQC69XQ4GrBCoOwGOC9iGlgB0DIwEgMThPjQPDQKBEH+wPdwWlk/ocsMP/////+HJMrkjy8WgKV+LyiKsEggFAcDAYH//////DMMxopEb02FmEADmAMACYBoBheqmcDLgcwHQAFtbBPKkgMgJYAE4EBgEBgFhcF////+A////XyQkLRyLjDC//////5JgGCT2mqoiCIABMMAqAYYHwA5fq8sDYAZ8SoFdG+SmJq+cSmAHAUJgCBk04Llf////9P//+myKlknJ7mGH//////eiAAR7aUhEBQAQoAQwBABBwAa5q7MAGgKORgNkH8lp7UgIgxMAcCz+S5f/////p//9Gl0jmPTMMP//////fODRO1FIQgSAIGACMAIAQYAF6mpxAAZnGrXFAVc1BsWZcQRLwLAubqXL/////6f//0rE0ekysww///////KSEYnUUxBBQAIQAcYAIAIgAJIqojABuAXBdwZsEAAA1fxpXAOgKHwMC5Qlcn/////2///OZHqRVMsMMP//////5zMLAk9JIiGYeQYCAQDgFDQR3/UvZWVAoFqBmBygUYPUFTAiQCQnCETg8DP///+Q////y7ZKR+YYYf//////pDAOFnpJDIwXDADAKBIOCH/5LWBACwMAqgNMCVACYBdE8SAeAwLggJ+HQM////8j////7JJXSGmGGf//////VZ0CA09JFKAiAAgqCZDzKADABFwUsARBBQhDQSDQUAjgUFQDC3B0DP///+D////2M3RpqYYf//////2STggeJEOw8ABMEU2FQGkGgMEAYHA4JeDAl4PC4B5fA8DP////D////4+NLUYYf//////5MEwkeA0DA8A9AxhNgmF4BA4FgnxIFPBkXAPLoHgM////+A////c7ZKkxhh///////FgZVAYWdOBQBZiAdAmIYDA8DgaBIF4WCbBoX4PC4B5eg+AYf///+H////vUXpkxhh///////wlBoE9ODADzBEBoGQbAYA4PgkC8JBRg0MeHhe5XB8DP///+P////R3FqZMYYf//////0hQQCTBwPAOAQMA8DgLdTAcAgDA8CQLwkFGBQ14MjHh4ZeXQPA0P///4////9nSNUmMMMP//////8lUFA1QaDwDAEDAQA4CzUYAgEAcHgSBeEgowODPDgzcNCE0AOH///+f////TpFmTGGGH//////+YPEAoaDwPAMAQMBADQHtQAgCgGB4EgXhIKMDBHw0Fnh0V+XgPA8P///5////dKUyYwww///////0OaCgaYPAgAwBgxggOAE1CCACgGB4EgXhIKMCg/w0PWQi/0AOG////P////pSmTGGGH//////+UPEAkweCIAgCBgJAaDRqGEAkAYHgSBeEgmAgSQSRN//tQxLWAZHaPnn8UACi21H/P5qAFEyPgQkGh3w+B4HB////4f///+lKp1MMv//////+YIgAlbRgSBICQYCQGAwajAEBEAwPAkC8JBJgkG2EYXh4bOXROQ+H///8P////VKpphh///////jAwBCU6MEQCAgGAkBoLdQggEgDB8EATBIJMEgvwkGnDY9MuA+D4f///x////5KpqYYf//////4aSCAS3QwRAICAYCQGg41DCAQAIHwQBMEgkwSDjCIX8PDUy6D4Ph////H////kqmphh///////QgYABJ4NBgQiwYDgGxUMJhQAgfBIEwSCLBYL8JA/w8L7LgPg+H////P////VVTTLr//////+GjAYJPBsMBICBgOAaCDUMIBIAgfBAEwSCLBYO8Igrw8J3LgPg+H////P////kVU0yw///////nDoASYfEwGBYGBgEhqSAwVwJJA1DU1KSmUJgUCQkkDUNTUpKZQmBQJCSQNQ1NSl//9SMCQSNQ1KSf/0SkoJEgah//pJTKDCRqGpf/+kEiQSJA1L///oJGpQYSCRqG///0NDQyEKE0kkl///UhVKbGyulMrKXKS///+Xy+i4kkkv///uJJJFU3RJZcSyD////8T/JJf///7EiRLlTdVCDQ0I4GBQBwYEAMBgKAYHYA7Df////wbGDTHx////4wbGfajjrrrr////6kQSXZX///+QQQQQ4bNxUQaHBHAwKAQDAkAwGAkDAHA3AGxv////+DYwaY+P////jBsZ9mOOuuuv////qJBJdlf///5BBBBDhs3ABuQFGDxAwQASDAuAwMAxDAQAYgF7/////0Njf/////w2OepOSct9D////+QeXl2V///ygAAANm41II3BSgwgEKDBAAoMEAAwQAQAYEQ23/////xsb/////+Gxz1Jy//////0dZll//////JAAADgcnIBMmEpBhAJQGCgBwIBADgYDQDBMBcYb/////+jd//////8Nmzw3///////SSyyyyyyVVVVVkokDf//9gMQBFBACAICQcMADw0MhIqLrZCOiwyNlw0My6zQj4uNka/+2DE84JmdqQQexsAOQrTghjbIwPjYyOKpCPi42Rr42MjY6Qj42Qj4+P/42MjY6Qj42Qj4+P/42MjY6R/jZCPj4//jYyNjpH+N/42Pj//+NjI2Okf43/jY+P//42MjY6R/jf+Nj4//k46Qj5WOkf43/jY+P//+NjZH+N/42Pj///jY2R/jf+Nj4///42Nkf43/jY+P///jY2R/jf+Nj4///49/jf+Nj4///5WPf43/jY+P///lY9/jf+Nj4///+Vj3+N/42Qj///5WPf43/jZCRMQU1FMy4xMDBUVERFVEFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==');
  
  // Adjust volume and play
  cheerfulSound.volume = 0.7; // 音量を少し上げる
  cheerfulSound.play().catch(e => console.log('Cannot play cheerful sound:', e));
  
  // 追加のチャイムエフェクト（オーバーラップさせて豪華に）
  setTimeout(() => {
    const secondSound = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAJlRJVDIAAAAZAAAAaHR0cDovL3d3dy5mcmVlc2Z4LmNvLnVrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');
    secondSound.volume = 0.4;
    secondSound.play().catch(e => console.log('Cannot play second sound:', e));
  }, 300);
  
  // スクリーンシェイク効果を追加 - 画面を少し揺らす
  addScreenShake();
  
  // 光るボーダー効果を追加
  addGlowingBorder();
  
  // 大きな「提供完了」テキストを画面中央に表示
  showCompletionText();
  
  // Show a temporary notification with more animation
  showCompletionNotification();
}

// 画面中央に大きな「提供完了」メッセージを表示する
function showCompletionText() {
  // 完了数を取得
  let completeCount = parseInt(localStorage.getItem('orderCompleteCount') || '0');
  
  // メッセージ要素の作成
  const messageElement = document.createElement('div');
  messageElement.style.position = 'fixed';
  messageElement.style.top = '50%';
  messageElement.style.left = '50%';
  messageElement.style.transform = 'translate(-50%, -50%)';
  messageElement.style.fontSize = '6rem'; // 非常に大きなフォントサイズ
  messageElement.style.fontWeight = '900'; // 極太フォント
  messageElement.style.color = 'rgba(46, 204, 113, 0.9)'; // メインの色（少し透過）
  messageElement.style.textShadow = '0 0 20px rgba(46, 204, 113, 0.8), 0 0 30px rgba(255, 255, 255, 0.6)'; // 光る効果
  messageElement.style.zIndex = '10001'; // 通知よりも上に表示
  messageElement.style.fontFamily = "'Noto Sans JP', sans-serif";
  messageElement.style.textAlign = 'center';
  messageElement.style.opacity = '0';
  messageElement.style.userSelect = 'none'; // テキスト選択を防止
  messageElement.style.pointerEvents = 'none'; // クリックイベントを通過させる
  messageElement.style.whiteSpace = 'nowrap'; // 改行しない
  
  // 3Dエフェクトの追加
  messageElement.style.perspective = '500px';
  messageElement.style.transformStyle = 'preserve-3d';
  
  // テキストの追加
  messageElement.innerHTML = `${completeCount}件<br>提供完了!`;
  
  // アニメーション用のクラスを追加
  messageElement.style.animation = 'bigText-appear 2.5s ease-in-out forwards';
  
  // スタイルシートに追加
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bigText-appear {
      0% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.3) rotate(-5deg);
      }
      30% { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1.2) rotate(5deg);
      }
      50% { 
        transform: translate(-50%, -50%) scale(1) rotate(-2deg);
      }
      70% { 
        transform: translate(-50%, -50%) scale(1.1) rotate(1deg);
      }
      100% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.8) translateY(-100px);
      }
    }
  `;
  document.head.appendChild(style);
  
  // DOMに追加
  document.body.appendChild(messageElement);
  
  // 一定時間後に削除（アニメーション時間より長く）
  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.parentNode.removeChild(messageElement);
    }
  }, 2600);
}

// スクリーンシェイク効果 - 画面を軽く揺らす
function addScreenShake() {
  const body = document.body;
  body.style.transition = 'transform 0.05s ease-in-out';
  
  // 揺れるアニメーション
  const directions = [
    { x: -5, y: -3 },
    { x: 4, y: 2 },
    { x: -3, y: 1 },
    { x: 2, y: -2 },
    { x: -1, y: 2 },
    { x: 0, y: 0 } // 最後は元の位置に戻す
  ];
  
  // 連続して揺らす
  directions.forEach((dir, index) => {
    setTimeout(() => {
      body.style.transform = `translate(${dir.x}px, ${dir.y}px)`;
    }, index * 60); // 60msごとに異なる方向へ
  });
  
  // 揺れ終わったらスタイルをリセット
  setTimeout(() => {
    body.style.transition = '';
    body.style.transform = '';
  }, directions.length * 60 + 100);
}

// 画面の縁を光らせる効果
function addGlowingBorder() {
  // ボーダーオーバーレイを作成
  const border = document.createElement('div');
  border.style.position = 'fixed';
  border.style.top = '0';
  border.style.left = '0';
  border.style.width = '100%';
  border.style.height = '100%';
  border.style.boxShadow = 'inset 0 0 30px 10px rgba(46, 204, 113, 0.7)';
  border.style.pointerEvents = 'none';
  border.style.zIndex = '9997';
  border.style.transition = 'opacity 1.5s ease-out';
  border.style.opacity = '0.8';
  
  document.body.appendChild(border);
  
  // 徐々にフェードアウト
  setTimeout(() => {
    border.style.opacity = '0';
    setTimeout(() => {
      if (border.parentNode) {
        border.parentNode.removeChild(border);
      }
    }, 1500);
  }, 200);
}

// Function to show a notification when order is completed
function showCompletionNotification() {
  // Create notification element - さらに豪華なスタイルに
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = 'rgba(46, 204, 113, 0.95)';
  notification.style.color = 'white';
  notification.style.padding = '20px 30px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15), 0 0 15px rgba(46, 204, 113, 0.5)';
  notification.style.zIndex = '10000';
  notification.style.fontWeight = 'bold';
  notification.style.fontSize = '1.4rem';
  notification.style.textAlign = 'center';
  notification.style.transition = 'all 0.3s ease';
  notification.style.animation = 'notification-pulse 1.2s ease-in-out';
  notification.style.border = '2px solid rgba(255, 255, 255, 0.5)';
  
  // 光るエフェクト追加
  notification.style.backgroundImage = 'linear-gradient(135deg, rgba(46, 204, 113, 0.95), rgba(46, 204, 113, 0.95), rgba(26, 188, 156, 0.95))';
  
  // Add icon and text with animated emoji - アイコンと絵文字を増やす
  // 既存の完了数を取得
  let completeCount = parseInt(localStorage.getItem('orderCompleteCount') || '0');
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
      <i class="fas fa-check-circle" style="font-size: 1.6rem; margin-right: 5px;"></i>
      <span>${completeCount}件提供完了しました！</span>
      <span style="animation: emoji-bounce 0.8s infinite; display: inline-block;">🎉</span>
      <span style="animation: emoji-bounce 0.8s 0.2s infinite; display: inline-block;">🎊</span>
      <span style="animation: emoji-bounce 0.8s 0.4s infinite; display: inline-block;">✨</span>
    </div>
  `;
  
  // Add animation keyframes - アニメーションをより豪華に
  const style = document.createElement('style');
  style.textContent = `
    @keyframes notification-pulse {
      0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
      40% { transform: translateX(-50%) scale(1.15); opacity: 1; }
      60% { transform: translateX(-50%) scale(0.95); opacity: 1; }
      80% { transform: translateX(-50%) scale(1.05); opacity: 1; }
      100% { transform: translateX(-50%) scale(1); opacity: 1; }
    }
    @keyframes emoji-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-12px) rotate(10deg); }
      60% { transform: translateY(-7px) rotate(-5deg); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 15px rgba(46, 204, 113, 0.5); }
      50% { box-shadow: 0 0 25px rgba(46, 204, 113, 0.8); }
    }
  `;
  document.head.appendChild(style);
  
  // グロウエフェクト追加
  notification.style.animation = 'notification-pulse 1.2s ease-in-out, glow 1.5s ease-in-out infinite';
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // 数字カウントアップ効果（オプション）- 完了カウンターの表示
  const counterElement = document.createElement('div');
  counterElement.style.position = 'fixed';
  counterElement.style.bottom = '20px';
  counterElement.style.right = '20px';
  counterElement.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
  counterElement.style.color = 'white';
  counterElement.style.padding = '10px 15px';
  counterElement.style.borderRadius = '50%';
  counterElement.style.width = '60px';
  counterElement.style.height = '60px';
  counterElement.style.display = 'flex';
  counterElement.style.alignItems = 'center';
  counterElement.style.justifyContent = 'center';
  counterElement.style.flexDirection = 'column';
  counterElement.style.fontWeight = 'bold';
  counterElement.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
  counterElement.style.zIndex = '9999';
  counterElement.style.opacity = '0';
  counterElement.style.transform = 'scale(0.5)';
  counterElement.style.transition = 'all 0.5s ease';
  
  // 既存の完了数を取得、カウントアップして保存
  let completeCount = parseInt(localStorage.getItem('orderCompleteCount') || '0');
  completeCount++;
  localStorage.setItem('orderCompleteCount', completeCount.toString());
  
  counterElement.innerHTML = `
    <div style="font-size: 1.4rem;">${completeCount}</div>
    <div style="font-size: 0.7rem; margin-top: -5px;">完了済</div>
  `;
  
  document.body.appendChild(counterElement);
  
  // カウンター表示アニメーション
  setTimeout(() => {
    counterElement.style.opacity = '1';
    counterElement.style.transform = 'scale(1)';
  }, 500);
  
  // Remove after 4 seconds with fade out effect - 表示時間を延長
  setTimeout(() => {
    notification.style.opacity = '0';
    counterElement.style.opacity = '0';
    counterElement.style.transform = 'scale(0.5)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (counterElement.parentNode) {
        counterElement.parentNode.removeChild(counterElement);
      }
    }, 500);
  }, 4000);
}

// Export the celebration function
export { celebrateOrder };