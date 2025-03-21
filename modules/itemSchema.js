const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemSchema = new Schema({
    name: String,
    description: String,
    location: String,
    contact: Number,
    date : Date,
    image: {
        data: Buffer, // Store the binary data of the image
        contentType: String, // Store the MIME type of the image (e.g., "image/png", "image/jpeg")
    },
    lost : {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model("Item", itemSchema);