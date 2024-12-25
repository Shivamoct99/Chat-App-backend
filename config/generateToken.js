const jwt = require("jsonwebtoken");

const generateToken = async (payload, expiry) => {
  const JWT_SECRET_KEY =
    process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";
  try {
    const token = await jwt.sign(
      payload,
      JWT_SECRET_KEY,
      { expiresIn: expiry } // Token expiration time
    );

    return token;
  } catch (err) {
    console.error("Error: Generating token", err.message);
  }
};

const verifyToken = async (token) => {
  try {
    const isVerified = await jwt.verify(token, process.env.JWT_SECRET);

    return isVerified;
  } catch (err) {
    console.error("Error: Verifying token", err.message);
  }
};
module.exports = { generateToken, verifyToken };
