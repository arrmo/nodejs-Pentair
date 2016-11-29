//This makes the module available to the app through BottleJS
module.exports = function(container) {

    //we listen to events with the socket client
    var io = container.socketClient
    var socket = io.connect('https://localhost:3000', {
        secure: true,
        reconnect: true,
        rejectUnauthorized: false
    });

    //load the configuration file
    var configFile = container.settings.getConfig()
    //and read the variables we put there
    var level = configFile.outputToConsole.level

    //This is a listener for the time event.  data is what is received.
    socket.on('time', function(data){
      console.log('The time was broadcast, and outputToConsole received it.  The time is: %s', JSON.stringify(data))
    })

    //This init can be this simple.  It just lets us know the integration is running
    function init() {
        //to log through all the logger channels (formatting, to the Bootstrap debug, etc, use "container.logger.")
        //we are using our variable, level, to set the level of the logger here
        container.logger[level]('outputToConsole Loaded')
    }

    //This makes the init() function available to the app globally
    return {
        init: init
    }
}
