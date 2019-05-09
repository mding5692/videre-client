import Videre from '../src/videre-client'

var hostVideo = document.getElementById('hostVideo')
var remoteVideo = document.getElementById('remoteVideo')
var canvasContext = document.getElementById('volumeLevel')
var remoteCanvas = document.getElementById('remoteCanvas')
var headIndicator = document.getElementById('headIndicator')

canvasContext = canvasContext.getContext('2d')

var videre = new Videre({
    signallerURL: 'http://localhost:1111/echo',
    localVideoElement: hostVideo,
    remoteVideoElement: remoteVideo,
    remoteCanvasElement: remoteCanvas,
    initComplete: init,
    headTrackerStatusChanged: headChanged
})

videre.onLocalStream = function() {
    videre.localVideoElement.muted = true
}

function init() {
    console.log('Videre initiated')
}

function headChanged(status) {
    if (status == 'found') {
        headIndicator.style.display = 'block'
    } else {
        headIndicator.style.display = 'none'
    }
}

videre.onLocalStream = function() {
    setInterval(function() {
        canvasContext.clearRect(0, 0, 60, 130)
        canvasContext.fillStyle = '#00ff00'
        canvasContext.fillRect(0,130-videre.volumeLevel,25,130)
        $('#volumeLevelData').val(videre.volumeLevel)
    }, 100)
}


$('#connectButton').click(function() {
    videre.connect($('#roomNumber').val())
})

$('#disconnectButton').click(function() {
    videre.disconnect()
})
