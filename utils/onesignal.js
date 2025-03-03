var sendNotification = function(data) {
    data.app_id = "6ccaeebf-6210-4c82-8da5-asdf"

    var headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": "Basic asd"
    };
    
    var options = {
      host: "onesignal.com",
      port: 443,
      path: "/api/v1/notifications",
      method: "POST",
      headers: headers
    };
    try {
      var https = require('https');
      var req = https.request(options, function(res) {  
        res.on('data', function(data) {
          console.log("Response:");
          console.log(JSON.parse(data));
        });
      });
      
      req.on('error', function(e) {
        console.log("ERROR:");
        console.log(e);
      });
      
      req.write(JSON.stringify(data));
      req.end();
    } catch (error) {
      console.log(error)
    }
   
  };
  
  //template
//   var message = { 
//     headings: {"en":"We are launching soon"},
//     contents: {"en": "Hey there. visit our instagram page for more information about our launching date"},
//     include_player_ids: ["c883b849-af6d-44bf-969b-1468ae0c0244"]
//   };

  module.exports = {
      sendNotification
  }