//Intellichlor status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 25.js')

        logger = container.logger

        function process(data, counter, packetType) {

            if (s.intellitouch) { //this is to test configs without a chlorinator.  can get rid of it.
                if (s.logChlorinator)
                    logger.debug('Msg# %s   Chlorinator status packet: %s', counter, data)

                    //TODO: move this to constants
                    var chlorinatorStatusBytes = {
                      "outputSpaPercent": 6,
                      "outputPercent": 7,
                      "saltPPM": 9,
                      "status": 10

                    }


                var outputSpaPercent = data[chlorinatorStatusBytes.outputSpaPercent]
                var outputPercent = data[chlorinatorStatusBytes.outputPercent];
                var saltPPM = data[chlorinatorStatusBytes.saltPPM];
                var status = data[chlorinatorStatusBytes.status]
                var name = container.chlorinator.getChlorinatorNameByBytes(data.slice(12,27))
                container. chlorinator.addChlorinatorStatus(saltPPM, outputPercent, outputSpaPercent, status, name, counter)



            }
            decoded = true;
            return decoded
        }


        if (container.logModuleLoading)
            container.logger.info('Loaded: 25.js')


    return {
        process: process
    }
}
