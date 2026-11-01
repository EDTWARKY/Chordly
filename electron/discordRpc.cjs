const net = require("net");

class DiscordRpcManager {
  constructor(clientId = "1177081335727267940") {
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectTimer = null;
    this.currentActivity = null;
    this.wasPlaying = false;
    this.enabled = true;
  }

  getPipePath(id) {
    if (process.platform === "win32") {
      return `\\\\?\\pipe\\discord-ipc-${id}`;
    }
    const { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } = process.env;
    const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || "/tmp";
    return `${prefix}/discord-ipc-${id}`;
  }

  async connect() {
    if (this.socket || this.connected || this.connecting || !this.enabled) return;
    this.connecting = true;

    for (let i = 0; i < 10; i++) {
      if (!this.enabled) break;
      const pipe = this.getPipePath(i);
      const ok = await new Promise((resolve) => {
        let sock = null;
        let settled = false;

        const onFinish = (success) => {
          if (settled) return;
          settled = true;
          resolve(success);
        };

        try {
          sock = net.createConnection(pipe, () => {
            this.socket = sock;
            this.sendHandshake();
            onFinish(true);
          });

          sock.on("data", (data) => this.handleData(data));
          sock.on("close", () => this.handleClose());
          sock.on("error", () => {
            if (this.socket === sock) {
              this.socket = null;
              this.connected = false;
            }
            onFinish(false);
          });
        } catch {
          onFinish(false);
        }
      });

      if (ok) {
        break;
      }
    }

    this.connecting = false;
  }

  sendHandshake() {
    if (!this.socket) return;
    const payload = JSON.stringify({ v: 1, client_id: this.clientId });
    this.writeOp(0, payload);
  }

  writeOp(op, jsonStr) {
    if (!this.socket || this.socket.destroyed) return;
    try {
      const len = Buffer.byteLength(jsonStr);
      const header = Buffer.alloc(8);
      header.writeInt32LE(op, 0);
      header.writeInt32LE(len, 4);
      this.socket.write(Buffer.concat([header, Buffer.from(jsonStr)]));
    } catch (e) {
      console.warn("[DiscordRPC] write error:", e.message);
    }
  }

  handleData(data) {
    try {
      if (data.length < 8) return;
      const op = data.readInt32LE(0);
      const len = data.readInt32LE(4);
      const raw = data.subarray(8, 8 + len).toString();
      const body = JSON.parse(raw);

      if (body.cmd === "DISPATCH" && body.evt === "READY") {
        this.connected = true;
        console.log(`[DiscordRPC] Connected to Discord as "${body.data?.user?.username}"`);
        if (this.currentActivity && this.enabled) {
          this.updateActivity(this.currentActivity);
        }
      }
    } catch (e) {
      console.warn("[DiscordRPC] parse data error:", e.message);
    }
  }

  handleClose() {
    this.connected = false;
    this.socket = null;
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !this.enabled) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.enabled) void this.connect();
    }, 15000);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.clearActivity();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    } else {
      if (!this.connected) {
        void this.connect();
      } else if (this.currentActivity) {
        this.updateActivity(this.currentActivity);
      }
    }
  }

  setClientId(clientId) {
    const clean = String(clientId || "").trim();
    const targetId = clean || "1177081335727267940";
    if (this.clientId !== targetId) {
      console.log(`[DiscordRPC] Switching client ID to: ${targetId}`);
      this.clientId = targetId;
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
        this.connected = false;
        if (this.enabled) {
          void this.connect();
        }
      }
    }
  }

  setActivity(activity) {
    this.currentActivity = activity;
    if (!this.enabled) return;

    if (!this.connected) {
      void this.connect();
      return;
    }
    this.updateActivity(activity);
  }

  updateActivity(activity) {
    if (!this.connected || !this.socket || !this.enabled) return;

    if (!activity || !activity.title) {
      return this.clearActivity();
    }

    const now = Math.floor(Date.now() / 1000);
    const progressSec = Math.floor(Number(activity.progress || 0));
    const durationSec = Math.floor(Number(activity.duration || 0));
    const isPlaying = Boolean(activity.isPlaying);

    // When transitioning from playing to paused, clear first so Discord flushes the active timeline bar
    if (this.wasPlaying && !isPlaying) {
      const clearPayload = JSON.stringify({
        cmd: "SET_ACTIVITY",
        args: {
          pid: process.pid,
          activity: null,
        },
        nonce: String(Date.now()),
      });
      this.writeOp(1, clearPayload);
    }
    this.wasPlaying = isPlaying;

    // Clean title, artist, and album
    const title = String(activity.title || "").trim();
    const artist = String(activity.artist || "Unknown Artist").trim();
    const album = String(activity.album || activity.title || "Chordly").trim();

    const details = title.slice(0, 128);
    const state = artist.slice(0, 128);

    const discordActivity = {
      name: "Chordly",
      type: 2, // 2 = Listening to
      details,
      state,
      assets: {
        large_image: activity.cover && /^https?:\/\//i.test(activity.cover) ? activity.cover : "music",
        large_text: album.slice(0, 128),
        small_text: isPlaying ? "Playing on Chordly" : "Paused",
      },
      instance: false,
    };

    // Only attach timestamps when actively playing. When paused, timestamps MUST be omitted
    // so Discord does not continue running the elapsed/countdown timer.
    if (isPlaying && durationSec > 0) {
      discordActivity.timestamps = {
        start: Math.max(0, now - progressSec),
        end: now + Math.max(1, durationSec - progressSec),
      };
    } else if (isPlaying) {
      discordActivity.timestamps = {
        start: Math.max(0, now - progressSec),
      };
    }

    const payload = JSON.stringify({
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: discordActivity,
      },
      nonce: String(Date.now()),
    });

    this.writeOp(1, payload);
  }

  clearActivity() {
    this.currentActivity = null;
    this.wasPlaying = false;
    if (!this.connected || !this.socket) return;
    const payload = JSON.stringify({
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: null,
      },
      nonce: String(Date.now()),
    });
    this.writeOp(1, payload);
  }

  destroy() {
    this.enabled = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearActivity();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.connecting = false;
  }
}

module.exports = { DiscordRpcManager };
