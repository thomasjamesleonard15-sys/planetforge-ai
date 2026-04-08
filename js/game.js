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
import { RemoteShipPool } from './remote-ship.js';
import { emitParticles } from './space-pools.js';
import { WorldSync } from './world-sync.js';
import { BlackHoleCutscene } from './blackhole-cutscene.js';
import { ArcadeMenu } from './arcade-menu.js';
import { Chat } from './chat.js';
import { IntroCutscene } from './intro-cutscene.js';
import { BatmanPlanet } from './batman-planet.js';
import { CoopBoss } from './coop-boss.js';
import { StoryPlanet } from './story-planet.js';
import { Space3D } from './space-3d.js';
import { Galaxy3D } from './galaxy-3d.js';
import { TaskList } from './task-list.js';
import { RacingGame } from './racing-game.js';

const STATE = { TITLE: 0, GALAXY: 1, SURFACE: 2, SPACE: 3, CUTSCENE: 4, DEATH: 5, FUEL: 6, QTE: 7, LOBBY: 8, BLACKHOLE: 9, ARCADE: 10, RACE: 11, BATMAN: 12, COOP: 13, STORY: 14 };

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
    this.arcade = null;
    this.race = null;
    this.batman = null;
    this.coop = null;
    this.story = null;
    this.space3D = null;
    this.galaxy3D = null;
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
    this.remoteShips = new RemoteShipPool();
    this.multiplayerActive = false;
    this.newBullets = [];
    this.newSurfaceBullets = [];
    this.worldSync = new WorldSync();
    this.chat = new Chat();
    this.tasks = new TaskList();
    this.intro = null;

    this.input.onTap = (x, y) => this.handleTap(x, y);
    this.input.onDragStart = (_x, _y) => {};
    this.input.onDrag = (x, y) => this.handleDrag(x, y);
    this.input.onDragEnd = () => this.handleDragEnd();
    this.input.onActionDrag = (dx, dy) => {
      if (this.state === STATE.SURFACE && this.surface && this.surface.fpsMode) {
        this.surface.fpsLook(dx, dy);
      } else if (this.state === STATE.SPACE && this.space && this.space.fpsMode) {
        this.space.fpsLook(dx, dy);
      }
    };
    this.input.onKey = (key) => {
      if (this.state === STATE.STORY && this.story) { this.story.handleKey(key); return; }
      if (this.multiplayerActive && this.chat.handleKey(key)) return;
      if (this.state === STATE.LOBBY && this.lobby) this.lobby.handleKey(key);
    };
  }

  start() {
    const threeCanvas = document.getElementById('three-canvas');
    if (threeCanvas && !this.space3D) {
      try {
        this.space3D = new Space3D(threeCanvas);
        this.space3D.resize(this.width, this.height);
        this.galaxy3D = new Galaxy3D(this.space3D.renderer, threeCanvas);
        this.galaxy3D.resize(this.width, this.height);
        this.galaxy3D.setupPlanets(this.galaxy.planets);
      } catch (e) { console.error('3D init failed', e); }
    }
    this.intro = new IntroCutscene(this.width, this.height);
    this.state = STATE.TITLE;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  startWithJoin(roomCode) {
    this.running = true;
    this.lastTime = performance.now();
    music.start();
    music.setMode('galaxy');
    this.enterLobby();
    this.lobby.joinCode = roomCode;
    this.lobby.mode = 'connecting';
    multiplayer.joinRoom(roomCode);
    requestAnimationFrame((t) => this.loop(t));
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    if (this.surface) this.surface.resize(w, h);
    if (this.space) this.space.resize(w, h);
    if (this.space3D) this.space3D.resize(w, h);
    if (this.galaxy3D) this.galaxy3D.resize(w, h);
  }

  handleTap(x, y) {
    if (this.state === STATE.TITLE && this.intro) {
      this.intro.handleTap();
      return;
    }

    if (this.tasks.handleTap(x, y)) return;
    if (this.multiplayerActive && this.chat.handleTap(x, y)) return;

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

    if (this.state === STATE.ARCADE) {
      if (this.arcade) this.arcade.handleTap(x, y);
      return;
    }

    if (this.state === STATE.RACE) {
      if (this.race) this.race.handleTap(x, y);
      return;
    }

    if (this.state === STATE.STORY) {
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.story = null; this.respawnHome(); return;
      }
      if (this.story) this.story.handleTap(x, y);
      return;
    }

    if (this.state === STATE.COOP) {
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.coop = null; this.respawnHome(); return;
      }
      if (this.coop) {
        if (this.coop.gameOver || this.coop.done) { this.coop = null; this.respawnHome(); return; }
        this.coop.handleTouchStart(x, y);
      }
      return;
    }

    if (this.state === STATE.BATMAN) {
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.batman = null; this.respawnHome(); return;
      }
      if (this.batman) {
        if (this.batman.gameOver) { this.batman = null; this.respawnHome(); return; }
        this.batman.handleTouchStart(x, y);
      }
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
    } else if (this.state === STATE.RACE && this.race) {
      this.race.handleMove(x, y);
    } else if (this.state === STATE.BATMAN && this.batman) {
      this.batman.handleTouchMove(x, y);
    } else if (this.state === STATE.COOP && this.coop) {
      this.coop.handleTouchMove(x, y);
    }
  }

  handleDragEnd() {
    if (this.state === STATE.SURFACE) {
      this.surface.handleTouchEnd();
    } else if (this.state === STATE.SPACE) {
      this.space.handleTouchEnd();
    } else if (this.state === STATE.RACE && this.race) {
      this.race.handleEnd();
    } else if (this.state === STATE.BATMAN && this.batman) {
      this.batman.handleTouchEnd();
    } else if (this.state === STATE.COOP && this.coop) {
      this.coop.handleTouchEnd();
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
      this.arcade = new ArcadeMenu(this.width, this.height);
      this.cutscene = null;
      this.state = STATE.ARCADE;
      return;
    }
    if (planetName === 'The Unknown') {
      this.story = new StoryPlanet(this.width, this.height, this.multiplayerActive);
      this.cutscene = null;
      this.state = STATE.STORY;
      music.setMode('galaxy');
      return;
    }
    if (planetName === 'Batplanet') {
      this.batman = new BatmanPlanet();
      this.batman.resize(this.width, this.height);
      this.cutscene = null;
      this.state = STATE.BATMAN;
      music.setMode('batman');
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
    this.tasks.complete('land1');
    if (this.multiplayerActive && !multiplayer.isHost && this.surface.enemies) {
      this.surface.enemies.syncedByHost = true;
    }
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
    multiplayer.onChat = (data) => {
      if (data.text) this.chat.addMessage(data.name || 'Player', data.text);
    };
    multiplayer.onGameData = (peerId, data) => {
      if (this.state === STATE.STORY && this.story && this.story.dmTools) {
        if (data.type === 'char-sheet') this.story.dmTools.receiveSheet(peerId, data);
        if (data.type === 'player-choice') this.story.dmTools.receiveChoice(peerId, data.idx, data.custom);
      }
    };
    multiplayer.onHostState = (data) => {
      if (data.action === 'start' && this.state === STATE.LOBBY && this.lobby) {
        this.lobby.done = true;
        this.lobby.result = 'client';
      } else if (data.action === 'world-surface' && this.state === STATE.SURFACE && this.surface) {
        this.worldSync.applySurface(data, this.surface.enemies);
      } else if (data.action === 'world-space' && this.state === STATE.SPACE && this.space) {
        this.worldSync.applySpace(data, this.space);
      } else if (data.action === 'coop-boss' && this.state === STATE.COOP && this.coop) {
        this.coop.applyHostState(data);
      } else if (data.action === 'dm-story' && this.state === STATE.STORY && this.story) {
        this.story.receiveDMStory(data);
      }
    };
  }

  startMultiplayerGame() {
    this.multiplayerActive = true;
    this.lobby = null;
    this.pendingPlanetName = 'Terra Prime';
    this.finishLanding();
    if (!multiplayer.isHost && this.surface && this.surface.enemies) {
      this.surface.enemies.syncedByHost = true;
    }
  }

  enterSpace() {
    this.space = new SpaceView(this.galaxy.planets);
    this.space.resize(this.width, this.height);
    this.state = STATE.SPACE;
    music.setMode('space');
    this.tasks.complete('fly');
    if (this.multiplayerActive && !multiplayer.isHost) {
      this.space.aliens.syncedByHost = true;
    }
    if (this.space3D) {
      this.space.use3D = true;
      this.space3D.setupPlanets(this.space.planets);
      this.space3D.show();
    }
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
    this.tasks.update(dt);
    if (this.state !== STATE.QTE) this.input.yPressed = false;

    if (this.state === STATE.TITLE) {
      if (this.intro) {
        this.intro.update(dt);
        if (this.intro.done) {
          this.intro = null;
          this.state = STATE.GALAXY;
          music.start();
          music.setMode('galaxy');
        }
      }
      return;
    }

    if (this.state === STATE.LOBBY) {
      if (this.lobby) {
        this.lobby.update(dt);
        if (this.lobby.done) {
          if (this.lobby.result === 'solo') {
            multiplayer.destroy();
            this.multiplayerActive = false;
            this.state = STATE.GALAXY;
            this.lobby = null;
          } else if (this.lobby.result === 'host') {
            multiplayer.broadcastHostState({ action: 'start' });
            this.startMultiplayerGame();
          } else {
            this.startMultiplayerGame();
          }
        }
      }
      return;
    }

    if (this.multiplayerActive) {
      this.chat.update(dt);
      const shouldSync = multiplayer.update(dt);
      if (this.state === STATE.SURFACE && this.surface) {
        if (shouldSync) {
          multiplayer.sendState({
            type: 'state', view: 'surface', planet: this.pendingPlanetName,
            x: this.surface.player.x, y: this.surface.player.y,
            health: this.surface.player.health, maxHealth: this.surface.player.maxHealth,
            skinIndex: this.surface.player.skinIndex, name: this.surface.player.skin.name,
            bullets: this.newSurfaceBullets,
          });
          this.newSurfaceBullets = [];
        }
        this.remotePlayers.updateFromStates(multiplayer.remoteStates, this.pendingPlanetName);
        this.remotePlayers.update(dt);
        if (multiplayer.isHost) this.worldSync.hostSyncSurface(dt, this.surface.enemies);
        const dmg = this.remotePlayers.checkHits(
          this.surface.player.x, this.surface.player.y, this.surface.player.radius,
          this.surface.particles
        );
        if (dmg > 0) {
          this.surface.player.health -= dmg;
          if (this.surface.player.health <= 0) {
            this.surface.player.health = 0;
            this.surface.gameOver = true;
          }
        }
      } else if (this.state === STATE.SPACE && this.space) {
        if (shouldSync) {
          multiplayer.sendState({
            type: 'state', view: 'space', galaxy: this.galaxy.currentGalaxy,
            x: this.space.shipX, y: this.space.shipY,
            angle: this.space.shipAngle, thrust: this.space.shipThrust,
            health: this.space.shipHealth, maxHealth: this.space.upgrades.getMaxHp(),
            hijacked: this.space.hijacked, name: 'Player',
            bullets: this.newBullets,
          });
          this.newBullets = [];
        }
        this.remoteShips.updateFromStates(multiplayer.remoteStates, this.galaxy.currentGalaxy);
        this.remoteShips.update(dt);
        if (multiplayer.isHost) this.worldSync.hostSyncSpace(dt, this.space);
        const dmg = this.remoteShips.checkHits(
          this.space.shipX, this.space.shipY, this.space.shipRadius,
          this.space.particles, emitParticles
        );
        if (dmg > 0) {
          this.space.shipHealth -= dmg;
          if (this.space.shipHealth <= 0) { this.space.shipHealth = 0; this.space.gameOver = true; }
        }
      } else if (shouldSync) {
        multiplayer.sendState({ type: 'state', view: 'other' });
      }
    }

    if (this.state === STATE.GALAXY) {
      this.galaxy.update(dt);
      if (this.galaxy.currentGalaxy >= 1) this.tasks.complete('galaxy2');
    } else if (this.state === STATE.SURFACE) {
      if (move.x !== 0 || move.y !== 0) {
        this.surface.player.update(dt, move.x, move.y);
      }
      if (this.input.spaceDown) {
        const couldFire = this.surface.player.fireCooldown <= 0;
        this.surface.tryShoot(this.input.mouseX, this.input.mouseY);
        if (this.multiplayerActive && couldFire && this.surface.player.fireCooldown > 0) {
          for (const p of this.surface.projectiles.pool) {
            if (p.active && p.friendly && p.life > 1.9) {
              this.newSurfaceBullets.push({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: p.life, color: p.color, radius: p.radius, damage: p.damage });
            }
          }
        }
      }
      this.surface.update(dt);
      if (this.surface.enemies) {
        if (this.surface.enemies.wave >= 5) this.tasks.complete('wave5');
        if (this.surface.enemies.wave >= 10) this.tasks.complete('wave10');
      }
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
        const couldFire = this.space.fireCooldown <= 0;
        this.space.shoot(this.input.mouseX, this.input.mouseY);
        if (this.multiplayerActive && couldFire && this.space.fireCooldown > 0) {
          for (const b of this.space.bullets) {
            if (b.active && b.life > 1.7) {
              this.newBullets.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, life: b.life, color: b.color, r: b.r, damage: b.damage });
            }
          }
        }
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
      // Black hole event
      if (this.space.blackHoleEvent) {
        this.space.blackHoleEvent = false;
        this.cutscene = new BlackHoleCutscene(this.width, this.height);
        this.state = STATE.BLACKHOLE;
        this.space = null;
        music.setMode('battle');
      }
    } else if (this.state === STATE.BLACKHOLE) {
      if (this.cutscene) {
        this.cutscene.update(dt);
        if (this.cutscene.done) {
          this.cutscene = null;
          this.respawnHome();
        }
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
            this.tasks.complete('qte');
            this.respawnHome();
          } else {
            this.startDeathCutscene();
          }
        }
      }
    } else if (this.state === STATE.STORY) {
      if (this.story) {
        this.story.update(dt);
        if (this.story.done) { this.story = null; this.respawnHome(); }
      }
    } else if (this.state === STATE.BATMAN) {
      if (this.batman) {
        if (move.x !== 0 || move.y !== 0) {
          this.batman.player.update(dt, move.x, move.y);
        }
        if (this.input.spaceDown) {
          this.batman.tryShoot(this.input.mouseX, this.input.mouseY);
        }
        this.batman.update(dt);
        if (this.batman.wave >= 5) this.tasks.complete('batman5');
        if (this.batman.wave >= 10) this.tasks.complete('batman10');
        if (this.batman.done) {
          this.batman = null;
          this.respawnHome();
        }
      }
    } else if (this.state === STATE.ARCADE) {
      if (this.arcade) {
        this.arcade.update(dt);
        if (this.arcade.done) {
          const choice = this.arcade.choice;
          this.arcade = null;
          if (choice === 'qte') {
            this.qte = new QTEPlanet(this.width, this.height);
            this.state = STATE.QTE;
            music.setMode('battle');
          } else if (choice === 'race') {
            this.race = new RacingGame(this.width, this.height);
            this.state = STATE.RACE;
            music.setMode('space');
          } else if (choice === 'coop') {
            this.coop = new CoopBoss(this.width, this.height);
            this.coop.resize(this.width, this.height);
            this.state = STATE.COOP;
            music.setMode('battle');
          } else {
            this.state = STATE.GALAXY;
            music.setMode('galaxy');
          }
        }
      }
    } else if (this.state === STATE.RACE) {
      if (this.race) {
        this.race.update(dt, move.x, move.y);
        if (this.race.done) {
          if (this.race.won) this.tasks.complete('race');
          this.race = null;
          this.respawnHome();
        }
      }
    } else if (this.state === STATE.COOP) {
      if (this.coop) {
        if (move.x !== 0 || move.y !== 0) this.coop.player.update(dt, move.x, move.y);
        if (this.input.spaceDown) this.coop.tryShoot(this.input.mouseX, this.input.mouseY);
        this.coop.update(dt);
        if (this.multiplayerActive && multiplayer.isHost) this.coop.syncBossState();
        if (this.coop.bossIndex > 0) this.tasks.complete('coop1');
        if (this.coop.victory) this.tasks.complete('coopall');
        if (this.coop.done) { this.coop = null; this.respawnHome(); }
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

    // 3D layer
    if (this.space3D) {
      if (this.state === STATE.SPACE && this.space && !this.space.fpsMode) {
        this.space3D.show();
        this.space3D.syncFromView(this.space);
        this.space3D.render();
      } else if (this.state === STATE.GALAXY && this.galaxy3D) {
        this.galaxy3D.show();
        this.galaxy3D.syncFromView(this.galaxy, this.width, this.height);
        this.galaxy3D.renderer.render(this.galaxy3D.scene, this.galaxy3D.camera);
        this.galaxy.use3D = true;
      } else {
        this.space3D.hide();
      }
    }

    if (this.state === STATE.TITLE) {
      if (this.intro) this.intro.render(ctx);
      return;
    }

    if (this.state === STATE.LOBBY) {
      if (this.lobby) this.lobby.render(ctx, this.width, this.height);
      return;
    }

    if (this.state === STATE.GALAXY) {
      if (!this.galaxy3D) this.renderStars(ctx);
      this.galaxy.render(ctx, this.width, this.height);
      this.tasks.render(ctx, this.width, this.height);
    } else if (this.state === STATE.BLACKHOLE) {
      if (this.cutscene) this.cutscene.render(ctx);
    } else if (this.state === STATE.CUTSCENE || this.state === STATE.DEATH) {
      if (this.cutscene) this.cutscene.render(ctx);
    } else if (this.state === STATE.STORY) {
      if (this.story) this.story.render(ctx);
      this.renderBackButton(ctx);
    } else if (this.state === STATE.COOP) {
      if (this.coop) {
        this.coop.render(ctx);
        if (this.multiplayerActive) this.remotePlayers.render(ctx, this.coop.camera);
      }
      this.renderBackButton(ctx);
    } else if (this.state === STATE.BATMAN) {
      if (this.batman) this.batman.render(ctx);
      this.renderBackButton(ctx);
    } else if (this.state === STATE.ARCADE) {
      if (this.arcade) this.arcade.render(ctx);
    } else if (this.state === STATE.RACE) {
      if (this.race) this.race.render(ctx);
    } else if (this.state === STATE.QTE) {
      if (this.qte) this.qte.render(ctx);
    } else if (this.state === STATE.SURFACE) {
      this.surface.render(ctx);
      if (this.multiplayerActive) {
        this.remotePlayers.render(ctx, this.surface.camera);
        this.renderMultiplayerHUD(ctx);
        this.chat.render(ctx, this.width, this.height);
      }
      this.renderBackButton(ctx);
    } else if (this.state === STATE.SPACE) {
      this.space.render(ctx);
      if (this.multiplayerActive) {
        this.remoteShips.render(ctx);
        this.renderMultiplayerHUD(ctx);
        this.chat.render(ctx, this.width, this.height);
      }
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
    this.tasks.render(ctx, this.width, this.height);
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
