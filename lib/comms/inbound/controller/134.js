//Set Circuit Function On/Off
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 134.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants

    s = container.settings

    if (container.logModuleLoading)
        container.logger.info('Loaded: 134.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {

            var status = {

                source: null,
                destination: null,
                sFeature: null,
                ACTION: null,
            }
            status.source = data[c.packetFields.FROM]
            status.destination = data[c.packetFields.DEST]


            status.sFeature = currentCircuitArrObj[data[6]].name
            if (data[7] == 0) {
                status.ACTION = "off"
            } else if (data[7] == 1) {
                status.ACTION = "on"
            }
            logger.info('Msg# %s   %s --> %s: Change %s to %s : %s', counter, c.ctrlString[data[c.packetFields.FROM]], c.ctrlString[data[c.packetFields.DEST]], status.sFeature, status.ACTION, JSON.stringify(data));
            decoded = true;


            return decoded
        }
    }
}
