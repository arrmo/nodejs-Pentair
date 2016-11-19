//Set Circuit Function On/Off
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 134.js')



    if (container.logModuleLoading)
        container.logger.info('Loaded: 134.js')


    return {
        process: function(data, counter, packetType) {
            container.circuit.requestUpdateCircuit(data[c.packetFields.FROM], data[c.packetFields.DEST], data[6], data[7], counter)
            decoded = true;


            return decoded
        }
    }
}
