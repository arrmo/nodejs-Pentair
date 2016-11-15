module.exports = function(container) {
        if (container.logModuleLoading)
            container.logger.info('Loading: process-chlorinator.js')

            s = container.settings


        return {
            processChlorinatorPacket: function(data, counter, packetType) {
                {

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
                        var chlorinatorStatus = JSON.parse(JSON.stringify(Chlorinator.currentChlorinatorStatus));
                        //TODO: better check besides pump power for asking for the chlorinator name
                        if (container.chlorinator.currentChlorinatorStatus.name == '' && s.chlorinator && container.pump.currentPumpStatus[1].power == 1)
                        //If we see a chlorinator status packet, then request the name.  Not sure when the name would be automatically sent over otherwise.
                        {
                            logger.verbose('Queueing messages to retrieve Salt Cell Name (AquaRite or OEM)')
                                //get salt cell name
                            if (s.logPacketWrites) logger.debug('decode: Queueing packet to retrieve Chlorinator Salt Cell Name: [16, 2, 80, 20, 0]')
                            queuePacket([16, 2, 80, 20, 0]);
                        }



                        switch (data[container.constants.chlorinatorPacketFields.ACTION]) {
                            case 0: //Get status of Chlorinator
                                {
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: Please provide status: %s', counter, from, destination, data)
                                    decoded = true;
                                    break;
                                }
                            case 1: //Response to get status
                                {
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: I am here: %s', counter, from, destination, data)
                                    decoded = true;
                                    break;
                                }
                            case 3: //Response to version
                                {
                                    chlorinatorStatus.name = '';
                                    chlorinatorStatus.version = data[4];
                                    for (var i = 5; i <= 20; i++) {
                                        chlorinatorStatus.name += String.fromCharCode(data[i]);
                                    }
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: Chlorinator version (%s) and name (%s): %s', counter, from, destination, chlorinatorStatus.version, chlorinatorStatus.name, data);
                                    decoded = true;
                                    break;
                                }
                            case 17: //Set Generate %
                                {
                                    chlorinatorStatus.outputPercent = data[4];
                                    if (data[4] == 101) {
                                        chlorinatorStatus.superChlorinate = 1
                                    } else {
                                        chlorinatorStatus.superChlorinate = 0
                                    }
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, chlorinatorStatus.superChlorinate == 'On' ? 'Super Chlorinate' : chlorinatorStatus.outputPercent, data);
                                    decoded = true;
                                    break;
                                }
                            case 18: //Response to 17 (set generate %)
                                {
                                    chlorinatorStatus.saltPPM = data[4] * 50;
                                    switch (data[5]) {
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
                                        case 144:
                                            {
                                                chlorinatorStatus.status = "Clean Salt Cell"
                                                break;
                                            }
                                        default:
                                            {
                                                chlorinatorStatus.status = "Unknown - Status code: " + data[5];
                                            }
                                    }
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: Current Salt level is %s PPM: %s', counter, from, destination, chlorinatorStatus.saltPPM, data);
                                    decoded = true;
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
                                    chlorinatorStatus.outputPercent = data[6] / 10;
                                    if (s.logChlorinator)
                                        logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, chlorinatorStatus.outputPercent, data);
                                    decoded = true;
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

                        if (JSON.stringify(container.chlorinator.currentChlorinatorStatus) === JSON.stringify(chlorinatorStatus)) {
                            if (s.logChlorinator)
                                logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
                        } else {
                            if (s.logChlorinator)
                                logger.verbose('Msg# %s   Chlorinator status changed: ', counter, container.chlorinator.currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                            container.chlorinator.currentChlorinatorStatus = chlorinatorStatus;
                            socket.io.io('chlorinator');
                        }
                    } else //need to set decoded to true or it will show up as NOT DECODED in the log.  Essentially, we are dropping it if we have an intellitouch.
                    {
                        decoded = true;
                    }

                }
                return decoded
                    //End Chlorinator Decode

            }
        }

        if (container.logModuleLoading)
            container.logger.info('Loaded: process-chlorinator.js')
    }
    //End Pump Decode
