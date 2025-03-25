const Users = require("../models/Users");
const Conversation = require("../models/Conversation");
const Messages = require("../models/Messages");
const  deleteMessage  = require("./message.controller");
// const { ApiError, CustemError, ApiResponse } = require("../utils/handler");

const getConversation = async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversation = await Conversation.find({
      members: { $elemMatch: { $eq: userId } },
    })
      .populate("members", "_id name email number profile_pic ")
      .populate("groupAdmin", "_id name email number ").populate("latestMessages");
    res.status(200).json(await conversation);
  } catch (error) {
    console.log(error, "Error");
  }
};
const postConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    let users = [senderId, receiverId];
    const newConversation = new Conversation({
      members: users,
    });
    // console.log("newConversation : ", newConversation)
    await newConversation.save();
    return newConversation;
    // res.status(200).send("Conversation Created Successfully");
  } catch (err) {
    console.error("Error: postConversation !", err);
  }
};
const creatGroup = async (req, res) => {
  try {
    const { groupName, senderId, receiverId } = req.body;
    let users = receiverId;
    if (users.length < 2) {
      return res
        .status(400)
        .send("More than 2 users are required to form a group chat");
    }
    users.push(senderId);
    const newConversation = new Conversation({
      conversationName: groupName,
      isGroupConversation: true,
      members: users,
        latestMessages: "" ,
      groupAdmin: senderId,
    });
    await newConversation.save();
    const fullGroupChat = await Conversation.findOne({
      _id: newConversation._id,
    })
      .populate("members", "_id name email profile_pic")
      .populate("groupAdmin", "_id name email profile_pic");

    res.status(200).json(fullGroupChat);
    //   .send("Conversation Created Successfully")
  } catch (error) {
    console.log(error, "Error");
  }
};
const updateGroupConversation = async (req, res) => {
  try {
    const { groupId, groupName, addMember, addAdmin } = req.body;

    const conversation = await Conversation.findOne({ _id: groupId });
    if (!conversation) {
      return res.status(400).send("Conversation not found");
    }
    if (conversation.isGroupConversation) {
      if (groupName) {
        conversation.conversationName = groupName;
      }
      if (addMember) {
        await conversation.members.concat(addMember);
      }
      if (addAdmin) {
        await conversation.groupAdmin.concat(addAdmin);
      }
      await conversation.save();
      res.status(200).json(conversation);
    }
  } catch (error) {
    console.log(error, "Error");
  }
};
const deleteConversation = async (req, res) => {
  try {
    const { _id } = req.body;
    // console.log(_id)
    const checkConverstion = await Conversation.findOne({ _id });

    if (!checkConverstion) {
      return res.status(404).send("Conversation Not Found");
    }
    const deletedMessages=await Messages.deleteMany({conversationId:_id});

    if (deletedMessages.deletedCount< 0) {
      return res.status(404).json({ success: false, message: "Some Error To Delete The Message" });
    }
    // req.body.conversationId = _id;

    // let messageDelete = await deleteMessage(req, res);
    // messageDelete === "Message Deleted" &&
      await Conversation.findByIdAndDelete(_id),
      res.status(200).send("Conversation Deleted Successfully");
  } catch (err) {
    console.error("Error: deleteConversation !", err);
  }
};
module.exports = {
  getConversation,
  postConversation,
  creatGroup,
  updateGroupConversation,
  deleteConversation,
};
