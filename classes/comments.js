var Comments = require('../models/comments');
var Users = require('./users');
function  saveComment(comment,callback){
           Comments.findOne({_id:comment.postId},{_id:1}, function(err, post){
             if(err)
                throw err
              else if(!post){
               var newComment = new Comments()
                 newComment._id  = comment.postId;
                 newComment.comments = [comment];
                 newComment.save(function(err){
                   if(err)
                      throw err;
                 }) 
              }
              else 
               Comments.updateOne({_id:comment.postId},{$push:{comments:comment}}, function(err){
                   if (err)
                      throw err;
               })
               callback()
           })
  }
function returnComments(criteria, fromId, callback){
    var fetchCrieria = [
        {$match: criteria},
        {$unwind:"$comments"},
        {$match: (fromId?{'comments.id':{$lt:fromId}}:{}) } ,
        {$sort: {'comments.id':-1} },
        {$limit:10},
        {$group: {
            _id:"",
            comments:{$push:'$comments'}
        }}
    ]
   Comments.aggregate(fetchCrieria).exec(function(err, comments){
       if(err)
        throw err
          if(comments.length){
            comments = comments[0].comments;
            userIds = comments.map(a=>a._id);
            Users.returnUsers(userIds, function(users){
                var UserComments = comments.map(function(a){
                    a.user = users[users.findIndex(q =>q._id == a._id)]
                    return a
                 })  
             callback(UserComments.reverse());
         })
        }else
        callback([]);
   })
}
    function returnFirstCommentId(postId, callback){
        Comments.aggregate([
            {$match: {_id:postId}},
            {$project:
                {
                    id:1,
                     elemId:{$arrayElemAt:["$comments",0]}
                }
            }
        ]).exec(function(err, comments){
            if(err)
             throw err
             var id = 0;
             if(comments.length)
               id = comments[0].elemId.id
             callback(id)
        }) 
    }
function returnCommentsIds(postId, callback){
  Comments.findOne({_id:postId},{_id:0,'comments._id':1}, function(err, res){
     if(err)
      throw err
      var commentsIds = res?res.comments.map(a=>a._id):[];
      callback(Array.from(new Set(commentsIds)))

  })
}
  module.exports = {
    saveComment: saveComment,
    returnComments:returnComments,
    returnFirstCommentId:returnFirstCommentId,
    returnCommentsIds:returnCommentsIds
  } 