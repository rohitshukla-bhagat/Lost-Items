const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recordsSchema = new Schema({
  image: {
    data: Buffer, // Store the binary data of the image
    contentType: String, // Store the MIME type of the image (e.g., "image/png", "image/jpeg")
  },
  senderUsername: String,
  senderEmail: String,
  ownerUsername: String,
  receiverEmail: String,
  date: {
    type: Date,
    default: Date.now,
  },
  status: String,
});

module.exports = mongoose.model("Record", recordsSchema);
