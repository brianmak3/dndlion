var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    _id: String,
    notifications:[{
        postId: String,
        postById:String,
        notfiedBy: String,
        time: String,
        date: String,
        text:String,
        id: Number,
        read: Boolean,
        viewed: Boolean,
        type: { type: String}
    }]
});
module.exports = mongoose.model('notifications', schema);