const express = require("express");
require("dotenv").config();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const server = require("https").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  },
});

// Connect DB
require("./db/connection");
// Import Files
const Users = require("./models/Users");
const Conversation = require("./models/Conversation");
const Messages = require("./models/Messages");
// App Use
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;
// Socket.io
let users = [];
io.on("connection", (socket) => {
  // console.log("user connected", socket.id);
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
app.post("/api/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(404).send("Please Fill All Required Fields");
    } else {
      const isAlreadyExist = await Users.findOne({ email });
      if (isAlreadyExist) {
        res.status(404).send("User Already Exist");
      } else {
        const user = new Users({
          name,
          email,
        });
        bcryptjs.hash(password, 10, (err, hashedPassword) => {
          user.set("password", hashedPassword);
          user.save();
          next();
        });
        return res.status(201).send("User Register Successfully");
      }
    }
  } catch (error) {
    console.log(error, "Error");
  }
});
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send("Please Fill All Required Fields");
    } else {
      const user = await Users.findOne({ email });
      if (!user) {
        res.status(400).send("User email or password is incorrect");
      } else {
        const validateUser = await bcryptjs.compare(password, user.password);
        if (!validateUser) {
          res.status(400).send("User email or password is incorrect");
        } else {
          const payload = {
            userId: user._id,
            email: user.email,
          };
          const JWT_SECRET_KEY =
            process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";
          jwt.sign(
            payload,
            JWT_SECRET_KEY,
            { expiresIn: 84600 },
            async (err, token) => {
              await Users.updateOne({ _id: user._id }, { $set: { token } });
              user.save();
              return res.status(200).json({
                user: { email: user.email, name: user.name, _id: user.id },
                token: token,
              });
            }
          );
        }
      }
    }
  } catch (error) {
    console.log(error, "Error");
  }
});
// create get conversationId
app.post("/api/conversation", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newConversation = new Conversation({
      members: [senderId, receiverId],
    });
    await newConversation.save();
    res.status(200).send("Conversation Created Successfully");
  } catch (error) {
    console.log(error, "Error");
  }
});
app.get("/api/conversation/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversation = await Conversation.find({
      members: { $in: [userId] },
    });
    const conversationUserData = Promise.all(
      conversation.map(async (conversation) => {
        const receiverId = await conversation.members.find(
          (member) => member !== userId
        );
        const user = await Users.findById(receiverId);
        return {
          user: { userId: user._id, email: user.email, name: user.name },
          conversationId: conversation._id,
        };
      })
    );
    res.status(200).json(await conversationUserData);
  } catch (error) {
    console.log(error, "Error");
  }
});
// message
app.post("/api/message", async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;
    if (!senderId || !message)
      return res.status(400).send("All input is required");
    if (conversationId === "new" && receiverId) {
      const newConversation = new Conversation({
        members: [senderId, receiverId],
      });
      await newConversation.save();
      const newMessage = new Messages({
        conversationId: newConversation.id,
        senderId,
        message,
      });
      await newMessage.save();
      res.status(200).send("Message Sent Successfully");
    } else if (!conversationId && !receiverId) {
      return res.status(400).send("Please Fill All Requiered Fields");
    } else {
      const newMessage = new Messages({ conversationId, senderId, message });
      await newMessage.save();
      res.status(200).send("Message Sent Successfully");
    }
  } catch (error) {
    console.log(error, "Error");
  }
});
app.get("/api/message/:conversationId", async (req, res) => {
  try {
    const checkMessage = async (conversationId) => {
      const messages = await Messages.find({ conversationId });
      const messageUserData = Promise.all(
        messages.map(async (message) => {
          const user = await Users.findById(message.senderId);
          return {
            user: { id: user.id, email: user.email, name: user.name },
            message: message.message,
          };
        })
      );
      res.status(200).json(await messageUserData);
    };
    const conversationId = req.params.conversationId;
    if (conversationId === "new") {
      const checkConverstion = await Conversation.find({
        members: { $all: [req.query.senderId, req.query.receiverId] },
      });
      if (checkConverstion.length > 0) {
        checkMessage(checkConverstion[0]._id);
      } else {
        return res.status(200).json([]);
      }
    } else {
      checkMessage(conversationId);
    }
  } catch (error) {
    console.log(error, "Error");
  }
});
// to get users
app.get("/api/users", async (req, res) => {
  try {
    const users = await Users.find();
    const userData = Promise.all(
      users.map(async (user) => {
        return {
          user: {
            email: user.email,
            name: user.name,
            userId: user._id,
          },
        };
      })
    );
    res.status(200).json(await userData);
  } catch (error) {
    console.log(error, "Error");
  }
});
server.listen(port, () => {
  console.log("listening on port " + port);
});
