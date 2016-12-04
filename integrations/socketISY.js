//var Bottle = require('bottlejs');
//var bottle = Bottle.pop('pentair-Bottle');
var request = require('request')

module.exports = function(container) {

    var io = container.socketClient
    var ISYTimer = container.nanoTimer
    var fs = container.fs

    var socket = io.connect('https://localhost:3000', {
        secure: true,
        reconnect: true,
        rejectUnauthorized: false
    });

    pump = {}
    chlorinator = {}
    var configurationFile = 'config.json';
    var configFile = JSON.parse(fs.readFileSync(configurationFile));
    var enabled = configFile.Integrations.socketISY
    var ISYConfig = configFile.socketISY
    var ISYVars = configFile.socketISY.Variables

    function send(name, connectionString) {

        request(connectionString, function(error, response, body) {
            if (error) {
                container.logger.error('ISY: Error writing ISY Variable %s.  Request: %s  (value: %s)', error, name, connectionString)
            } else {
                container.logger.verbose('ISY: Response from ISY: %s %s', response, body)
            }
        })
    }

    function process(name, ISYport, value) {
        //logger.verbose('Sending ISY Rest API Calls')

        var basePath = '/rest/vars/set/2/'

        var options = {
            hostname: ISYConfig.ipaddr,
            port: ISYConfig.port,
            auth: ISYConfig.username + ':' + ISYConfig.password
        }
        var connectionString
        var logconnectionString

        var delayCounter = 0;

        connectionString = 'http://' + options.auth + '@' + options.hostname + ':' + options.port + basePath + ISYport + '/' + value;
        logconnectionString = 'http://' + 'user:pwd' + '@' + options.hostname + ':' + options.port + basePath + ISYport + '/' + value;


        container.logger.verbose('ISY Socket: Sending %s (value: %s) to ISY with URL (%s)', name, value, logconnectionString)
        ISYTimer.setTimeout(send, [name, connectionString], (delayCounter).toString() + 'm'); //500ms delay between http requests to ISY
        delayCounter += 500

    }

    socket.on('chlorinator', function(data) {
        //console.log('FROM SOCKET CLIENT: ' + JSON.stringify(data))
        for (var prop in data) {
            for (var ISYVar in ISYVars.chlorinator) {
                if (ISYVar === prop && data[prop] !== -1) {
                    //console.log('true')
                    if (!chlorinator.hasOwnProperty(prop)) {
                        chlorinator[prop] = data[prop]
                        process(prop, ISYVars.chlorinator[ISYVar], chlorinator[prop])
                    } else if (chlorinator[prop] !== data[prop]) {
                        chlorinator[prop] = data[prop]
                        process(prop, ISYVars.chlorinator[ISYVar], chlorinator[prop])
                    } else if (chlorinator[prop] === data[prop]) {
                        container.logger.debug('ISY Socket: Will not send %s to ISY because the value has not changed (%s)', prop, chlorinator[prop])

                    }

                }
            }
        }
    })



    socket.on('pump', function(data) {
        for (var v in Object.keys(ISYVars.pump)) {  //Retrieve number of pumps to retrieve from configFile.socketISY.Variables
            var currPump = parseInt(Object.keys(ISYVars.pump)[v]) //fancy way of converting JSON key "pump"."1" to int (1)
            for (var prop in data[currPump]) {  //retrieve values in pump[1]
                for (var ISYVar in ISYVars.pump[currPump]) { //iterate over JSON "pump"."1"."Variables" for a match
                    var varset = 1;  //variable to tell us if there is a value.
                    if (data[currPump][prop] === -1){
                        varset = 0  //set to 0 if the value is -1
                    }
                    else if (data[currPump][prop].toString().toLowerCase().indexOf("notset") >= 0){
                     varset = 0 //or if the value contains "notset"
                    }
                    if (ISYVar === prop && varset) {  //is the ISYVariable and the pump variable the same?  And is the actual value !== -1 or "notset"
                        if (!pump.hasOwnProperty(prop)) {  //If the value isn't previously set...
                            pump[prop] = data[currPump][prop]
                            process(prop, ISYVars.pump[currPump][ISYVar], pump[prop])
                        } else if (pump[prop] !== data[currPump][prop]) {  //if the value isn't equal to what we have stored locally
                            pump[prop] = data[currPump][prop]
                            process(prop, ISYVars.pump[currPump][ISYVar], pump[prop])  //if the value IS equal to what we have stored locally
                        } else if (pump[prop] === data[currPump][prop]) {
                            container.logger.debug('ISY Socket: Will not send %s to ISY because the value has not changed (%s)', prop, pump[prop])
                        }
                    }
                }
            }
        }
    })


    function init() {
        container.logger.verbose('Socket ISY Loaded')
    }

    return {
        init: init
    }
}
