//Intellichlor status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 25.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants
        currentHeat = container.heat.currentHeat
        currentChlorinatorStatus = container.chlorinator.currentChlorinatorStatus

    if (container.logModuleLoading)
        container.logger.info('Loaded: 25.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {

            if (s.intellitouch) { //this is to test configs without a chlorinator.  can get rid of it.
                if (s.logChlorinator)
                    logger.debug('Msg# %s   Chlorinator status packet: %s', counter, data)

                //copy the currentChlorinatorStatus to temp object
                //var chlorinatorStatus = JSON.parse(JSON.stringify(currentChlorinatorStatus));;
                //we are not using the parse(stringify) method here because the constructor contains a mapping function
                var chlorinatorStatus = container.chlorinator.chlorinatorObj();
                chlorinatorStatus.outputSpaPercent = (data[6] - 1) / 2; //41 would equal 20%, for example
                chlorinatorStatus.outputPercent = data[7];
                chlorinatorStatus.saltPPM = data[9] * 50;
                switch (data[10]) {
                    case 0: //ok
                        {
                            chlorinatorStatus.status = "Ok";
                            break;
                        }
                    case 1:
                        {
                            chlorinatorStatus.status = "No flow";
                            break;
                        }
                    case 2:
                        {
                            chlorinatorStatus.status = "Low Salt";
                            break;
                        }
                    case 4:
                        {
                            chlorinatorStatus.status = "High Salt";
                            break;
                        }
                    case 132:
                        {
                            chlorinatorStatus.status = "Comm Link Error(?).  Also Low Salt.  ";
                            break;
                        }

                    case 144:
                        {
                            chlorinatorStatus.status = "Clean Salt Cell"
                            break;
                        }
                    case 145:
                        {
                            chlorinatorStatus.status = "???"
                            break;
                        }
                    default:
                        {
                            chlorinatorStatus.status = "Unknown - Status code: " + data[10];
                        }
                }
                chlorinatorStatus.name = '';
                for (var i = 12; i <= 27; i++) {
                    chlorinatorStatus.name += String.fromCharCode(data[i]);
                }
                if (currentChlorinatorStatus.name == '') {
                    currentChlorinatorStatus = chlorinatorStatus;
                    if (s.logChlorinator)
                        logger.info('Msg# %s   Initial chlorinator settings discovered: ', counter, JSON.stringify(currentChlorinatorStatus))
                    container.io.emit('chlorinator');
                } else
                if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
                    if (s.logChlorinator)
                        logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
                } else {
                    if (s.logChlorinator)
                        logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                    currentChlorinatorStatus = chlorinatorStatus;
                    container.io.emit('chlorinator');
                }

            }
            decoded = true;
            return decoded
        }
    }
}
