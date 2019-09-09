var Posts = require('../models/posts');
var Functions = require('../Functions');
function getFirstPost(userId, callback){
    Posts.findOne({byId: userId},{id:1,_id:0}, function(err, res){
      if(err)
       throw err 
       else if(res) 
       callback (res.id);
       else
       callback (0);
    })
 }
 function fetchAllPosts(coords,callback){
  fetchAndSort(coords,0,function(posts){
      callback(posts);
  })
 }
function fetchAndSort(cordinates, maxDist, callback){
  distances = [100, 200, 500, 1000, 10000];
   Posts.aggregate([
     {
       $geoNear:{
         near:{
          type:'Point',
          coordinates:cordinates
        },
        distanceField:'dis.calculated',
        maxDistance:distances[maxDist],
        spherical:true 
      }
     },
     {$sort:{_d:-1,comments:-1,}},
     {
       $group: { _id:  "$location.coordinates",  count:{$sum:1},
       post: { $first: {_id:"$_id", id:"$id",
       place:'$place',date:"$date",action:"$action", time:'$time', text:"$text",
       byId:"$byId", likeIds:"$likeIds", comments:"$comments"}}
       }
    },
    {$limit: 20}
   ]).exec(function(err, posts){
    if(err)
      throw err
     if(posts.length == 20 || maxDist == 4)
      callback({posts:posts,maxDist:(maxDist==4?17:maxDist==3?15:maxDist==2?16:17)});
     else
     fetchAndSort(cordinates,maxDist+1,callback)
 })
 }
 function getUserPosts(criteria, callback){
    Posts.find(criteria,function(err, res){
      if(err)
        throw err;
      else callback(res)
    }).sort({id:-1}).limit(6)
}
function fetchPostList(cordinates, query, callback){
  Posts.aggregate([
    {
      $geoNear:{
        near:{
         type:'Point',
         coordinates:cordinates
       },
       distanceField:'dis.calculated',
       maxDistance:1000,
       spherical:true,
       query:query 
     },
    }]).exec()
}
 function getFirstPostInList(posts, data, callback){
     Posts.findOne({
       location:{
          $nearSphere:{
            $geometry: {
              type:'Point',
              coordinates:data.coords
            },
            $maxDistance:10
          }
       }
     }, {id:1, _id:0}, function(err, res){
       if(err)
        throw err 
        else
          callback({
            firstPostId:res.id,
            posts:posts
          }) 
     })
 }
 function liftOfPostsInArea(data, callback){
      Posts.find({
        location:{
          $nearSphere:{
            $geometry: {
              type:'Point',
              coordinates:data.coords
            },
            $maxDistance:10
          }
        },
        id:{$lt:!data.fromId?Date.now():data.fromId}
      },  function(err, posts){
        if(err)
        throw err 
         if(!data.fromId)
         getFirstPostInList(posts,data,callback);
         else
         callback({posts:posts})
      }).sort({_id:-1}).limit(10);
 }
function savePost(post, callback){
  var now = new Date;
  var newPost = new Posts();
      newPost.id = Date.now();
      newPost.action = post.action;
      newPost.byId = post.byId;
      newPost.byName = post.byName;
      newPost.location = {
        type:'Point',
        coordinates:[post.location.lat,  post.location.lng]
      };
      newPost.place = post.location.place,
      newPost.comments = 0;
      newPost.likes = 0;
      newPost.img = post.img;
      newPost.text = post.text;
      newPost.date = now.toString().substr(0,15);
      newPost.save(function(err, res){
        if(err)
          throw err
          callback(true)
      })
}

function likeDislike(data, callback){
  Posts.findOne({_id:data.postId, 'likeIds':data.myId},{_id:1},function(err, res){
    if(err)
       throw err
     else{
       var update;
      if(res){
         if(data.action == 'Dislike')
            update = {$inc:{likes:-1},$pull:{"likeIds":data.myId}};
      }
      else {
         if(data.action == 'Like')
           update = {$inc:{likes:1},$addToSet:{"likeIds":data.myId}};
         //makeNotification(data,'like')
      }
       Posts.updateOne({_id:data.postId}, update, function(err, res){
         if(err)
            throw err
          callback()
       })
    }
  })
}
function increaseComemnt(commentId,callback){
  Posts.updateOne({_id:commentId}, {$inc:{comments:1}}, function(err){
    if(err)
      throw err;
     callback()
  })
}
function returnPostLikes(postId,callback){
  Posts.findOne({_id:postId}, {likeIds:1, _id:0}, function(err, res){
    if(err)
      throw err;
     callback(res)
  })
}
function returnPost(postId,callback){
  Posts.findOne({_id:postId}, function(err, res){
    if(err)
      throw err;
     callback(res)
  })
}
module.exports = {
    getFirstPost: getFirstPost,
    fetchAllPosts:fetchAllPosts,
    getUserPosts:getUserPosts,
    savePost:savePost,
    likeDislike:likeDislike,
    increaseComemnt:increaseComemnt,
    returnPostLikes:returnPostLikes,
    returnPost:returnPost,
    fetchPostList:fetchPostList,
    getFirstPostInList:getFirstPostInList,
    liftOfPostsInArea:liftOfPostsInArea
}
