class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
const sendResponse = (res, statusCode, data, message = "") => {
  res.status(statusCode).json({
    message,
    data,
  });
};

const ApiError = (err, res) => {
  const status = err.statusCode || 500;
  const message = err.message || "INTERNAL SERVER ERROR";
  const extraDetails = err.extraDetails || "Error from Backend details";
  return res.status(status).json({ message: message, extraDetails });
};
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { CustomError, ApiResponse, ApiError, sendResponse };
