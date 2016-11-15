//Send request/response for pump status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants

    if (container.logModuleLoading)
        container.logger.info('Loaded: 2.js')

    //TODO:  Merge this to a common function with the pump packet

    return {
        process: function(data, counter, packetType) {
            var pumpNum;
            if (data[c.packetFields.FROM] === 96 || data[c.packetFields.DEST] === 96) {
                pumpNum = 1
            } else {
                pumpNum = 2
            }

            //var pumpname = (data[c.packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
            //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3

            var pumpStatus;
            //pump status has not been copied to currentPumpStatus yet
            //if (currentPumpStatus[pumpNum].name == undefined) {
            //    pumpStatus = new pump();
            //} else {
            pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]));
            pumpStatus.name = c.ctrlString[pumpNum + 95];
            //}


            if (data[c.packetFields.FROM] === 16) //Request of status from Main
            {
                if (s.logPumpMessages) {
                    logger.verbose('Msg# %s   Main asking pump %s for status: %s', counter, c.ctrlString[data[c.packetFields.DEST]], JSON.stringify(data));
                }
            } else //Response to request for status
            {


                //TODO: make this code the same (one function?) as coming from the pump/controller

                pumpStatus.pump = pumpNum;
                var pumpname = (data[c.packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
                //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3

                pumpStatus.time = data[c.pumpPacketFields.HOUR] + ':' + data[c.pumpPacketFields.MIN];
                pumpStatus.run = data[c.pumpPacketFields.CMD]
                pumpStatus.name = c.ctrlString[pumpname];
                pumpStatus.mode = data[c.pumpPacketFields.MODE]
                pumpStatus.drivestate = data[c.pumpPacketFields.DRIVESTATE]
                pumpStatus.watts = (data[c.pumpPacketFields.WATTSH] * 256) + data[c.pumpPacketFields.WATTSL]
                pumpStatus.rpm = (data[c.pumpPacketFields.RPMH] * 256) + data[c.pumpPacketFields.RPML]
                pumpStatus.ppc = data[c.pumpPacketFields.PPC]
                pumpStatus.err = data[c.pumpPacketFields.ERR]
                pumpStatus.timer = data[c.pumpPacketFields.TIMER]
                    //pumpStatus.packet = data;

                if (s.logPumpMessages)
                    logger.debug('Msg# %s  %s Status: ', counter, pumpStatus.name, JSON.stringify(pumpStatus), data);
                //if (s.logPumpMessages) logger.silly('currentPumpStatusPacket', currentPumpStatusPacket)

                if (pumpNum == 1 || pumpNum == 2) {

                    //TODO - I don't think the following works...
                    if (JSON.stringify(currentPumpStatus[pumpStatus.pump]) === JSON.stringify(pumpStatus)) {

                        if (s.logPumpMessages)
                            logger.debug('Msg# %s   Pump %s status has not changed: ', counter, pumpStatus.pump, data)
                    } else {
                        var needToEmit = 0
                        if (pumpStatus.watts !== currentPumpStatus[pumpNum].watts) {
                            if ((Math.abs((pumpStatus.watts - currentPumpStatus[pumpNum].watts) / pumpStatus.watts)) > .05) {
                                //logger.error('pumpnum.watts:', JSON.stringify(currentPumpStatus), currentPumpStatus[pumpNum].watts)
                                if (s.logPumpMessages) logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].watts, pumpStatus.watts)
                                needToEmit = 1;
                            }
                            //logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))
                            if (s.logPumpMessages)
                                if (s.logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].whatsDifferent(pumpStatus));
                        } else {
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

                        //if we don't have a previous value for .watts than it should be the first time we are here and let's emit the pump status
                        if ((currentPumpStatus[pumpNum].watts).toLowerCase.indexOf('notset') >= 0) {
                            needToEmit = 1
                        }
                        currentPumpStatus[pumpNum] = pumpStatus;
                        if (needToEmit) {
                            emit('pump');
                        }
                    }
                }
            }
            decoded = true;
            return decoded
        }

    }
}
