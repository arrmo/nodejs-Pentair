//Broadcast current heat set point and mode
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 8.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants
        //currentHeat = container.heat.currentHeat <--Not sure why, but this isn't working very well.  :-(  Can't do currentHeat = heat and have it set container.heat.currentHeat at the same time.  

    s = container.settings

    if (container.logModuleLoading)
        container.logger.info('Loaded: 8.js')

        function process(data, counter, packetType) {
            //   0 1  2  3 4  5  6 7   8  9  19 11 12 13  14 15 16 17 18 19  20
            //[165,x,15,16,8,13,75,75,64,87,101,11,0,  0 ,62 ,0 ,0 ,0 ,0 ,2,190]
            //function heatObj(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode)


            var heat = new container.heat.Heat(data[9], data[11] & 3, data[10], (data[11] & 12) >> 2)



            if (s.logConfigMessages) {
                logger.silly('heat status packet object: %s  data: %s  currentHeat: %s', JSON.stringify(heat), data, container.currentHeat == undefined ? "Not set yet" : JSON.stringify(container.currentHeat));
            }
            if (heat.poolSetPoint != undefined) //invalid packet?
            {
                //if (currentHeat===container.heat.currentHeat) console.log('TRUE!!!') 
                //else console.log('FALSE!!!')
                if (container.heat.currentHeat.poolSetPoint == undefined) {
                    container.heat.currentHeat = heat
                    //if (currentHeat===container.heat.currentHeat) console.log('TRUE!!!') 
                    //else console.log('FALSE!!!')
                    if (s.logConfigMessages)
                        logger.info('Msg# %s   Pool/Spa heat set point discovered:  \n  Pool heat mode: %s @ %s degrees \n  Spa heat mode: %s at %s degrees', counter, c.heatModeStr[currentHeat.poolHeatMode], currentHeat.poolSetPoint, c.heatModeStr[currentHeat.spaHeatMode], currentHeat.spaSetPoint);

                    container.io.emit('heat');
                } else {

                    if (JSON.stringify(container.heat.currentHeat) === JSON.stringify(heat)) {
                        logger.debug('Msg# %s   Pool/Spa heat set point HAS NOT CHANGED:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, c.heatModeStr[heat.poolHeatMode], heat.poolSetPoint, c.heatModeStr[heat.spaHeatMode], heat.spaSetPoint);
                    } else {
                        if (s.logConfigMessages) {
                            logger.verbose('Msg# %s   Pool/Spa heat set point changed:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, c.heatModeStr[heat.poolHeatMode], heat.poolSetPoint, c.heatModeStr[heat.spaHeatMode], heat.spaSetPoint);
                            logger.info('Msg# %s  Change in Pool/Spa Heat Mode:  %s', counter, currentHeat.whatsDifferent(heat))
                        }
                        container.heat.currentHeat = JSON.parse(JSON.stringify(heat))
                        container.io.emit('heat');
                    }
                }
            }
            decoded = true;

            return decoded
        }

    return {
        process: process
    }
}
