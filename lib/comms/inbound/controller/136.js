//This is _SET_ heat/temp... not the response.
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 136.js')

        logger = container.logger
        s = container.settings
        c = container.constants

    s = container.settings


    function process(data, counter) {
        //  [16,34,136,4,POOL HEAT,SPA HEAT,Heat Mode,0,2,56]

        var status = {

            source: null,
            destination: null,
            b3: null,
            CMD: null,
            sFeature: null,
            ACTION: null,
            b7: null

        }
        status.source = data[c.packetFields.FROM]
        status.destination = data[c.packetFields.DEST]

        status.POOLSETPOINT = data[6];
        status.SPASETPOINT = data[7];
        status.POOLHEATMODE = c.heatModeStr[data[8] & 3]; //mask the data[6] with 0011
        status.SPAHEATMODE = c.heatModeStr[(data[8] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places
        logger.info('Msg# %s   %s asking %s to change pool heat mode to %s (@ %s degrees) & spa heat mode to %s (at %s degrees): %s', counter, c.ctrlString[data[c.packetFields.FROM]], c.ctrlString[data[c.packetFields.DEST]], status.POOLHEATMODE, status.POOLSETPOINT, status.SPAHEATMODE, status.SPASETPOINT, JSON.stringify(data));
        decoded = true;


        return decoded
    }


    if (container.logModuleLoading)
        container.logger.info('Loaded: 136.js')


    return {
        process: process
    }
}
