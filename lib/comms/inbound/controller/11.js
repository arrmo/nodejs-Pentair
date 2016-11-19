// Get Circuit Names
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 11.js')

        logger = container.logger

    function process(data, counter, packetType) {

        var circuit = data[c.namePacketFields.NUMBER]
        if (container.settings.logMessageDecoding) logger.silly('Msg# %s  Get Circuit Info  %s', counter, JSON.stringify(data))
        container.circuit.setCircuit(circuit, data[c.namePacketFields.NAME], data[c.namePacketFields.CIRCUITFUNCTION], counter)

        decoded = true;
        return decoded
    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: 11.js')

    return {
        process: process
    }
}
