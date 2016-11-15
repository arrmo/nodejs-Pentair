module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 2.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        s = container.settings
        c = container.constants


        if (container.logModuleLoading)
            logger.info('Loaded: 2.js')


            function process(data, counter, packetType) {
              //quick gut test to see if we have a duplicate packet
              if (JSON.stringify(data) !== JSON.stringify(currentStatusBytes)) {
                  //--------Following code (re)-assigns all the incoming data to the status object
                  var status = {};

                  //if the currentStatus is present, copy it.
                  if (currentStatus != undefined) {
                      status = JSON.parse(JSON.stringify(currentStatus))
                  }

                  var timeStr = ''
                  if (data[c.controllerStatusPacketFields.HOUR] > 12) {
                      timeStr += data[c.controllerStatusPacketFields.HOUR] - 12
                  } else {
                      timeStr += data[c.controllerStatusPacketFields.HOUR]
                  }
                  timeStr += ':'
                  if (data[c.controllerStatusPacketFields.MIN] < 10)
                      timeStr += '0';
                  timeStr += data[c.controllerStatusPacketFields.MIN]
                  if (data[c.controllerStatusPacketFields.HOUR] > 11 && data[c.controllerStatusPacketFields.HOUR] < 24) {
                      timeStr += " PM"
                  } else {
                      timeStr += " AM"
                  }

                  status.time = timeStr;
                  status.poolTemp = data[c.controllerStatusPacketFields.POOL_TEMP];
                  status.spaTemp = data[c.controllerStatusPacketFields.SPA_TEMP];
                  status.airTemp = data[c.controllerStatusPacketFields.AIR_TEMP];
                  status.solarTemp = data[c.controllerStatusPacketFields.SOLAR_TEMP];
                  status.poolHeatMode2 = c.heatModeStr[data[c.controllerStatusPacketFields.UNKNOWN] & 3]; //mask the data[6] with 0011
                  status.spaHeatMode2 = c.heatModeStr[(data[c.controllerStatusPacketFields.UNKNOWN] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places

                  status.poolHeatMode = c.heatModeStr[data[c.controllerStatusPacketFields.HEATER_MODE] & 3]; //mask the data[6] with 0011
                  status.spaHeatMode = c.heatModeStr[(data[c.controllerStatusPacketFields.HEATER_MODE] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places

                  status.valves = c.strValves[data[c.controllerStatusPacketFields.VALVES]];
                  status.runmode = c.strRunMode[data[c.controllerStatusPacketFields.UOM] & 129]; // more here?
                  status.UOM = String.fromCharCode(176) + ((data[c.controllerStatusPacketFields.UOM] & 4) >> 3) ? ' Farenheit' : ' Celsius';
                  if (data[c.controllerStatusPacketFields.HEATER_ACTIVE] == 0) {
                      status.HEATER_ACTIVE = 'Off'
                  } else
                  if (data[c.controllerStatusPacketFields.HEATER_ACTIVE] == 32) {
                      status.HEATER_ACTIVE = 'Heater On'
                  } else {
                      status.HEATER_ACTIVE = 'Unknown'
                  }
                  if (currentCircuitArrObj != undefined) {
                      circuitArrObj = JSON.parse(JSON.stringify(currentCircuitArrObj))
                  }
                  //assign circuit status to circuitArrObj
                  for (var i = 0; i < 3; i++) {
                      for (var j = 0; j < 8; j++) {
                          if ((j + (i * 8) + 1) <= 20) {
                              equip = data[c.controllerStatusPacketFields.EQUIP1 + i]
                              if (s.logMessageDecoding)
                                  logger.silly('Decode Case 2:   i: %s  j:  %s  j + (i * 8) + 1: %s   equip: %s', i, j, j + (i * 8) + 1, equip)
                              circuitArrObj[j + (i * 8) + 1].status = (equip & (1 << (j))) >> j ? "on" : "off"
                          }
                      }
                  }
                  //-----------------Finished assigning new data to temporary object


                  //For the first time we have a 2 packete
                  if (currentStatusBytes.length===0) {

                      logger.info('Msg# %s   Discovered initial system settings: ', counter, status)
                      logger.verbose('\n ', container.decodeHelper.printStatus(data));

                      //NOTE:  Commented this out because we only want to display the circuit discovery info when we have both the circuit names and status
                      /*var circuitStr = '';
                      //logger.info('Msg# %s  Initial circuits status discovered', counter)
                      for (var i = 1; i <= 20; i++) {
                          if (circuitArrObj[i].name != undefined) {
                              circuitStr += circuitArrObj[i].name + " status: "
                              circuitStr += circuitArrObj[i].status + '\n'
                              logger.info('Msg# %s: Circuit states discovered: \n %s', counter, circuitStr)
                          }
                      }*/



                  } else {

                      //now, let's output what is different between the packet and stored packets
                      if (s.logConfigMessages) {
                          //what's different (overall) with the status packet
                          logger.verbose('-->EQUIPMENT Msg# %s   \n', counter)
                              //this will output the difference between currentStatusByte and data
                          logger.verbose('Msg# %s: \n', counter, container.decodeHelper.printStatus(currentStatusBytes, data));
                          var currentWhatsDifferent; //persistent variable to hold what's different

                          currentWhatsDifferent = currentStatus.whatsDifferent(status);
                          if (currentWhatsDifferent != "Nothing!") {
                              logger.verbose('Msg# %s   System Status changed: %s', counter, currentWhatsDifferent)
                          }


                          //What's different with the circuit status?
                          //THE LOOP IS BECAUSE THERE IS A BUG IN THE RECURSIVE LOOP.  It won't display the output.  Need to fix for objects embedded inside an array.
                          var results;
                          for (var i = 1; i <= 20; i++) {
                              if (currentCircuitArrObj[i].status != undefined) {
                                  results = currentCircuitArrObj[i].whatsDifferent(circuitArrObj[i]);
                                  if (!(results == "Nothing!" || currentCircuitArrObj[i].name == undefined)) {
                                      logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuitArrObj[i].name, results)
                                  }
                              }
                          }
                      }
                  }

                  //and finally assign the temporary variables to the permanent one
                  currentStatus = JSON.parse(JSON.stringify(status));
                  currentStatusBytes = JSON.parse(JSON.stringify(data));
                  currentCircuitArrObj = JSON.parse(JSON.stringify(circuitArrObj));



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
