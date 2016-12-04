//Broadcast current heat set point and mode
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 8.js')

        var logger = container.logger
        var s = container.settings

        //currentHeat = container.heat.currentHeat <--Not sure why, but this isn't working very well.  :-(  Can't do currentHeat = heat and have it set container.heat.currentHeat at the same time.


    if (container.logModuleLoading)
        container.logger.info('Loaded: 8.js')

        function process(data, counter) {
            //   0 1  2  3 4  5  6 7   8  9  19 11 12 13  14 15 16 17 18 19  20
            //[165,x,15,16,8,13,75,75,64,87,101,11,0,  0 ,62 ,0 ,0 ,0 ,0 ,2,190]
            //function heatObj(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode)


            container.heat.setHeatModeAndSetPoints(data[9], data[11] & 3, data[10], (data[11] & 12) >> 2, counter)



            if (s.logConfigMessages) {
                logger.silly('Msg# %s  Heat status packet data: %s  currentHeat: %s', counter, data);
            }


            decoded = true;

            return decoded
        }

    return {
        process: process
    }
}
