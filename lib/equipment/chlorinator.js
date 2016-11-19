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

    var chlorinatorStatusStr = {
        0: "Ok",
        1: "No flow",
        2: "Low Salt",
        4: "High Salt",
        132: "Comm Link Error(?).  Low Salt",
        144: "Clean Salt Cell",
        145: "???"
    }

    function addChlorinatorStatus(saltPPM, outputPercent, outputSpaPercent, status, name, counter) {
        var chlorinatorStatus = {}
        chlorinatorStatus.saltPPM = saltPPM * 50
        chlorinatorStatus.outputPercent = outputPercent
        chlorinatorStatus.outputSpaPercent = (outputSpaPercent - 1) / 2; //41 would equal 20%, for example

        //TODO: take care of unknown status' here.  Is this right?
        chlorinatorStatus.status = chlorinatorStatusStr[status] !== undefined ? chlorinatorStatusStr[status] : status


        if (currentChlorinatorStatus.name == '') {
          //TODO: Don't leave this as assignment.  It will break the bottle.container reference to the original object
            currentChlorinatorStatus = chlorinatorStatus;
            if (container.settings.logChlorinator)
                logger.info('Msg# %s   Initial chlorinator settings discovered: ', counter, JSON.stringify(currentChlorinatorStatus))
            container.io.emit('chlorinator');
        } else
        if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
            if (container.settings.logChlorinator)
                logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
        } else {
            if (container.settings.logChlorinator)
                logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
            currentChlorinatorStatus = chlorinatorStatus;
            container.io.emit('chlorinator');
        }



    }

    function getChlorinatorNameByBytes(nameArr) {
        var name
        for (var i = 1; i <= nameArr.length; i++) {
            name += String.fromCharCode(nameArr[i]);
        }
        return name
    }


    if (container.logModuleLoading)
        container.logger.info('Loaded: chlorinator.js')


    return {
        currentChlorinatorStatus,
        desiredChlorinatorOutput,
        addChlorinatorStatus : addChlorinatorStatus,
        getChlorinatorNameByBytes : getChlorinatorNameByBytes,
        chlorinatorObj: function() {
            return new Chlorinator(0, 0, 0, 0, 0, 0, '', '')
        }
    }
}
