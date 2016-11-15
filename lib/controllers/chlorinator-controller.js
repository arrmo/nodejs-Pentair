var Bottle = require('bottlejs');
var bottle = Bottle.pop('pentair-Bottle');

if (bottle.container.logModuleLoading)
    bottle.container.logger.info('Loading: chlorinator-controller.js')



exports.startPumpController = function() {

    var chlorinatorTimer = new NanoTimer();
    chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '3500m')

}


function chlorinatorStatusCheck() {
    if (desiredChlorinatorOutput >= 0 && desiredChlorinatorOutput <= 101) {
        queuePacket([16, 2, 80, 17, desiredChlorinatorOutput])

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



if (bottle.container.logModuleLoading)
    bottle.container.logger.info('Loaded: chlorinator-controller.js')
