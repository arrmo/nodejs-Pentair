//Set Circuit Function On/Off
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 134.js')


function process(data, counter) {
            container.circuit.requestUpdateCircuit(data[container.constants.packetFields.FROM], data[container.constants.packetFields.DEST], data[6], data[7], counter)
            decoded = true;


            return decoded
        }


    if (container.logModuleLoading)
        container.logger.info('Loaded: 134.js')


    return {
        process: process
    }
}
