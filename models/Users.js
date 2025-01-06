const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const onlineHoursSchema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  loginTime: {
    type: Date,
    default: null,
  },
  logoutTime: {
    type: Date,
    default: null,
  },
  onlineHours: {
    type: Number,
    default: 0,
  },
});

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    number: {
      type: Number,
      required: true,
      // unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profile_pic: {
      type: String,
      default:
        "https://res.cloudinary.com/lostcoder/image/upload/v1729622453/np1y8ip8rdnhh3dv0en2.png",
    },
    loggedIn: {
      type: Boolean,
      default: false,
    },
    isOtpRequired: {
      type: Boolean,
      default: false,
    },
    onlineLogs: [onlineHoursSchema],
    // token: { type: String },
  },
  {
    timestamps: true,
  }
);
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(10);
      console.log(salt);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      console.error(error);
    }
  }
  //next step which is saving data in database
  next();
});

const Users = mongoose.model("User", userSchema);
module.exports = Users;
