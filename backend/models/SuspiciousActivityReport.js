/**
 * Suspicious Activity Report (SAR/STR) Model
 * Used for NFIU (Nigerian Financial Intelligence Unit) reporting
 */

const mongoose = require('mongoose');

const sarSchema = new mongoose.Schema({
    reportId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Reference to the flagged transaction
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        index: true
    },

    // Reference to the user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Why it was flagged
    redFlags: [{
        type: {
            type: String,
            enum: ['HIGH_VALUE_TRANSACTION', 'POSSIBLE_STRUCTURING', 'RAPID_TRANSFERS', 'ROUND_AMOUNT', 'RESTRICTED_COUNTRY', 'SUSPICIOUS_PAYMENT_METADATA'],
            required: true
        },
        severity: String,
        message: String,
        details: mongoose.Schema.Types.Mixed
    }],

    // Risk assessment
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },

    // Reporting status to NFIU
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'reported', 'archived', 'rejected'],
        default: 'draft'
    },

    // NFIU Submission Details
    nfiu: {
        submissionId: String,
        submittedAt: Date,
        submissionStatus: String,
        responseMetadata: mongoose.Schema.Types.Mixed
    },

    // Internal Audit
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    comments: String,

    // Metadata for NFIU formats (goAML)
    goAmlXml: String,

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

sarSchema.index({ status: 1, riskLevel: 1 });
sarSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SuspiciousActivityReport', sarSchema);
