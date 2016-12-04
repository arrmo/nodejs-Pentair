// Get Circuit Names
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 11.js')

        var logger = container.logger

    function process(data, counter) {

        var circuit = data[container.constants.namePacketFields.NUMBER]
        if (container.settings.logMessageDecoding) logger.silly('Msg# %s  Get Circuit Info  %s', counter, JSON.stringify(data))
        
        container.circuit.setCircuit(circuit, data[container.constants.namePacketFields.NAME], data[container.constants.namePacketFields.CIRCUITFUNCTION], counter)

        decoded = true;
        return decoded
    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: 11.js')

    return {
        process: process
    }
}
