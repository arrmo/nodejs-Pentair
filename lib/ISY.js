var ISYConnector = function () {};
var request = require('request');

ISYConnector.prototype.emit = function (ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger) {
    logger.verbose('Sending ISY Rest API Calls')

    var basePath = '/rest/vars/set/2/'

    var options = {
        hostname: ISYConfig.ipaddr,
        port: ISYConfig.port,
        auth: ISYConfig.username + ':' + ISYConfig.password
    }

    var delayCounter = 0;


    //var httpTimer = new NanoTimer(); //is there a better way to call NanoTimer from the main index.js?
    for (var ISYVar in ISYConfig.Variables) {
        options.url = basePath + ISYConfig.Variables[ISYVar] + '/' + eval(ISYVar);
        //httpTimer.setTimeout(send, '', (500 * delayCounter).toString() + 'm'); //500ms delay between http requests to ISY
        delayCounter++;

        //function send() {
        logger.debug('Send ISY Variables: ', options);
        var req = request(options, function (error, res, body) {
            if (!error && body != undefined) {
                logger.debug('Response from ISY:', body)
            }


        })
        req.on('error', (e) => {
            logger.error('Error writing ISY Request: ${e.message}')
        })

    }
    //}


}




module.exports = new ISYConnector();