const express = require("express");
const router = express.Router();

const {
  register,
  login,
  verificationOtp,
  getUsers,
  updateUser,
  updatePassword,
  sendOtp,
  resetPassword,
  deleteUser,
  logout,
} = require("../controllers/user.controller");
const {
  getMessage,
  postMessage,
  deleteMessage,
} = require("../controllers/message.controller");
const {
  getConversation,
  postConversation,
  deleteConversation,
  creatGroup,
  updateGroupConversation,
} = require("../controllers/conversation.controller");

// Routes
router.post("/register", register);
router.post("/login", login);
router.get("/users", getUsers);
router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verificationOtp);
router.put("/updateUser", updateUser);
router.put("/updatePassword", updatePassword);
router.post("/resetPassword", resetPassword);
router.delete("/deleteUser", deleteUser);
router.post("/logout", logout);

//  conversationId Routes
router.post("/conversation", postConversation);
router.post("/createGroup", creatGroup);
router.post("/updateGroup", updateGroupConversation);
router.get("/conversation/:userId", getConversation);
router.delete("/conversation/delete", deleteConversation);

// message Routes
router.post("/message", postMessage);
router.get("/message/:conversationId", getMessage);
router.delete("/message/delete", deleteMessage);

module.exports = router;
