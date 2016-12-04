module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)2.js')

    s = container.settings
    logger = container.logger

    function process(pumpStatus, data) {
      logger.info('in pump area 2: ', data)

        decoded = true;
        return decoded
    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)2.js')



    return {
        process: process
    }
}
