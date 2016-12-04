module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: time.js')

    //How to use this.... container.dateFormat

    var time = {
        "controllerTime": -1,
        "pump1Time": -1,
        "pump2Time": -1
    }


    function setControllerTime(hour, min) {
        var timeStr = container.helpers.formatTime(hour, min)

        if (time.controllerTime === -1) {
            time.controllerTime = timeStr;
            container.io.emitToClients('time')
        } else if (timeStr !== time.controllerTime) {
            container.io.emitToClients('time')
            time.controllerTime = timeStr;
        }
        else {
          if (container.settings.logConfigMessages) logger.debug('No change in time.')
        }

    }

    function setPumpTime(pump, time){
      var pumpStr = "pump" + pump + "Time"
      time[pumpStr] = time
    }

    function getTime(callback) {
        return time
    }

    if (container.logModuleLoading)
        logger.info('Loaded: time.js')


    return {
        //time,
        setControllerTime: setControllerTime,
        getTime: getTime,
        setPumpTime: setPumpTime
    }
}
