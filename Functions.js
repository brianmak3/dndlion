const Notification = require('./classes/notifications')
function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return strTime;
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
  