//TODO: make an 'update' function so poolHeatModeStr/spaHeatModeStr update when we set the corresponding modes.



module.exports = function(container) {
    var logger = container.logger
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


    function setHeatActiveFromController(data) {
        if (data === 0) {
            Heat.heaterActive = 0
        } else
        if (data === 32) {
            Heat.heaterActive = 1
        } else {
            Heat.heaterActive = -1 //Unknown
        }
    }

    function setHeatModeFromController(poolHeat, spaHeat) {
        Heat.poolHeatMode = poolHeat
        Heat.poolHeatModeStr = container.constants.heatModeStr[poolHeat]
        Heat.spaHeatMode = spaHeat
        Heat.spaHeatModeStr = container.constants.heatModeStr[spaHeat]
    }

    function getCurrentHeat() {
        return currentHeat
    }

    function setHeatModeAndSetPoints(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode, counter) {
        var heat = new Heat(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode)

        if (currentHeat.poolSetPoint === undefined) {
            copyHeat(heat)
            if (container.settings.logConfigMessages)
                logger.info('Msg# %s   Pool/Spa heat set point discovered:  \n  Pool heat mode: %s @ %s degrees \n  Spa heat mode: %s at %s degrees', counter, currentHeat.poolHeatModeStr, currentHeat.poolSetPoint, currentHeat.spaHeatModeStr, currentHeat.spaSetPoint);

            container.io.emitToClients('heat');
        } else {

            if (newHeatSameAsExistingHeat(heat)) {
                logger.debug('Msg# %s   Pool/Spa heat set point HAS NOT CHANGED:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, currentHeat.poolHeatModeStr, currentHeat.poolSetPoint, currentHeat.spaHeatModeStr, currentHeat.spaSetPoint)
            } else {

                if (container.settings.logConfigMessages) {
                    logger.verbose('Msg# %s   Pool/Spa heat set point changed:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, heat.poolHeatModeStr, heat.poolSetPoint, heat.spaHeatModeStr, heat.spaSetPoint);
                    logger.info('Msg# %s  Change in Pool/Spa Heat Mode:  %s', counter, currentHeat.whatsDifferent(heat))
                }
                copyHeat(heat)
                container.io.emitToClients('heat');
            }
        }
    }

    function copyHeat(heat) {
        currentHeat.poolSetPoint = heat.poolSetPoint;
        currentHeat.poolHeatMode = heat.poolHeatMode;
        currentHeat.poolHeatModeStr = heat.poolHeatModeStr
        currentHeat.spaSetPoint = heat.spaSetPoint;
        currentHeat.spaHeatMode = heat.spaHeatMode;
        currentHeat.spaHeatModeStr = heat.spaHeatModeStr
    }

    function newHeatSameAsExistingHeat(heat) {
        if (
            currentHeat.poolSetPoint === heat.poolSetPoint &&
            currentHeat.poolHeatMode === heat.poolHeatMode &&
            currentHeat.poolHeatModeStr === heat.poolHeatModeStr &&
            currentHeat.spaSetPoint === heat.spaSetPoint &&
            currentHeat.spaHeatMode === heat.spaHeatMode &&
            currentHeat.spaHeatModeStr === heat.spaHeatModeStr
        ) {
            return true
        } else {
            return false
        }
    }

    if (container.logModuleLoading)
        logger.info('Loaded: heat.js')


    return {
        getCurrentHeat: getCurrentHeat,
        //Heat: Heat,
        setHeatModeFromController: setHeatModeFromController,
        setHeatActiveFromController: setHeatActiveFromController,
        setHeatModeAndSetPoints: setHeatModeAndSetPoints
    }
}
