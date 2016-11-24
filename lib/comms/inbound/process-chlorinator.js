module.exports = function(container) {
        if (container.logModuleLoading)
            container.logger.info('Loading: process-chlorinator.js')

        s = container.settings


        function processChlorinatorPacket(data, counter) {

            container.chlorinator.processChlorinatorPacketfromController(data, counter)
                //return decoded
                //End Chlorinator Decode
                return true
        }


        if (container.logModuleLoading)
            container.logger.info('Loaded: process-chlorinator.js')

        return {
            processChlorinatorPacket: processChlorinatorPacket

        }

    }
    //End Pump Decode
