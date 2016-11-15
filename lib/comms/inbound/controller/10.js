//Get Custom Names
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 10.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants
        currentHeat = container.heat.currentHeat

    if (container.logModuleLoading)
        container.logger.info('Loaded: 10.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {
            var customName = '';
            for (var i = 7; i < 18; i++) {
                if (data[i] > 0 && data[i] < 251) //251 is used to terminate the custom name string if shorter than 11 digits
                {

                    customName += String.fromCharCode(data[i])
                };
            }

            if (s.logConfigMessages) {
                logger.silly('Msg# %s  Custom Circuit Name Raw:  %s  & Decoded: %s', counter, JSON.stringify(data), customName)
                    //logger.verbose('Msg# %s  Custom Circuit Name Decoded: "%s"', counter, customName)
            }

            if (container.checkForChange[0]) {
                if (customNameArr[data[6]] !== customName) {
                    logger.info('Msg# %s  Custom Circuit name %s changed to %s', customNameArr[data[6]], customName)
                    container.io.emit('circuit');
                }
            }

            customNameArr[data[6]] = customName;
            //display custom names when we reach the last circuit
            if (data[6] == 9 && container.checkForChange[0] === 0) {
                logger.info('\n  Custom Circuit Names retrieved from configuration: ', customNameArr)
                container.checkForChange[0] = 1
                container.io.emit('circuit');
            }


            decoded = true;

            return decoded
        }
    }
}
