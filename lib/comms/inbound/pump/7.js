module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)7.js')

    s = container.settings
    logger = container.logger
    c = container.constants


    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)7.js')

        //var Bottle = require('bottlejs')
        //var bottle = Bottle.pop('pentair-Bottle');
    function process(pumpStatus, data, counter, packetType) {
        /*logger.error('IN 7: ', bottle.list())
        logger.error('bottle.container.constants.packetFields: ', bottle.container.constants.packetFields)
        logger.error('container.constants.packetFields: ', container.constants.packetFields)
        logger.error('container.constants: ', container.constants)
        logger.error('c: ', c)
        logger.error('c.packetFields: ', c.packetFields)*/

        if (data[c.packetFields.DEST] === 96 || data[c.packetFields.DEST] === 97) //Command to the pump
        {
            if (s.logPumpMessages)
                logger.verbose('Msg# %s   %s --> %s: Provide status: %s', counter, c.ctrlString[data[c.packetFields.FROM]], c.ctrlString[data[c.packetFields.DEST]], JSON.stringify(data));
        } else //response
        {


            pumpStatus.time = data[c.pumpPacketFields.HOUR] + ':' + data[c.pumpPacketFields.MIN];
            pumpStatus.run = data[c.pumpPacketFields.CMD] == 10 ? 1 : 0 //10=On, 4=Off

            pumpStatus.mode = data[c.pumpPacketFields.MODE]
            pumpStatus.drivestate = data[c.pumpPacketFields.DRIVESTATE]
            pumpStatus.watts = (data[c.pumpPacketFields.WATTSH] * 256) + data[c.pumpPacketFields.WATTSL]
            pumpStatus.rpm = (data[c.pumpPacketFields.RPMH] * 256) + data[c.pumpPacketFields.RPML]
            pumpStatus.ppc = data[c.pumpPacketFields.PPC]
            pumpStatus.err = data[c.pumpPacketFields.ERR]
            pumpStatus.timer = data[c.pumpPacketFields.TIMER]
                //status.packet = data;

            if (s.logPumpMessages)
                logger.verbose('\n Msg# %s  %s Pump Status (from pump): ', counter, pumpStatus.name, JSON.stringify(pumpStatus), data, '\n');
            //logger.error('1. what\'s different:', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))

            container.pump.currentPumpStatusPacket[pumpStatus.pump] = data;
        }
        return pumpStatus
    }

    return {
        process: process
    }
}
