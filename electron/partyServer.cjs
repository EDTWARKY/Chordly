const http = require("http");
const crypto = require("crypto");
const os = require("os");

class PartyServer {
  constructor(port = 39420) {
    this.port = port;
    this.server = null;
    this.rooms = new Map(); // roomCode -> { hostSocket, members: Set<socket>, state: null }
    this.activeRoomCode = null;
    this.isHost = false;
  }

  getLocalIp() {
    try {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal) {
            return net.address;
          }
        }
      }
    } catch {}
    return "127.0.0.1";
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  start() {
    if (this.server) return Promise.resolve(this.port);

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === "/ip") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ip: this.getLocalIp(), port: this.port }));
          return;
        }

        if (req.url === "/status") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              activeRoom: this.activeRoomCode,
              isHost: this.isHost,
              memberCount: this.activeRoomCode ? this.rooms.get(this.activeRoomCode)?.members?.size || 1 : 0,
            })
          );
          return;
        }

        res.writeHead(404);
        res.end("Chordly Party Server");
      });

      // Handle WebSocket upgrade
      this.server.on("upgrade", (req, socket) => {
        const key = req.headers["sec-websocket-key"];
        if (!key) {
          socket.destroy();
          return;
        }

        const accept = crypto
          .createHash("sha1")
          .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
          .digest("base64");

        const responseHeaders = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${accept}`,
          "\r\n",
        ];
        socket.write(responseHeaders.join("\r\n"));

        let currentRoom = null;

        socket.on("data", (chunk) => {
          const frame = this.parseFrame(chunk);
          if (!frame) return;

          try {
            const msg = JSON.parse(frame.payload);
            if (msg.type === "ping") {
              socket.write(this.makeFrame(JSON.stringify({ type: "pong", timestamp: msg.timestamp })));
              return;
            }

            if (msg.type === "join") {
              const code = String(msg.roomCode || "").toUpperCase();
              currentRoom = code;
              let room = this.rooms.get(code);
              if (!room) {
                room = { hostSocket: socket, members: new Set(), state: null };
                this.rooms.set(code, room);
              }
              room.members.add(socket);

              socket.write(
                this.makeFrame(
                  JSON.stringify({
                    type: "joined",
                    roomCode: code,
                    memberCount: room.members.size,
                    state: room.state,
                  })
                )
              );

              this.broadcastToRoom(code, {
                type: "member_count",
                memberCount: room.members.size,
              });
              return;
            }

            if (msg.type === "sync_state") {
              const code = currentRoom || this.activeRoomCode;
              if (code && this.rooms.has(code)) {
                const room = this.rooms.get(code);
                room.state = msg.state;
                this.broadcastToRoom(code, {
                  type: "state_update",
                  state: msg.state,
                }, socket); // don't echo to sender
              }
              return;
            }
          } catch {}
        });

        socket.on("close", () => {
          if (currentRoom && this.rooms.has(currentRoom)) {
            const room = this.rooms.get(currentRoom);
            room.members.delete(socket);
            if (room.members.size === 0) {
              this.rooms.delete(currentRoom);
            } else {
              this.broadcastToRoom(currentRoom, {
                type: "member_count",
                memberCount: room.members.size,
              });
            }
          }
        });

        socket.on("error", () => {
          socket.destroy();
        });
      });

      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          // Port already in use (e.g. another instance or reload), consider it running
          resolve(this.port);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, "0.0.0.0", () => {
        console.log(`[PartyServer] Listening on 0.0.0.0:${this.port}`);
        resolve(this.port);
      });
    });
  }

  broadcastToRoom(roomCode, data, excludeSocket = null) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const frame = this.makeFrame(JSON.stringify(data));
    for (const member of room.members) {
      if (member !== excludeSocket && !member.destroyed) {
        try {
          member.write(frame);
        } catch {}
      }
    }
  }

  makeFrame(str) {
    const payload = Buffer.from(str, "utf8");
    const len = payload.length;
    if (len < 126) {
      const header = Buffer.from([0x81, len]);
      return Buffer.concat([header, payload]);
    } else if (len < 65536) {
      const header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
      return Buffer.concat([header, payload]);
    } else {
      const header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
      return Buffer.concat([header, payload]);
    }
  }

  parseFrame(buffer) {
    if (buffer.length < 2) return null;
    const isMasked = (buffer[1] & 0x80) === 0x80;
    let len = buffer[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buffer.length < 4) return null;
      len = buffer.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (buffer.length < 10) return null;
      len = Number(buffer.readBigUInt64BE(2));
      offset = 10;
    }
    let mask = null;
    if (isMasked) {
      if (buffer.length < offset + 4) return null;
      mask = buffer.subarray(offset, offset + 4);
      offset += 4;
    }
    if (buffer.length < offset + len) return null;
    const payload = Buffer.from(buffer.subarray(offset, offset + len));
    if (isMasked && mask) {
      for (let i = 0; i < len; i++) {
        payload[i] ^= mask[i % 4];
      }
    }
    return { payload: payload.toString("utf8") };
  }

  async createRoom() {
    await this.start();
    const roomCode = this.generateRoomCode();
    this.activeRoomCode = roomCode;
    this.isHost = true;
    this.rooms.set(roomCode, { hostSocket: null, members: new Set(), state: null });
    return {
      roomCode,
      ip: this.getLocalIp(),
      port: this.port,
      wsUrl: `ws://${this.getLocalIp()}:${this.port}`,
    };
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.rooms.clear();
    this.activeRoomCode = null;
    this.isHost = false;
  }
}

module.exports = { PartyServer };
