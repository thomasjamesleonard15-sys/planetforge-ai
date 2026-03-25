const PEER_PREFIX = 'pforge-';
const SYNC_RATE = 1000 / 30;
const CONNECT_TIMEOUT = 8000;

export class Multiplayer {
  constructor() {
    this.peer = null;
    this.connections = [];
    this.isHost = false;
    this.roomCode = '';
    this.connected = false;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onHostState = null;
    this.onChat = null;
    this.localState = null;
    this.remoteStates = new Map();
    this.syncTimer = 0;
    this.error = '';
    this.connecting = false;
    this.peerReady = false;
    this.connectTimer = null;
  }

  generateCode() {
    let code = '';
    for (let i = 0; i < 5; i++) code += Math.floor(Math.random() * 10);
    return code;
  }

  async loadPeer() {
    if (window.Peer) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load PeerJS'));
      document.head.appendChild(s);
    });
  }

  clearTimeout() {
    if (this.connectTimer) { clearTimeout(this.connectTimer); this.connectTimer = null; }
  }

  async createRoom() {
    this.error = '';
    this.connecting = true;
    try {
      await this.loadPeer();
    } catch (_) {
      this.error = 'Failed to load networking';
      this.connecting = false;
      return;
    }
    this.roomCode = this.generateCode();
    this.isHost = true;

    this.clearTimeout();
    this.connectTimer = setTimeout(() => {
      if (this.connecting) {
        this.error = 'Timed out connecting to server';
        this.connecting = false;
      }
    }, CONNECT_TIMEOUT);

    this.peer = new window.Peer(PEER_PREFIX + this.roomCode, { debug: 0 });

    this.peer.on('open', () => {
      this.clearTimeout();
      this.peerReady = true;
      this.connected = true;
      this.connecting = false;
    });

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      this.clearTimeout();
      if (err.type === 'unavailable-id') {
        this.roomCode = this.generateCode();
        this.peer.destroy();
        this.createRoom();
      } else {
        this.error = 'Connection error: ' + (err.type || 'unknown');
        this.connecting = false;
      }
    });

    this.peer.on('disconnected', () => {
      if (this.peerReady && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });
  }

  async joinRoom(code) {
    this.error = '';
    this.connecting = true;
    try {
      await this.loadPeer();
    } catch (_) {
      this.error = 'Failed to load networking';
      this.connecting = false;
      return;
    }
    this.roomCode = code;
    this.isHost = false;

    this.clearTimeout();
    this.connectTimer = setTimeout(() => {
      if (this.connecting) {
        this.error = 'Could not connect — room may not exist';
        this.connecting = false;
      }
    }, CONNECT_TIMEOUT);

    this.peer = new window.Peer(undefined, { debug: 0 });

    this.peer.on('open', () => {
      this.peerReady = true;
      const conn = this.peer.connect(PEER_PREFIX + code, { reliable: true });
      if (!conn) {
        this.clearTimeout();
        this.error = 'Failed to connect to room';
        this.connecting = false;
        return;
      }
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      this.clearTimeout();
      if (err.type === 'peer-unavailable') {
        this.error = 'Room not found — check the code';
      } else {
        this.error = 'Connection error: ' + (err.type || 'unknown');
      }
      this.connecting = false;
    });
  }

  setupConnection(conn) {
    conn.on('open', () => {
      this.clearTimeout();
      this.connections.push(conn);
      this.connected = true;
      this.connecting = false;
      this.error = '';
      if (this.onPlayerJoin) this.onPlayerJoin(conn.peer);
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'state') {
        this.remoteStates.set(conn.peer, data);
      } else if (data.type === 'host-state' && this.onHostState) {
        this.onHostState(data);
      } else if (data.type === 'chat' && this.onChat) {
        this.onChat(data);
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.remoteStates.delete(conn.peer);
      if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
    });

    conn.on('error', (err) => {
      this.error = 'Peer error: ' + (err.type || err.message || 'unknown');
    });
  }

  sendState(state) {
    this.localState = state;
    for (const conn of this.connections) {
      if (conn.open) {
        try { conn.send(state); } catch (_) {}
      }
    }
  }

  broadcastHostState(data) {
    const msg = { type: 'host-state', ...data };
    for (const conn of this.connections) {
      if (conn.open) {
        try { conn.send(msg); } catch (_) {}
      }
    }
  }

  update(dt) {
    this.syncTimer += dt * 1000;
    if (this.syncTimer >= SYNC_RATE) {
      this.syncTimer = 0;
      return true;
    }
    return false;
  }

  get playerCount() {
    return this.connections.length + 1;
  }

  destroy() {
    this.clearTimeout();
    for (const conn of this.connections) conn.close();
    this.connections = [];
    this.remoteStates.clear();
    if (this.peer) { try { this.peer.destroy(); } catch (_) {} }
    this.peer = null;
    this.connected = false;
    this.peerReady = false;
    this.roomCode = '';
    this.isHost = false;
    this.error = '';
    this.connecting = false;
  }
}

export const multiplayer = new Multiplayer();

multiplayer.loadPeer().catch(() => {});
