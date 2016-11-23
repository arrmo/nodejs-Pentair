module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: pump.js')

    function Pump(number, time, run, mode, drivestate, watts, rpm, ppc, err, timer, duration, currentprogram, program1rpm, program2rpm, program3rpm, program4rpm, remotecontrol, power) {
        this.pump = number; //1 or 2
        this.time = time;
        this.run = run;
        this.mode = mode;
        this.drivestate = drivestate;
        this.watts = watts;
        this.rpm = rpm;
        this.ppc = ppc;
        this.err = err;
        this.timer = timer;
        this.duration = duration;
        this.currentprogram = currentprogram;
        this.program1rpm = program1rpm;
        this.program2rpm = program2rpm;
        this.program3rpm = program3rpm;
        this.program4rpm = program4rpm;
        this.remotecontrol = remotecontrol;
        this.power = power;
    }

    //module.exports = Pump

    var pump1 = new Pump(1, 'timenotset', 'runnotset', 'modenotset', 'drivestatenotset', 'wattsnotset', 'rpmnotset', 'ppcnotset', 'errnotset', 'timernotset', 'durationnotset', 'currentprognotset', 'prg1notset', 'prg2notset', 'prg3notset', 'prg4notset', 'remotecontrolnotset', 'powernotset');
    var pump2 = new Pump(2, 'timenotset', 'runnotset', 'modenotset', 'drivestatenotset', 'wattsnotset', 'rpmnotset', 'ppcnotset', 'errnotset', 'timernotset', 'durationnotset', 'currentprognotset', 'prg1notset', 'prg2notset', 'prg3notset', 'prg4notset', 'remotecontrolnotset', 'powernotset');
    //object to hold pump information.  Pentair uses 1 and 2 as the pumps so we will set array[0] to a placeholder.
    var currentPumpStatus = ['blank', pump1, pump2]
    var currentPumpStatusPacket = ['blank', [],
        []
    ]; // variable to hold the status packets of the pumps


    if (container.logModuleLoading)
        container.logger.info('Loaded: pump.js')

    function setTime(pump, hour, min) {
        currentPumpStatus[pump].time = hour + ":" + min
    }




    function getPumpNumber(data) {
        var pump;
        if (data[container.constants.packetFields.FROM] === 96 || data[container.constants.packetFields.DEST] === 96) {
            pump = 1
        } else {
            pump = 2
        };

        pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pump]));
        if (currentPumpStatus.name === undefined) {
            currentPumpStatus[pump].name = container.constants.ctrlString[pump + 95]
            currentPumpStatus[pump].pump = pumpStatus.pump
        }

        return pump
    }

    function pumpACK(data, from, counter) {
        if (s.logPumpMessages)
            logger.verbose('Msg# %s   %s responded with acknowledgement: %s', counter, container.constants.ctrlString[from], JSON.stringify(data));
    }

    function setCurrentProgram(program, from, data, counter) {
        //setAmount = setAmount / 8
        var pump = getPumpNumber(data)

        if (currentPumpStatus[pump].currentprogram !== program) {
            currentPumpStatus[pump].currentprogram = program;
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s: Set Current Program to %s %s', counter, container.constants.ctrlString[from], program.toString(), JSON.stringify(data));
        }
        container.io.emitToClients('pump')

    }

    function saveProgramAs(program, rpm, from, data, counter) {
        programXrpm = 'program' + program.toString() + 'rpm'
            //str1 = 'Save Program 1 as '
            //str2 = setAmount.toString() + 'rpm';
            //pumpStatus.programXrpm = setAmount;

        var pump = getPumpNumber(data)

        if (currentPumpStatus[pump].programXrpm !== rpm) {
            currentPumpStatus[pump].programXrpm = rpm;
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s: Save Program %s as %s RPM %s', counter, program, container.constants.ctrlString[from], rpm, JSON.stringify(data));
        }
        container.io.emitToClients('pump')
    }

    function setRemoteControl(remotecontrol, from, data, counter) {
        var remoteControlStr = pumpStatus.remotecontrol === 1 ? 'on' : 'off'
        var pump = getPumpNumber(data)
        if (data[container.constants.packetFields.DEST] == 96 || data[container.constants.packetFields.DEST] == 97) //Command to the pump
        {
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s --> %s: Remote control (turn %s pump control panel): %s', counter, container.constants.ctrlString[from], container.constants.ctrlString[data[container.constants.packetFields.DEST]], remoteControlStr, JSON.stringify(data));
        } else {
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s: Remote control %s: %s', counter, container.constants.ctrlString[from], remoteControlStr, JSON.stringify(data));
        }
        currentPumpStatus[pump].remotecontrol = remotecontrol
    }

    function setRunMode(mode, from, data, counter) {
        var pump = getPumpNumber(data)
        if (data[container.constants.packetFields.DEST] == 96 || data[container.constants.packetFields.DEST] == 97) //Command to the pump
        {

            switch (mode) {
                case 0:
                    {
                        mode = "Filter";
                        break;
                    }
                case 1:
                    {
                        mode = "Manual";
                        break;
                    }
                case 2:
                    {
                        mode = "Speed 1";
                        break;
                    }
                case 3:
                    {
                        mode = "Speed 2";
                        break;
                    }
                case 4:
                    {
                        mode = "Speed 3";
                        break;
                    }
                case 5:
                    {
                        mode = "Speed 4";
                        break;
                    }
                case 6:
                    {
                        mode = "Feature 1";
                        break;
                    }
                case 7:
                    {
                        mode = "Unknown pump mode";
                        break;
                    }
                case 8:
                    {
                        mode = "Unknown pump mode";
                        break;
                    }
                case 9:
                    {
                        mode = "External Program 1";
                        break;
                    }
                case 10:
                    {
                        mode = "External Program 2";
                        break;
                    }
                case 11:
                    {
                        mode = "External Program 3";
                        break;
                    }
                case 12:
                    {
                        mode = "External Program 4";
                        break;
                    }
                default:
                    {
                        mode = "Oops, we missed something!"
                    }

            }

            if (currentPumpStatus[pump].mode !== mode) {
                currentPumpStatus[pump].mode = mode;
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s --> %s: Set pump mode to _%s_: %s', counter, container.constants.ctrlString[from], container.constants.ctrlString[data[container.constants.packetFields.DEST]], mode, JSON.stringify(data));
            }
            container.io.emitToClients('pump')

        } else {
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s confirming it is in mode %s: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], data[container.constants.packetFields.CMD], JSON.stringify(data));
        }

    }

    function setPower(power, from, data, counter) {
        var pump = getPumpNumber(data)
        var powerStr = power === 1 ? 'on' : 'off'

        if (data[container.constants.packetFields.DEST] === 96 || data[container.constants.packetFields.DEST] === 97) //Command to the pump
        {
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s --> %s: Pump power to %s: %s', counter, container.constants.ctrlString[from], container.constants.ctrlString[data[container.constants.packetFields.DEST]], powerStr, JSON.stringify(data));

        } else {
            if (currentPumpStatus[pump].power !== power) {
                currentPumpStatus[pump].power = power;
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s: Pump power %s: %s', counter, container.constants.ctrlString[from], powerStr, JSON.stringify(data));

                container.io.emitToClients('pump')
            }

        }
    }


    function provideStatus(data, counter) {
        if (s.logPumpMessages)
            logger.verbose('Msg# %s   %s --> %s: Provide status: %s', counter, c.ctrlString[data[c.packetFields.FROM]], c.ctrlString[data[c.packetFields.DEST]], JSON.stringify(data));

    }

    function pumpStatus(pump, hour, min, run, mode, drivestate, watts, rpm, ppc, err, timer, data, counter) {
        setTime(pump, hour, min)
        var needToEmit = 0
        var whatsDifferent = ''

        if (currentPumpStatus[pump].watts === 'wattsnotset') {
            needToEmit = 1
            currentPumpStatus[pump].run = run
            currentPumpStatus[pump].mode = mode
            currentPumpStatus[pump].drivestate = drivestate
            currentPumpStatus[pump].watts = watts
            currentPumpStatus[pump].rpm = rpm
            currentPumpStatus[pump].ppc = ppc
            currentPumpStatus[pump].err = err
            currentPumpStatus[pump].timer = timer
        } else {

            if (significantWattsChange(pump, watts) || currentPumpStatus[pump].run !== run || currentPumpStatus[pump].mode !== mode) {
                needToEmit = 1
            }

            if (currentPumpStatus[pump].run !== run) {
                whatsDifferent += 'Run: ' + currentPumpStatus[pump].run + '-->' + run + ' '
                currentPumpStatus[pump].run = run
                needToEmit = 1
            }
            if (currentPumpStatus[pump].mode !== mode) {
                whatsDifferent += 'Mode: ' + currentPumpStatus[pump].mode + '-->' + mode + ' '
                currentPumpStatus[pump].mode = mode
                needToEmit = 1
            }
            if (currentPumpStatus[pump].drivestate !== drivestate) {
                whatsDifferent += 'Drivestate: ' + currentPumpStatus[pump].drivestate + '-->' + drivestate + ' '
                currentPumpStatus[pump].drivestate = drivestate
            }
            if (currentPumpStatus[pump].watts !== watts) {
                whatsDifferent += 'Watts: ' + currentPumpStatus[pump].watts + '-->' + watts + ' '
                currentPumpStatus[pump].watts = watts
            }
            if (currentPumpStatus[pump].rpm !== rpm) {
                whatsDifferent += 'rpm: ' + currentPumpStatus[pump].rpm + '-->' + rpm + ' '
                currentPumpStatus[pump].rpm = rpm
            }
            if (currentPumpStatus[pump].ppc !== ppc) {
                whatsDifferent += 'ppc: ' + currentPumpStatus[pump].ppc + '-->' + ppc + ' '
                currentPumpStatus[pump].ppc = ppc
            }
            if (currentPumpStatus[pump].err !== err) {
                whatsDifferent += 'Err: ' + currentPumpStatus[pump].err + '-->' + err + ' '
                currentPumpStatus[pump].err = err
            }
            if (currentPumpStatus[pump].timer !== timer) {
                whatsDifferent += 'Timer: ' + currentPumpStatus[pump].timer + '-->' + timer + ' '
                currentPumpStatus[pump].timer = timer
            }

            if (s.logPumpMessages)
                logger.verbose('\n Msg# %s  %s Status changed %s : ', counter, container.constants.ctrlString[pump + 95], whatsDifferent, data, '\n');

        }
        if (needToEmit) {
            container.io.emitToClients('pump');
        }
    }


    /*          function decodePacketFromController(pump, hour, min, err, mode, drivestate, watts, rpm, ppc, err, timer, counter) {
                setTime(pump, hour, min)

                //var pumpname = (data[c.packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
                //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3

                var pumpStatus;

                pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pump]));


                if (data[c.packetFields.FROM] === 16) //Request of status from Main
                {
                    if (s.logPumpMessages) {
                        logger.verbose('Msg# %s   Main asking pump %s for status: %s', counter, c.ctrlString[data[c.packetFields.DEST]], JSON.stringify(data));
                    }
                } else //Response to request for status
                {
                    if (s.logPumpMessages)
                        logger.debug('Msg# %s  %s Status: ', counter, pumpStatus.name, JSON.stringify(pumpStatus), data);


                        //TODO - I don't think the following works...
                        if (JSON.stringify(currentPumpStatus[pumpStatus.pump]) === JSON.stringify(pumpStatus)) {

                            if (s.logPumpMessages)
                                logger.debug('Msg# %s   Pump %s status has not changed: ', counter, pumpStatus.pump, data)
                        } else {
                            var needToEmit = 0
                            if (pumpStatus.watts !== currentPumpStatus[pump].watts) {
                                  significantWattsChange(pump, watts)
                                    needToEmit = 1;
                                }
                                //logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))
                                if (s.logPumpMessages)
                                    if (s.logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pump].whatsDifferent(pumpStatus));
                            } else {
                                //NOTE: Need to ignore TIME & remotecontrol so the packets aren't emitted every minute if there are no other changes.
                                var tempPumpStatus = JSON.parse(JSON.stringify(pumpStatus))
                                var tempcurrentPumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pump]))

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
                                var pumpWhatsDifferent = currentPumpStatus[pump].whatsDifferent(pumpStatus)
                                if (pumpWhatsDifferent != "Nothing!") {
                                    if (s.logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, pumpWhatsDifferent);
                                }
                            }

                            //if we don't have a previous value for .watts than it should be the first time we are here and let's emit the pump status
                            if ((currentPumpStatus[pump].watts).toLowerCase.indexOf('notset') >= 0) {
                                needToEmit = 1
                            }
                            currentPumpStatus[pump] = pumpStatus;
                            if (needToEmit) {
                                container.io.emitToClients('pump');
                            }
                        }

                }

            }
*/


    function significantWattsChange(pump, watts) {
        if ((Math.abs((watts - currentPumpStatus[pump].watts) / watts)) > .05) {
            if (s.logPumpMessages) logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pump, currentPumpStatus[pump].watts, watts)
            return true
        }
        return false
    }

    function setPumpOff(pump){
      currentPumpStatus[pump].duration = 0;
      //set program to 0
      currentPumpStatus[pump].currentprogram = 0;
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
            currentPumpStatus[equip].power = program;
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
            var str = 'program' + program + 'rpm';
            currentPumpStatus[equip][str] = value;
            currentPumpStatus[equip].currentprogram = program;
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
            //set a timer for 1 minute
            var setTimerPacket = [165, 0, pump, container.settings.appAddress, 1, 4, 3, 43, 0, 1];
            if (container.settings.logApi) logger.info('Sending Set a 1 minute timer (safe mode enabled, timer will reset every minute for a total of %s minutes): %s', duration, setTimerPacket);
            container.queuePacket.queuePacket(setTimerPacket);
            //fix until the default duration actually is set to 1
            if (duration < 1 || duration == null) {
                duration = 1;
            }
            if (equip == 1) {
                currentPumpStatus[1].duration = duration;
                //run the timer update 50s into the 1st minute
                container.pumpController.startTimer(1)
            } else {
                currentPumpStatus[2].duration = duration;
                //run the timer update 50s into the 1st minute
                container.pumpController.startTimer(2)
            }



        } else {
            //turn pump on/off
            var pumpPowerPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(pumpPowerPacket, setPrg)
            if (container.settings.logApi) logger.verbose('Sending Turn pump %s: %s', program, pumpPowerPacket);
            queuePacket(pumpPowerPacket);
        }
        //set pump to local control
        var localControlPacket = [165, 0, pump, container.settings.appAddress, 4, 1, 0];
        if (container.settings.logApi) logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        //request pump status
        var statusPacket = [165, 0, pump, container.settings.appAddress, 7, 0];
        if (container.settings.logApi) logger.verbose('Sending Request Pump Status: %s', statusPacket)
        queuePacket(statusPacket);
        if (container.settings.logApi) logger.info('End of Sending Pump Packet \n \n')

        socket.io.io.emit('pump')
    }



    function getCurrentPumpStatus() {
        return currentPumpStatus
    }

    return {
        //currentPumpStatus,
        //currentPumpStatusPacket,
        //decodePacketFromController: decodePacketFromController,
        getCurrentPumpStatus: getCurrentPumpStatus,
        provideStatus: provideStatus,
        setCurrentProgram: setCurrentProgram,
        saveProgramAs: saveProgramAs,
        pumpACK: pumpACK,
        setRemoteControl: setRemoteControl,
        setRunMode: setRunMode,
        setPower: setPower,
        pumpStatus: pumpStatus
    }
}
