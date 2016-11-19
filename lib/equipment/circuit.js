function Circuit(number, numberStr, name, circuitFunction, status, freeze) {
    this.number = number; //1
    this.numberStr = numberStr; //circuit1
    this.name = name; //Pool
    this.circuitFunction = circuitFunction; //Generic, Light, etc
    this.status = status; //0, 1
    this.freeze = freeze; //0, 1
}

module.exports = function(container) {


    if (container.logModuleLoading)
        container.logger.info('Loading: circuit.js')

    var initialCircuitsDiscovered = 0
    var logger = container.logger

    var circuit1 = new Circuit();
    var circuit2 = new Circuit();
    var circuit3 = new Circuit();
    var circuit4 = new Circuit();
    var circuit5 = new Circuit();
    var circuit6 = new Circuit();
    var circuit7 = new Circuit();
    var circuit8 = new Circuit();
    var circuit9 = new Circuit();
    var circuit10 = new Circuit();
    var circuit11 = new Circuit();
    var circuit12 = new Circuit();
    var circuit13 = new Circuit();
    var circuit14 = new Circuit();
    var circuit15 = new Circuit();
    var circuit16 = new Circuit();
    var circuit17 = new Circuit();
    var circuit18 = new Circuit();
    var circuit19 = new Circuit();
    var circuit20 = new Circuit();
    //array of circuit objects.  Since Pentair uses 1-20, we'll just use a placeholder for the 1st [0] element in the array


    var currentCircuitArrObj = ['blank', circuit1, circuit2, circuit3, circuit4, circuit5, circuit6, circuit7, circuit8, circuit9, circuit10, circuit11, circuit12, circuit13, circuit14, circuit15, circuit16, circuit17, circuit18, circuit19, circuit20];


    function getCircuitName(circuit) {
        return currentCircuitArrObj[circuit].name
    }

    function setCircuit(circuit, nameByte, functionByte, counter) {

        var circuitArrObj = {}
            //if the ID of the circuit name is 1-101 then it is a standard name.  If it is 200-209 it is a custom name.  The mapping between the string value in the getCircuitNames and getCustomNames is 200.  So subtract 200 from the circuit name to get the id in the custom name array.
        if (nameByte < 200) {
            circuitArrObj.name = container.constants.strCircuitName[nameByte]
        } else {
            circuitArrObj.name = container.customNames.getCustomName(nameByte - 200);
        }
        circuitArrObj.number = circuit;
        circuitArrObj.numberStr = 'circuit' + circuit;
        //The &64 masks to 01000000 because it is the freeze protection bit
        var freeze = ((functionByte & 64) === 64) ? 1 : 0
        circuitArrObj.freeze = freeze
        circuitArrObj.circuitFunction = container.constants.strCircuitFunction[functionByte & 63]

        if (currentCircuitArrObj[circuit].name === undefined) {
            assignCircuitVars(circuit, circuitArrObj)
        }

        if (circuit === 20 && initialCircuitsDiscovered === 0) {
            outputInitialCircuitsDiscovered()
            initialCircuitsDiscovered = 1
        } else if (initialCircuitsDiscovered === 1) {
            //not sure we can do this ... have to check to see if they will come out the same
            if (JSON.stringify(currentCircuitArrObj[circuit]) === JSON.stringify(circuit)) {
                circuitChanged(circuit, circuitArrObj, counter)
                assignCircuitVars(circuit, circuitArrObj)
            } else {
                logger.debug('Msg# %s  No change in circuit %s', counter, circuit)
            }

        }

    }

    function assignCircuitVars(circuit, circuitArrObj) {
        currentCircuitArrObj[circuit].number = circuitArrObj.number
        currentCircuitArrObj[circuit].numberStr = circuitArrObj.numberStr
        currentCircuitArrObj[circuit].name = circuitArrObj.name
        currentCircuitArrObj[circuit].freeze = circuitArrObj.freeze
        currentCircuitArrObj[circuit].circuitFunction = circuitArrObj.circuitFunction
    }


    function outputInitialCircuitsDiscovered() {
        var circuitStr = '';
        for (var i = 1; i <= 20; i++) {
            circuitStr += 'Circuit ' + currentCircuitArrObj[i].number + ': ' + currentCircuitArrObj[i].name
            circuitStr += ' Function: ' + currentCircuitArrObj[i].circuitFunction
            if (currentCircuitArrObj[i].status === undefined) {
                circuitStr += ' Status: (not received yet)'
            } else {
                circuitStr += ' Status: ' + currentCircuitArrObj[i].status
            }
            circuitStr += ' Freeze Protection: '
            circuitStr += (currentCircuitArrObj[i].freeze === 0) ? "off" : "on"
            circuitStr += '\n'
        }
        logger.info('\n  Circuit Array Discovered from configuration: \n%s \n', circuitStr)
        container.io.emit('circuit');

    }

    function circuitChanged(circuit, counter) {


        results = currentCircuitArrObj[circuit].whatsDifferent(circuit);
        if (!(results === "Nothing!" || currentCircuitArrObj[circuit].name === 'NOT USED')) {
            logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuit.name, results)

            if (container.settings.logConfigMessages) {

                if (circuit.status === undefined) {
                    logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: (not received yet)  Freeze Protection: %s', counter, currentCircuitArrObj[circuit].number, currentCircuitArrObj[circuit].name, currentCircuitArrObj[circuit].circuitFunction, currentCircuitArrObj[circuit].freeze)
                } else {
                    logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: %s  Freeze Protection: %s', counter, currentCircuitArrObj[circuit].number, currentCircuitArrObj[circuit].name, currentCircuitArrObj[circuit].circuitFunction, currentCircuitArrObj[circuit].status, currentCircuitArrObj[circuit].freeze)

                }
            }
            container.io.emit('circuit');
        }




    }

    //this function takes the status packet (controller:2) and parses through the equipment fields
    function assignCircuitStatusFromControllerStatus(data, counter) {

        circuitArrObj = JSON.parse(JSON.stringify(currentCircuitArrObj))
//TODO: clean this section up.  probably don't need to broadcast it at all because we broadcast the full circuits later
        //assign circuit status to circuitArrObj
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 8; j++) {
                if ((j + (i * 8) + 1) <= 20) {
                    equip = data[container.constants.controllerStatusPacketFields.EQUIP1 + i]
                    if (container.settings.logMessageDecoding)
                        logger.silly('Decode Case 2:   i: %s  j:  %s  j + (i * 8) + 1: %s   equip: %s', i, j, j + (i * 8) + 1, equip)
                    var newStatus = (equip & (1 << (j))) >> j ? "on" : "off"
                    if (currentCircuitArrObj[j + (i * 8) + 1].status === undefined) {
                        logger.verbose('Msg# %s   Circuit %s state discovered:  %s', counter, j + (i * 8) + 1, newStatus)
                        currentCircuitArrObj[j + (i * 8) + 1].status = newStatus
                    } else
                    if (currentCircuitArrObj[j + (i * 8) + 1].status === newStatus) {
                        //nothing changed
                        //TODO: Fix for when we don't have the name yet
                        if (container.settings.logMessageDecoding)
                            logger.silly('Msg# %s   NO change in circuit %s',counter,  circuitArrObj[j + (i * 8) + 1].name)
                    } else {
                        //TODO: Fix for when we don't have the name yet
                        if (container.settings.logMessageDecoding) {
                            var results = "Status: " + currentCircuitArrObj[j + (i * 8) + 1].status + " --> " + newStatus
                            logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuitArrObj[j + (i * 8) + 1].name, results)
                        }
                        currentCircuitArrObj[j + (i * 8) + 1].status = newStatus
                    }

                }
            }
        }

    }



    function requestUpdateCircuit(source, dest, counter, circuit, action, counter) {
        //this is for the request.  Not actual confirmation of circuit update.  So we don't update the object here.
        var status = {}
        status.source = source
        status.destination = dest
        status.name = getCircuitName(circuit)
        if (action === 0) {
            status.ACTION = "off"
        } else if (action === 1) {
            status.ACTION = "on"
        }
        logger.info('Msg# %s   %s --> %s: Change %s to %s', counter, container.constants.ctrlString[source], container.constants.ctrlString[dest], status.sFeature, status.ACTION)


    }



    if (container.logModuleLoading)
        container.logger.info('Loaded: circuit.js')





    return {
        currentCircuitArrObj,
        getCircuitName: getCircuitName,
        assignCircuitStatusFromControllerStatus: assignCircuitStatusFromControllerStatus,
        requestUpdateCircuit: requestUpdateCircuit,
        setCircuit: setCircuit
    }
}
