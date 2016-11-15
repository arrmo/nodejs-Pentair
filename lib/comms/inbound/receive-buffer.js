


module.exports = function(container) {
    logger = container.logger
    s = container.settings
    bufferArrayOfArrays = container.sp.bufferArrayOfArrays

    if (container.logModuleLoading)
        logger.info('Loading: receive-buffer.js')
    var processingBuffer = false
    var bufferToProcess = []

    function pushBufferToArray() {
        if (bufferArrayOfArrays.length > 0) {
            if (bufferToProcess.length === 0) {
                bufferToProcess = bufferArrayOfArrays.shift() //move the first element from Array of Arrays to bufferToProcess
                if (s.logMessageDecoding)
                    logger.silly('pBTA: bufferToProcess length=0;  bufferArrayOfArrays>0.  Shifting AoA to BTP')
            } else {
                bufferToProcess = bufferToProcess.concat(bufferArrayOfArrays.shift())
                if (s.logMessageDecoding)
                    logger.silly('pBTA: bufferToProcess length>0;  bufferArrayOfArrays>0.  CONCAT AoA to BTP')
            }
        }
    }

    function pushBufferToArray() {
        if (bufferArrayOfArrays.length > 0) {
            if (bufferToProcess.length === 0) {
                bufferToProcess = bufferArrayOfArrays.shift() //move the first element from Array of Arrays to bufferToProcess
                if (s.logMessageDecoding)
                    logger.silly('pBTA: bufferToProcess length=0;  bufferArrayOfArrays>0.  Shifting AoA to BTP')
            } else {
                bufferToProcess = bufferToProcess.concat(bufferArrayOfArrays.shift())
                if (s.logMessageDecoding)
                    logger.silly('pBTA: bufferToProcess length>0;  bufferArrayOfArrays>0.  CONCAT AoA to BTP')
            }
        }
    }

    iterateOverArrayOfArrays = function() {

        var chatter = []; //a {potential} message we have found on the bus
        var packetType;
        var preambleStd = [255, 165];
        var preambleChlorinator = [16, 2]
        var breakLoop = false

        processingBuffer = true; //we don't want this function to run asynchronously beyond this point or it will start to process the same array multiple times

        pushBufferToArray()

        if (s.logMessageDecoding) {
            if (container.settings.logType === 'debug')
                console.log('\n\n')
            logger.debug('iOAOA: Packet being analyzed: %s', bufferToProcess);

            if (bufferArrayOfArrays.length === 1) {
                logger.silly('iOAOA: Next two packets in buffer: \n %s ', bufferArrayOfArrays.first())
            } else if (bufferArrayOfArrays.length > 1) {
                var tempArr = bufferArrayOfArrays.shift()
                logger.silly('iOAOA: Next two packets in buffer: \n %s \n %s', tempArr, bufferArrayOfArrays.first())
                bufferArrayOfArrays.unshift(tempArr)
            } else {
                logger.silly('iOAOA: No more packets in bufferArrayOfArrays')

            }


        }


        while (bufferToProcess.length > 0 && !breakLoop) {
            if (preambleStd[0] == bufferToProcess[0] && preambleStd[1] == bufferToProcess[1]) //match on pump or controller packet
            {

                var chatterlen = bufferToProcess[6] + 6 + 2; //chatterlen is length of following message not including checksum (need to add 6 for start of chatter, 2 for checksum)
                //   0,   1,      2,      3,    4, 5,        6
                //(255,165,preambleByte,Dest,Src,cmd,chatterlen) and 2 for checksum)

                if (chatterlen >= 50) //we should never get a packet greater than or equal to 50.  So if the chatterlen is greater than that let's shift the array and retry
                {
                    if (s.logMessageDecoding) logger.debug('iOAOA: Will shift first element out of bufferToProcess because it appears there is an invalid length packet (>=50) Lengeth: %s  Packet: %s', bufferToProcess[6], bufferToProcess)
                    bufferToProcess.shift() //remove the first byte so we look for the next [255,165] in the array.

                } else if ((bufferToProcess.length - chatterlen) <= 0) {
                    if (s.logMessageDecoding)
                        logger.silly('Msg#  n/a   Incomplete message in bufferToProcess. %s', bufferToProcess)
                    if (bufferArrayOfArrays.length > 0) {
                        pushBufferToArray()
                    } else {
                        if (s.logMessageDecoding) logger.silly('iOAOA: Setting breakLoop=true because (bufferToProcess.length(%s) - chatterlen) <= 0(%s): %s', bufferToProcess.length, chatterlen == undefined || ((bufferToProcess.length - chatterlen), chatterlen == undefined || (bufferToProcess.length - chatterlen) <= 0))
                        breakLoop = true //do nothing, but exit until we get a second buffer to concat
                    }
                } else
                if (chatterlen == undefined || isNaN(chatterlen)) {
                    if (s.logMessageDecoding)
                        logger.silly('Msg#  n/a   chatterlen NaN: %s.', bufferToProcess)
                    if (bufferArrayOfArrays.length > 0) {
                        pushBufferToArray()
                    } else {
                        if (s.logMessageDecoding) logger.silly('iOAOA: Setting breakLoop=true because isNan(chatterlen) is %s.  bufferToProcess:', chatterlen, bufferToProcess)
                        breakLoop = true //do nothing, but exit until we get a second buffer to concat
                    }
                } else {
                    if (s.logMessageDecoding)
                        logger.silly('iOAOA: Think we have a packet. bufferToProcess: %s  chatterlen: %s', bufferToProcess, chatterlen)
                    container.msgCounter.msgCounter += 1;
                    bufferToProcess.shift() //remove the 255 byte
                    chatter = bufferToProcess.splice(0, chatterlen); //splice modifies the existing buffer.  We remove chatter from the bufferarray.

                    if (((chatter[2] === container.constants.ctrl.PUMP1 || chatter[2] === container.constants.ctrl.PUMP2)) || chatter[3] === container.constants.ctrl.PUMP1 || chatter[3] === container.constants.ctrl.PUMP2) {
                        packetType = 'pump'
                    } else {
                        packetType = 'controller';
                        container.intellitouch.preambleByte = chatter[1]; //we dynamically adjust this based on what the controller is using.  It is also different for the pumps (should always be 0 for pump messages)
                    }
                    if (s.logMessageDecoding)
                        logger.debug('Msg# %s  Found incoming %s packet: %s', container.msgCounter.msgCounter, packetType, chatter)

                    container.decodeHelper.processChecksum(chatter, container.msgCounter.msgCounter, packetType);
                }
                //breakLoop = true;
            } else if (preambleChlorinator[0] == bufferToProcess[0] && preambleChlorinator[1] == bufferToProcess[1] &&
                (bufferToProcess[2] == 0 || bufferToProcess[2] == 80)) {
                /*Match on chlorinator packet
                 //the ==80 and ==0 is a double check in case a partial packet comes through.

                 //example packet:
                 //byte  0  1   2   3  4    5   6  7
                 //len                             8
                 //     16  2  80  20  2  120  16  3*/

                container.msgCounter.msgCounter += 1;
                chatter = [];
                var i = 0;
                //Looking for the Chlorinator preamble 16,2
                while (!(bufferToProcess[i] == 16 && bufferToProcess[i + 1] == 3) && !breakLoop) {
                    //check to make sure we aren't reaching the end of the buffer.
                    if ((i + 1) === bufferToProcess.length) {
                        //if we get here, just silently abort
                        breakLoop = true
                        if (s.logMessageDecoding) logger.silly('Msg# %s  Aborting chlorinator packet because we reached the end of the buffer.', container.msgCounter.msgCounter, bufferToProcess)
                    } else {
                        chatter.push(bufferToProcess[i]);
                        i++;
                        if (bufferToProcess[i] == 16 && bufferToProcess[i + 1] == 3) {
                            chatter.push(bufferToProcess[i]);
                            chatter.push(bufferToProcess[i + 1]);
                            i += 2;
                            container.decodeHelper.processChecksum(chatter, container.msgCounter.msgCounter, 'chlorinator');
                            bufferToProcess.splice(0, i)
                            breakLoop = true;
                        }
                    }

                }

            } else { //not a preamble for chlorinator or pump/controller packet.  Eject the first byte.
                bufferToProcess.shift();
            }

        }

        logger.silly('iOAOA: Criteria for recursing/exting.  \nbreakLoop: %s\nbufferArrayOfArrays.length(%s) === 0 && bufferToProcess.length(%s) > 0: %s', breakLoop, bufferArrayOfArrays.length, bufferToProcess.length, bufferArrayOfArrays.length === 0 && bufferToProcess.length > 0)
        if (breakLoop) {
            processingBuffer = false;
            if (s.logMessageDecoding)
                logger.silly('iOAOA: Exiting because breakLoop: %s', breakLoop)
        } else
        if (bufferToProcess.length > 0) {
            if (s.logMessageDecoding)
                logger.silly('iOAOA: Recursing back into iOAOA because no bufferToProcess.length > 0: %s', bufferToProcess.length > 0)
            iterateOverArrayOfArrays()
        } else
        if (bufferArrayOfArrays.length === 0) {
            processingBuffer = false;
            if (s.logMessageDecoding)
                logger.silly('iOAOA: Exiting out of loop because no further incoming buffers to append. bufferArrayOfArrays.length === 0 (%s) ', bufferArrayOfArrays.length === 0)

        } else {
            if (s.logMessageDecoding)
                logger.silly('iOAOA: Recursing back into iOAOA because no other conditions met.')
            iterateOverArrayOfArrays()
        }
    }



    return {
        processingBuffer, //flag to tell us if we are processing the buffer currently
        //var interimBuffer = [];
        bufferToProcess,
        //var bufferArrayOfArrays = exports.bufferArrayOfArrays = new Dequeue();
        //testbufferArrayOfArrays  = [],
        iterateOverArrayOfArrays : iterateOverArrayOfArrays

    }


    if (container.logModuleLoading)
        logger.info('Loaded: receive-buffer.js')


    //return currentHeat
}
