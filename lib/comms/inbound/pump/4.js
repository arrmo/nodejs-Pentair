module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')


    function process(data, counter) {
        var remotecontrol
        if (data[container.constants.pumpPacketFields.CMD] == 255) //Set pump control panel off (Main panel control only)
        {
            remotecontrol = 1;
        } else //0 = Set pump control panel on
        {
            remotecontrol = 0;
        }
        container.pump.setRemoteControl(remotecontrol, data[container.constants.packetFields.FROM], data, counter)
    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: 2.js')



    return {
        process: process
    }
}
