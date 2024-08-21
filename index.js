const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

app.post("/api/messages", async (req, res) => {
  const { senderId, receiverId, content } = req.body;

  try {
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
    });
    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
});

app.get("/api/messages/:chatRoomId", async (req, res) => {
  const { chatRoomId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { chatRoomId: parseInt(chatRoomId) },
      include: { sender: true, receiver: true },
    });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("Received login request:", { username, password });

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log("User found:", user);

    if (!user || user.password !== password) {
      console.log("Invalid username or password");
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.status(200).json({ message: "Login successful!", user });
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password,
      },
    });
    res.status(200).json({ message: "Registration successful!", user });
  } catch (err) {
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
});

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with your client URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("chat message", async (msg) => {
    try {
      const chat = await prisma.message.create({
        data: {
          user: msg.user,
          content: msg.message,
        },
      });
      io.emit("chat message", chat);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


