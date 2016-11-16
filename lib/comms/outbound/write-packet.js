var NanoTimer = require('nanotimer'); //If you get an error here, re-run 'npm install` because this is a new dependency.

module.exports = function(container) {

    bufferArrayOfArrays = container.packetBuffer.bufferArrayOfArrays


    if (container.logModuleLoading)
        logger.info('Loading: write-packet.js')

    //var NanoTimer = require('nanotimer'); //If you get an error here, re-run 'npm install` because this is a new dependency.
    var queuePacketsArr = []; //array to hold messages to send
    var writeQueueActive = {writeQueueActive: false} //flag to tell us if we are currently processing the write queue or note
    var msgWriteCounter = {
        counter: 0, //how many times the packet has been written to the bus
        packetWrittenAt: 0, //var to hold the message counter variable when the message was sent.  Used to keep track of how many messages passed without a successful counter.
        msgWrote: []
    }; //How many times are we writing the same packet to the bus?
    var skipPacketWrittenCount = {skipPacketWrittenCount: 0} //keep track of how many times we skipped writing the packet
    var writePacketTimer = new NanoTimer();

    preWritePacketHelper = function() {
        if (container.writePacket.queuePacketsArr.length === 0) // need this because the correct packet might come back during the container.timers.writePacketTimer.timeout.
        {
            if (s.logPacketWrites) logger.silly('preWritePacketHelper: Setting writeQueueActive=false because last message was successfully received and there is no message to send. %s', container.writePacket.queuePacketsArr)
            container.writePacket.writeQueueActive.writeQueueActive = false
        } else {
            //msgWriteCounter===0;  this means no packet has been written yet (queuePacketsArr.shift() was called and msgWriteCounter reset)
            if (container.writePacket.msgWriteCounter.counter === 0) {
                if (s.logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because it has not been written yet', container.writePacket.queuePacketsArr[0])
                container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount = 0
                writePacket()
            } else if (container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount === 2) {
                if (s.logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because it has been skipped twice', container.writePacket.queuePacketsArr[0])
                container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount = 0
                writePacket()
            }
            //if we have not processed more than 4 messages, let's delay again.  However, if we do this twice, then skipPacketWrittenCount >= 2 will be processed and we will write the message no matter what
            else if (container.msgCounter.msgCounter - container.writePacket.msgWriteCounter.packetWrittenAt <= 4) {
                if (s.logPacketWrites) logger.silly('preWritePacketHelper: Skipping write packet %s time(s) because we have not processed four incoming messages since the last write. Packet: %s', container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount, container.writePacket.queuePacketsArr[0])
                container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount++
                    container.writePacket.writePacketTimer.setTimeout(container.writePacket.preWritePacketHelper, '', '150m')
            }
            //if the incoming buffer (bufferArrayOfArrays)>=2
            //OR
            //part of buffer current processing (bufferToProcess)>=50 bytes, let's skip writing the packet twice
            else if (bufferArrayOfArrays.length >= 2 || container.receiveBuffer.bufferToProcess.length >= 50) {
                //skipPacketWrittenCount>=2;  we've skipped writting it twice already, so write it now.
                container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount++
                    if (s.logPacketWrites) logger.silly('preWritePacketHelper: Skipping write packet %s time(s) due to \n1. bufferArrayOfArrays.length>=2: %s (%s) \n2. bufferToProcess.length>=50:  %s (%s)', container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount, container.writePacket.bufferArrayOfArrays.length >= 2, container.writePacket.bufferArrayOfArrays.length, container.writePacket.bufferToProcess.length >= 50, container.writePacket.bufferToProcess.length)
                container.writePacket.writePacketTimer.setTimeout(container.writePacket.preWritePacketHelper, '', '150m')
            } else
            //if none of the conditions above are met, let's write the packet
            {
                if (s.logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because no other conditions have been met', container.writePacket.queuePacketsArr[0])
                container.writePacket.skipPacketWrittenCount.skipPacketWrittenCount = 0
                writePacket()
            }
        }
    }


    writePacket = function() {
        if (s.logPacketWrites) logger.silly('writePacket: Entering writePacket() to write: %s\nFull queue: [[%s]]', container.writePacket.queuePacketsArr[0], container.writePacket.queuePacketsArr.join('],\n['))

        container.writePacket.writeQueueActive.writeQueueActive = true
        if (s.netConnect === 0) {
            container.sp.sp.write(container.writePacket.queuePacketsArr[0], function(err) {
                if (err) {
                    logger.error('Error writing packet: ' + err.message)
                } else {
                    //if (s.logPacketWrites) logger.silly('Packet written: ', queuePacketsArr[0])
                    postWritePacketHelper()
                }
            })
        } else {
            container.sp.sp.write(new Buffer(container.writePacket.queuePacketsArr[0]), 'binary', function(err) {
                if (err) {
                    logger.error('Error writing packet: ' + err.message)
                } else {
                    //if (s.logPacketWrites) logger.silly('Packet written: ', queuePacketsArr[0])
                    postWritePacketHelper()
                }
            })
        }


    }

    postWritePacketHelper = function() {

        if (container.writePacket.msgWriteCounter.counter === 0) {
            //if we are here because we wrote a packet, but it is the first time, then the counter will be 0 and we need to set the variables for later comparison
            container.writePacket.msgWriteCounter.packetWrittenAt = container.msgCounter.msgCounter;
            container.writePacket.msgWriteCounter.msgWrote = container.writePacket.queuePacketsArr[0].slice(0)
            container.writePacket.msgWriteCounter.counter++
                if (s.logPacketWrites) logger.debug('postWritePacketHelper: First time writing packet.', container.writePacket.msgWriteCounter)
        } else
        if (container.writePacket.msgWriteCounter.counter === 5) //if we get to 5 retries, then throw an Error.
        {
            var pktType = container.whichPacket.outbound(container.writePacket.queuePacketsArr[0])
            if (pktType === 'pump') {
                logger.warn('Error writing pump packet \'%s\' to serial bus.  Tried %s times to write %s', container.constants.strPumpActions[container.writePacket.queuePacketsArr[0][container.constants.packetFields.ACTION + 3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)
            }
            //chlorinator
            else if (pktType === 'chlorinator') {
                logger.warn('Error writing chlorinator packet \'%s\' to serial bus.  Tried %s times to write %s', container.constants.strChlorinatorActions[container.writePacket.queuePacketsArr[0][3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)

            }
            //controller packet
            else {
                logger.warn('Error writing controller packet \'%s\' to serial bus.  Tried %s times to write %s', container.constants.strControllerActions[queuePacketsArr[0][container.constants.packetFields.ACTION + 3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)

            }

            if (s.logPacketWrites) logger.silly('postWritePacketHelper: msgWriteCounter: ', msgWriteCounter)
            container.writePacket.msgWriteCounter.counter++;
        } else
        if (container.writePacket.msgWriteCounter.counter === 10) //if we get to 10 retries, then abort this packet.
        {
            if (pktType === 'pump') {
                logger.error('Aborting pump packet \'%s\'.  Tried %s times to write %s', container.constants.strPumpActions[container.writePacket.queuePacketsArr[0][container.constants.packetFields.ACTION + 3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)

            }
            //chlorinator
            else if (pktType === 'chlorinator') {
                logger.error('Aborting chlorinator packet \'%s\'.  Tried %s times to write %s', container.constants.strChlorinatorActions[container.writePacket.queuePacketsArr[0][3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)

            }
            //controller packet
            else {
                logger.error('Aborting controller packet \'%s\'.  Tried %s times to write %s', container.constants.strControllerActions[container.writePacket.queuePacketsArr[0][container.constants.packetFields.ACTION + 3]], container.writePacket.msgWriteCounter.counter, container.writePacket.msgWriteCounter.msgWrote)

            }
            container.writePacket.ejectPacketAndReset()
            if (s.logPacketWrites) logger.silly('postWritePacketHelper: Tries===10.  Shifted queuePacketsArr.  \nWrite queue now: %s\nmsgWriteCounter:', container.writePacket.queuePacketsArr, container.writePacket.msgWriteCounter)
                //let's reconsider if we want to change the logging levels, or just fail silently/gracefully?
                /*if (logType == "info" || logType == "warn" || logType == "error") {
                    logger.warn('Setting logging level to Debug')
                    logType = 'debug'
                    logger.transports.console.level = 'debug';
                }*/
        } else //we should get here between 1-4 packet writes
        {
            container.writePacket.msgWriteCounter.counter++;
            if (s.logPacketWrites) logger.debug('postWritePacketHelper: Try %s.  Wrote: %s ', container.writePacket.msgWriteCounter.counter, container.writePacket.queuePacketsArr[0])
        }

        if (container.writePacket.queuePacketsArr.length === 0) {
            if (s.logPacketWrites) logger.debug('postWritePacketHelper: Write queue empty.  writeQueueActive=false')
            container.writePacket.writeQueueActive.writeQueueActive = false
        } else {
            if (s.logPacketWrites) logger.debug('writePacketHelper: Setting timeout to write next packet (will call preWritePacketHelper())\n')
            container.writePacket.writePacketTimer.setTimeout(preWritePacketHelper, '', '175m')

        }
    }


    ejectPacketAndReset = function() {
        if (container.writePacket.queuePacketsArr.length > 0) {
            container.writePacket.queuePacketsArr.shift();
        }
        container.writePacket.msgWriteCounter.counter = 0
        container.writePacket.msgWriteCounter.msgWrote = []
        container.writePacket.msgWriteCounter.packetWrittenAt = 0
    }


    if (container.logModuleLoading)
        logger.info('Loaded: write-packet.js')


    return {
        queuePacketsArr,
        writeQueueActive,
        msgWriteCounter,
        skipPacketWrittenCount,
        writePacketTimer,
        preWritePacketHelper: preWritePacketHelper,
        ejectPacketAndReset: ejectPacketAndReset
    }


}
