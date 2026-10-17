const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // Hashed password (bcrypt controller me hash hota hai)
        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const UserRecord = mongoose.model("UserRecord", userSchema);

module.exports = UserRecord;