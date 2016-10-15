var ISYConnector = function () {};

ISYConnector.prototype.emit = function (ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType) {
    //logger.verbose('Sending ISY Rest API Calls')

    var basePath = '/rest/vars/set/2/'

    var options = {
        hostname: ISYConfig.ipaddr,
        port: ISYConfig.port,
        auth: ISYConfig.username + ':' + ISYConfig.password
    }
    var connectionString

    var delayCounter = 0;
    var httpTimer = new NanoTimer(); //is there a better way to call NanoTimer from the main index.js?


    for (var ISYVar in ISYConfig.Variables) {
        if (ISYVar.toLowerCase().indexOf(outputType.toLowerCase()) != -1 || outputType == 'all') {
            var value = eval(ISYVar)
            connectionString = 'http://' + options.auth + '@' + options.hostname + ':' + options.port + basePath + ISYConfig.Variables[ISYVar] + '/' + value;
            //options.uri = basePath + ISYConfig.Variables[ISYVar] + '/' + value;
            if (value.toString().toLowerCase().indexOf('notset') == -1) {

                logger.verbose('ISYC: Sending %s (value: %s) to ISY with URL (%s)', ISYVar, eval(ISYVar), connectionString)
                httpTimer.setTimeout(send, [connectionString, logger], (delayCounter).toString() + 'm'); //500ms delay between http requests to ISY
                delayCounter += 500
            } else
            {
                logger.debug('ISYC: Will not send %s to ISY because the value is %s', ISYVar, value)
            }
        }
    }
}

function send(connectionString, logger) {
    var request = require('request')

    request(connectionString, function (error, response, body) {
        if (error) {
            logger.error('ISYC: Error writing ISY Request: %s  (value: %s)', error, connectionString)
        } else {
            logger.verbose('ISYC: Response from ISY: %s %s', response, body)
        }
    })
}

module.exports = new ISYConnector();