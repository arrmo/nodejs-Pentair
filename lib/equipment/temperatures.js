module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: temperatures.js')

    var temperatures = {
        "poolTemp": 0,
        "spaTemp": 0,
        "airTemp": 0,
        "solarTemp": 0
    }


    function setTempFromController(poolTemp, spaTemp, airTemp, solarTemp) {
        temperatures.poolTemp = poolTemp
        temperatures.spaTemp = spaTemp
        temperatures.airTemp = airTemp
        temperatures.solarTemp = solarTemp
    }

    function getTemperatures(){
      return temperatures
    }

    if (container.logModuleLoading)
        logger.info('Loaded: temperatures.js')


    return {
        temperatures,
        setTempFromController: setTempFromController,
        getTemperatures : getTemperatures
    }
}
