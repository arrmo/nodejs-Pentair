module.exports = function(container) {


        if (container.logModuleLoading)
            logger.info('Loading: process-controller.js')


            function processControllerPacket(data, counter) {
                var decoded;
                switch (data[container.constants.packetFields.ACTION]) {

                    case 2: //Controller Status
                        {
                            decoded = container.controller_2.process(data, counter)
                            break;
                        }
                    case 7: //Send request/response for pump status
                        {
                            decoded = container.controller_7.process(data, counter)
                            break;
                        }
                    case 8: //Broadcast current heat set point and mode
                        {
                            decoded = container.controller_8.process(data, counter)
                            break;
                        }


                    case 10: //Get Custom Names
                        {
                            decoded = container.controller_10.process(data, counter)
                            break;
                        }

                    case 11: // Get Circuit Names
                        {
                            decoded = container.controller_11.process(data, counter)
                            break;
                        }
                    case 17: // Get Schedules
                        {
                            decoded = container.controller_17.process(data, counter)
                            break;
                        }
                    case 25: //Intellichlor status
                        {
                            decoded = container.controller_25.process(data, counter)
                            break;
                        }
                    case 134: //Set Circuit Function On/Off
                        {
                            decoded = container.controller_134.process(data, counter)
                            break;
                        }
                    case 136: //This is _SET_ heat/temp... not the response.
                        {
                            decoded = container.controller_136.process(data, counter)
                            break;
                        }
                    case 153: //Set Intellichlor status
                        {
                            decoded = container.controller_153.process(data, counter)
                            break;
                        }
                    case 217: //Get Intellichlor status
                        {
                            decoded = container.controller_217.process(data, counter)
                            break;
                        }
                    case 252: //Get system settings
                        {
                            decoded = container.controller_252.process(data, counter)
                            break;
                        }
                    default:
                        {

                            var currentAction = container.constants.strControllerActions[data[container.constants.packetFields.ACTION]]
                            if (currentAction != undefined) {
                                if (s.logConsoleNotDecoded)
                                    logger.verbose('Msg# %s   %s packet: %s', counter, currentAction, data)
                                decoded = true;
                            } else {
                                if (s.logConsoleNotDecoded)
                                    logger.verbose('Msg# %s   is NOT DEFINED packet: %s', counter, data)
                            }
                        }
                }
                return decoded
            }



        if (container.logModuleLoading)
            logger.info('Loaded: process-controller.js')


            return {
                processControllerPacket: processControllerPacket
            }
    }
    //End Controller Decode
