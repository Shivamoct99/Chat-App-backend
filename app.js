const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const Server = require("http").createServer(app);
const io = require("socket.io")(Server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  },
});

const port = process.env.PORT || 8000;

// Connect DB
require("./db/connection");
// Import Files
const Users = require("./models/Users");

// App Use / middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Socket.io
let users = [];
io.on("connection", (socket) => {
  socket.on("addUser", (userId) => {
    const isUserExist = users.find((user) => user.userId === userId);
    if (!isUserExist) {
      const user = { userId, socketId: socket.id };
      users.push(user);
      io.emit("getUsers", users);
    }
  });
  socket.on(
    "sendMessage",
    async ({ senderId, receiverId, message, conversationId }) => {
      const receiver = users.find((user) => user.userId === receiverId);
      const sender = users.find((user) => user.userId === senderId);
      const user = await Users.findById(senderId);
      if (receiver) {
        io.to(receiver.socketId)
          .to(sender.socketId)
          .emit("getMessage", {
            senderId,
            message,
            conversationId,
            receiverId,
            user: { id: user._id, name: user.name, email: user.email },
          });
      } else {
        io.to(sender.socketId).emit("getMessage", {
          senderId,
          message,
          conversationId,
          receiverId,
          user: { id: user._id, name: user.name, email: user.email },
        });
      }
    }
  );
  socket.on("disconnect", () => {
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", users);
  });
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome");
});
app.use("/api", require("./routes/api"));

// error handler middleware
// 404 error
app.use((req, res, next) => {
  res.status(404).json({ message: `Page Not Found-${req.originalUrl}` });
});
// custome error
app.use((err, req, res, next) => {
  res.status(500).json({ message: "Internal Server Error" });
});

Server.listen(port, () => {
  console.log("listening on port " + port);
});
