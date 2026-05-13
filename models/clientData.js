const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
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

        password: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true
        },

        clientId: {
            type: String,
            required: true,
            unique: true
        },

        assignStaff: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const ClientRecord = mongoose.model("ClientRecord", clientSchema);

module.exports = ClientRecord;