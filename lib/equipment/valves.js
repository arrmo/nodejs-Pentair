//TODO: make an 'update' function so poolHeatModeStr/spaHeatModeStr update when we set the corresponding modes.



module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: valves.js')

    var valves = {
      "valves":0
  }


function setValves(data) {

  valves.valves = container.constants.strValves[data];
}



    if (container.logModuleLoading)
        logger.info('Loaded: valves.js')


    return {
        valves,
        setValves : setValves
    }
}
