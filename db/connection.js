const mongoose = require("mongoose");
// const url =
//   "mongodb+srv://chat-app-admin:admin1234@cluster0.vrggz2u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const url = process.env.DBBHOST;

mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB"))
  .catch((e) => console.log("Error", e));
