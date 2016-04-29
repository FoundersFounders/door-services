/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Export selectors engine
var $$ = Dom7;

var app = {
 
    token: '<TOKEN>',
    username: '<USERNAME>',
    
    f7: new Framework7({
        material: true
    }),
        
    turnOffRequests: false,
    
    openDoor: function()
    {
        app.showNotification("Opening the door",3000);
        
        if(app.turnOffRequests)
        {
            return;
        }
        
        var url = 'https://slack.com/api/chat.postMessage?token='+app.token+'&channel=door&text=@door-service: open&link_names=1&username='+app.username+'&as_user=true&pretty=1';       
        app.sendAction(url);
    },
    
    openGarage: function()
    {
        app.showNotification("Opening the garage",3000);
        
        if(app.turnOffRequests)
        {
            return;
        }
        
        var url = 'https://slack.com/api/chat.postMessage?token='+app.token+'&channel=door&text=@door-service: garage&link_names=1&username='+app.username+'&as_user=true&pretty=1';
        app.sendAction(url);
    },
    
    // Application Constructor
    initialize: function() 
    {
        app.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function()
    {
        $$(document).on('deviceready', this.onDeviceReady, false);
        
        var eventType = 'click';
        
        if(app.f7.support.touch)
        {
            console.log("touch is supported");
            eventType = 'touchstart';
        }
        
        $$('#open-door').on(eventType, this.openDoor);
        $$('#open-garage').on(eventType, this.openGarage);
    },

    onDeviceReady: function() 
    {
        app.showNotification("Device Ready");
    },
    
    sendAction: function(url)
    {
        $$.ajax({
            url: url,
            crossDomain: true,
            method: 'GET',
            dataType: 'json',
            success: app.actionSuccess,
            error: app.actionError
        });        
    },
    
    actionSuccess: function(data, status, xhr)
    {
        app.showNotification(JSON.stringify(data));
    },
    
    actionError: function(xhr, status)
    {
        app.showNotification("Error: " + status + " " + xhr.response);
    },
    
    showNotification: function(message, timeout)
    {
        if(typeof timeout === "undefined")
        {
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