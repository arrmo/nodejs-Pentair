module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: chlorinator.js')

    var desiredChlorinatorOutput = 0; //variable for chlorinator output % (in pumpOnly mode; controllers take care of this otherwise).  0 = off.  1-100=% output; 101=superChlorinate


    function Chlorinator(saltPPM, outputPercent, outputSpaPercent, outputLevel, superChlorinate, version, name, status) {

        this.saltPPM = saltPPM;
        this.outputPercent = outputPercent; //for intellitouch this is the pool setpoint, for standalone it is the default
        this.outputSpaPercent = outputSpaPercent; //intellitouch has both pool and spa set points
        this.outputLevel = outputLevel;
        this.superChlorinate = superChlorinate;
        this.version = version;
        this.name = name;
        this.status = status;
    }

    //module.exports = Chlorinator

    var currentChlorinatorStatus = new Chlorinator(0, 0, 0, 0, 0, 0, '', '');


    if (container.logModuleLoading)
        container.logger.info('Loaded: chlorinator.js')


    return {
      currentChlorinatorStatus,
      desiredChlorinatorOutput,
      chlorinatorObj: function (){return new Chlorinator(0, 0, 0, 0, 0, 0, '', '')}
    }
}
