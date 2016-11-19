//TODO: make an 'update' function so poolHeatModeStr/spaHeatModeStr update when we set the corresponding modes.



module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: heat.js')

        function Heat(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode) {
            this.poolSetPoint = poolSetPoint;
            this.poolHeatMode = poolHeatMode;
            this.poolHeatModeStr = container.constants.heatModeStr[poolHeatMode]
            this.spaSetPoint = spaSetPoint;
            this.spaHeatMode = spaHeatMode;
            this.spaHeatModeStr = container.constants.heatModeStr[spaHeatMode]
            this.heaterActive = 0
        }

    var currentHeat = new Heat();


function setHeatActiveFromController(data){
    if (data === 0) {
        Heat.heaterActive = 0
    } else
    if (data === 32) {
        Heat.heaterActive = 1
    } else {
        Heat.heaterActive = -1 //Unknown
    }
}

function setHeatModeFromController(poolHeat, spaHeat){
  Heat.poolHeatMode = poolHeat
  Heat.poolHeatModeStr = container.constants.heatModeStr[poolHeat]
  Heat.spaHeatMode = spaHeat
  Heat.spaHeatModeStr = container.constants.heatModeStr[spaHeat]

}


    if (container.logModuleLoading)
        logger.info('Loaded: heat.js')


    return {
      currentHeat,
      Heat : Heat,
      setHeatModeFromController : setHeatModeFromController,
      setHeatActiveFromController : setHeatActiveFromController
    }
}
