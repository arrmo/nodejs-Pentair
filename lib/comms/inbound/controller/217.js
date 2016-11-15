//Get Intellichlor status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 217.js')

    logger = container.logger
    currentStatusBytes = container.currentStatusBytes
    currentCircuitArrObj = container.circuit.currentCircuitArrObj
    currentSchedule = container.currentSchedule
    customNameArr = container.circuit.customNameArr
    c = container.constants
    s = container.settings

    if (container.logModuleLoading)
        container.logger.info('Loaded: 217.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {

            if (s.logChlorinator)
                if (s.logMessageDecoding)
                    logger.debug('Msg# %s   Get Chlorinator packet: %s', counter, data)
            decoded = true;


            return decoded
        }
    }
}
