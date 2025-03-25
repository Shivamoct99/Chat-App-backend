const mongoose = require("mongoose");
const conversationSchema = mongoose.Schema(
  {
    conversationName: { type: String, trim: true },
    isGroupConversation: { type: Boolean, default: false },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        // required: true,
      },
    ],
    latestMessages: { type: mongoose.Schema.Types.ObjectId, ref: "Messages" , default:null},
    groupAdmin: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
