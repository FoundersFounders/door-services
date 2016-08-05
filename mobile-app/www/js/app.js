// Export selectors engine
var $$ = Dom7;

var app = {

  // -- to be filled before compiling the app --
  clientId: '<CLIENT_ID>',
  clientSecret: '<CLIENT_SECRET>',
  teamId: '<TEAM_ID>',
  channel: '<CHANNEL>',
  redirectUri: '<REDIRECT_URI>',
  // --

  appScope: function() {
    if ( document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1 ) {
      return "app";
    } else {
      return "web";
    }
  },

  token: '',
  requiredScope: 'chat:write:user',

  f7: new Framework7({
    material: true
  }),

  turnOffRequests: false,

  openDoor: function() {
    app.showNotification("Opening the door", 3000);

    if (app.turnOffRequests) {
      return;
    }
    adMessage = (app.appScope() == "web") ? ' - via webapp, <http://www.founders-founders.com/doorservices/|get yours here>' : ' - via app, <https://github.com/FoundersFounders/door-services|get yours here>';
    var url =
        'https://slack.com/api/chat.postMessage?token=' + app.token +
        '&channel=' + app.channel +
        '&text=@door-service: open' + adMessage + '&link_names=1' +
        '&as_user=true';
    app.sendAction(url);
  },

  openGarage: function() {
    app.showNotification("Opening the garage", 3000);

    if (app.turnOffRequests) {
      return;
    }
    adMessage = (app.appScope() == "web") ? ' - via webapp, <http://www.founders-founders.com/doorservices/|get yours here>' : ' - via app, <https://github.com/FoundersFounders/door-services|get yours here>';
    var url =
        'https://slack.com/api/chat.postMessage?token=' + app.token +
        '&channel=' + app.channel +
        '&text=@door-service: garage' + adMessage + '&link_names=1' +
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

  getToken: function(fileEntry) {
    fileEntry.file(function (file) {
      var reader = new FileReader();
      reader.onloadend = function() {
        if (this.result.length != 0) {
          app.token = this.result;
        } else {
          app.getOAuthToken(fileEntry);
        }
      };
      reader.readAsText(file);
    });
  },

  getOAuthToken: function(fileEntry) {
    var authUrl = 'https://slack.com/oauth/authorize' +
        '?client_id=' + app.clientId +
        '&client_secret=' + app.clientSecret +
        '&scope=' + app.requiredScope +
        '&team=' + app.teamId;

    if ( app.appScope() == "app" ) {
        // Cordova application
        var authWindow = cordova.InAppBrowser.open(authUrl, '_blank', 'location=no,toolbar=no');

        authWindow.addEventListener('loadstart', function(e) {
          var code = new RegExp(app.redirectUri + '\\?code=([^&]+)?').exec(e.url);
          if (code) code = code[1];

          var error = new RegExp(app.redirectUri + '\\?error=([^&]+)').exec(e.url);
          if (error) error = error[1];

          if (code || error) {
            authWindow.close();
          }
        });

      } else {
        // Web page, restore browser's original window.open because cordova-inappbrowser-plugin overwrote this

        // check we already have a code
        var code = new RegExp(app.redirectUri + '\\?code=([^&]+)?').exec(document.URL);
        if (code) code = code[1];
        var error = new RegExp(app.redirectUri + '\\?error=([^&]+)').exec(document.URL);
        if (error) error = error[1];
        function retrieveNative(native) {
          var iframe = document.createElement('iframe');
          document.body.appendChild(iframe);
          var retrieved = iframe.contentWindow[native];
          document.body.removeChild(iframe);
          return retrieved;
      }
        window.open = retrieveNative('open');
        if (!(code || error)) {
          window.open(authUrl, '_self', 'location=no,toolbar=no');
        }
    }

    if (error) {
      app.showNotification("Error: " + error);
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
          app.saveToken(fileEntry, app.token);
          app.showNotification("Slack authentication successful");
        }
      });
    }
  },

  saveToken: function(fileEntry, token) {
    fileEntry.createWriter(function (fileWriter) {
      fileWriter.write(token);
    });
  },

  onDeviceReady: function() {
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 1024, function (fs) {
      fs.root.getFile("token", { create: true, exclusive: false }, function (fileEntry) {
        app.getToken(fileEntry);
      });
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
