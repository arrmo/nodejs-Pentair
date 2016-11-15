module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)6.js')

    s = container.settings
    logger = container.logger



    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)6.js')

        function process(pumpStatus, data, counter, packetType){
          var power;
          if (data[6] == 10)
              power = 1
          else if (data[6] == 4)
              power = 0;
          var powerStr = power === 1 ? 'on' : 'off'
          pumpStatus.power = power;
          if (data[container.constants.packetFields.DEST] == 96 || data[container.constants.packetFields.DEST] == 97) //Command to the pump
          {
              if (s.logPumpMessages)
                  logger.verbose('Msg# %s   %s --> %s: Pump power to %s: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], container.constants.ctrlString[data[container.constants.packetFields.DEST]], powerStr, JSON.stringify(data));

          } else {
              if (s.logPumpMessages)
                  logger.verbose('Msg# %s   %s: Pump power %s: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], powerStr, JSON.stringify(data));

          }
            return pumpStatus
        }


    return {
        process: process
    }
}
