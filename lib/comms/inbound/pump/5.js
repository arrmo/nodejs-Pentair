module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)5.js')

    s = container.settings
    logger = container.logger

    function process(data, counter) {
        var mode = data[7]

        container.pump.setRunMode(mode, data[container.constants.packetFields.FROM], data, counter)

    }



    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)5.js')



    return {
        process: process
    }
}
