const Users = require("../models/Users");
const Conversation = require("../models/Conversation");
const Messages = require("../models/Messages");
const {
  ApiError,
  CustomError,
  ApiResponse,
  sendResponse,
} = require("../utils/handler");
const { postConversation } = require("./conversation.controller");

const getMessage = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    // console.log(req.params.conversationId)
    const checkMessage = async (conversationId) => {
      const messages = await Messages.find({ conversationId }).populate({
        path: "conversationId",
        populate: [
          {
          path: "members",  // Populating latestMessages inside conversationId
          model: "Users",  // Reference model
        },
          {
          path: "latestMessages",  // Populating latestMessages inside conversationId
          model: "Messages",  // Reference model
        }
      ]
      });
      // console.log("messaages :",messages)
      sendResponse(res, 200, messages, "Get All Message Successfully");
          };
          if (conversationId === "new") {
            const checkConverstion = await Conversation.find({
              isGroupConversation: false,
              members: { $all: [req.query.senderId, req.query.receiverId] },
              // $and: [
                //   { members: { $elemMatch: { $eq: req.query.senderId } } },
                //   { members: { $elemMatch: { $eq: req.query.receiverId } } },
                // ],
              });
              if (checkConverstion.length > 0) {
                checkMessage(checkConverstion[0]._id);
              } else {
                sendResponse(res, 200, [], "no messages found");
              }
            } else {
              // console.log(conversationId)
              checkMessage(conversationId);
            }
          } catch (err) {
            console.error("Error: GetMessage !", err);
          }
        };
const postMessage = async (req, res) => {
try {
    const { conversationId, senderId, message, receiverId = "" } = req.body;
    // console.log(conversationId, senderId, message, receiverId)
    if (!senderId || !message || !conversationId || !receiverId) throw new CustomError("All input is required", 400);

    if (conversationId === "new" && receiverId) {
      // console.log("if call")
      const newConversation = await postConversation(req);
      // console.log("newConversation : ",newConversation)
      const newMessage = new Messages({
        conversationId: newConversation.id,
        senderId,
        message,
      });
      // // console.log(newMessage)
      await newMessage.save();
      await Conversation.findByIdAndUpdate(
          { _id: newConversation.id },
          { latestMessages: newMessage.id }
        );
        sendResponse(res, 200, newMessage, "Message Sent Successfully");
      } else {
        // console.log("else")
        const newMessage = new Messages({ conversationId, senderId, message });
        // console.log(newMessage)
      await newMessage.save();
      await Conversation.findByIdAndUpdate(
        { _id: conversationId },
        { latestMessages: newMessage.id }
      );
      const populatedMessage = await Messages.findById(newMessage._id).populate("conversationId");
      sendResponse(res, 200, populatedMessage, "Message Sent Successfully");
    }
  } catch (err) {
    console.error("Error: postMessage !", err.message);
    ApiError(err, res);
  }
};
//   const updateMessage = async (req,res)=>{
  
  //   }
const deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;

     // Validate input
     if (!messageIds && !conversationId) {
      sendResponse(res, 400, [], "Provide either messageIds or conversationId.");
    }

    let deleteQuery = {};

    // ✅ If messageIds are provided, delete those specific messages
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      deleteQuery._id = { $in: messageIds };
    }

    // ✅ If conversationId is provided, delete all messages from that conversation
    if (conversationId) {
      deleteQuery.conversationId = conversationId;
    }

    const deletedMessages=await Messages.deleteMany(deleteQuery);

    if (deletedMessages.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No messages found to delete." });
    }
    if (conversationId) {
      return "Message Deleted"
    }
    sendResponse(res, 200, [], "Message Deleted Successfully");
    // return res.status(200).send("Message Deleted Successfully");
  } catch (error) {
    console.error("Error: DeleteMessage !", err);
  }
};
module.exports = {
  getMessage,
  postMessage,
  deleteMessage,
};

// const postMessage = async (req, res) => {
  //   try {
    //     const { conversationId, senderId, message, receiverId = "" } = req.body;
    //     if (!senderId || !message)
    //       return res.status(400).send("All input is required");
    //     if (conversationId === "new" && receiverId) {
      //       const newConversation = new Conversation({
        //         members: [senderId, receiverId],
        //       });
        //       await newConversation.save();
        //       const newMessage = new Messages({
          //         conversationId: newConversation.id,
          //         senderId,
          //         message,
          //       });
          //       await newMessage.save();
          //       res.status(200).send("Message Sent Successfully");
          //     } else if (!conversationId && !receiverId) {
//       return res.status(400).send("Please Fill All Requiered Fields");
//     } else {
  //       const newMessage = new Messages({ conversationId, senderId, message });
  //       await newMessage.save();
  //       res.status(200).send("Message Sent Successfully");
  //     }
//   } catch (error) {
  //     console.log(error, "Error");
//   }
// };

// const getMessage = async (req, res) => {
//   try {
//     const checkMessage = async (conversationId) => {
//       const messages = await Messages.find({ conversationId });
//       const messageUserData = Promise.all(
//         messages.map(async (message) => {
//           const user = await Users.findById(message.senderId);
//           return {
//             user: { id: user.id, email: user.email, name: user.name },
//             messageId: message.id,
//             message: message.message,
//           };
//         })
//       );
//       res.status(200).json(await messageUserData);
//     };
//     const conversationId = req.params.conversationId;
//     if (conversationId === "new") {
//       const checkConverstion = await Conversation.find({
//         members: { $all: [req.query.senderId, req.query.receiverId] },
//       });
//       if (checkConverstion.length > 0) {
//         checkMessage(checkConverstion[0]._id);
//       } else {
//         return res.status(200).json([]);
//       }
//     } else {
//       checkMessage(conversationId);
//     }
//   } catch (error) {
//     console.log(error, "Error");
//   }
// };
