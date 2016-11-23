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



    function changeHeatSetPoint(equip, change, src) {
        //TODO: There should be a function for a relative (+1, -1, etc) change as well as direct (98 degrees) method
        //ex spa-->103
        //255,0,255,165,16,16,34,136,4,95,104,7,0,2,65

        /*
        FROM SCREENLOGIC

        20:49:39.032 DEBUG iOAOA: Packet being analyzed: 255,0,255,165,16,16,34,136,4,95,102,7,0,2,63
        20:49:39.032 DEBUG Msg# 153  Found incoming controller packet: 165,16,16,34,136,4,95,102,7,0,2,63
        20:49:39.032 INFO Msg# 153   Wireless asking Main to change pool heat mode to Solar Only (@ 95 degrees) & spa heat mode to Heater (at 102 degrees): [165,16,16,34,136,4,95,102,7,0,2,63]
        #1 - request

        20:49:39.126 DEBUG iOAOA: Packet being analyzed: 255,255,255,255,255,255,255,255,0,255,165,16,34,16,1,1,136,1,113
        20:49:39.127 DEBUG Msg# 154  Found incoming controller packet: 165,16,34,16,1,1,136,1,113
        #2 - ACK

        20:49:41.241 DEBUG iOAOA: Packet being analyzed: 255,255,255,255,255,255,255,255,0,255,165,16,15,16,2,29,20,57,0,0,0,0,0,0,0,0,3,0,64,4,68,68,32,0,61,59,0,0,7,0,0,152,242,0,13,4,69
        20:49:41.241 DEBUG Msg# 155  Found incoming controller packet: 165,16,15,16,2,29,20,57,0,0,0,0,0,0,0,0,3,0,64,4,68,68,32,0,61,59,0,0,7,0,0,152,242,0,13,4,69
        20:49:41.241 VERBOSE -->EQUIPMENT Msg# 155  .....
        #3 - Controller responds with status
        */


        logger.debug('cHSP: setHeatPoint called with %s %s from %s', equip, change, src)
        var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
        if (equip === 'pool') {
            var updateHeat = [165, container.intellitouch.getpreambleByte(), 16, container.settings.appAddress, 136, 4, currentHeat.poolSetPoint + parseInt(change), currentHeat.spaSetPoint, updateHeatMode, 0]
            logger.info('User request to update %s set point to %s', equip, currentHeat.poolSetPoint + change)
        } else {
            var updateHeat = [165, container.intellitouch.getpreambleByte(), 16, container.settings.appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint + parseInt(change), updateHeatMode, 0]
            logger.info('User request to update %s set point to %s', equip, currentHeat.spaSetPoint + change)
        }
        container.queuePacket.queuePacket(updateHeat);
    }

    function changeHeatMode(equip, heatmode, src) {

        //pool
        if (equip === 'pool') {
            var updateHeatMode = (currentHeat.spaHeatMode << 2) | heatmode;
            var updateHeat = [165, container.intellitouch.getpreambleByte(), 16, container.settings.appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
            queuePacket(updateHeat);
            //TODO: replace heatmode INT with string
            logger.info('User request to update pool heat mode to %s', heatmode)
        } else {
            //spaSetPoint
            var updateHeatMode = (parseInt(heatmode) << 2) | currentHeat.poolHeatMode;
            var updateHeat = [165, container.intellitouch.getpreambleByte(), 16, container.settings.appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
            queuePacket(updateHeat);
            //TODO: replace heatmode INT with string
            logger.info('User request to update spa heat mode to %s', heatmode)
        }
    }


    if (container.logModuleLoading)
        logger.info('Loaded: heat.js')


    return {
        getCurrentHeat: getCurrentHeat,
        changeHeatMode: changeHeatMode,
        setHeatModeFromController: setHeatModeFromController,
        setHeatActiveFromController: setHeatActiveFromController,
        setHeatModeAndSetPoints: setHeatModeAndSetPoints
    }
}
