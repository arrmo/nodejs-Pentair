// Get Circuit Names
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 11.js')

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



    if (container.logModuleLoading)
        container.logger.info('Loaded: 11.js')

    //TODO:  Merge this to a common function with the pump packet

    function process(data, counter, packetType) {

        var circuitNumber = data[c.namePacketFields.NUMBER]
        logger.silly('get circuit names packet: %s', data)
        var freezeProtection;
        if ((data[c.namePacketFields.CIRCUITFUNCTION] & 64) == 64) {
            freezeProtection = 1
        } else {
            freezeProtection = 0
        }
        //The &63 masks to 00111111 because 01000000 is freeze protection bit

        //if the ID of the circuit name is 1-101 then it is a standard name.  If it is 200-209 it is a custom name.  The mapping between the string value in the getCircuitNames and getCustomNames is 200.  So subtract 200 from the circuit name to get the id in the custom name array.
        //data[4]-1 because this array starts at 1 and JS arrays start at 0.
        //-(8*whichCircuit) because this will subtract 0, 8 or 16 from the index so each secondary index will start at 0

        var circuit = JSON.parse(JSON.stringify(currentCircuitArrObj[circuitNumber]))

        if (circuitNumber != null || circuit.name != undefined) {
            if (data[c.namePacketFields.NAME] < 200) {
                circuit.name = c.strCircuitName[data[c.namePacketFields.NAME]]
            } else {
                circuit.name = container.circuit.customNameArr[data[c.namePacketFields.NAME] - 200];
            }
            circuit.number = circuitNumber;
            circuit.numberStr = 'circuit' + circuitNumber;
            circuit.circuitFunction = c.strCircuitFunction[data[c.namePacketFields.CIRCUITFUNCTION] & 63];
            circuit.freeze = freezeProtection;

            if (container.checkForChange[1]) {
                if (JSON.stringify(circuit) !== JSON.stringify(currentCircuitArrObj[circuitNumber])) {
                    results = currentCircuitArrObj[i].whatsDifferent(circuit);
                    if (!(results == "Nothing!" || currentCircuitArrObj[i].name === 'NOT USED')) {
                        logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuit.name, results)

                        if (s.logConfigMessages) {
                            logger.silly('Msg# %s  Circuit Info  %s', counter, JSON.stringify(data))
                                //logger.debug('currentCircuitArrObj[%s]: %s ', circuitNumber, JSON.stringify(currentCircuitArrObj[circuitNumber]))
                                //logger.verbose('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: %s  Freeze Protection: %s', counter, circuitNumber, strCircuitName[data[c.namePacketFields.NAME]], c.strCircuitFunction[data[c.namePacketFields.CIRCUITFUNCTION] & 63], freezeProtection)
                            if (circuit.status == undefined) {
                                logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: (not received yet)  Freeze Protection: %s', counter, currentCircuitArrObj[circuitNumber].number, currentCircuitArrObj[circuitNumber].name, currentCircuitArrObj[circuitNumber].circuitFunction, currentCircuitArrObj[circuitNumber].freeze)
                            } else {
                                logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: %s  Freeze Protection: %s', counter, currentCircuitArrObj[circuitNumber].number, currentCircuitArrObj[circuitNumber].name, currentCircuitArrObj[circuitNumber].circuitFunction, currentCircuitArrObj[circuitNumber].status, currentCircuitArrObj[circuitNumber].freeze)

                            }
                        }
                        container.io.emit('circuit');
                    }
                } else {
                    logger.debug('Msg# %s  No change in circuit %s', counter, circuit.number)
                }
            }
            currentCircuitArrObj[circuitNumber] = JSON.parse(JSON.stringify(circuit));



            if (data[c.namePacketFields.NUMBER] === 20 && container.checkForChange[1] === 0 && currentCircuitArrObj[20].name != undefined) {
                var circuitStr = '';
                for (var i = 1; i <= 20; i++) {
                    circuitStr += 'Circuit ' + currentCircuitArrObj[i].number + ': ' + currentCircuitArrObj[i].name
                    circuitStr += ' Function: ' + currentCircuitArrObj[circuitNumber].circuitFunction
                    if (currentCircuitArrObj[circuitNumber].status == undefined) {
                        circuitStr += ' Status: (not received yet)'
                    } else {
                        circuitStr += ' Status: ' + currentCircuitArrObj[circuitNumber].status
                    }
                    circuitStr += ' Freeze Protection: ' + currentCircuitArrObj[circuitNumber].freeze
                    circuitStr += '\n'
                }
                logger.info('\n  Circuit Array Discovered from configuration: \n%s \n', circuitStr)
                container.io.emit('circuit');
                container.checkForChange[1] = 1
            }
        }

        decoded = true;
        return decoded
    }

    return {
        process: process
    }
}
