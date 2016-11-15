var Bottle = require('bottlejs');
var bottle = Bottle.pop('pentair-Bottle');

if (bottle.container.logModuleLoading)
    bottle.container.logger.info('Loading: pump-controller.js')

exports.startPumpController = function() {
    var pump1Timer = new NanoTimer();
    var pump1TimerDelay = new NanoTimer();
    var pumpInitialRequestConfigDelay = new NanoTimer();
    var pumpStatusTimer = new NanoTimer();
    if (s.numberOfPumps == 1) {
        if (s.logPumpTimers) logger.silly('pumpStatusTimer.setInterval(pumpStatusCheck, [1], \'30s\');')
        pumpStatusTimer.setInterval(pumpStatusCheck, [1], '30s');
        if (s.logPumpTimers) logger.silly('pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], \'3500m\');')
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], '3500m'); //must give a short delay to allow the port to open
    } else {
        var pump2Timer = new NanoTimer();
        var pump2TimerDelay = new NanoTimer();
        pumpStatusTimer.setInterval(pumpStatusCheck, [1, 2], '30s');
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1, 2], '3500m'); //must give a short delay to allow the port to open
    }
}



function pumpStatusCheck(pump1, pump2) {
    //request pump status
    if (s.logPumpTimers) logger.silly('pumpStatusCheck: Running pump 1 command on setInterval to check pump status')
    var statusPacket = [165, 0, 96, s.appAddress, 7, 0];
    logger.verbose('Sending Request Pump 1 Status: %s', statusPacket)
    queuePacket([165, 0, 96, s.appAddress, 4, 1, 255]);
    queuePacket(statusPacket);
    //queuePacket([165, 0, 96, s.appAddress, 4, 1, 0]);

    if (pump2 === 2) {
        //request pump status
        var statusPacket = [165, 0, 97, s.appAddress, 7, 0];
        logger.verbose('Sending Request Pump 2 Status: %s', statusPacket)
        queuePacket([165, 0, 97, s.appAddress, 4, 1, 255]);
        queuePacket(statusPacket);
        //queuePacket([165, 0, 97, 16, 4, 1, 0]);
    }
}


function pump1SafePumpMode() {
    if (s.logPumpTimers) logger.silly('pump1SafePumpMode: Running pump 1 on setTimer expiration')
    Pump.currentPumpStatus[1].duration = (Pump.currentPumpStatus[1].duration - 0.5);
    if (Pump.currentPumpStatus[1].duration > 0) {
        //set pump to remote control
        var remoteControlPacket = [165, 0, 96, s.appAddress, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 96, s.appAddress, 1, 4, 3, 33, 0, Pump.currentPumpStatus[1].currentprogram * 8];
        logger.verbose('App -> Pump 1: Sending Run Program %s: %s (%s total minutes left)', Pump.currentPumpStatus[1].currentprogram, setProgramPacket, Pump.currentPumpStatus[1].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 96, s.appAddress, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        if (s.logPumpTimers) logger.silly('pumpStatusCheck: Setting 10s delay to run pump1SafePumpModeDelay')
        pump1TimerDelay.setTimeout(pump1SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 1 Program Finished.   Pump will shut down in ~10 seconds.')
            //Timer = 0, we are done.  Pump should turn off automatically
        pump1Timer.clearTimeout();
        //set program to 0
        Pump.currentPumpStatus[1].currentprogram = 0;
        socket.io.io('pump')
    }
}

function pump2SafePumpMode() {
    Pump.currentPumpStatus[2].duration--;
    if (Pump.currentPumpStatus[2].duration > 0) {
        //set pump to remote control
        var remoteControlPacket = [165, 0, 97, s.appAddress, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 97, 34, 1, 4, 3, 33, 0, Pump.currentPumpStatus[2].currentprogram * 8];
        logger.verbose('App -> Pump 2: Sending Run Program %s: %s (%s total minutes left)', Pump.currentPumpStatus[2].currentprogram, setProgramPacket, Pump.currentPumpStatus[2].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 97, s.appAddress, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        //pad the timer with 10 seconds so we have a full minute per cycle
        pump2TimerDelay.setTimeout(pump2SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 2 Program Finished.  Pump will shut down in ~10 seconds.')
            //Timer = 0, we are done.  Pump should turn off automatically
        pump2Timer.clearTimeout();
        //set program to 0
        Pump.currentPumpStatus[2].currentprogram = 0;
        socket.io.io('pump')
    }
}

function pump1SafePumpModeDelay() {
    if (s.logPumpTimers) logger.silly('pumpStatusCheck: Setting 20s delay to run pump1SafePumpMode')
    pump1Timer.setTimeout(pump1SafePumpMode, '', '20s')
}

function pump2SafePumpModeDelay() {
    pump2Timer.setTimeout(pump2SafePumpMode, '', '20s')
}

if (bottle.container.logModuleLoading)
    bottle.container.logger.info('Loaded: settings.js')
