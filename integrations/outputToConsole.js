//This makes the module available to the app through BottleJS
module.exports = function(container) {

    //load the configuration file
    var configFile = container.settings.getConfig()
        //and read the variables we put there
    var level = configFile.outputToConsole.level
    var protocol = configFile.Misc.expressTransport
    var serverURL;
    var secureTransport;
    //The following IF statement sets the varibles if the transport is either HTTP or HTTPS
    if (protocol === 'http') {
        serverURL = 'http://localhost:3000'
        secureTransport = false
    } else {
        serverURL = 'https://localhost:3000'
        secureTransport = true
    }

    //we listen to events with the socket client
    var io = container.socketClient
    var socket = io.connect(serverURL, {
        secure: secureTransport,
        reconnect: true,
        rejectUnauthorized: false
    });

    //This is a listener for the time event.  data is what is received.
    socket.on('time', function(data) {
        console.log('outputToConsole: The time was broadcast, and it was received.  The time is: %s', JSON.stringify(data))
    })

    //The 'connect' function fires when the socket is connected
    socket.on('connect', function(err) {
        console.log('outputToConsole: Socket connected to socket @ %s (secure: %s)', serverURL, secureTransport)
    })

    //The 'error' function fires if there is an error connecting to the socket
    socket.on('error', function(err) {
        console.log('outputToConsole: Error connecting to socket @ %s (secure: %s)', serverURL, secureTransport)
    })

    //This init can be this simple.  It just lets us know the integration is running
    function init() {
        //to log through all the logger channels (formatting, to the Bootstrap debug, etc, use "container.logger")
        //we are using our variable, level, to set the level of the logger here
        container.logger[level]('outputToConsole Loaded.')
    }

    //This makes the init() function available to the app globally
    return {
        init: init
    }
}
