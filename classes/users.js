var Users = require('../models/users');
function  fetchUser(data,callback){
    Users.findOne(data, function(err, user){
       if(err)
            throw err;
       else{
           callback(user)
       }
    })
  }
function createNewUser (data, callback){
    var newUser = new Users();
    newUser.userName = data[0];
    newUser.email = data[1];
    newUser.userId = Date.now();
    newUser.password =newUser.generatHarsh(data[2]);
    newUser.save((err, user)=>{
        if(err)
         throw err;
         else
         callback(user)
         //send mail to user using nodemailer
    })
  }
function returnSearch (id, userId, callback){
    Users.find({_id:{$ne:userId},$or:[{"userName" : { '$regex' : id, '$options' : 'i' }},
                        {"firstName" : { '$regex' : id, '$options' : 'i' }},
                        {"lastName" : { '$regex' : id, '$options' : 'i' }}]},
            {userName: 1, firstName:1,lastName:1, pic: 1, _id: 1}, function (err, res) {
            if(err)
                throw err;
            else
              callback(res)
        });
}
function fetchConnections(userId,all,callback){
    Users.aggregate([ 
      {$match: {_id: new mongoose.Types.ObjectId(userId)}},
      {$unwind:"$connections"},
      {"$group": {"_id": "$_id", 
            "connections": {"$push": "$connections"}
        } },
      {$match:{'connections.status': (all?'Disconnect':'Accept Connection')}},
      {"$project": {"_id": 0,
              "connections": "$connections"}
      }
    ]).exec(function(err, res){
      if(err)
         throw err
        if(!all || !res.length)
         callback(res)
        else if(res.length)
        {
          returnUsers(res[0].connections.map((a)=>a._id), users=>{
            callback(users)
          })
        }
      })
  }
  function returnUsers(ids,callback){
    Users.find({_id: {$in:ids}}, {userName: 1, firstName:1,lastName:1, pic: 1, _id: 1}, function(err, users){
         if(err)
            throw(err)
          callback(users)
      })
 }
 function updateUser(userId,update,callback){
    Users.updateOne({'_id': userId}, update, function (err, res) {
        if (err)
            throw err;
        callback(true)
    }); 
 }
 function checkIfFriend(myId, friendId, callback){
    Users.aggregate([
        {$match:{'_id': new mongoose.Types.ObjectId(myId)}},
        {$unwind:{path: "$connections"}},
        {$match:{'connections._id': friendId}},
        {$project: {"connections": 1, _id:0}}
      ]).exec(function(err, res){
          if(err)
         throw err
       var status = 'Connect';
        if(res.length)
          status = res[0].connections.status;
         callback(status)
      })
 }
 function addFriendToArray(id,friendId,status,owner, callback){
    Users.updateOne({_id:id},{$addToSet:{connections:{_id:friendId,status:status}}},function(err){
      if(err)
         throw err;
        callback(JSON.stringify({
            action: 'connectionStatus',
            datam:{status:status,to:id, owner:owner}
        }))
     })
  }
  function updateFriendToArray(id,friendId, callback){
    Users.updateOne({_id:id,'connections._id':friendId},
      {$set:{'connections.$.status':'Disconnect'}},function(err,res){
      if(err)
         throw err;
      callback();
    })
  }
  function removeFriendFromArray(id,friendId, callback){
    Users.updateOne({_id:id},{$pull:{connections:{id:friendId}}}, function(err, res){
        if(err)
          throw err
          callback()
    })
}
  module.exports = {
    createNewUser: createNewUser,
    fetchUser: fetchUser,
    fetchConnections:fetchConnections,
    returnSearch:returnSearch,
    updateUser:updateUser,
    checkIfFriend:checkIfFriend,
    returnUsers:returnUsers,
    addFriendToArray:addFriendToArray,
    updateFriendToArray:updateFriendToArray,
    removeFriendFromArray:removeFriendFromArray 
  } 