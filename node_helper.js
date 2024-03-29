var NodeHelper = require("node_helper");
var https = require("https");

module.exports = NodeHelper.create({
  // Store the API key and channel IDs in local variables for faster access.
  apiKey: null,
  channelIds: null,
  updateInterval: null,
  debug: false,
  intervalId: null,

  // Override start method.
  start: function() {
    console.log("Starting node helper for: " + this.name);
    this.getData();
  },

  // Handle the GET_VIDEO_TITLES socket notification.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_VIDEO_TITLES") {
      clearInterval(this.intervalId);
      this.apiKey = payload.apiKey;
      this.channelIds = payload.channelIds;
      this.updateInterval = payload.updateInterval;
      this.debug = payload.debug;
      this.getData();
    }
  },

  // Fetch the video titles and send them back to the module.
  getData: function() {
    if (!this.channelIds) {
      return;
    }

    var self = this;
    this.channelIds.forEach(function(channelId) {
      var url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${self.apiKey}`;

      https.get(url, function(res) {
        var body = "";

        res.on("data", function(chunk) {
          body += chunk;
        });

        res.on("end", function() {
          var response = JSON.parse(body);
          var titles = [];

          for (var i = 0; i < response.items.length; i++) {
            titles.push(response.items[i].snippet.title);
          }

          // Log the titles to the console if debug is enabled.
          if (self.debug) {
            console.log("Titles: " + titles);
          }

          // Send the video titles back to the module.
          self.sendSocketNotification("VIDEO_TITLES", {
            titles: titles,
            channelId: channelId
          });
        });
      });
    });

    // Set a timeout to fetch the data again after the update interval has passed.
    this.intervalId = setTimeout(function() {
      self.getData();
    }, this.updateInterval);
  }
});
