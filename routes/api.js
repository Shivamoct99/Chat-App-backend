const express = require("express");
const jwt = require("jsonwebtoken");
var router = express.Router();

// Import Files
const Users = require("../models/Users");
const Conversation = require("../models/Conversation");
const Messages = require("../models/Messages");
const generateToken = require("../config/generateToken");

// Routes
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, profile_pic } = req.body;
    if (!name || !email || !password) {
      return res.status(404).send("Please Fill All Required Fields");
    }
    const isAlreadyExist = await Users.findOne({ email });
    if (isAlreadyExist) {
      return res.status(404).send("User Already Exist");
    }

    const user = await Users.create({
      name,
      email,
      password,
      profile_pic,
    });
    if (user) {
      return res.status(201).send("User Register Successfully");
    }
  } catch (error) {
    console.log(error, "Error");
  }
});
// login route
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Please Fill All Required Fields");
    }
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(400).send("User Is Not Register ");
    }
    const validateUser = user.matchPassword(password);
    if (!validateUser) {
      return res.status(400).send("User email or password is incorrect");
    }
    const payload = {
      userId: user._id,
      email: user.email,
    };
    const token = generateToken(payload);
    if (!token) {
      return res.status(400).send("somthing went wrong in token");
    }
    await Users.updateOne({ _id: user._id }, { $set: { token } });
    user.save();
    return res.status(200).json({
      user: {
        email: user.email,
        name: user.name,
        _id: user.id,
        profile_pic: user.profile_pic,
      },
      token: token,
    });
  } catch (error) {
    console.log(error, "Error");
  }
});
//  conversationId
// post route of conversationID
router.post("/conversation", async (req, res) => {
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
// get route of conversationID
router.get("/conversation/:userId", async (req, res) => {
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
          user: {
            userId: user._id,
            email: user.email,
            name: user.name,
            profile_pic: user.profile_pic,
          },
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
router.post("/message", async (req, res) => {
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
router.get("/message/:conversationId", async (req, res) => {
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
router.get("/users", async (req, res) => {
  try {
    const users = await Users.find();
    const userData = Promise.all(
      users.map(async (user) => {
        return {
          user: {
            email: user.email,
            name: user.name,
            userId: user._id,
            profile_pic: user.profile_pic,
          },
        };
      })
    );
    res.status(200).json(await userData);
  } catch (error) {
    console.log(error, "Error");
  }
});

module.exports = router;
