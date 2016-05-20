# Build

Install the required dependencies:

```
npm install -g cordova
npm install -g cordova-icon
npm install -g bower
cordova prepare
bower install
```

`cordova-icon` requires `ImageMagick`:

```
brew install imagemagick # OSX
sudo apt-get install imagemagick # Debian / Ubuntu
```

To build the app for iOS you must also install:

```
npm install -g ios-sim
npm install -g ios-deploy
```

To build the app:

```
cordova build
```

To run the app in the platform simulator:

```
cordova run
```

# Reference

* https://cordova.apache.org/docs/en/latest/guide/cli/index.html
