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
        }

    var currentHeat = new Heat();

    if (container.logModuleLoading)
        logger.info('Loaded: heat.js')


    return {
      currentHeat,
      Heat : Heat
    }
}
