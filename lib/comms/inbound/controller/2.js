module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

        var logger = container.logger
        var s = container.settings
        var c = container.constants


        if (container.logModuleLoading)
            logger.info('Loaded: 2.js')


            function process(data, counter) {
              //Only run through this if there is a change
              //if (JSON.stringify(data) !== JSON.stringify(container.status.getCurrentStatusBytes())) {
              if (JSON.stringify(data) !== JSON.stringify(container.circuit.getCurrentStatusBytes())) {
                container.circuit.setCurrentStatusBytes(data, counter)


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




                  //and finally emit the packets
                  container.io.emitToClients('config')
                  container.io.emitToClients('circuit')

              } else {
                  if (container.settings.logDuplicateMessages)
                      logger.verbose('Msg# %s   Duplicate broadcast.', counter)
              }

              decoded = true;
              return decoded

            }


    return {
      process : process
    }



}
