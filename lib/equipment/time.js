module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: time.js')

    //How to use this.... container.dateFormat

    var time = {
        "controllerTime": "",
        "pump1Time": "",
        "pump2Time": ""
    }


    function setControllerTime(hour, min) {
        var timeStr = ''
        var ampm = ''
        if (hour >= 12) {
            ampm += " PM"
        } else {
            ampm += " AM"
        }
        if (hour >= 13)
            hour = hour - 12
        else if (hour === 0) {
            hour += 12
        }
        if (min < 10)
            min += '0' + min.toString();

        timeStr += hour + ':' + min + ampm

        if (time.controllerTime === undefined) {
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


    function getTime(callback) {
        return time
    }

    if (container.logModuleLoading)
        logger.info('Loaded: time.js')


    return {
        //time,
        setControllerTime: setControllerTime,
        getTime: getTime
    }
}
