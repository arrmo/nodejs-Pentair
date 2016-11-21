module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: process-pump.js')

    currentPumpStatus = container.pump.currentPumpStatus
    currentPumpStatusPacket = container.pump.currentPumpStatusPacket


    if (container.logModuleLoading)
        container.logger.info('Loaded: process-pump.js')

    return {
        processPumpPacket: function(data, counter, packetType) {
                {
                    if (s.logPumpMessages)
                        logger.silly('Msg# %s  Decoding pump packet %s', counter, data)

                    var pumpNum;
                    if (data[container.constants.packetFields.FROM] == 96 || data[container.constants.packetFields.DEST] == 96) {
                        pumpNum = 1
                    } else {
                        pumpNum = 2
                    };

                    var pumpStatus;

                    pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]));
                    pumpStatus.name = container.constants.ctrlString[pumpNum + 95];
                    pumpStatus.pump = pumpNum;


                    //logger.error('pumpStatus: %s    currentPumpStatus: %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))


                    switch (data[container.constants.packetFields.ACTION]) {



                        case 1: //Set speed setting
                            {
                              pumpStatus = container.pump_1.process(pumpStatus, data, counter, packetType)

                                break;
                            }
                        case 2: //??
                            {
                              pumpStatus = container.pump_2.process(pumpStatus, data, counter, packetType)

                                break;
                            }
                        case 4: //Pump control panel on/off
                            {
                              pumpStatus = container.pump_4.process(pumpStatus, data, counter, packetType)
                                break;
                            }
                        case 5: //Set pump mode
                            {
                              pumpStatus = container.pump_5.process(pumpStatus, data, counter, packetType)
                                break;
                            }
                        case 6: //Turn pump on/off
                            {
                              pumpStatus = container.pump_6.process(pumpStatus, data, counter, packetType)

                                break;
                            }
                        case 7: //cyclical status of pump requesting pump status
                            {
                              pumpStatus = container.pump_7.process(pumpStatus, data, counter, packetType)

                                break;
                            }

                        case 256: //03:17:39.122 INFO Msg# 5 is UNKNOWN: [16,96,255,1,8,2,29]  Possibly priming?
                            {
                                logger.warn('Msg# %s  Pump message?  Possibly priming?  %s', JSON.stringify(pumpStatus))
                                decoded = true;
                                break;
                            }
                        default:
                            {
                                if (s.logPumpMessages)
                                    logger.info('Msg# %s is UNKNOWN: %s', counter, JSON.stringify(data));
                                decoded = true;
                            }
                    }
                    if (s.logPumpMessages)
                        logger.silly('\n Analyzing pump packets for pump ', pumpNum, ': \n currentPumpStatus: ', JSON.stringify(currentPumpStatus[pumpStatus.pump]), '\n pumpStatus: ', JSON.stringify(pumpStatus), '\n equal?: ', JSON.stringify(currentPumpStatus[pumpNum]) === (JSON.stringify(pumpStatus)))

                    if ((currentPumpStatus[pumpNum].rpm === 'rpmnotset')) {
                        //we don't have status yet, but something changed
                        currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
                        container.io.emitToClients('pump')
                    } else {
                        if (JSON.stringify(currentPumpStatus[pumpNum]) === (JSON.stringify(pumpStatus))) {
                            if (s.logPumpMessages)
                                logger.debug('Msg# %s   Pump %s status has not changed: %s  \n', counter, pumpStatus.pump, data)
                        } else {


                            var needToEmit = 0
                                //  If the difference is less then (absolute) 5% and the watts is not the same as it previously was, then notify the user.
                                //  Separate check just for watts.  If not watts, this check isn't applicable.
                            if (pumpStatus.watts !== currentPumpStatus[pumpNum].watts) {
                                if ((Math.abs((pumpStatus.watts - currentPumpStatus[pumpNum].watts) / pumpStatus.watts)) > .05) {
                                    //logger.error('pumpnum.watts:', JSON.stringify(currentPumpStatus), currentPumpStatus[pumpNum].watts)
                                    if (s.logPumpMessages) logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].watts, pumpStatus.watts)
                                    needToEmit = 1;
                                }
                                //logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))

                                if (s.logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].whatsDifferent(pumpStatus));
                            }
                            //something besides watts changed
                            else {
                                //NOTE: Need to ignore TIME & remotecontrol so the packets aren't emitted every minute if there are no other changes.
                                var tempPumpStatus = JSON.parse(JSON.stringify(pumpStatus))
                                var tempcurrentPumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]))

                                delete tempPumpStatus.time
                                delete tempcurrentPumpStatus.time
                                delete tempPumpStatus.remotecontrol
                                delete tempcurrentPumpStatus.remotecontrol
                                if (JSON.stringify(tempPumpStatus) === JSON.stringify(tempcurrentPumpStatus)) {
                                    //only time or remotecontrol has changed, so don't emit
                                    needToEmit = 0
                                } else {
                                    needToEmit = 1
                                }
                                //We will still output any differences in verbose, including time
                                var pumpWhatsDifferent = currentPumpStatus[pumpNum].whatsDifferent(pumpStatus)
                                if (pumpWhatsDifferent != "Nothing!") {
                                    if (s.logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, pumpWhatsDifferent);
                                }
                            }
                            //if we have 'notset' as part of the variable, then it's the first time we are here.

                            currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
                            if (needToEmit) {
                                container.io.emitToClients('pump');
                            }
                        }
                    }
                }
                return true
            }

    }
}


//End Pump Decode
