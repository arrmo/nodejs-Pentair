module.exports = function(container) {

        var Bottle = require('bottlejs');
        var bottle = Bottle.pop('pentair-Bottle');
        bottle.factory('controller_2', require('./controller/2.js'))
        bottle.factory('controller_7', require('./controller/7.js'))
        bottle.factory('controller_8', require('./controller/8.js'))
        bottle.factory('controller_10', require('./controller/10.js'))
        bottle.factory('controller_11', require('./controller/11.js'))
        bottle.factory('controller_17', require('./controller/17.js'))
        bottle.factory('controller_25', require('./controller/25.js'))
        bottle.factory('controller_134', require('./controller/134.js'))
        bottle.factory('controller_136', require('./controller/136.js'))
        bottle.factory('controller_153', require('./controller/153.js'))
        bottle.factory('controller_217', require('./controller/217.js'))
        bottle.factory('controller_252', require('./controller/252.js'))


        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        s = container.settings

        if (container.logModuleLoading)
            logger.info('Loading: process-controller.js')


            function processControllerPacket(data, counter, packetType) {
                var decoded;
                switch (data[container.constants.packetFields.ACTION]) {

                    case 2: //Controller Status
                        {
                            decoded = container.controller_2.process(data, counter, packetType, currentStatusBytes)
                            break;
                        }
                    case 7: //Send request/response for pump status
                        {
                            decoded = container.controller_7.process(data, counter, packetType)
                            break;
                        }
                    case 8: //Broadcast current heat set point and mode
                        {
                            decoded = container.controller_8.process(data, counter, packetType)
                            break;
                        }


                    case 10: //Get Custom Names
                        {
                            decoded = container.controller_10.process(data, counter, packetType)
                            break;
                        }

                    case 11: // Get Circuit Names
                        {
                            decoded = container.controller_11.process(data, counter, packetType)
                            break;
                        }
                    case 17: // Get Schedules
                        {
                            decoded = container.controller_17.process(data, counter, packetType)
                            break;
                        }
                    case 25: //Intellichlor status
                        {
                            decoded = container.controller_25.process(data, counter, packetType)
                            break;
                        }
                    case 134: //Set Circuit Function On/Off
                        {
                            decoded = container.controller_134.process(data, counter, packetType)
                            break;
                        }
                    case 136: //This is _SET_ heat/temp... not the response.
                        {
                            decoded = container.controller_136.process(data, counter, packetType)
                            break;
                        }
                    case 153: //Set Intellichlor status
                        {
                            decoded = container.controller_153.process(data, counter, packetType)
                            break;
                        }
                    case 217: //Get Intellichlor status
                        {
                            decoded = container.controller_217.process(data, counter, packetType)
                            break;
                        }
                    case 252: //Get system settings
                        {
                            decoded = container.controller_252.process(data, counter, packetType)
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
