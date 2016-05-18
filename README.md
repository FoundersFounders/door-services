# Door Services

This project contains the 2 services and a mobile app concerning the FoundersFounders door.

## Doorbell service

This was based off a simple wireless (RF) doorbell, in which an ESP8266 was wired to the led that blinks when it rings.
This will make the ESP connect to slack through an Incoming Webhook and post a message notifying that someone is at the door.

## Door Open service

This service controls the door-unlock mechanism. An ESP8266 with an relay is wired to the door-unlock mechanism and connected
to the node service. The node service will work both as a slack bot (to receive the trigger messages) and as the controller
to let ESP8266 known when to open the door.

## Mobile App

A web app to send messages to a slack bot for door and garage opening services.
