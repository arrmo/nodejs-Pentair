module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

        logger = container.logger
        s = container.settings
        c = container.constants


        if (container.logModuleLoading)
            logger.info('Loaded: 2.js')


            function process(data, counter, packetType, currentStatusBytes, circuitArrO) {
              //Only run through this if there is a change
              if (JSON.stringify(data) !== container.status.getCurrentStatusBytes()) {

                  container.time.setControllerTime(data[c.controllerStatusPacketFields.HOUR], data[c.controllerStatusPacketFields.MIN])
                  container.temperatures.setTempFromController(data[c.controllerStatusPacketFields.POOL_TEMP],data[c.controllerStatusPacketFields.SPA_TEMP],data[c.controllerStatusPacketFields.AIR_TEMP],data[c.controllerStatusPacketFields.SOLAR_TEMP])

                  //TODO: Figure out what this heat mode string does...
                  var status = {}
                  status.poolHeatMode2 = c.heatModeStr[data[c.controllerStatusPacketFields.UNKNOWN] & 3]; //mask the data[6] with 0011
                  status.spaHeatMode2 = c.heatModeStr[(data[c.controllerStatusPacketFields.UNKNOWN] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places

                                                              //mask the data[6] with 0011                           mask the data[6] with 1100 and shift right two places
                  container.heat.setHeatModeFromController(data[c.controllerStatusPacketFields.HEATER_MODE]&3, (data[c.controllerStatusPacketFields.HEATER_MODE] & 12) >> 2)
                  container.valves.setValves([data[c.controllerStatusPacketFields.VALVES]])

                  status.runmode = c.strRunMode[data[c.controllerStatusPacketFields.UOM] & 129]; // more here?
                  container.UOM.setUOM((data[c.controllerStatusPacketFields.UOM] & 4) >> 3)



                  container.heat.setHeatActiveFromController(data[c.controllerStatusPacketFields.HEATER_ACTIVE])
                  container.circuit.assignCircuitStatusFromControllerStatus(data, counter)

                  //For the first time we have a 2 packete
                  container.status.setCurrentStatusBytes(data, counter)



                  //and finally emit the packets
                  container.io.emit('config')
                  container.io.emit('circuit')

              } else {
                  if (s.logDuplicateMessages)
                      logger.debug('Msg# %s   Duplicate broadcast.', counter)
              }

              decoded = true;
              return decoded

            }


    return {
      process : process
    }



}
