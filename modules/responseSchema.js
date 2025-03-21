const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const responseSchema = new Schema({
    name: String,
    description: String,
    location: String,
    contact: Number,
    date : Date,
    image: {
        data: Buffer, 
        contentType: String, 
    },
});

module.exports = mongoose.model("Response", responseSchema);