const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  name : String,
  email: String,
  password: String,
  lostitems: [
    {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
  founditems: [
    {
      type: Schema.Types.ObjectId,
      ref: "Item",
    },
  ],
  responses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Response",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);