//Get system settings
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 252.js')

    logger = container.logger
    currentStatusBytes = container.currentStatusBytes
    currentCircuitArrObj = container.circuit.currentCircuitArrObj
    currentSchedule = container.currentSchedule
    customNameArr = container.circuit.customNameArr
    c = container.constants
    s = container.settings

    if (container.logModuleLoading)
        container.logger.info('Loaded: 252.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter) {
            //Software/Bootloader Revision
            if (s.logConfigMessages) {
                logger.info('Controller Bootloader Revision: %s  Full Packet: %s', data[11] + '.' + data[12] + data[13], JSON.stringify(data))
            }
            var decoded = true
            return decoded
        }
    }
}
