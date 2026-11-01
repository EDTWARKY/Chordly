const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "chordly-listen-together" }));
});

const wss = new WebSocket.Server({ server });
const rooms = new Map();

wss.on("connection", (ws) => {
  let currentRoom = null;
  const userId = Math.random().toString(36).substring(2, 10);

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === "ping") {
        return ws.send(JSON.stringify({ type: "pong", timestamp: data.timestamp }));
      }
      if (data.type === "create_party") {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms.set(roomId, {
          host: userId,
          users: new Set([ws]),
          state: { track: null, time: 0, playing: false, queue: [] },
        });
        currentRoom = roomId;
        ws.send(JSON.stringify({ type: "party_created", roomId, isHost: true }));
      }
      if (data.type === "join_party") {
        const room = rooms.get(String(data.roomId || "").toUpperCase());
        if (room) {
          room.users.add(ws);
          currentRoom = String(data.roomId).toUpperCase();
          ws.send(
            JSON.stringify({
              type: "party_joined",
              roomId: currentRoom,
              state: room.state,
              memberCount: room.users.size,
            })
          );
        } else {
          ws.send(JSON.stringify({ type: "error", message: "Party room not found" }));
        }
      }
      if (data.type === "sync_state" && currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.state = { ...room.state, ...data.state };
          room.users.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "state_update", state: room.state }));
            }
          });
        }
      }
    } catch (e) {
      console.error("[Party Server Error]:", e.message);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.users.delete(ws);
      if (room.users.size === 0) rooms.delete(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Chordly Listen Together Server running on ws://localhost:${PORT}`)
);
