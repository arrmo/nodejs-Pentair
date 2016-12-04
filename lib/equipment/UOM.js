module.exports = function(container) {
    logger = container.logger
    if (container.logModuleLoading)
        logger.info('Loading: UOM.js')

    var UOM = {
        "UOM": 0,
        "UOMStr": "unknown"
    }


    function setUOM(uom) {
        UOM.UOM = uom
        UOM.UOM = String.fromCharCode(176) +
            (uom === 0 ?
                ' Farenheit' :
                ' Celsius')
    }

    function getUOM(){
      return UOM.UOM
    }

    function getUOMStr(){
      return UOMStr
    }

    if (container.logModuleLoading)
        logger.info('Loaded: UOM.js')


    return {
        //UOM,
        setUOM: setUOM,
        getUOM: getUOM,
        getUOMStr: getUOMStr
    }
}
