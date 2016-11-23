module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)6.js')

    s = container.settings
    logger = container.logger



    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)6.js')

        function process(data, counter){
          var power;
          if (data[6] == 10)
              power = 1
          else if (data[6] == 4)
              power = 0;
          container.pump.setPower(power, data[container.constants.packetFields.FROM], data, counter)

        }



    return {
        process: process
    }
}
