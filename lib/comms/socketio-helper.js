module.exports = function(container) {

    var
        Server = require('./server.js'),
        io = require('socket.io')(container.server.server);



    logger = container.logger

    if (container.logModuleLoading)
        logger.info('Loading: socketio-helper.js')



    io.on('connection', function(socket, error) {

        socket.on('error', function() {
            logger.error('Error with socket: ', error)
        })


        // when the client emits 'toggleEquipment', this listens and executes
        socket.on('toggleCircuit', function(equipment) {

            var desiredStatus = currentCircuitArrObj[equipment].status == "on" ? 0 : 1;
            var toggleCircuitPacket = [165, container.intellitouch.preambleByte, 16, container.settings.appAddress, 134, 2, equipment, desiredStatus];
            container.queuePacket.queuePacket(toggleCircuitPacket);
            logger.info('User request to toggle %s to %s', currentCircuitArrObj[equipment].name, desiredStatus == 0 ? "off" : "on")


        });
        socket.on('search', function(mode, src, dest, action) {
            //check if we don't have all valid values, and then emit a message to correct.

            logger.debug('from socket.on search: mode: %s  src %s  dest %s  action %s', mode, src, dest, action);
            searchMode = mode;
            searchSrc = src;
            searchDest = dest;
            searchAction = action;
        })

        socket.on('sendPacket', function(incomingPacket) {


            logger.info('User request (send_request.html) to send packet: %s', incomingPacket);
            var packet;
            packet = incomingPacket.split(',');
            for (i = 0; i < packet.length; i++) {
                packet[i] = parseInt(packet[i])
            }
            if (packet[0] == 16 && packet[1] == c.ctrl.CHLORINATOR) {
                //logger.debug('packet (chlorinator) now: ', packet)
            } else {
                if (packet[0] == 96 || packet[0] == 97 || packet[1] == 96 || packet[1] == 97)
                //If a message to the controller, use the preamble that we have recorded
                {
                    var preamblePacket = [165, container.intellitouch.preambleByte]; //255,0,255 will be added later
                } else
                //if a message to the pumps, use 165,0
                {
                    preamble = [165, 0]
                }
                Array.prototype.push.apply(preamblePacket, packet);
                packet = preamblePacket.slice(0);
                //logger.debug('packet (pool) now: ', packet)
            }
            container.queuePacket.queuePacket(packet);
            io.sockets.emit('sendPacketResults', 'Sent packet: ' + JSON.stringify(packet))
        })

        socket.on('spasetpoint', function(spasetpoint) {
            changeHeatSetPoint('spa', spasetpoint, ' socket.io spasetpoint')
        })

        socket.on('spaheatmode', function(spaheatmode) {
            changeHeatMode('spa', spaheatmode, 'socket.io spaheatmode')

        })

        socket.on('poolsetpoint', function(poolsetpoint) {
            changeHeatSetPoint('pool', change, 'socket.io poolsetpoint')
        })

        socket.on('poolheatmode', function(poolheatmode) {
            changeHeatMode('pool', poolheatmode, 'socket.io poolheatmode')
        })

        socket.on('setHeatSetPoint', function(equip, change) {
            if (equip != null && change != null) {
                changeHeatSetPoint(equip, change, 'socket.io setHeatSetPoint')
            } else {
                logger.warn('setHeatPoint called with invalid values: %s %s', equip, change)
            }
        })

        socket.on('setHeatMode', function(equip, change) {
            if (equip == "pool") {
                changeHeatMode('pool', change, 'socket.io setHeatMode ' + equip + ' ' + change)

            } else {
                changeHeatMode('spa', change, 'socket.io setHeatMode ' + equip + ' ' + change)
            }
        })


        socket.on('pumpCommand', function(equip, program, value, duration) {

            logger.silly('Socket.IO pumpCommand variables - equip %s, program %s, value %s, duration %s', equip, program, value, duration)
            pumpCommand(equip, program, value, duration)
        })


        emit('all')
    });




    function emit(outputType) {
        logger.warn('EMIT: %s', outputType)

        if (s.ISYController) {
            ISYHelper.emit(outputType)
        }
        if (outputType == 'circuit' || outputType == 'all') {
            io.sockets.emit('circuit',
                container.circuit.currentCircuitArrObj
            )
        }

        if (outputType == 'config' || outputType == 'all') {
            io.sockets.emit('config',
                container.circuit.currentStatus
            )
        }

        if (outputType == 'pump' || outputType == 'all') {
            io.sockets.emit('pump',
                container.pump.currentPumpStatus
            )
        }

        if (outputType == 'heat' || outputType == 'all') {
            if (container.currentHeat != null) {
                io.sockets.emit('heat',
                    container.heat.currentHeat
                )
            }
        }

        if (outputType == 'schedule' || outputType == 'all') {
            if (container.currentSchedule.length > 3) {
                io.sockets.emit('schedule',
                    container.currentSchedule)
            }
        }

        if (outputType == 'chlorinator' || outputType == 'all') {
            if (container.chlorinator.currentChlorinatorStatus.saltPPM != 'undefined')
                io.sockets.emit('chlorinator', container.chlorinator.currentChlorinatorStatus)
        }

        if (outputType == 'search' || outputType == 'all') {
            io.sockets.emit('searchResults',
                'Input values and click start.  All values optional.  Please refer to https://github.com/tagyoureit/nodejs-Pentair/wiki/Broadcast for values.');
        }
    }


    if (container.logModuleLoading)
        logger.info('Loaded: socketio-helper.js')

    return {
        io,
        emit: emit
    }

}
