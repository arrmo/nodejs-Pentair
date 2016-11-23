/* global logger */


module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: intellitouch.js')

    var controllerSettings = {
        'appAddress': container.settings.appAddress,
        'needConfiguration': 1, //variable to let the program know we need the configuration from the Intellitouch
        'preambleByte': -1 //variable to hold the 2nd preamble byte... it used to by 10 for me.  Now it is 16.  Very strange.  So here is a variable to find it.
    }


    function getControllerConfiguration() {
        container.logger.info('Queueing messages to retrieve configuration from Intellitouch')

        container.logger.verbose('Queueing messages to retrieve SW Version')
            //get Heat Mode
        container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 253, 1, 0]);

        container.logger.verbose('Queueing messages to retrieve Pool/Spa Heat Mode')
        container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 200, 1, 0]);

        container.logger.verbose('Queueing messages to retrieve settings(?)')
        container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 232, 1, 0]);

        container.logger.verbose('Queueing messages to retrieve Custom Names')
        var i = 0;
        //get custom names
        for (i; i < 10; i++) {
            container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 202, 1, i]);
        }


        container.logger.verbose('Queueing messages to retrieve Circuit Names')
            //get circuit names
        for (i = 1; i < 21; i++) {
            container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 203, 1, i]);
        }


        container.logger.verbose('Queueing messages to retrieve Schedules')
            //get schedules
        for (i = 1; i < 13; i++) {

            container.queuePacket.queuePacket([165, controllerSettings.preambleByte, 16, controllerSettings.appAddress, 209, 1, i]);
        }
    }

    function setPreambleByte(byte){
        controllerSettings.preambleByte = byte
    }

    function getPreambleByte(){
        return controllerSettings.preambleByte
    }

    function checkIfNeedControllerConfiguration() {
       if (controllerSettings.needConfiguration) {

           if (container.settings.intellitouch) // ONLY check the configuration if the controller is Intellitouch (address 16)
           {
               if (controllerSettings.preambleByte !== -1) {

                   getControllerConfiguration()
                   controllerSettings.needConfiguration = 0; //we will no longer request the configuration.  Need this first in case multiple packets come through.
               }

           } else {

               if (container.settings.intellicom) {
                   logger.info('IntellicomII Controller in .  No configuration request messages sent.')
               } else {
                   logger.info('No pool controller (Intellitouch or IntelliComII) detected.  No configuration request messages sent.')
               }
               controllerSettings.needConfiguration = 0; //we will no longer request the configuration.  Need this first in case multiple packets come through.
           }
       }
   }



    if (container.logModuleLoading)
        container.logger.info('Loaded: intellitouch.js')

    return {
        checkIfNeedControllerConfiguration: checkIfNeedControllerConfiguration,
        getPreambleByte: getPreambleByte,
        setPreambleByte : setPreambleByte,
        checkIfNeedControllerConfiguration: checkIfNeedControllerConfiguration
    }

}
