import { InputHandler } from './input.js';
import { GalaxyView } from './galaxy-view.js';
import { SurfaceView } from './surface-view.js';
import { SpaceView } from './space-view.js';
import { music } from './music.js';
import { saveHome, loadHome } from './save.js';
import { LandingCutscene } from './landing-cutscene.js';
import { DeathCutscene } from './death-cutscene.js';
import { FuelCutscene } from './fuel-cutscene.js';
import { QTEPlanet } from './qte-planet.js';
import { Lobby } from './lobby.js';
import { multiplayer } from './multiplayer.js';
import { RemotePlayerPool } from './remote-player.js';

const STATE = { TITLE: 0, GALAXY: 1, SURFACE: 2, SPACE: 3, CUTSCENE: 4, DEATH: 5, FUEL: 6, QTE: 7, LOBBY: 8 };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.state = STATE.TITLE;
    this.input = new InputHandler(canvas);
    this.galaxy = new GalaxyView();
    this.surface = null;
    this.space = null;
    this.qte = null;
    this.cameFromSpace = false;
    this.earnedSoldiers = 0;
    this.cutscene = null;
    this.pendingPlanetName = '';
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.stars = null;
    this.lobby = null;
    this.remotePlayers = new RemotePlayerPool();
    this.multiplayerActive = false;

    this.input.onTap = (x, y) => this.handleTap(x, y);
    this.input.onDragStart = (_x, _y) => {};
    this.input.onDrag = (x, y) => this.handleDrag(x, y);
    this.input.onDragEnd = () => this.handleDragEnd();
    this.input.onKey = (key) => {
      if (this.state === STATE.LOBBY && this.lobby) this.lobby.handleKey(key);
    };
  }

  start() {
    this.state = STATE.GALAXY;
    this.running = true;
    this.lastTime = performance.now();
    music.start();
    music.setMode('galaxy');
    requestAnimationFrame((t) => this.loop(t));
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    if (this.surface) this.surface.resize(w, h);
    if (this.space) this.space.resize(w, h);
  }

  handleTap(x, y) {
    // Skip cutscenes — only via skip button (bottom-right)
    if (this.state === STATE.CUTSCENE || this.state === STATE.DEATH || this.state === STATE.FUEL) {
      const sbx = this.width - 130, sby = this.height - 60;
      if (x >= sbx && x <= sbx + 120 && y >= sby && y <= sby + 44) {
        try { speechSynthesis.cancel(); } catch (_) {}
        if (this.state === STATE.CUTSCENE) {
          if (this.cutscene) { this.cutscene.done = true; this.finishLanding(); }
        } else if (this.state === STATE.DEATH) {
          if (this.cutscene) { this.cutscene.done = true; this.cutscene = null; this.respawnHome(); }
        } else if (this.state === STATE.FUEL) {
          if (this.cutscene) { this.cutscene.done = true; this.cutscene = null; this.landAtGasStation(); }
        }
      }
      return;
    }

    if (this.state === STATE.QTE) {
      if (this.qte) this.qte.handleTap(x, y);
      return;
    }

    if (this.state === STATE.LOBBY) {
      if (this.lobby) this.lobby.handleTap(x, y);
      return;
    }

    if (this.state === STATE.GALAXY) {
      const result = this.galaxy.handleTap(x, y, this.width, this.height);
      if (result === 'enter') this.enterSurface();
      else if (result === 'fly') this.enterSpace();
      else if (result === 'multiplayer') this.enterLobby();
    } else if (this.state === STATE.SURFACE) {
      if (x >= 12 && x <= 52 && y >= 104 && y <= 134) {
        music.toggle(); return;
      }
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.leaveSurface();
        return;
      }
      if (this.surface.gameOver) {
        this.startDeathCutscene();
        return;
      }
      this.surface.handleTouchStart(x, y);
    } else if (this.state === STATE.SPACE) {
      // Mute button
      if (x >= 12 && x <= 52 && y >= 104 && y <= 134) {
        music.toggle(); return;
      }
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.state = STATE.GALAXY; this.space = null;
        music.setMode('galaxy'); return;
      }
      if (this.space.gameOver) {
        this.startDeathCutscene();
        return;
      }
      this.space.handleTouchStart(x, y);
    }
  }

  handleDrag(x, y) {
    if (this.state === STATE.SURFACE) {
      this.surface.handleTouchMove(x, y);
    } else if (this.state === STATE.SPACE) {
      this.space.handleTouchMove(x, y);
    }
  }

  handleDragEnd() {
    if (this.state === STATE.SURFACE) {
      this.surface.handleTouchEnd();
    } else if (this.state === STATE.SPACE) {
      this.space.handleTouchEnd();
    }
  }

  enterSurface() {
    this.cameFromSpace = this.state === STATE.SPACE;
    let planetName = 'Terra Prime';
    if (this.state === STATE.GALAXY && this.galaxy.selectedPlanet >= 0) {
      planetName = this.galaxy.planets[this.galaxy.selectedPlanet].name;
    } else if (this.state === STATE.SPACE && this.space.landTarget >= 0) {
      planetName = this.space.planets[this.space.landTarget].name;
    }
    this.pendingPlanetName = planetName;
    this.cutscene = new LandingCutscene(this.width, this.height, planetName);
    this.state = STATE.CUTSCENE;
    music.setMode('galaxy');
  }

  finishLanding() {
    const planetName = this.pendingPlanetName;
    if (planetName === 'Pixel Arena') {
      this.qte = new QTEPlanet(this.width, this.height);
      this.cutscene = null;
      this.state = STATE.QTE;
      music.setMode('battle');
      return;
    }
    const isHome = planetName === 'Terra Prime';
    const isGas = planetName === 'Gas Station';
    this.surface = new SurfaceView(isHome || isGas);
    this.surface.isGasStation = isGas;
    this.surface.resize(this.width, this.height);
    if (isHome) {
      loadHome(this.surface);
      if (this.earnedSoldiers > 0) {
        this.surface.soldierCount += this.earnedSoldiers;
        this.surface.soldiers.setCount(this.surface.soldierCount, this.surface.player.x, this.surface.player.y);
        this.earnedSoldiers = 0;
      }
    }
    if (this.space) {
      this.surface.resources.add('metal', this.space.metal);
      this.space.metal = 0;
    }
    this.cutscene = null;
    this.state = STATE.SURFACE;
    music.setMode(isHome ? 'surface' : 'battle');
    if (isHome) music.playHomeJingle();
  }

  leaveSurface() {
    if (this.surface) {
      if (this.surface.isHome) {
        saveHome(this.surface);
      } else {
        this.earnedSoldiers += this.surface.soldierCount;
      }
      // Refuel from gas station
      if (this.surface.isGasStation && this.surface.refueled && this.space) {
        this.space.fuel = this.space.maxFuel;
      }
    }
    this.surface = null;
    if (this.cameFromSpace && this.space) {
      this.state = STATE.SPACE;
      music.setMode('space');
    } else {
      this.state = STATE.GALAXY;
      music.setMode('galaxy');
    }
    this.cameFromSpace = false;
  }

  respawnHome() {
    if (this.surface && this.surface.isHome) return;
    if (this.surface && !this.surface.isHome) {
      this.earnedSoldiers += this.surface.soldierCount;
    }
    this.surface = new SurfaceView(true);
    this.surface.resize(this.width, this.height);
    loadHome(this.surface);
    if (this.earnedSoldiers > 0) {
      this.surface.soldierCount += this.earnedSoldiers;
      this.surface.soldiers.setCount(this.surface.soldierCount, this.surface.player.x, this.surface.player.y);
      this.earnedSoldiers = 0;
    }
    this.space = null;
    this.cameFromSpace = false;
    this.state = STATE.SURFACE;
    music.setMode('surface');
    music.playHomeJingle();
  }

  startDeathCutscene() {
    this.cutscene = new DeathCutscene(this.width, this.height);
    this.state = STATE.DEATH;
    music.setMode('galaxy');
  }

  landAtGasStation() {
    this.cameFromSpace = true;
    this.surface = new SurfaceView(false);
    this.surface.isGasStation = true;
    this.surface.resize(this.width, this.height);
    this.state = STATE.SURFACE;
    music.setMode('surface');
  }

  enterLobby() {
    this.lobby = new Lobby();
    this.state = STATE.LOBBY;
  }

  startMultiplayerGame() {
    this.multiplayerActive = true;
    multiplayer.onHostState = (data) => {
      if (data.action === 'start') {
        this.enterSurface();
      }
    };
    this.state = STATE.GALAXY;
    this.lobby = null;
  }

  enterSpace() {
    this.space = new SpaceView(this.galaxy.planets);
    this.space.resize(this.width, this.height);
    this.state = STATE.SPACE;
    music.setMode('space');
  }

  loop(time) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const move = this.input.getMoveVector();
    if (this.state !== STATE.QTE) this.input.yPressed = false;

    if (this.state === STATE.LOBBY) {
      if (this.lobby) {
        this.lobby.update(dt);
        if (this.lobby.done) {
          if (this.lobby.result === 'solo') {
            multiplayer.destroy();
            this.multiplayerActive = false;
            this.state = STATE.GALAXY;
            this.lobby = null;
          } else {
            this.startMultiplayerGame();
            if (this.lobby && this.lobby.result === 'host') {
              multiplayer.broadcastHostState({ action: 'start' });
            }
          }
        }
      }
      return;
    }

    if (this.multiplayerActive && this.state === STATE.SURFACE && this.surface) {
      if (multiplayer.update(dt)) {
        multiplayer.sendState({
          type: 'state',
          x: this.surface.player.x,
          y: this.surface.player.y,
          health: this.surface.player.health,
          maxHealth: this.surface.player.maxHealth,
          skinIndex: this.surface.player.skinIndex,
          name: this.surface.player.skin.name,
        });
      }
      this.remotePlayers.updateFromStates(multiplayer.remoteStates);
      this.remotePlayers.update(dt);
    }

    if (this.state === STATE.GALAXY) {
      this.galaxy.update(dt);
    } else if (this.state === STATE.SURFACE) {
      if (move.x !== 0 || move.y !== 0) {
        this.surface.player.update(dt, move.x, move.y);
      }
      if (this.input.spaceDown) {
        this.surface.tryShoot(this.input.mouseX, this.input.mouseY);
      }
      this.surface.update(dt);
      // Victory cutscene finished — go home
      if (this.surface.victoryCutscene && this.surface.victoryCutscene.done) {
        this.surface.victoryCutscene = null;
        this.respawnHome();
      }
    } else if (this.state === STATE.CUTSCENE) {
      if (this.cutscene) {
        this.cutscene.update(dt);
        if (this.cutscene.done) this.finishLanding();
      }
    } else if (this.state === STATE.DEATH) {
      if (this.cutscene) {
        this.cutscene.update(dt);
        if (this.cutscene.done) {
          this.cutscene = null;
          this.respawnHome();
        }
      }
    } else if (this.state === STATE.SPACE) {
      if (this.input.spaceDown) {
        this.space.shoot(this.input.mouseX, this.input.mouseY);
      }
      this.space.update(dt, move.x, move.y);
      // Enter/Return to land on planet or board alien (after update so targets are fresh)
      if (this.input.enterPressed) {
        this.input.enterPressed = false;
        if (this.space.nearPortal) {
          this.space.wantWarp = true;
        } else if (this.space.boardTarget >= 0) {
          this.space.boardAlien();
        } else if (this.space.landTarget >= 0) {
          this.space.wantLand = true;
        }
      }
      const aliensNear = this.space.aliens.activeCount() > 0;
      music.setMode(aliensNear ? 'battle' : 'space');
      if (this.space.wantLand) {
        this.space.wantLand = false;
        this.enterSurface();
      }
      // Warp to next galaxy
      if (this.space.wantWarp) {
        this.space.wantWarp = false;
        const totalGalaxies = this.galaxy.galaxies.length;
        if (this.galaxy.currentGalaxy < totalGalaxies - 1) {
          this.galaxy.currentGalaxy++;
        } else {
          this.galaxy.addGalaxy();
          this.galaxy.currentGalaxy = this.galaxy.galaxies.length - 1;
        }
        this.galaxy.selectedPlanet = -1;
        // Re-enter space in new galaxy
        this.space = new SpaceView(this.galaxy.planets);
        this.space.resize(this.width, this.height);
        this.space.fuel = 80;
      }
      // Out of fuel
      if (this.space.outOfFuel) {
        this.space.outOfFuel = false;
        this.cutscene = new FuelCutscene(this.width, this.height);
        this.state = STATE.FUEL;
        music.setMode('galaxy');
      }
    } else if (this.state === STATE.QTE) {
      if (this.qte) {
        if (this.input.yPressed) {
          this.input.yPressed = false;
          this.qte.pressY();
        }
        this.qte.update(dt);
        if (this.qte.done) {
          const won = this.qte.won;
          this.qte = null;
          if (won) {
            this.respawnHome();
          } else {
            this.startDeathCutscene();
          }
        }
      }
    } else if (this.state === STATE.FUEL) {
      if (this.cutscene) {
        this.cutscene.update(dt);
        if (this.cutscene.done) {
          this.cutscene = null;
          this.landAtGasStation();
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.state === STATE.LOBBY) {
      if (this.lobby) this.lobby.render(ctx, this.width, this.height);
      return;
    }

    if (this.state === STATE.GALAXY) {
      this.renderStars(ctx);
      this.galaxy.render(ctx, this.width, this.height);
    } else if (this.state === STATE.CUTSCENE || this.state === STATE.DEATH) {
      if (this.cutscene) this.cutscene.render(ctx);
    } else if (this.state === STATE.QTE) {
      if (this.qte) this.qte.render(ctx);
    } else if (this.state === STATE.SURFACE) {
      this.surface.render(ctx);
      if (this.multiplayerActive) {
        this.remotePlayers.render(ctx, this.surface.camera);
        this.renderMultiplayerHUD(ctx);
      }
      this.renderBackButton(ctx);
    } else if (this.state === STATE.SPACE) {
      this.space.render(ctx);
      this.renderBackButton(ctx);
    }
  }

  renderBackButton(ctx) {
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(12, 60, 80, 36, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.stroke();
    ctx.fillStyle = '#aab';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← Back', 52, 82);

    // Mute button
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(12, 104, 40, 30, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.stroke();
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = music.muted ? '#666' : '#aab';
    ctx.fillText(music.muted ? '🔇' : '🔊', 22, 124);
    ctx.textAlign = 'left';
  }

  renderMultiplayerHUD(ctx) {
    const code = multiplayer.roomCode;
    const count = multiplayer.playerCount;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(this.width - 140, 60, 128, 36, 8);
    ctx.fill();
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddccff';
    ctx.fillText(`Room: ${code}  |  ${count}P`, this.width - 76, 82);
    ctx.textAlign = 'left';
  }

  renderStars(ctx) {
    if (!this.stars) {
      this.stars = [];
      for (let i = 0; i < 200; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: Math.random() * 1.5 + 0.5,
          a: Math.random() * 0.8 + 0.2,
        });
      }
    }
    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }
  }
}
