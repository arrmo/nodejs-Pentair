module.exports = function(container) {
  var logger = container.logger
  if (container.logModuleLoading)
      logger.info('Loading: chlorinator-controller.js')

    var NanoTimer = require('nanotimer')
    var chlorinatorTimer = new NanoTimer();


    function startPumpController() {
        chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '3500m')
    }


    function chlorinatorStatusCheck() {
        desiredChlorinatorOutput = container.chlorinator.getDesiredChlorinatorOutput()
        if (desiredChlorinatorOutput >= 0 && desiredChlorinatorOutput <= 101) {
            container.queuePacket.queuePacket([16, 2, 80, 17, desiredChlorinatorOutput])

            //not 100% sure if we need this, but just in case we get here in the middle of the 1800s timeout, let's clear it out
            //this would happen if the users sets the chlorinator from 0 to 1-100.
            chlorinatorTimer.clearTimeout()

            //if 0, then only check every 30 mins; else resend the packet every 4 seconds as a keep-alive
            if (desiredChlorinatorOutput === 0) {
                chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '1800s') //30 minutes
            } else {
                chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '4s') // every 4 seconds
            }
        }
    }

    if (container.logModuleLoading)
        logger.info('Loaded: chlorinator-controller.js')

    return {
        startPumpController: startPumpController,
        chlorinatorStatusCheck: chlorinatorStatusCheck
    }

}
