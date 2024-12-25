const speakeasy = require("speakeasy");

const generateOtp = async () => {
  try {
    const token = speakeasy.totp({
      secret: process.env.SPEAKEASY_SECRET,
      encoding: process.env.SPEAKEASY_ENCODING,
      step: 500, //valid for 5 minutes
    });
    return token;
  } catch (error) {
    console.error("Error: Generating OTP!");
  }
};

const verifyOtp = async (otp) => {
  try {
    const isVerified = speakeasy.totp.verify({
      secret: process.env.SPEAKEASY_SECRET,
      encoding: process.env.SPEAKEASY_ENCODING,
      token: otp,
      step: 500,
    });

    if (!isVerified) {
      console.error("Invalid OTP!");
    }
    return isVerified;
  } catch (error) {
    console.error("Error: Verfiying OTP!");
  }
};

module.exports = { generateOtp, verifyOtp };
