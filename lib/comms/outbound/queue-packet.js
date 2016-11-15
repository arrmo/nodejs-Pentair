module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: queue-packet.js')


    logger = container.logger
    s = container.settings




    if (container.logModuleLoading)
        logger.info('Loaded: queue-packet.js')

    return {
        queuePacket: function(message) {
            if (s.logPacketWrites) logger.debug('queuePacket: Adding checksum and validating packet to be written %s', message)
            var checksum = 0;
            for (var j = 0; j < message.length; j++) {
                checksum += message[j]
            }


            var packet;
            var requestGet = 0;
            if (message[0] == 16 && message[1] == container.constants.ctrl.CHLORINATOR) {
                message.push(checksum)
                message.push(16)
                message.push(3)
                packet = message.slice();
                logger.silly('chrlorinator packet configured as: ', packet)
            } else {
                //Process the packet to include the preamble and checksum

                message.push(checksum >> 8)
                message.push(checksum & 0xFF)
                packet = [255, 0, 255];
                Array.prototype.push.apply(packet, message);

                //if we request to "SET" a variable on the HEAT STATUS
                if (packet[7] === 136 && s.intellitouch) {
                    requestGet = 1;
                }
            }

            //-------Internally validate checksum

            if (message[0] == 16 && message[1] == container.constants.ctrl.CHLORINATOR) //16,2 packet
            {
                //example packet: 16,2,80,0,98,16,3
                var len = packet.length;
                //checksum is calculated by 256*2nd to last bit + last bit
                var packetchecksum = packet[len - 3];
                var databytes = 0;
                // add up the data in the payload
                for (var i = 0; i < len - 3; i++) {
                    databytes += packet[i];
                }
            } else //255,0,255,165 packet
            {
                //example packet: 255,0,255,165,10,16,34,2,1,0,0,228
                var len = packet.length;
                //checksum is calculated by 256*2nd to last bit + last bit
                var packetchecksum = (packet[len - 2] * 256) + packet[len - 1];
                var databytes = 0;
                // add up the data in the payload
                for (var i = 3; i < len - 2; i++) {
                    databytes += packet[i];
                }
            }

            var validPacket = (packetchecksum === databytes);

            if (!validPacket) {
                logger.error('Asking to queue malformed packet: %s', packet)
            } else {
                container.writePacket.queuePacketsArr.push(packet);
                //pump packet
                if (packet[container.constants.packetFields.DEST + 3] === 96 || packet[container.constants.packetFields.DEST + 3] === 97) {
                    if (s.logPacketWrites) logger.verbose('Just Queued Pump Message \'%s\' to send: %s', container.constants.strPumpActions[packet[container.constants.packetFields.ACTION + 3]], packet)

                }
                //chlorinator
                else if (packet[0] === 16) {
                    if (s.logPacketWrites) logger.verbose('Just Queued Chlorinator Message \'%s\' to send: %s', container.constants.strChlorinatorActions[packet[3]], packet)

                }
                //controller packet
                else {
                    if (s.logPacketWrites) logger.verbose('Just Queued Message \'%s\' to send: %s', container.constants.strControllerActions[packet[container.constants.packetFields.ACTION + 3]], packet)

                }
            }


            //-------End Internally validate checksum

            if (requestGet) {
                //request the GET version of the SET packet
                var getPacket = [165,container.intellitouch.preambleByte, 16, s.appAddress, packet[container.constants.packetFields.ACTION + 3] + 64, 1, 0]
                if (s.logPacketWrites) logger.debug('Queueing message %s to retrieve \'%s\'', getPacket, container.constants.strControllerActions[getPacket[container.constants.packetFields.ACTION]])
                queuePacket(getPacket);

                //var statusPacket = [165, preambleByte, 16, 34, 194, 1, 0]
                //logger.debug('Queueing messages to retrieve \'%s\'', container.constants.strControllerActions[statusPacket[container.constants.packetFields.ACTION]])
                //queuePacket(statusPacket);
            }



            if (s.logPacketWrites) logger.silly('queuePacket: Message: %s now has checksum added: %s', message, packet)

            //if length > 0 then we will loop through from isResponse
            if (!container.writePacket.writeQueueActive.writeQueueActive)
                container.writePacket.preWritePacketHelper();


        }
    }
}
