var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    id:Number,
    action: {
    title:String,
    icon:String
    },
    byId:String,
    byName:String,
    location: {
        type:{type: String},
        coordinates:[]
    },
    place:String,
    comments: Number,
    likes: Number,
    likeIds:[],
    img: String,
    text: String,
    date:String
});

module.exports = mongoose.model('posts', schema);
