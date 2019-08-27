
const
express = require('express'),
  Posts = require ('./classes/posts')
  Users = require ('./classes/users')
  Notification = require('./classes/notifications'),
  Comments = require('./classes/comments'),
  Functions = require('./Functions'),
  app = express(),
  http = require('http').Server(app),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  multer = require('multer'),
  path = require('path'),
  mongoose = require('mongoose'),
  storage =   multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './public/uploads');
    },
    filename: function (req, file, callback) {
         callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
    }

}),
  upload = multer({ storage : storage, limits: { fieldSize: 10 * 1024 * 1024 }}).single('image'),
  // connect to the database

 WebSocket = require('ws'),
 
 wss = new WebSocket.Server({
  port: 8080,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed.
  }
});
 //mongoose.connect('mongodb://127.0.0.1/sagar',{ useNewUrlParser: true } );
 mongoose.connect('mongodb://nearby:nearby@127.0.0.1/nearBy',{ useNewUrlParser: true });
app.use(cors());
app.use(express.static('www'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
// home
app.get('/', (req, res) => {
  res.send('Unknown origin.');
});
app.post('/appApi',(req,res)=>{
    var body = req.body, info;
         data = body.data;
        switch (body.action) {
          case 'SIGN UP':
              Users.fetchUser({$or:[{'email': data[1]}, {'userName': data[0]}]},(user)=>{
                  if(!user)
                  Users.createNewUser(data, function(users){
                      res.status(201).json(user);
                  })
                  else{
                       if(user.userName == data[0])
                         info = {errorMessage:'Sorry the username has been taken'};
                       else if(user.email == data[1])
                         info = {errorMessage:'The email already exists'};
                      res.status(201).json(info);

                  }
              })
          break;
          case 'LOGIN':
              Users.fetchUser({$or:[{'email': data[0]}, {'userName': data[0]}]},(user)=>{
                if(!user){
                  info =  {errorMessage:'Email/user name is not registered'};
               }else if(!user.validPassword(data[2])){
                   info =  {errorMessage:'Password does not match.'};
               }else{
                   user.password = undefined;
                   info = user;
               }
                res.status(201).json(info);
              }); 
              break;
          case 'fetchPosts':
             Posts.fetchAllPosts(data,function(data){
               var posts = data.posts;
                 var userIds = posts.map(a=>a.post.byId);
                 Users.returnUsers(userIds, function(users){
                  var postsWthUser = posts.filter(function(groupedPost){
                    groupedPost.post.user = users[users.findIndex(q=>q._id == groupedPost.post.byId)];
                     return groupedPost;
                  });
                  res.status(201).json({posts:postsWthUser, zoom:data.maxDist})
                })
             })
          break;
          case 'fetchUsers':
              Users.returnSearch(data.val,null,function(friends){
                res.status(201).json(friends);            
              })
            break;
          case 'fetchUserData':
           if(data.lastId)
            Posts.getUserPosts({byId:data.userId, id:{$lt: data.lastId}}, function(posts){
              res.status(201).json({
                 posts:posts
              });
            })
            else
               Users.fetchConnections(data.userId, true, function(connections){
                Posts.getUserPosts({byId:data.userId}, function(posts){
                  Posts.getFirstPost(data.userId, function(lastPostId){
                    if(data.myId){
                      Users.checkIfFriend(data.myId, data.userId,function(status){
                        res.status(201).json({
                          connects: connections,
                          posts:posts,
                          lastPostId: lastPostId,
                          friendStatus:status
                        });
                      })
                    }
                    else
                    res.status(201).json({
                      connects: connections,
                      posts:posts,
                      lastPostId: lastPostId
                    }); 
                  })
                })
             })
            break;
          case 'uploadPost':
              uploadPost(data, res);
            break;
          case 'updateUser':
              Users.updateUser(data._id, {$set:data},function(){
                res.status(201).json({
                  message:'Your profile has been updated'
                })
              })
           break;
          case 'actionConnection':
             var comment, noteType;
            if(data.action == 'Connect'){
                  Users.addFriendToArray(data.userId, data.ownerId, 'Accept Connection',data.ownerId, function(res){
                    broadCast(res);
                  });
                  Users.addFriendToArray(data.ownerId, data.userId, 'Remove request',data.ownerId, function(data){
                    res.status(201).json({
                      status: 'Remove request'
                    })
                  });
                  noteType = 'connection'
                  comment = 'Sent <strong>you</strong> a connection request'
            }
            else if(data.action == 'Accept Connection'){
                Users.updateFriendToArray(data.userId, data.ownerId, function(){
                  broadCast(JSON.stringify({
                    action: 'connectionStatus',
                    datam:{status:'Disconnect', to:data.userId, owner:data.ownerId}
                }));
              })
                Users.updateFriendToArray(data.ownerId, data.userId, function(){
                  res.status(201).json({
                     status: 'Disconnect'
                  })
                });
                comment = 'Accepted <strong>your</strong> connection request'
              }
            else if(data.action == 'Remo ve request' || data.action == 'Disconnect'){
                Users.removeFriendFromArray(data.userId, data.ownerId, function(){
                    broadCast(JSON.stringify({
                      action: 'connectionStatus',
                      datam:{status:'Connect',from:data.ownerId, to:data.userId,owner:data.ownerId}
                  }));
                })
                Users.removeFriendFromArray(data.ownerId, data.userId, function(){
                  res.status(201).json({
                    status: 'Connect'
                 })
                })
                
            }
            if(comment)
              Functions.saveAndEmitNotification(data,comment,noteType,broadCast)
             break;
           case 'likeDislike':
              Posts.likeDislike(data, function(){
                if(data.action=='Like')
                 makeMultipleNotications(data, 'Liked');
                res.status(201).json({})
              })
             break;
           case 'newPostComment':
                var dta = {
                  action:'newPostComment',
                  datam:data
                }
                Posts.increaseComemnt(data.postId, function(){
                  Comments.saveComment(data, function(){
                    // make notification
                    broadCast(JSON.stringify(dta));
                    makeMultipleNotications(data, 'Commented on');
                    res.status(201).json({})
                  })
                })
             break;
           case 'getPostData':
             if(!data.fromId)
              Users.returnUsers(data.likeIds, function(likers){
                Comments.returnFirstCommentId(data.postId, function(id){
                  Comments.returnComments({_id:data.postId}, null, function(comments){
                    res.status(201).json({
                      likers:likers,
                      comments:comments,
                      lastCommentId:id
                    })
                  })
                })
              })
              else 
              Comments.returnComments({_id:data.postId}, data.fromId, function(comments){
                res.status(201).json({
                  comments:comments
                })
              })
             break;
            case 'fetchUserConnections':
               Users.fetchUser({_id: data.userId}, function(user){
                 var friends = user.connections;
                 Users.returnUsers(friends.map(a=>a._id), function(users){
                   var friends0 = users.filter(function(user){
                     user.status = friends[friends.findIndex(q=>q._id == user._id)].status;
                      return user;
                   });
                   res.status(201).json({connections:friends0})
                 })
               })
              break; 
              case 'fetchNotesNumber':
                Notification.countNotifications(data.userId,function(response){
                  res.status(201).json(response)
                })
                break;
              case 'fetchNotifications':
                    var criteria = (data.fromId?{'notifications.id':{$lt: data.fromId}}:{})
                    Notification.fetchNotification(data.userId, criteria,function(notes){
                       if(!data.fromId)
                        Notification.returnFirstNote(data.userId, function(firstNote){
                            res.status(201).json({
                              notifications: notes,
                              firstNote:firstNote
                            })
                        })
                      else
                      res.status(201).json({
                        notifications: notes
                      })
                 })
                  
                   break;
              case 'updateNotification':
                var criteria = {_id:data.userId, notifications:{$elemMatch:data.criteria} } , 
                  updateQuery = {$set: {'notifications.$[].viewed':true}}
                if(data.friendId)
                  updateQuery = {$set: {'notifications.$[].read':true}}
                Notification.updateNotification(criteria, updateQuery,  function(){
                  res.status(201).json({})
                })
              break;
              case 'fetchPost':
                var criteria = {_id:data.userId, notifications:{$elemMatch:data.criteria} } , 
                updateQuery = {$set: {'notifications.$[].read':true}}
                Notification.updateNotification(criteria, updateQuery,  function(){
                  Users.returnUsers([data.byId], function(users){
                    var user = users[0];
                    Posts.returnPost(data.postId, function(post){
                       res.status(201).json({
                         user:user,
                         post:post
                       })
                    })
                  })
                })
             break;
             case 'getPostsList':
                Posts.liftOfPostsInArea(data,function(result){
                  var userIds =  Array.from(new Set(result.posts.map(a=>a.byId).concat(data.users)));
                   Users.returnUsers(userIds, function(users){
                     result.users = users;
                     res.status(201).json(result)
                  })
                })
             break;
             case 'removeUserPic':
                updateUserProfilePic(data, '', res)
               break;
        }
})
app.post('/imagePost',(req, res)=>{
   upload(req, res, function (err) {
               if (err)
                throw(err);
                var url = req.body.url+'//uploads/';
                var pic = url + req.file.filename,
                data = req.body;
                if(data.userId )
                  updateUserProfilePic(data, pic, res)
                else if(data.post)
                {
                  data = JSON.parse(data.post);
                  data.img = pic;
                  uploadPost(data, res);
                }
        })
})



// setup socket.io
wss.getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

wss.on('connection', function(socket){
    console.log('connected')
  socket.on('message', function(dataAttach){
   dataAttach = JSON.parse(dataAttach);
   var data = dataAttach.data;
   
  })
});
function uploadPost(data, res){
  Posts.savePost(data, function(){
    res.status(201).json({
      message:'Post has been successfully uploaded.'
    }) 
  });
}

function updateUserProfilePic(data, pic, res){
  if(data.userPic != 'images/bigAvatar.jpg'){
    var rem = 'public/'+data.userPic.split('//')[2];
      fs.unlink(rem,function(e){})
  }
  Users.updateUser(data.userId, {$set: {'pic': pic}}, function(){
      res.status(201).json({userPic:pic})
  })
}
function makeMultipleNotications(data,commType){
  Posts.returnPostLikes(data.postId, function(likers){
     commentors = [data.byId]
      Comments.returnCommentsIds(data.postId, function(commenters){
        commentors = commentors.concat(commenters)
        commentors = Array.from(new Set(commentors.concat(likers.likeIds)));
        commentors.map(a=>{
          if(a !== data.myId)
             Functions.saveAndEmitNotification({
               ownerId: data.myId,
               userId:a,
               notification:true,
               postId: data.postId,
               postById:data.byId
             },""+commType+" <strong>"+(a == data.byId? 'your':data.byName)+"</strong> post",'notification',broadCast)
         })
      })
    })
}

function broadCast(data){
    wss.clients.forEach(function each(client){
      if (client.readyState === WebSocket.OPEN) {
       client.send(data);
    }
    })
}
const port = process.env.PORT || 3001;
http.listen(port, () => {
  console.log('listening on port', port);
});

