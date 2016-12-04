//Get Custom Names
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 10.js')




    if (container.logModuleLoading)
        container.logger.info('Loaded: 10.js')

    function process(data, counter) {

        //TODO: move to constants
        var customNameArrBytes = {
          "circuit": 6
        }

        var customNameStrBytes = data.slice(7,18);
        container.customNames.setCustomName(data[customNameArrBytes.circuit], customNameStrBytes, counter)




        decoded = true;

        return decoded
    }


    return {
        process: process

    }
}
