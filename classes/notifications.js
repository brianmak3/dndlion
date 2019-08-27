Notifications = require('../models/notifications');
Users = require('../models/users');
function storeNotification(userId, data, callback){
    Notifications.findOne({_id:userId},{_id:0},function(err, notification){
        if(err)
         throw err;
         if(notification)
           Notifications.updateOne({_id:userId},{$push:{notifications:data}},function(err,res){
               if(err)
                throw err;
                callback()
           })
         else{
             var newNotification = new Notifications();
             newNotification._id = userId;
             newNotification.notifications = [data];
             newNotification.save(function(err, res){
                 if(err)
                  throw err 
                  callback()
                })
         }
    });
}
function countNotifications(userId, callback){
    Notifications.aggregate([
        {$match:{_id:userId}},
        {$unwind:"$notifications"},
        {$match:{'notifications.viewed':false}},
        {$group: {_id:'$notifications.type', count:{$sum:1}} }

    ]).exec(function(err, res){
        if(err)
         throw err;
         var count = {connects:0, notifications:0},
         connIndex = res.findIndex(q=> q._id == 'connection');
         noteIndex = res.findIndex(q=> q._id == 'notification');
        if(res.length)
         count = {
            connects: (connIndex > -1? res[connIndex].count:0),
            notifications:(noteIndex > -1? res[noteIndex].count:0)
          }
         callback(count);
    });
 
}
function fetchNotification(userId, criteria, callback){
      Notifications.aggregate([
        {$match:{_id:userId}},
        {$unwind:"$notifications"},
        {$match: criteria},
        {$sort: {'notifications.id':-1} },
        {$limit:10},
        {$group: {
            _id:"",
            comments:{$push:'$notifications'}
        }}
      ]).exec(function(err, res){
          if(err)
           throw err;
           var notes = [], userIds, notifications;
           if(res.length){
               notes = res[0].comments,
               userIds = notes.map(a=>a.notfiedBy);
               Users.returnUsers(userIds, function(users){
                   notifications = notes.map(function(a){
                    a.user = users[users.findIndex(q =>q._id == a.notfiedBy)]
                    return a
                 });
                 callback(notifications) 
               })
           }
           else
           callback([])
      })
}
function updateNotification(criteria, updateQuery, callback){
    Notifications.updateMany(criteria, updateQuery, function(err, res){
      if(err)
       throw err 
       else callback()
    })
}
function returnFirstNote(userId, callback){
    Notifications.aggregate([
        {$match: {_id:userId}},
        {$project:
            {
                id:1,
                 elemId:{$arrayElemAt:["$notifications",0]}
            }
        }
    ]).exec(function(err, notes){
        if(err)
         throw err
         var id = 0;
         if(notes.length)
           id = notes[0].elemId.id
         callback(id)
    }) 
}
module.exports = {
    storeNotification: storeNotification,
    countNotifications:countNotifications,
    fetchNotification:fetchNotification,
    updateNotification:updateNotification,
    returnFirstNote:returnFirstNote
}