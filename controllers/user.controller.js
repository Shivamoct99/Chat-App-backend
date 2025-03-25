// Import Files
const Users = require("../models/Users");
// const Conversation = require("../models/Conversation");
// const Messages = require("../models/Messages");
const { generateToken } = require("../config/generateToken");
const { CustomError, ApiError } = require("../utils/handler");
const { generateOtp, verifyOtp } = require("../utils/two-factor-auth");
const sendEmail = require("../utils/nodemailer");

const register = async (req, res) => {
  // console.log("register");
  const { name, email, number, password, profile_pic } = req.body;
  try {
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
    const newUser = new Users({
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
    let user=await newUser.save()
    if (user) {
      return res.status(201).json({message:"User Register Successfully"});
    }
  } catch (err) {
    console.error("Error: Registering user!", err);
    ApiError(err, res);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // Check for missing required fields
    if (!email || !password) {
      throw new CustomError("Please enter all required fields", 400);
    }
    // Check if the user exists
    const user = await Users.findOne({ email }).select("+password");
    // console.log(user)
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
    await Users.updateOne({ _id: user._id }, { $set: { token } });
    user.loggedIn = true;
    // user.isOtpRequired = isAllowedToLogin;
    user.onlineLogs.push({
      date: new Date(),
      loginTime: new Date(),
      logoutTime: null,
      onlineHours: 0,
    });
    user.save();
    // console.log(user,token)
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
};

const logout = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if the user exists
    let user = await Users.findOne({ email }).select("+loggedIn");
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
};

const verificationOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // const user = await Users.findOne({ email });

    // if (!user) {
    //   throw new CustomError("User not found", 404);
    // }

    const isVerified = await verifyOtp(otp);

    if (!isVerified) {
      throw new CustomError("Invalid OTP", 403);
    }
    return res.status(200).json({ message: "Verify Otp successfully!" });
  } catch (err) {
    console.error("Error:Verify Otp!", err.message);
    ApiError(err, res);
  }
};
const getUsers = async (req, res) => {
  try {
    const users = await Users.find();
    const userData = Promise.all(
      users.map(async (user) => {
        return {
          user: {
            email: user.email,
            name: user.name,
            _id: user._id,
            profile_pic: user.profile_pic,
          },
        };
      })
    );
    res.status(200).json(await userData);
  } catch (error) {
    console.log(error, "Error");
  }
};
const updateUser = async (req, res) => {
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
};
const updatePassword = async (req, res) => {
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
};
const sendOtp = async (req, res) => {
  const { email ,verify} = req.body;
  // console.log(verify)
  try {
    const user = await Users.findOne({ email }); // Corrected method
    if (verify) {

    if (user) {
      throw new CustomError("User Already Have Acoount!", 404);
    }
      const otp = await generateOtp();

      let mailOptions = {
        from: process.env.NODEMAILER_USERNAME,
        to: email,
        subject: "For Email Verification",
        text: `Your OTP is: ${otp}. \n\n It is valid for 5 minutes.`,
      };
  
      await sendEmail(mailOptions);
  
      return res.status(200).json({ message: "Email Sent" });   
    };

    // const user = await Users.findOne({ email }); // Corrected method

    if (!user) {
      throw new CustomError("User Do Not Have Account!", 404);
    }

    const otp = await generateOtp();

    let mailOptions = {
      from: process.env.NODEMAILER_USERNAME,
      to: email,
      subject: "Password Reset",
      text: `Your OTP is: ${otp}. \n\n It is valid for 5 minutes.`,
    };

    await sendEmail(mailOptions);

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Error:send Otp", err.message);
    ApiError(err, res);
  }
};
const resetPassword = async (req, res) => {
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
};
const deleteUser = async (req, res) => {
  const { _id } = req.body;

  try {
    const user = await Users.findOne({ _id });

    if (!user) {
      throw new CustomError("User not found", 404);
    }

    if (!user.loggedIn) {
      throw new CustomError("User Not Login ", 404);
    }
    await Users.findOneAndDelete({ _id });
    return res.status(200).json({ message: "user Delete Sucessfully" });
  } catch (err) {
    console.error("Error:Delete User!", err.message);
    ApiError(err, res);
  }
};

module.exports = {
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
};
