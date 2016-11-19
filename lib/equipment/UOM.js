module.exports = function(container) {
        logger = container.logger
        if (container.logModuleLoading)
            logger.info('Loading: UOM.js')

        var UOM = {
            "UOM": "unknown"
        }


        function setUOM(uom) {
            UOM.UOM = String.fromCharCode(176) +
                (uom === 0 ?
                    ' Farenheit' :
                    ' Celsius')
                }

            if (container.logModuleLoading)
                logger.info('Loaded: UOM.js')


            return {
                UOM,
                setUOM: setUOM
            }
        }
