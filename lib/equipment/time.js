module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: time.js')

//How to use this.... container.dateFormat

    var time = {
        "controllerTime": "",
        "pump1Time": "",
        "pump2Time": "",
    }


    function setControllerTime(hour, min) {
      var timeStr = ''
      if (hour > 12) {
          timeStr += hour - 12
      } else {
          timeStr += hour
      }
      timeStr += ':'
      if (min < 10)
          timeStr += '0';
      timeStr += min
      if (min > 11 && min < 24) {
          timeStr += " PM"
      } else {
          timeStr += " AM"
      }

      time.controllerTime = timeStr;
    }


    function getTime(){
      return time
    }

    if (container.logModuleLoading)
        logger.info('Loaded: time.js')


    return {
        //time,
        setControllerTime: setControllerTime,
        getTime : getTime
    }
}
