module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: chlorinator.js')

    var desiredChlorinatorOutput = 0; //variable for chlorinator output % (in pumpOnly mode; controllers take care of this otherwise).  0 = off.  1-100=% output; 101=superChlorinate


    function Chlorinator(saltPPM, outputPoolPercent, outputSpaPercent, superChlorinate, version, name, status) {

        this.saltPPM = saltPPM;
        this.outputPoolPercent = outputPoolPercent; //for intellitouch this is the pool setpoint, for standalone it is the default
        this.outputSpaPercent = outputSpaPercent; //intellitouch has both pool and spa set points
        this.superChlorinate = superChlorinate;
        this.version = version;
        this.name = name;
        this.status = status;
    }

    //module.exports = Chlorinator

    var currentChlorinatorStatus = new Chlorinator(-1, -1, -1, -1, -1, -1, '', -1);

    var chlorinatorStatusStr = {
        0: "Ok",
        1: "No flow",
        2: "Low Salt",
        4: "High Salt",
        132: "Comm Link Error(?).  Low Salt",
        144: "Clean Salt Cell",
        145: "???"
    }

    function addChlorinatorStatus(saltPPM, outputPoolPercent, outputSpaPercent, status, name, counter) {
        var chlorinatorStatus = {}
        chlorinatorStatus.saltPPM = saltPPM * 50
        chlorinatorStatus.outputPoolPercent = outputPoolPercent
        chlorinatorStatus.outputSpaPercent = (outputSpaPercent - 1) / 2; //41 would equal 20%, for example

        //TODO: take care of unknown status' here.  Is this right?
        chlorinatorStatus.status = chlorinatorStatusStr[status] !== undefined ? chlorinatorStatusStr[status] : status


        if (currentChlorinatorStatus.name == '') {
            //TODO: Don't leave this as assignment.  It will break the bottle.container reference to the original object
            currentChlorinatorStatus = chlorinatorStatus;
            if (container.settings.logChlorinator)
                logger.info('Msg# %s   Initial chlorinator settings discovered: ', counter, JSON.stringify(currentChlorinatorStatus))
            container.io.emitToClients('chlorinator');
        } else
        if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
            if (container.settings.logChlorinator)
                logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
        } else {
            if (container.settings.logChlorinator)
                logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
            currentChlorinatorStatus = chlorinatorStatus;
            container.io.emitToClients('chlorinator');
        }



    }

    function getChlorinatorNameByBytes(nameArr) {
        var name
        for (var i = 1; i <= nameArr.length; i++) {
            name += String.fromCharCode(nameArr[i]);
        }
        return name
    }

    function getChlorinatorName() {
        return currentChlorinatorStatus.name
    }

    function getSaltPPM() {
        return this.saltPPM
    }

    function getChlorinatorStatus() {
        return currentChlorinatorStatus
    }

    function setChlorinatorLevel(chlorLvl, callback) {
        if (container.settings.chlorinator) {
            if (chlorLvl >= 0 && chlorLvl <= 101) {
                desiredChlorinatorOutput = chlorLvl
                var response
                if (desiredChlorinatorOutput === 0) {
                    response = 'Chlorinator set to off.  Chlorinator will be queried every 30 mins for PPM'
                } else if (desiredChlorinatorOutput >= 1 && desiredChlorinatorOutput <= 100) {
                    response = 'Chlorinator set to ' + desiredChlorinatorOutput + '%.'
                } else if (desiredChlorinatorOutput === 101) {
                    response = 'Chlorinator set to super chlorinate'
                }
                if (container.settings.logChlorinator) logger.info(response)
                container.chlorinatorController.chlorinatorStatusCheck()
                if (callback !== undefined) {
                    callback(response)
                }
                container.io.emitToClients('chlorinator')
                return response
            }
        }
    }

    function getDesiredChlorinatorOutput() {
        return desiredChlorinatorOutput
    }

    function processChlorinatorPacketfromController(data, counter) {
        //put in logic (or logging here) for chlorinator discovered (upon 1st message?)

        if (!s.intellitouch) //If we have an intellitouch, we will get it from decoding the controller packets (25, 153 or 217)
        {
            var destination;
            if (data[container.constants.chlorinatorPacketFields.DEST] == 80) {
                destination = 'Salt cell';
                from = 'Controller'
            } else {
                destination = 'Controller'
                from = 'Salt cell'
            }

            //logger.error('currentChlorStatus  ', currentChlorinatorStatus)
            //var chlorinatorStatus = clone(currentChlorinatorStatus);
            //not sure why the above line failed...?  Implementing the following instead.
            //var chlorinatorStatus = JSON.parse(JSON.stringify(currentChlorinatorStatus));
            //TODO: better check besides pump power for asking for the chlorinator name.  Possibly need to due this because some chlorinators are only "on" when the pumps/controller
            if (currentChlorinatorStatus.name === '' && s.chlorinator && currentChlorinatorStatus.status!==-1) //Do we need this--> && container.pump.currentPumpStatus[1].power == 1)
            //If we see a chlorinator status packet, then request the name.  Not sure when the name would be automatically sent over otherwise.
            {
                logger.verbose('Queueing messages to retrieve Salt Cell Name (AquaRite or OEM)')
                    //get salt cell name
                if (s.logPacketWrites) logger.debug('decode: Queueing packet to retrieve Chlorinator Salt Cell Name: [16, 2, 80, 20, 0]')
                container.queuePacket.queuePacket([16, 2, 80, 20, 0]);
            }



            switch (data[container.constants.chlorinatorPacketFields.ACTION]) {
                case 0: //Get status of Chlorinator
                    {
                        if (s.logChlorinator)
                            logger.verbose('Msg# %s   %s --> %s: Please provide status: %s', counter, from, destination, data)

                        break;
                    }
                case 1: //Response to get status
                    {
                        if (s.logChlorinator)
                            logger.verbose('Msg# %s   %s --> %s: I am here: %s', counter, from, destination, data)

                        break;
                    }
                case 3: //Response to version
                    {
                        var name = '';
                        var version = data[4];
                        for (var i = 5; i <= 20; i++) {
                            name += String.fromCharCode(data[i]);
                        }

                        if (currentChlorinatorStatus.name !== name && currentChlorinatorStatus.version !== version) {
                            if (s.logChlorinator)
                                logger.verbose('Msg# %s   %s --> %s: Chlorinator version (%s) and name (%s): %s', counter, from, destination, version, name, data);
                            currentChlorinatorStatus.name = name
                            currentChlorinatorStatus.version = version
                            container.io.emitToClients('chlorinator')
                        }

                        break;
                    }
                case 17: //Set Generate %
                    {
                        var outputPoolPercent = data[4];
                        var superChlorinate
                        if (data[4] == 101) {
                            superChlorinate = 1
                        } else {
                            superChlorinate = 0
                        }
                        if (currentChlorinatorStatus.outputPoolPercent !== outputPoolPercent && currentChlorinatorStatus.superChlorinate !== superChlorinate) {
                            if (s.logChlorinator)
                                logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, superChlorinate == 'On' ? 'Super Chlorinate' : outputPoolPercent, data);
                            currentChlorinatorStatus.outputPoolPercent = outputPoolPercent
                            currentChlorinatorStatus.superChlorinate = superChlorinate
                            container.io.emitToClients('chlorinator')
                        }

                        break;
                    }
                case 18: //Response to 17 (set generate %)
                    {
                        var saltPPM = data[4] * 50;
                        var status = ""
                        switch (data[5]) {
                            case 0: //ok
                                {
                                    status = "Ok";
                                    break;
                                }
                            case 1:
                                {
                                    status = "No flow";
                                    break;
                                }
                            case 2:
                                {
                                    status = "Low Salt";
                                    break;
                                }
                            case 4:
                                {
                                    status = "High Salt";
                                    break;
                                }
                            case 144:
                                {
                                    status = "Clean Salt Cell"
                                    break;
                                }
                            default:
                                {
                                    status = "Unknown - Status code: " + data[5];
                                }
                        }
                        if (currentChlorinatorStatus.saltPPM !== saltPPM && currentChlorinatorStatus.status !== status) {
                            if (s.logChlorinator)
                                logger.verbose('Msg# %s   %s --> %s: Current Salt level is %s PPM: %s', counter, from, destination, saltPPM, data);
                            currentChlorinatorStatus.saltPPM = saltPPM
                            currentChlorinatorStatus.status = status
                            container.io.emitToClients('chlorinator')
                        }

                        break;
                    }
                case 20: //Get version
                    {
                        if (s.logChlorinator)
                            logger.verbose('Msg# %s   %s --> %s: What is your version?: %s', counter, from, destination, data)
                        decoded = true;
                        break;
                    }
                case 21: //Set Generate %, but value / 10??
                    {
                        outputPoolPercent = data[6] / 10;

                        if (currentChlorinatorStatus.outputPoolPercent !== outputPoolPercent) {
                            if (s.logChlorinator)
                                logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, outputPoolPercent, data);
                            currentChlorinatorStatus.outputPoolPercent = outputPoolPercent
                            container.io.emitToClients('chlorinator')
                        }
                        break;
                    }
                default:
                    {
                        if (s.logChlorinator)
                            logger.verbose('Msg# %s   %s --> %s: Other chlorinator packet?: %s', counter, from, destination, data)
                        decoded = true;
                        break;
                    }
            }
        }
    }


    if (container.logModuleLoading)
        container.logger.info('Loaded: chlorinator.js')


    return {
        //currentChlorinatorStatus,
        processChlorinatorPacketfromController: processChlorinatorPacketfromController,
        getDesiredChlorinatorOutput: getDesiredChlorinatorOutput,
        addChlorinatorStatus: addChlorinatorStatus,
        getChlorinatorName: getChlorinatorName,
        getChlorinatorNameByBytes: getChlorinatorNameByBytes,
        getSaltPPM: getSaltPPM,
        getChlorinatorStatus: getChlorinatorStatus,
        setChlorinatorLevel: setChlorinatorLevel

    }
}
