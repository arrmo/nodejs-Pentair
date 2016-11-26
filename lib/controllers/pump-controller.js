module.exports = function(container) {


    if (container.logModuleLoading)
        container.logger.info('Loading: pump-controller.js')

    //var NanoTimer = require('nanotimer')
    var pump1Timer = container.nanoTimer;
    var pump1TimerDelay = container.nanoTimer;
    var pump2Timer = container.nanoTimer;
    var pump2TimerDelay = container.nanoTimer;
    var pumpInitialRequestConfigDelay = container.nanoTimer;
    var pumpStatusTimer = container.nanoTimer;

    function startPumpController() {
        if (s.numberOfPumps == 1) {
            if (s.logPumpTimers) logger.silly('pumpStatusTimer.setInterval(pumpStatusCheck, [1], \'30s\');')
            pumpStatusTimer.setInterval(pumpStatusCheck, [1], '30s');
            if (s.logPumpTimers) logger.silly('pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], \'3500m\');')
            pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], '3500m'); //must give a short delay to allow the port to open
        } else {
            pumpStatusTimer.setInterval(pumpStatusCheck, [1, 2], '30s');
            pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1, 2], '3500m'); //must give a short delay to allow the port to open
        }
    }



    function pumpStatusCheck(pump1, pump2) {
        //request pump status
        if (s.logPumpTimers) logger.silly('pumpStatusCheck: Running pump 1 command on setInterval to check pump status')
        var statusPacket = [165, 0, 96, s.appAddress, 7, 0];
        logger.verbose('Sending Request Pump 1 Status: %s', statusPacket)
        container.queuePacket.queuePacket([165, 0, 96, s.appAddress, 4, 1, 255]);
        container.queuePacket.queuePacket(statusPacket);
        //queuePacket([165, 0, 96, s.appAddress, 4, 1, 0]);

        if (pump2 === 2) {
            //request pump status
            var statusPacket = [165, 0, 97, s.appAddress, 7, 0];
            logger.verbose('Sending Request Pump 2 Status: %s', statusPacket)
            container.queuePacket.queuePacket([165, 0, 97, s.appAddress, 4, 1, 255]);
            container.queuePacket.queuePacket(statusPacket);
            //queuePacket([165, 0, 97, 16, 4, 1, 0]);
        }
    }


    function pump1SafePumpMode() {
        if (s.logPumpTimers) logger.silly('pump1SafePumpMode: Running pump 1 on setTimer expiration')
        container.pump.updatePumpDuration(1, -0.5)
        if (container.pump.getDuration(1) > 0) {
            //set pump to remote control
            var remoteControlPacket = [165, 0, 96, s.appAddress, 4, 1, 255];
            logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
            container.queuePacket.queuePacket(remoteControlPacket);
            //Initially this was resending the 'timer' packet, but that was found to be ineffective.
            //Instead, sending the Program packet again resets the timer.
            var setProgramPacket = [165, 0, 96, s.appAddress, 1, 4, 3, 33, 0, container.pump.getCurrentProgram(1) * 8];
            logger.verbose('App -> Pump 1: Sending Run Program %s: %s (%s total minutes left)', container.pump.getCurrentProgram(1), setProgramPacket, container.pump.getDuration(1));
            container.queuePacket.queuePacket(setProgramPacket);
            //set pump to local control
            var localControlPacket = [165, 0, 96, s.appAddress, 4, 1, 0];
            logger.verbose('Sending Set pump to local control: %s', localControlPacket)
            container.queuePacket.queuePacket(localControlPacket);
            if (s.logPumpTimers) logger.silly('pumpStatusCheck: Setting 10s delay to run pump1SafePumpModeDelay')
            pump1TimerDelay.setTimeout(pump1SafePumpModeDelay, '', '10s')
        } else {
            logger.info('Pump 1 Program Finished.   Pump will shut down in ~10 seconds.')
                //Timer = 0, we are done.  Pump should turn off automatically
            pump1Timer.clearTimeout();
            //set program to 0
            container.pump.setPumpOff(1)
            container.io.emitToClients('pump')
        }
    }

    function pump2SafePumpMode() {
      if (s.logPumpTimers) logger.silly('pump2SafePumpMode: Running pump 2 on setTimer expiration')
      container.pump.updatePumpDuration(2, -0.5)
        if (container.pump.getDuration(2) > 0) {
            //set pump to remote control
            var remoteControlPacket = [165, 0, 97, s.appAddress, 4, 1, 255];
            logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
            container.queuePacket.queuePacket(remoteControlPacket);
            //Initially this was resending the 'timer' packet, but that was found to be ineffective.
            //Instead, sending the Program packet again resets the timer.
            var setProgramPacket = [165, 0, 97, 34, 1, 4, 3, 33, 0, container.pump.getCurrentProgram(2) * 8];
            logger.verbose('App -> Pump 2: Sending Run Program %s: %s (%s total minutes left)', container.pump.getCurrentProgram(2), setProgramPacket, container.pump.getDuration(2));
            container.queuePacket.queuePacket(setProgramPacket);
            //set pump to local control
            var localControlPacket = [165, 0, 97, s.appAddress, 4, 1, 0];
            logger.verbose('Sending Set pump to local control: %s', localControlPacket)
            container.queuePacket.queuePacket(localControlPacket);
            //pad the timer with 10 seconds so we have a full minute per cycle
            pump2TimerDelay.setTimeout(pump2SafePumpModeDelay, '', '10s')
        } else {
            logger.info('Pump 2 Program Finished.  Pump will shut down in ~10 seconds.')
                //Timer = 0, we are done.  Pump should turn off automatically
            pump2Timer.clearTimeout();
            //set program to 0
            container.pump.setPumpOff(2)
            ToClients('pump')
        }
    }

    function pump1SafePumpModeDelay() {
        if (s.logPumpTimers) logger.silly('pumpStatusCheck: Setting 20s delay to run pump1SafePumpMode')
        pump1Timer.setTimeout(pump1SafePumpMode, '', '20s')
    }

    function pump2SafePumpModeDelay() {
        pump2Timer.setTimeout(pump2SafePumpMode, '', '20s')
    }



    function clearTimer(pump) {
        if (pump === 1) {
            pump1Timer.clearTimeout();
            pump1TimerDelay.clearTimeout();
        } else {
            pump2Timer.clearTimeout();
            pump2TimerDelay.clearTimeout();
        }
    }

    function startTimer(pump) {
        if (pump === 1) {
            pump1Timer.setTimeout(pump1SafePumpMode, '', '30s')
        } else {
            pump2Timer.setTimeout(pump2SafePumpMode, '', '30s')
        }
    }

    function pumpCommand(equip, program, value, duration) {
        equip = parseInt(equip)
        if (value != null) {
            value = parseInt(value)
        }
        if (duration != null) {
            duration = parseInt(duration)
        }

        //program should be one of 'on', 'off' or 1,2,3,4
        if (program == 'on' || program == 'off') {
            program = program
        } else {
            program = parseInt(program)
        }

        var pump;
        if (equip === 1) {
            pump = 96
        } else {
            pump = 97
        }

        var setPrg;
        var runPrg;
        var speed;
        if (container.settings.logApi) logger.verbose('Sending the following pump commands to pump %s:', equip)
        if (program === 'off' || program === 'on') {
            if (container.settings.logApi) logger.info('User request to set pump %s to %s', equip, program);
            if (program === 'off') {
                setPrg = [6, 1, 4];

                if (equip === 1) {
                    setPumpOff(1)
                    container.pumpController.clearTimer(1)

                } else {
                    container.pumpController.clearTimer(2)
                    setPumpOff(2)
                }

            } else // pump set to on
            {
                setPrg = [6, 1, 10];
            }
            container.pump.setPower(equip, program)

        } else {
            if (container.settings.logApi) logger.verbose('User request to set pump %s to Ext. Program %s @ %s RPM', equip, program, value);
            //set speed
            setPrg = [1, 4, 3]
            setPrg.push(38 + program);
            setPrg.push(Math.floor(value / 256))
            setPrg.push(value % 256);
            //run program
            runPrg = [1, 4, 3, 33, 0]
            runPrg.push(8 * program)
            container.pump.setCurrentProgram(pump, program, value)
        }

        //set pump to remote control
        var remoteControlPacket = [165, 0, pump, container.settings.appAddress, 4, 1, 255];
        if (container.settings.logApi) logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        container.queuePacket.queuePacket(remoteControlPacket);
        //set program packet
        if (value < 450 || value > 3450) {
            if (container.settings.logApi) logger.warn('Speed provided (%s) is outside of tolerances.  Program being run with speed that is stored in pump.', value)
        } else
        if (isNaN(value) || value == null) {
            if (container.settings.logApi) logger.warn('Skipping Set Program Speed because it was not included.')
        } else {
            var setProgramPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(setProgramPacket, setPrg);
            //logger.info(setProgramPacket, setPrg)
            if (container.settings.logApi) logger.verbose('Sending Set Program %s to %s RPM: %s', program, value, setProgramPacket);
            container.queuePacket.queuePacket(setProgramPacket);
        }

        if (program >= 1 && program <= 4) {
            //run program packet
            var runProgramPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(runProgramPacket, runPrg);
            if (container.settings.logApi) logger.verbose('Sending Run Program %s: %s', program, runProgramPacket)
            container.queuePacket.queuePacket(runProgramPacket);
            //turn on pump
            var turnPumpOnPacket = [165, 0, pump, container.settings.appAddress, 6, 1, 10];
            if (container.settings.logApi) logger.verbose('Sending Turn pump on: %s', turnPumpOnPacket)
            container.queuePacket.queuePacket(turnPumpOnPacket);
            //set a timer for 30 second
            var setTimerPacket = [165, 0, pump, container.settings.appAddress, 1, 4, 3, 43, 0, 1];
            if (container.settings.logApi) logger.info('Sending Set a 30 second timer (safe mode enabled, timer will reset 2x/minute for a total of %s minutes): %s', duration, setTimerPacket);
            container.queuePacket.queuePacket(setTimerPacket);
            //fix until the default duration actually is set to 1
            if (duration < 1 || duration == null) {
                duration = 1;
            }
            if (equip == 1) {
                container.pump.setDuration(1, duration)
                //run the timer update 50s into the 1st minute
                startTimer(1)
            } else {
                container.pump.setDuration(2, duration)
                //run the timer update 50s into the 1st minute
                startTimer(2)
            }



        } else {
            //turn pump on/off
            var pumpPowerPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(pumpPowerPacket, setPrg)
            if (container.settings.logApi) logger.verbose('Sending Turn pump %s: %s', program, pumpPowerPacket);
            container.queuePacket.queuePacket(pumpPowerPacket);
        }
        //set pump to local control
        var localControlPacket = [165, 0, pump, container.settings.appAddress, 4, 1, 0];
        if (container.settings.logApi) logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        container.queuePacket.queuePacket(localControlPacket);
        //request pump status
        var statusPacket = [165, 0, pump, container.settings.appAddress, 7, 0];
        if (container.settings.logApi) logger.verbose('Sending Request Pump Status: %s', statusPacket)
        container.queuePacket.queuePacket(statusPacket);
        if (container.settings.logApi) logger.info('End of Sending Pump Packet \n \n')

        container.io.emitToClients('pump')
    }


    if (container.logModuleLoading)
        container.logger.info('Loaded: settings.js')

    return {
        startPumpController: startPumpController,
        pumpStatusCheck: pumpStatusCheck,
        pumpCommand: pumpCommand,
        pump1Timer: pump1Timer,
        pump2Timer: pump2Timer
    }

}
