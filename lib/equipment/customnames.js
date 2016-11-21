module.exports = function(container) {
    var logger = container.logger

    var customNameArr = [];
    var initialCustomNamesDiscovered = 0


    if (container.logModuleLoading)
        container.logger.info('Loaded: circuit.js')


    function getCustomName(index) {
        return customNameArr[index]
    }


    function setCustomName(index, nameBytes, counter) {
        var customName=""
        for (var i = 0; i < nameBytes.length; i++) {
            if (nameBytes[i] > 0 && nameBytes[i] < 251) //251 is used to terminate the custom name string if shorter than 11 digits
            {
                customName += String.fromCharCode(nameBytes[i])
            }
        }

        if (container.settings.logConfigMessages) {
            logger.silly('Msg# %s  Custom Circuit Name Raw:  %s  & Decoded: %s', counter, JSON.stringify(nameBytes), customName)
                //logger.verbose('Msg# %s  Custom Circuit Name Decoded: "%s"', counter, customName)
        }

        customNameArr[index] = customName;

        if (initialCustomNamesDiscovered === 0 && index === 9) {
            displayInitialCustomNames()
        } else
        if (customNameArr[index] !== customName) {
            logger.info('Msg# %s  Custom Circuit name %s changed to %s', counter, customNameArr[index], customName)
        }
    }

    function displayInitialCustomNames() {
        //display custom names when we reach the last circuit

        logger.info('\n  Custom Circuit Names retrieved from configuration: ', customNameArr)
        initialCustomNamesDiscovered = 1
    }


    return {
        getCustomName: getCustomName,
        setCustomName: setCustomName
    }
}
