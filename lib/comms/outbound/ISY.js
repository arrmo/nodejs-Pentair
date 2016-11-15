
    var NanoTimer = require('nanotimer'); //If you get an error here, re-run 'npm install` because this is a new dependency.
    var ISYTimer = new NanoTimer();


    module.exports = function(container) {

        logger = container.logger
        ISYConfig = container.ISYConfig
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        currentChlorinatorStatus = container.chlorinator.currentChlorinatorStatus

        //var ISYConfig; //object to hold ISY variables.
        //TODO: We don't need to assign this anymore.  Can use the bottle... to access it directly.
        //ISYConfig = JSON.parse(JSON.stringify(s.ISYConfig))


        if (container.logModuleLoading)
            logger.info('Loading: heat.js')


        function send(connectionString, logger) {
            var request = require('request')

            request(connectionString, function(error, response, body) {
                if (error) {
                    logger.error('ISYC: Error writing ISY Request: %s  (value: %s)', error, connectionString)
                } else {
                    logger.verbose('ISYC: Response from ISY: %s %s', response, body)
                }
            })
        }
        if (container.logModuleLoading)
            logger.info('Loaded: heat.js')

        return {
          emit: function(outputType) {
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


              for (var ISYVar in ISYConfig.Variables) {
                  if (ISYVar.toLowerCase().indexOf(outputType.toLowerCase()) != -1 || outputType == 'all') {
                      var value = eval(ISYVar)
                      connectionString = 'http://' + options.auth + '@' + options.hostname + ':' + options.port + basePath + ISYConfig.Variables[ISYVar] + '/' + value;
                      logconnectionString = 'http://' + 'user:pwd' + '@' + options.hostname + ':' + options.port + basePath + ISYConfig.Variables[ISYVar] + '/' + value;
                      //options.uri = basePath + ISYConfig.Variables[ISYVar] + '/' + value;
                      if (value.toString().toLowerCase().indexOf('notset') == -1) {

                          logger.verbose('ISYC: Sending %s (value: %s) to ISY with URL (%s)', ISYVar, eval(ISYVar), logconnectionString)
                          ISYTimer.setTimeout(send, [connectionString, logger], (delayCounter).toString() + 'm'); //500ms delay between http requests to ISY
                          delayCounter += 500
                      } else {
                          logger.debug('ISYC: Will not send %s to ISY because the value is %s', ISYVar, value)
                      }
                  }
              }

              //NEED:  return here??
          }

        }

    }
}
//module.exports = new ISYConnector();
