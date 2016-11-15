//Set Intellichlor status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 153.js')

    logger = container.logger
    c = container.constants
    s = container.settings

    if (container.logModuleLoading)
        container.logger.info('Loaded: 153.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {

            if (s.logChlorinator)
                logger.info('Msg# %s   Set Chlorinator packet: %s', counter, data)
            decoded = true;
            return decoded
        }
    }
}
