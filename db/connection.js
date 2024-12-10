const mongoose = require("mongoose");
const url = process.env.DBBHOST;

mongoose
  .connect(url)
  .then(() => console.log("Connected to DB"))
  .catch((e) => console.log("Error", e));
