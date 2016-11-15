module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

    s = container.settings
    logger = container.logger



    if (container.logModuleLoading)
        container.logger.info('Loaded: 2.js')



    return {
        process: function(pumpStatus, data, counter, packetType) {

            if (data[container.constants.pumpPacketFields.CMD] == 255) //Set pump control panel off (Main panel control only)
            {
                pumpStatus.remotecontrol = 1;
            } else //0 = Set pump control panel on
            {
                pumpStatus.remotecontrol = 0;
            }
            var remoteControlStr = pumpStatus.remotecontrol === 1 ? 'on' : 'off'


            if (data[container.constants.packetFields.DEST] == 96 || data[container.constants.packetFields.DEST] == 97) //Command to the pump
            {
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s --> %s: Remote control (turn %s pump control panel): %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], container.constants.ctrlString[data[container.constants.packetFields.DEST]], remoteControlStr, JSON.stringify(data));
            } else {
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s: Remote control %s: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], remoteControlStr, JSON.stringify(data));
            }


            return pumpStatus
        }
    }
}
