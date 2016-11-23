//Send request/response for pump status
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

    logger = container.logger
    s = container.settings
    c = container.constants



    function process(data, counter) {

        if (data[c.packetFields.DEST] === 96 || data[c.packetFields.DEST] === 97) //Command to the pump
        {
            container.pump.provideStatus(data, counter)
        } else //response
        {
            var pump;
            if (data[c.packetFields.FROM] === 96 || data[c.packetFields.DEST] === 96) {
                pump = 1
            } else {
                pump = 2
            }
            var hour = data[c.pumpPacketFields.HOUR]
            var min = data[c.pumpPacketFields.MIN];
            var run = data[c.pumpPacketFields.CMD]
            var mode = data[c.pumpPacketFields.MODE]
            var drivestate = data[c.pumpPacketFields.DRIVESTATE]
            var watts = (data[c.pumpPacketFields.WATTSH] * 256) + data[c.pumpPacketFields.WATTSL]
            var rpm = (data[c.pumpPacketFields.RPMH] * 256) + data[c.pumpPacketFields.RPML]
            var ppc = data[c.pumpPacketFields.PPC]
            var err = data[c.pumpPacketFields.ERR]
            var timer = data[c.pumpPacketFields.TIMER]
            container.pump.pumpStatus(pump, hour, min, run, mode, drivestate, watts, rpm, ppc, err, timer, data, counter)
        }

    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: 2.js')


    return {
        process: process
    }
}
