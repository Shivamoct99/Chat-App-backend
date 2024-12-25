const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { CustomError, ApiError } = require("../utils/handler");
const { generateOtp, verifyOtp } = require("../utils/two-factor-auth");
const sendEmail = require("../utils/nodemailer");

// Import Files
const Users = require("../models/Users");
const Conversation = require("../models/Conversation");
const Messages = require("../models/Messages");
const { generateToken } = require("../config/generateToken");

// Routes
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, number, password, profile_pic } = req.body;
    // Check for missing required fields
    if (!name || !email || !number || !password) {
      throw new CustomError("Please enter all required fields", 404);
    }
    // Check if the email or phone number already exists
    const isemailExist = await Users.findOne({ email });
    const isnumberExist = await Users.findOne({ number });
    if (isemailExist || isnumberExist) {
      throw new CustomError(
        `User with this ${
          (isemailExist && "email") || (isnumberExist && "number")
        } already exists`,
        403
      );
    }

    // Create a new user
    const user = await Users.create({
      name,
      email,
      number,
      password,
      profile_pic,
      loggedIn: false,
      isOtpRequired: false,
      lastLoginTime: null,
      loginHours: 0,
    });
    if (user) {
      return res.status(201).send("User Register Successfully");
    }
  } catch (err) {
    console.error("Error: Registering user!", err);
    ApiError(err, res);
  }
});

// login route
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Check for missing required fields
    if (!email || !password) {
      throw new CustomError("Please enter all required fields", 400);
    }
    // Check if the user exists
    const user = await Users.findOne({ email });
    if (!user) {
      throw new CustomError("Cannot find email", 404);
      // return res.status(400).send("User Is Not Register ");
    }
    // Compare password
    const validateUser = await user.matchPassword(password);
    if (!validateUser) {
      throw new CustomError("Wrong Password", 403);
      // return res.status(400).send("User password is incorrect");
    }
    // Check if the user is already logged in
    if (user.loggedIn) {
      throw new CustomError("User already logged in on another device", 403);
    }
    const payload = {
      userId: user._id,
    };
    const token = await generateToken(payload, "24h");
    if (!token) {
      throw new CustomError("Error generating token!", 400);
    }
    // await Users.updateOne({ _id: user._id }, { $set: { token } });
    user.loggedIn = true;
    // user.isOtpRequired = isAllowedToLogin;
    user.onlineLogs.push({
      date: new Date(),
      loginTime: new Date(),
      logoutTime: null,
      onlineHours: 0,
    });
    user.save();
    return res.status(200).json({
      message: "User Logged In Successfully",
      token,
      user: {
        _id: user.id,
        email: user.email,
        name: user.name,
        number: user.number,
        profile_pic: user.profile_pic,
      },
    });
  } catch (err) {
    console.error("Error: Logging in user!", err.message);
    ApiError(err, res);
  }
});

// logout route
router.post("/logout", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    let user = await Users.findOne({ email });
    if (!user) {
      throw new CustomError("Cannot find email", 404);
    }

    // Check if the user is logged in
    if (!user.loggedIn) {
      throw new CustomError("User is not logged in", 403);
    }

    const lastLoggedOut = new Date();

    let lastRecord = await user.onlineLogs[user.onlineLogs?.length - 1];

    const lastLoggedIn = lastRecord.loginTime;

    // time difference in hours {timestamp/(second * mints * hrs)}
    const duration = (lastLoggedOut - lastLoggedIn) / (1000 * 60 * 60);
    // console.log("duration", duration);

    if (lastRecord) {
      // console.log("inlastRecord", lastRecord);
      lastRecord.onlineHours = duration;
      lastRecord.logoutTime = lastLoggedOut;
    } else {
      // console.log("elselastRecord");
      await user.onlineLogs.push({
        date: today,
        loginTime: null,
        logoutTime: today,
        onlineHours: duration,
      });
    }

    // Set the user as logged out
    user.loggedIn = false;

    await user.save();

    return res.status(200).json({ message: "User Logged Out Successfully" });
  } catch (err) {
    console.error("Error: Logging out user!", err.message);
    ApiError(err, res);
  }
});

// Update user information
router.put("/update", async (req, res) => {
  const { _id, name, email, number, profile_pic } = req.body;
  try {
    // const { _id } = req;
    const user = await Users.findOne({ _id });
    // Check if the user is logged in
    if (!user.loggedIn) {
      throw new CustomError("User is not logged in", 403);
    }
    // Update the user information
    if (name) user.name = name;
    if (email) user.email = email;
    if (number) user.number = number;
    // if (password) {
    //   user.password = await bcrypt.hash(password, 10);
    // }
    if (profile_pic) user.profile_pic = profile_pic;

    // Save the updated user
    const updatedUser = await user.save();

    // Send updated user data to the client
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        number: updatedUser.number,
        profile_pic: updatedUser.profile_pic,
      },
    });
  } catch (err) {
    console.error("Error: Logging out user!", err.message);
    ApiError(err, res);
  }
});

router.put("/updatePassword", async (req, res) => {
  const { _id, currentPassword, newpassword } = req.body;

  try {
    // Check for missing required fields
    if (!_id || !currentPassword || !newpassword) {
      throw new CustomError("Please enter all required fields", 400);
    }

    // Find the user by userId
    let user = await Users.findOne({ _id });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    // Compare current password with the stored hash
    const isMatch = user.matchPassword(currentPassword);

    if (!isMatch) {
      throw new CustomError("Current password is incorrect", 403);
    }

    // Update the user's password
    user.password = newpassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error: Updating password", err.message);
    ApiError(err, res);
  }
});

router.post("/forgotPassword", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Users.findOne({ email }); // Corrected method

    if (!user) {
      throw new CustomError("User not found!", 404);
    }

    const otp = await generateOtp();

    let mailOptions = {
      from: process.env.NODEMAILER_USERNAME,
      to: email,
      subject: "Password Reset",
      text: `Please enter the following OTP to reset your password: \n\n Your OTP is: ${otp}`,
    };

    await sendEmail(mailOptions);

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Error:Forget Password", err.message);
    ApiError(err, res);
  }
});

router.post("/resetPassword", async (req, res) => {
  const { email, otp, password } = req.body;

  try {
    const user = await Users.findOne({ email });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    const isVerified = await verifyOtp(otp);

    if (!isVerified) {
      throw new CustomError("Invalid OTP", 403);
    }

    user.password = password; // Ensure password is hashed before saving

    await user.save();

    return res.status(200).json({ message: "Password reset successfully!" });
  } catch (err) {
    console.error("Error:Resetting password!", err.message);
    ApiError(err, res);
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
