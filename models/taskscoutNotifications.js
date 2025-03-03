const mongoose = require("mongoose");
var Schema = mongoose.Schema;

var notificationSchema = mongoose.Schema({
    for: String, //ticket, invoice
    title: String,
    description: String,
    affectedId: String,
    initiatedBy: {type: Schema.Types.ObjectId, ref: 'taskscoutusers'},
    userList: [{type: Schema.Types.ObjectId, ref: 'taskscoutusers'}],
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
});

const notification = mongoose.model('notification', notificationSchema);
module.exports = notification;