/**
 *
 * Author: Jacob Shultis
 * Git: https://github.com/Jacob-Shultis/videre-client
 *
 * JS client for WebRTC implementation.
 *
 * Designed for fast, stable video streaming between 2 users.
 */
import headtrackr from './headtrackr'
import hark from 'hark'

class Videre {
    
    constructor(options) {
        // Init Options
        this.signallerURL = options.signallerURL
        this.localVideoElement = options.localVideoElement
        this.remoteVideoElement = options.remoteVideoElement
        this.headTrackingCanvas = options.headTrackingCanvas
        this.initComplete = options.initComplete
        this.headTrackerStatusChanged = options.headTrackerStatusChanged

        this.muted = false
        this.videoMuted = false
        this.started = false
        this.isInitiator = false
        this.localStream = null
        this.peerConnection = null
        this.pingInterval = null
        this.browser = null
        this.signallerConnected = false
        this.loadedIceFrame = false
        this.externalServerList = []
        this.headStatus = ''
        this.htracker = null

        // Custom Event Handlers
        this.onLocalStream = () => {}
        this.onRemoteStream = () => {}
        this.speaking = () => {}
        this.stoppedSpeaking = () => {}
        this.onVideoError = () => {}
        this.onAudioError = () => {}

        // Determine the current browser and configure the
        // correct functions
        if (window.mozRTCPeerConnection) {
            this.browser = 'firefox'
            this.getUserMedia = navigator.mozGetUserMedia.bind(navigator)
            this.rtcPeerConnection = mozRTCPeerConnection
            this.rtcSessionDescription = mozRTCSessionDescription
            this.rtcIceCandidate = mozRTCIceCandidate
        } else {
            this.browser = 'chrome'
            this.getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator)
            this.rtcPeerConnection = RTCPeerConnection
            this.rtcSessionDescription = RTCSessionDescription
            this.rtcIceCandidate = RTCIceCandidate
        }

        if (options.userId === undefined) {
            // Generate a userId if not provided
            var randomId = ''
            var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

            for(var i = 0; i < 10; i++) {
                randomId += possible.charAt(Math.floor(Math.random() * possible.length))
            }
            this.userId = randomId
        } else {
            this.userId = options.userId
        }

