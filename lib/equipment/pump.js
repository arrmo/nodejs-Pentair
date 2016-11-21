
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
    var currentPumpStatusPacket  = ['blank', [],
        []
    ]; // variable to hold the status packets of the pumps


    if (container.logModuleLoading)
        container.logger.info('Loaded: pump.js')


    return {
      currentPumpStatus,
      currentPumpStatusPacket
    }
}
