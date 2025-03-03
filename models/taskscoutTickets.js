const mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ticketsSchema = mongoose.Schema({
  organisationId: {
    type: Schema.Types.ObjectId,
    ref: 'taskscoutorganisation'
  },
    siteName: {
        type: String
    },
    placedBy: String,
    siteNumber: {
        type: Number
    },
    ETA: Date,
    ticketNumber: {
        type: Number
    },
    technician: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    waitingParts: [String],
    jobCompleted: {
        type: Boolean,
        default: false
    },
    jobCompletedStore:  {
        type: Boolean,
        default: false
    },
    workOrder: [{
        savedParts: [{
            id: String,
            text: String,
            timeFinished: Date,
            timeOfArrival: Date,
            valueType: String,
            workTime: String,
            workTimeSeconds: Number,
            rate: Number,
        }],
        managerSignatureUrl: String,
        vendorSignatureUrl: String,
        totalWorkTime: String,
        images: [String],
        explain: String,
        submittedAt: {
            type: Date,
            default: new Date()
        },
    }],
    invoice: { 
        partAmount: Number,
        additionalExpenses: [
            {
                expenseName: String,
                expenseAmount: Number
            }
        ],
        totalAmount: Number,
        labourAmount: Number,
        totalLaborCost: Number,
        totalPartCost: Number,
        totalWorkTime: Number,
        managerSignatureUrl: String,
        vendorSignatureUrl: String,
        approved: {
            type: Boolean,
            default: false
        },
        images: [String],
        submittedAt: {
            type: Date,
            default: new Date()
        },
    }, 
    photos: [{
        url: String,
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
    }],
    issue: {
        type: String
    },
    explain: {
        type: String
    },
    timeSpent: {
        type: String
    },
    cost: {
        type: String
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'locations'
    },
    vendor: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    dateOfService: {
        type: Date,
        default: Date.now()
    },

    expDateService: {
        type: Date,
    },
    provider: {
        type: String,
    },
    approved: {
        type: String,
        default: 'pending'
    },
    approvedByVendor: {
        type: Boolean,
    },
    reason: {
        type: String,
    },
    otherNotes: String,
    createdAt: {
        type: Date,
        default: Date.now()
    },
});

const Tickets = mongoose.model('taskscouttickets', ticketsSchema);
module.exports = Tickets;