        this.initComplete()
    }

    connect(roomId) {
        this.roomId = roomId
        var _this = this

        // Initialize the signaller connection
        this.signaller = new SockJS(this.signallerURL)
        this.signaller.onopen = this.onSignallerConnected.bind(this)
        this.signaller.onmessage = this.receivePacket.bind(this)
        this.signaller.onclose = this.onSignallerDisconnected.bind(this)

        // Initialize the peerConection object
        var iceServers = {
            iceServers: [
                {
                    url: 'turn:turn.facetoface.dating:2222?transport=tcp',
                    username: 'ispingle',
                    credential: 'zaq97u437tF66gN',
                },
                {
                    url: 'turn:turn.facetoface.dating:2222?transport=udp',
                    username: 'ispingle',
                    credential: 'zaq97u437tF66gN',
                },
                {
                    url: 'turn:turn2.facetoface.dating:2222?transport=tcp',
                    username: 'ispingle',
                    credential: 'JE76k4N47A924kP'
                },
                {
                    url: 'turn:turn2.facetoface.dating:2222?transport=udp',
                    username: 'ispingle',
                    credential: 'JE76k4N47A924kP'
                },
                {
                    url: 'stun:stun.l.google.com:19302'
                },
                {
                    url: 'stun:stun.anyfirewall.com:3478'
                },
                {
                    url: 'stun:stun.services.mozilla.com'
                },
                {
                    url: 'stun:turn01.uswest.xirsys.com'
                },
            ],
            iceTransportPolicy: 'all'
        }
        
        /*var rtcOptions = {
            optional: [
                {
                    DtlsSrtpKeyAgreement: true
                },
                {
                    googImprovedWifiBwe: true
                },
                {
                    googScreencastMinBitrate: 300
                },
            ]
        }*/

        var config = {
            iceServers: iceServers,

        }

        this.peerConnection = new this.rtcPeerConnection([config])
        this.peerConnection.onicecandidate = this.onIceCandidate.bind(this)
        this.peerConnection.oniceconnectionstatechange = this.onIceStateChange.bind(this)
        this.peerConnection.onaddstream = this.gotRemoteStream.bind(this)
        this.peerConnection.onsignalingstatechange = this.onIceStateChange.bind(this)
        this.peerConnection.ongatheringchange = this.onGatheringChange.bind(this)

        // Show the host video
        this.loadHostVideo()
    }

    loadHostVideo() {
        var constraints = {
            audio: true,
            video: true
        }

        console.log(this.getUserMedia)

        //this.getUserMedia(constraints).then(function(stream) {
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
            // Check if the media devices are available

            var videoTrack = stream.getVideoTracks()[0]
            var audioTrack = stream.getAudioTracks()[0]

            console.log(videoTrack)
            console.log(audioTrack)

            if (!videoTrack) {
                this.onVideoError()
            }

            if (audioTrack) {
                // Configure hark audio analyzer

                var speechEvents = hark(stream, {})
     
                speechEvents.on('speaking', function() {
                    this.speaking()
                }.bind(this))
             
                speechEvents.on('stopped_speaking', function() {
                    this.stoppedSpeaking()
                }.bind(this))
            } else {
                this.onAudioError()
            }
            
            // Svae and attach the stream to the video

            this.localStream = stream

            console.log('Local stream set')

            //this.localVideoElement.src = window.URL.createObjectURL(stream)
            this.localVideoElement.srcObject = stream

            console.log('Video Set')

            this.peerConnection.addStream(this.localStream)

            // Mute video and audio if mute is enabled
            if (this.muted) {
                this.localStream.getAudioTracks()[0].enabled = false
            }
            if (this.videoMuted) {
                this.localStream.getVideoTracks()[0].enabled = false
            }

            // Connect to the signaller and mark as successful

            this.connectToSignaller()
            this.onLocalStream()
        }.bind(this)).catch(function(err) { console.log(err.name + ": " + err.message) })
    }

    /**
     * Set the signaller state to connected, and attempt
     * to notify the signaller of the connection
     */
    onSignallerConnected() {
        this.signallerConnected = true
        this.connectToSignaller()
    }

    /**
     * Notify the signaller that a successful connection
     * has been established
     */
    connectToSignaller() {
        if (this.signallerConnected && this.localStream) {
            this.signaller.send(JSON.stringify({
                Header: {
                    Event: 'connect',
                    UserId: this.userId,
                    RoomId: this.roomId,
                },
                Payload: JSON.stringify({}),
            }))

            this.pingInterval = setInterval(this.pingSignaller.bind(this), 2000)
        }
    }

    /**
     * Signaller disconnected
     */
    onSignallerDisconnected() {
        console.log('Signaller Disconnected')
    }

    // Request room details from the signaller
    pingSignaller() {
        if (this.signallerConnected) {
            this.signaller.send(JSON.stringify({
                Header: {
                    Event: 'ping',
                    UserId: this.userId,
                    RoomId: this.roomId,
                },
                Payload: JSON.stringify({}),
            }))
        }
    }

    /**
     * Receive and parse a packet from the signaller, parse
     * the packet and run the appropriate function
     */
    receivePacket(packet) {
        var packetObject = JSON.parse(packet.data)

        // Ignore any connect/broadcast packets sent from self
        if (packetObject.Header.UserId != this.userId) {
            // Run appropriate command based on packet header
            if (packetObject.Header.Event == 'connect') {
                this.userConnected(packetObject)
            } else if (packetObject.Header.Event == 'broadcast') {
                this.receiveBroadcast(packetObject)
            } else if (packetObject.Header.Event == 'disconnect') {
                this.userDisconnected(packetObject)
            }
        } else {
            if (packetObject.Header.Event == 'connect') {
                try {
                    this.isInitiator = JSON.parse(packetObject.Payload)
                } catch(err) {
                    this.isInitiator = packetObject.Payload
                }
            } else if (packetObject.Header.Event == 'ping') {
                this.receivePing(packetObject)
            }
        }
    }

    /**
     * Begin the ICE communication
     */
    initCon(userId) {
        this.initiateConnection()
    }

    /**
     * Check if the user is the initiator and begin
     * the ICE communication
     */
    userConnected(packetObject) {
        if (this.isInitiator && !this.started) {
            this.started = true
            this.initiateConnection()
        }
    }

    /**
     * Parse a broadcast message and reply back with
     * the appropriate details
     */
    receiveBroadcast(packetObject) {
        try {
            var payload = JSON.parse(packetObject.Payload)
        } catch(err) {
            var payload = packetObject.Payload
        }

        if (payload.Type == 'Ice Offer') {
            // Set remote descriptions and construct an ICE answer
            var icePacket = new this.rtcSessionDescription({
                type: payload.IcePacket.type,
                sdp: payload.IcePacket.sdp,
            })

            this.peerConnection.setRemoteDescription(icePacket, function() {
                this.peerConnection.createAnswer(this.onCreateAnswerSuccess.bind(this), this.onCreateSessionDescriptionError)
            }.bind(this), this.onSetSessionDescriptionError)
            

        } else if (payload.Type == 'Ice Answer') {
            // Set the remote description
            var icePacket = new this.rtcSessionDescription({
                type: payload.IcePacket.type,
                sdp: payload.IcePacket.sdp,
            })

            this.peerConnection.setRemoteDescription(icePacket, function() {
                this.onSetRemoteSuccess()
            }.bind(this), this.onSetSessionDescriptionError)
        } else if (payload.Type == 'Ice Candidate') {
            // Add the candidate to the list of ICE candidates
            var candidate = new this.rtcIceCandidate({
                sdpMLineIndex: payload.sdpMLineIndex,
                sdpMid: payload.sdpMid,
                candidate: payload.candidate,
            })
            this.peerConnection.addIceCandidate(candidate)
        }
    }

    /**
     * Disconnect from the room once the other peer has left
     */
    userDisconnected(packetObject) {
        console.log('User disconnected: ' + packetObject.Header.UserId)

        // For now just kill the connection
        this.disconnect()
    }

    /**
     * Check if the room size has increased and initiate the
     * ICE connection
     */
    receivePing(packetObject) {
        var userList = JSON.parse(packetObject.Payload)
        if (userList.length > 1 && this.isInitiator && !this.started) {
            this.started = true
            this.initiateConnection()
        }
    }

    /**
     * Create an ICE offer and begin signalling the 
     * other peer
     */
    initiateConnection() {
        var offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1,
        }

        this.peerConnection.createOffer(this.onCreateOfferSuccess.bind(this), this.onCreateSessionDescriptionError.bind(this), offerOptions)
    }

    /**
     * Disconnect from the signaller, close all streams, disable
     * all media devices, and reset some of the configuration
     */
    disconnect() {
        console.log('Disconnecting...')

        this.signallerConnected = false
        this.isInitiator = false
        this.started = false
        
        //this.htracker.stop()

        clearInterval(this.pingInterval)
        
        // Close the local stream
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(function(track) {
                track.stop()
            })
            this.localStream.getVideoTracks().forEach(function(track) {
                track.stop()
            })
        }
        
        // Destroy the peer connection
        if (this.peerConnection) {
            this.peerConnection.close()
            this.peerConnection = null
        }
        
        this.localStream = null
        this.remoteStream = null
        
        if (this.signaller) {
           this.signaller.close()
        }

        this.localVideoElement.removeAttribute('source')
        this.remoteVideoElement.removeAttribute('source')
    }

    /**
     * Mute local audio stream
     */
    muteMic() { 
        if (this.localStream) {
            this.muted = true
            this.localStream.getAudioTracks()[0].enabled = false
        }
    }

    /**
     * Unmute local audio stream
     */
    unmuteMic() {
        if (this.localStream) {
            this.muted = false
            this.localStream.getAudioTracks()[0].enabled = true
        }
    }

    /**
     * Mute local video stream
     */
    muteVideo() {
        if (this.localStream) {
            this.videoMuted = true
            this.localStream.getVideoTracks()[0].enabled = false
        }
    }

    /**
     * Unmute local video stream
     */
    unmuteVideo() {
        if (this.localStream) {
            this.videoMuted = false
            this.localStream.getVideoTracks()[0].enabled = true
        }
    }

    /**
     * Send the constructed offer to the other peer
     * and add it to our local description
     */
    onCreateOfferSuccess(desc) {
        this.peerConnection.setLocalDescription(desc, function() {
            // Send the offer to the other user
            this.signaller.send(JSON.stringify({
                Header: {
                    Event: 'broadcast',
                    UserId: this.userId,
                    RoomId: this.roomId,
                },
                Payload: {
                    Type: 'Ice Offer',
                    IcePacket: desc,
                },
            }))
        }.bind(this), this.onSetSessionDescriptionError)
    }

    /**
     * Send the constructed offer to the other peer
     * and add it to our local description
     */
    onCreateAnswerSuccess(desc) {
        this.peerConnection.setLocalDescription(desc, function() {
            
            // Send the answer to the other user
            this.signaller.send(JSON.stringify({
                Header: {
                    Event: 'broadcast',
                    UserId: this.userId,
                    RoomId: this.roomId,
                },
                Payload: {
                    Type: 'Ice Answer',
                    IcePacket: desc,
                },
            }))

        }.bind(this), this.onSetSessionDescriptionError)
    }

    onCreateSessionDescriptionError(error) {
        console.log('Failed to create session description: ' + error.toString())
    }

    onSetRemoteSuccess(icePacket) {
        console.log('setRemoteDescription complete')
    }

    onSetSessionDescriptionError(error) {
        console.log('Failed to set session description: ' + error.toString())
    }

    gotRemoteStream(e) {
        //this.remoteVideoElement.src = window.URL.createObjectURL(e.stream)
        this.remoteVideoElement.srcObject = e.stream
        this.onRemoteStream()
        
        /*this.htracker.init(this.localVideoElement, this.headTrackingCanvas)

        this.htracker.start()

        this.listenEventHandler('headtrackrStatus', function(e) {
            this.headStatus = e.status
            this.headTrackerStatusChanged(e.status)
            if (e.status == 'found') {
                this.htracker.stop()
            }
        }.bind(this))*/
    }
    
    /**
     * Send the ICE candidate info to the other peer
     */
    onIceCandidate(candidate) {
        if (candidate.candidate) {
            
            // Send ICE candidate info
            this.signaller.send(JSON.stringify({
                Header: {
                    Event: 'broadcast',
                    UserId: this.userId,
                    RoomId: this.roomId,
                },
                Payload: {
                    Type: 'Ice Candidate',
                    sdpMLineIndex: candidate.candidate.sdpMLineIndex,
                    candidate: candidate.candidate.candidate,
                    sdpMid: candidate.candidate.sdpMid,
                },
            }))
        } else {
        }
    }

    onAddIceCandidateSuccess() {}

    onAddIceCandidateError(error) {
        console.log('Failed to add ICE Candidate: ' + error.toString())
    }

    onGatheringChange(e) {console.log(e.currentTarget.iceGatheringState)}

    onIceStateChange(event) {}

    listenEventHandler(eventName, eventHandler) {
        window.removeEventListener(eventName, eventHandler)
        window.addEventListener(eventName, eventHandler, false)
    }
}

export default Videre
