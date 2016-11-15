module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)1.js')


    s = container.settings
    logger = container.logger



    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)1.js')



    return {
        process: function(pumpStatus, data, counter, packetType) {
            var str1;
            var str2;
            var setAmount = data[8] * 256 + data[9];

            if (data[5] == 2) // Length==2 is a response.
            {

                var str1;
                var setAmount = data[6] * 256 + data[7];
                decoded = true;
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s responded with acknowledgement: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], JSON.stringify(data));
            } else if (data[6] == 3) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
            {
                switch (data[7]) {

                    case 33: //0x21
                        {
                            setAmount = setAmount / 8
                            str1 = 'Set Current Program to '
                            str2 = setAmount.toString();
                            pumpStatus.currentprogram = setAmount;
                            break;
                        }
                    case 39: //0x27
                        {
                            str1 = 'Save Program 1 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program1rpm = setAmount;
                            break;
                        }
                    case 40: //0x28
                        {
                            str1 = 'Save Program 2 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program2rpm = setAmount;
                            break;
                        }
                    case 41: //0x29
                        {
                            str1 = 'Save Program 3 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program3rpm = setAmount;
                            break;
                        }
                    case 42: //0x2a
                        {
                            str1 = 'Save Program 4 as ';
                            pumpStatus.program4rpm = setAmount;
                            str2 = setAmount.toString() + 'rpm';
                            break;
                        }
                    case 43: //0x2B
                        {
                            str1 = 'Set Pump Timer for ';
                            //commented out the following line because we are not sure what the timer actually does
                            //leaving it in creates problems for ISY that might rely on this variable
                            //pumpStatus.timer = setAmount;
                            str2 = setAmount.toString() + ' minutes'
                            break;
                        }
                    default:
                        {
                            str1 = 'unknown(?)'
                        }

                }

                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s: %s %s %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], str1, str2, JSON.stringify(data));
                decoded = true;
            } else if (data[6] == 2) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
            {

                var str1;
                var setAmount = data[8] * 256 + data[9];
                if (s.logPumpMessages)
                    logger.verbose('Msg# %s   %s --> %s: Set Speed (Intellitouch) to %s rpm: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], container.constants.ctrlString[data[container.constants.packetFields.DEST]], setAmount, JSON.stringify(data));
            } else {
                str1 = '[' + data[6] + ',' + data[7] + ']';
                str2 = ' rpm(?)'
                logger.warn('Msg# %s  Pump data ?', str1, str2, counter, data)
            }

            return pumpStatus
        }
    }
}
