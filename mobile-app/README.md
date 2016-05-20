# Build

Install the required dependencies:

```
npm install
```

`cordova-icon` requires `ImageMagick`:

```
brew install imagemagick            # OSX
sudo apt-get install imagemagick    # Debian / Ubuntu
```

To build the app for iOS you must also install (locally or globally):

```
npm install ios-sim
npm install ios-deploy
```

To build and run the app in the platform simulator:

```
npm start                   # all platforms
npm start android           # android app only
npm start ios               # iOS app only
```

To build the app only without running it:

```
npm run build               # all platforms
npm run build -- android    # android app only
npm run build -- ios        # iOS app only
```

# Reference

* https://cordova.apache.org/docs/en/latest/guide/cli/index.html
