module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: (pump)5.js')

    s = container.settings
    logger = container.logger



    if (container.logModuleLoading)
        container.logger.info('Loaded: (pump)5.js')



    return {
        process: function(pumpStatus, data, counter, packetType) {
          if (data[container.constants.packetFields.DEST] == 96 || data[container.constants.packetFields.DEST] == 97) //Command to the pump
          {
              if (s.logPumpMessages)
                  logger.verbose('Msg# %s   %s --> %s: Set pump mode to _%s_: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], container.constants.ctrlString[data[container.constants.packetFields.DEST]], data[container.constants.pumpPacketFields.CMD], JSON.stringify(data));
              var pumpMode;
              switch (data[7]) {
                  case 0:
                      {
                          pumpMode = "Filter";
                          break;
                      }
                  case 1:
                      {
                          pumpMode = "Manual";
                          break;
                      }
                  case 2:
                      {
                          pumpMode = "Speed 1";
                          break;
                      }
                  case 3:
                      {
                          pumpMode = "Speed 2";
                          break;
                      }
                  case 4:
                      {
                          pumpMode = "Speed 3";
                          break;
                      }
                  case 5:
                      {
                          pumpMode = "Speed 4";
                          break;
                      }
                  case 6:
                      {
                          pumpMode = "Feature 1";
                          break;
                      }
                  case 7:
                      {
                          pumpMode = "Unknown pump mode";
                          break;
                      }
                  case 8:
                      {
                          pumpMode = "Unknown pump mode";
                          break;
                      }
                  case 9:
                      {
                          pumpMode = "External Program 1";
                          break;
                      }
                  case 10:
                      {
                          pumpMode = "External Program 2";
                          break;
                      }
                  case 11:
                      {
                          pumpMode = "External Program 3";
                          break;
                      }
                  case 12:
                      {
                          pumpMode = "External Program 4";
                          break;
                      }
                  default:
                      {
                          pumpMode = "Oops, we missed something!"
                      }

              }
              logger.verbose('Pump mode: %s  %s', pumpMode, JSON.stringify(data))
              pumpStatus.mode = pumpMode;

          } else {
              if (s.logPumpMessages)
                  logger.verbose('Msg# %s   %s confirming it is in mode %s: %s', counter, container.constants.ctrlString[data[container.constants.packetFields.FROM]], data[container.constants.packetFields.CMD], JSON.stringify(data));

          }
                      return pumpStatus
        }
    }
}
