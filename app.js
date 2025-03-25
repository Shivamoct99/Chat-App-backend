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
io.on("connection", (socket) => {
  console.log("connected to socket.io")

  socket.on("addUser", (userId) => {
    socket.join(userId)
    socket.emit("connected");
  });

    socket.on("join chat",(room)=>{
      socket.join(room);
      console.log("user joind Room : " + room)  
    })
  socket.on("sendMessage", (data)=>{
    let conversation=data?.conversationId
    if (!conversation?.members)return console.log("convesation.members is not defined");
    conversation?.members.forEach(user => {    
      if (user==data.senderId) return;   
      socket.in(user).emit("getMessage",data)
    });
  })
  // socket.on("disconnect", () => {
  //   users = users.filter((user) => user.socketId !== socket.id);
  //   io.emit("getUsers", users);
  // });
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
