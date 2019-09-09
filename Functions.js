const Notification = require('./classes/notifications')
function formatAMPM(dateId) {
    var time = new Date(dateId);
    return time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })

}
function saveAndEmitNotification(data,comment, Commtype,broadcast){
   var now = new Date
    Notification.storeNotification(data.userId, {
        notfiedBy: data.ownerId,
        time: formatAMPM(now),
        date: now.toString().substr(0,15),
        text:comment,
        id: now,
        read: false,
        viewed: false,
        type: Commtype,
        postId: data.postId,
        postById:data.postById
      },function(){
          broadcast(JSON.stringify({
             action:(data.notification?'updateNotifications':'updateConnects'),
             datam:data.userId
          }))
      })
}
 
module.exports = {
    formatAMPM: formatAMPM,
    saveAndEmitNotification:saveAndEmitNotification,
    
}
  
