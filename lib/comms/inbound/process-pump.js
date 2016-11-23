module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: process-pump.js')

    currentPumpStatus = container.pump.currentPumpStatus
    currentPumpStatusPacket = container.pump.currentPumpStatusPacket

    function processPumpPacket(data, counter, packetType) {
        {
            var decoded
            if (s.logPumpMessages)
                logger.silly('Msg# %s  Decoding pump packet %s', counter, data)

            switch (data[container.constants.packetFields.ACTION]) {
                case 1: //Set speed setting
                    {
                        container.pump_1.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 2: //??
                    {
                        container.pump_2.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 4: //Pump control panel on/off
                    {
                        container.pump_4.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 5: //Set pump mode
                    {
                        container.pump_5.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 6: //Turn pump on/off
                    {
                        container.pump_6.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 7: //cyclical status of pump requesting pump status
                    {
                        container.common_7.process(data, counter)
                        decoded = true;
                        break;
                    }
                case 256: //03:17:39.122 INFO Msg# 5 is UNKNOWN: [16,96,255,1,8,2,29]  Possibly priming?
                    {
                        logger.warn('Msg# %s  Pump message?  Possibly priming?  %s', JSON.stringify(pumpStatus))
                        decoded = false;
                        break;
                    }
                default:
                    {
                        if (s.logPumpMessages)
                            logger.info('Msg# %s is UNKNOWN: %s', counter, JSON.stringify(data));
                        decoded = false;
                    }
            }


        }
        return decoded
    }



    if (container.logModuleLoading)
        container.logger.info('Loaded: process-pump.js')

    return {
        processPumpPacket: processPumpPacket
    }
}


//End Pump Decode
