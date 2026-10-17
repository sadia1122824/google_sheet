
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
        },

        // OTP verification fields
        otp: {
            type: String,
            default: null
        },

        otpExpires: {
            type: Date,
            default: null
        },

        otpAttempts: {
            type: Number,
            default: 0
        },

        otpLastSent: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const ClientRecord = mongoose.model("ClientRecord", clientSchema);

module.exports = ClientRecord;
