// Export selectors engine
var $$ = Dom7;

var app = {

  channel: '<CHANNEL>',
  token: '',

  clientId: 'CLIENT_ID',
  clientSecret: 'CLIENT_SECRET',
  requiredScope: 'chat:write:user',
  redirectUri: 'REDIRECT_URI',
  teamId: 'TEAM_ID',

  f7: new Framework7({
    material: true
  }),

  turnOffRequests: false,

  openDoor: function() {
    app.showNotification("Opening the door", 3000);

    if (app.turnOffRequests) {
      return;
    }

    var url =
        'https://slack.com/api/chat.postMessage?token=' + app.token +
        '&channel=' + app.channel +
        '&text=@door-service: open&link_names=1' +
        '&as_user=true';
    app.sendAction(url);
  },

  openGarage: function() {
    app.showNotification("Opening the garage", 3000);

    if (app.turnOffRequests) {
      return;
    }

    var url =
        'https://slack.com/api/chat.postMessage?token=' + app.token +
        '&channel=' + app.channel +
        '&text=@door-service: garage&link_names=1' +
        '&as_user=true';
    app.sendAction(url);
  },

  // Application Constructor
  initialize: function() {
    app.bindEvents();
  },

  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    $$(document).on('deviceready', app.onDeviceReady, false);

    var eventType = 'click';

    if (app.f7.support.touch) {
      console.log("touch is supported");
      eventType = 'touchstart';
    }

    $$('#open-door').on(eventType, app.openDoor);
    $$('#open-garage').on(eventType, app.openGarage);
  },

  onDeviceReady: function() {
    var authUrl = 'https://slack.com/oauth/authorize' +
        '?client_id=' + app.clientId +
        '&client_secret=' + app.clientSecret +
        '&scope=' + app.requiredScope +
        '&team=' + app.teamId;

    var authWindow = cordova.InAppBrowser.open(authUrl, '_blank', 'location=no,toolbar=no');

    authWindow.addEventListener('loadstart', function(e) {
      var code = new RegExp(app.redirectUri + '\\?code=([^&]+)?').exec(e.url);
      if (code) code = code[1];

      var error = new RegExp(app.redirectUri + '\\?error=([^&]+)').exec(e.url);
      if (error) error = error[1];

      if (code || error) {
        authWindow.close();
      }

      if (code) {
        $$.ajax({
          url: 'https://slack.com/api/oauth.access' +
            '?client_id=' + app.clientId +
            '&client_secret=' + app.clientSecret +
            '&code=' + code,
          dataType: 'json',
          success: function (data) {
            app.token = data.access_token;
            app.showNotification("Slack authentication successful");
          }
        });
      }

      if (error) {
        app.showNotification("Error: " + error);
      }
    });

    app.showNotification("Device ready");
  },

  sendAction: function(url) {
    $$.ajax({
      url: url,
      crossDomain: true,
      method: 'GET',
      dataType: 'json',
      success: app.actionSuccess,
      error: app.actionError
    });
  },

  actionSuccess: function(data, status, xhr) {
    app.showNotification(JSON.stringify(data));
  },

  actionError: function(xhr, status) {
    app.showNotification("Error: " + status + " " + xhr.response);
  },

  showNotification: function(message, timeout) {
    if (typeof timeout === "undefined") {
      timeout = 5000;
    }

    app.f7.addNotification({
      message: message,
      hold: timeout,
      closeOnClick: true,
      button: {
        text: 'Close',
        color: 'lightgreen'
      }
    });
  }
};

app.initialize();
