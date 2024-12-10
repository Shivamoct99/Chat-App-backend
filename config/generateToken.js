const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  const JWT_SECRET_KEY =
    process.env.JWT_SECRET_KEY || "THIS_IS_A_JWT_SECRET_KEY";
  return jwt.sign({ payload }, JWT_SECRET_KEY, { expiresIn: "12d" });
};
module.exports = generateToken;
