# videre-client

## About

videre-client is a js module that provides fast and reliable WebRTC connections in combination with the videre-server signalling server. It emphasizes fast initial connection setup and reconnection support if the peers are disconnected for a short period of time.

## Browser Support

| Browser  | Supported        |
| ---------| ---------------- |
| Chrome   | Yes              |
| Firefox  | Yes              |
| Edge     | No (Coming Soon) |
| Safari   | No (Planned)     |
| Explorer | No (Planned)     |
| Opera    | No (Planned)     |

## Installation

Clone the repository and include the videre.js script in your projects template file. For example:

```html
<script src = "/path/to/videre.js"></script>
```

The library has one dependancy, the [sockjs client library](https://github.com/sockjs/sockjs-client). Be sure to include it in your template before including the videre module:

```html
<script src="//cdn.jsdelivr.net/sockjs/1.0.3/sockjs.min.js"></script>
```

## API

### Initialize

First, create a new instance of the Videre class.

```javascript
videre = new Videre(options);
```

Options is a hash that must contain the following options:

- **signallerURL** The URL for the signalling server you wish to use
- **localVideoElement** HTML reference to a video container that will host your local stream
- **remoteVideoElement** HTML reference to a video container that will host the other peers remote stream
- **initComplete** Callback function once initialization is completed, do not attempt a connection until this function has been called

For example:

```javascript
videre = new Videre({
  signallerURL: 'https://somesignallingserver/echo',
  localVideoElement: document.getElementById('localVideo'),
  remoteVideoElement: document.getElementById('remoteVideo'),
  initComplete: function() {
    console.log('Ready to go!');
  },
});
```

### Connect to a Room

```javascript
videre.connect('roomID');
```

This function will initialize your local video stream and attempt to connect to the signaller.
Afterwards it will wait till another peer is found in the same room, and will initiate the WebRTC connection.

### Disconnect

```javascript
videre.disconnect();
```

### Additional Controls

Mute/Unmute microphone.

```javascript
videre.muteMic();
videre.unmuteMic();
```

Mute/Unmute video.

```javascript
videre.muteVideo();
videre.unmuteVideo();
```

This function will disconnect you from the room and immediately close all streams.
You can make subsequent 'connect' calls if desired after you have disconnected.

## Demo

You can run a demo of the client using the assets located in the test folder.

First, install http-server:

```shell
npm install -g http-server
```

Then navigate to the main repo directory and run http-server.

```shell
cd videre-client
http-server
```

You should now see a demo page at [http://localhost:8080/test/](http://localhost:8080/test/).
