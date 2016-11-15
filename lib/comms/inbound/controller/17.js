// Get Schedules
module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: 17.js')

        logger = container.logger
        currentStatusBytes = container.currentStatusBytes
        currentCircuitArrObj = container.circuit.currentCircuitArrObj
        currentSchedule = container.currentSchedule
        customNameArr = container.circuit.customNameArr
        currentStatus = container.currentStatus
        currentPumpStatus = container.pump.currentPumpStatus
        s = container.settings
        c = container.constants
        currentHeat = container.heat.currentHeat

    if (container.logModuleLoading)
        container.logger.info('Loaded: 17.js')

    //TODO:  Merge this to a common function with the pump packet

    function process(data, counter, packetType) {
        //byte:      0  1  2  3  4 5 6 7 8  9 10 11  12 13 14
        //example: 165,16,15,16,17,7,1,6,9,25,15,55,255,2, 90
        var schedule = {};
        schedule.ID = data[6];
        schedule.CIRCUIT = data[7] === 0 ? c.strCircuitName[data[7]] : currentCircuitArrObj[data[7]].name; //Correct???
        schedule.CIRCUITNUM = data[7]
        if (data[8] == 25) //25 = Egg Timer
        {
            schedule.MODE = 'Egg Timer'
            schedule.DURATION = data[10] + ':' + data[11];
        } else {
            schedule.MODE = 'Schedule'
            schedule.DURATION = 'n/a'
            schedule.START_TIME = data[8] + ':' + data[9];
            schedule.END_TIME = data[10] + ':' + data[11];
            schedule.DAYS = '';
            // if (data[12] == 255) { //not sure this is needed as it is really x1111111 with the x=1 being unknown.  See following note.
            //    schedule.DAYS += 'EVERY DAY'
            //} else { //0 = none;  My Pentiar Intellitouch always adds a leading 1xxxxxxx to the schedule.  Don't know the significance of that.
            if ((data[12] == 0))
                schedule.DAYS += 'None';
            if ((data[12] & 1) == 1)
                schedule.DAYS += 'Sunday '; //1
            if ((data[12] & 2) >> 1 == 1)
                schedule.DAYS += 'Monday '; // 2
            if ((data[12] & 4) >> 2 == 1)
                schedule.DAYS += 'Tuesday '; // 4
            if ((data[12] & 8) >> 3 == 1)
                schedule.DAYS += 'Wednesday '; //8
            if ((data[12] & 16) >> 4 == 1)
                schedule.DAYS += 'Thursday '; //16
            if ((data[12] & 32) >> 5 == 1)
                schedule.DAYS += 'Friday '; //32
            if ((data[12] & 64) >> 6 == 1)
                schedule.DAYS += 'Saturday '; //64
            //}
        }





        if (s.logConfigMessages)
            logger.silly('\nMsg# %s  Schedule packet %s', counter, JSON.stringify(data))


        if ((JSON.stringify(currentSchedule[schedule.ID])) === (JSON.stringify(schedule))) {
            if (s.logConfigMessages)
                logger.debug('Msg# %s:  Schedule %s has not changed.', counter, schedule.ID)
        } else {
            if (currentSchedule[schedule.ID] == undefined && schedule.ID === 12 && container.checkForChange[2] === 0) {
                currentSchedule[schedule.ID] = schedule; //should only be called here for schedule.ID === 12.
                var scheduleStr = 'Msg# ' + counter + '  Schedules discovered:'
                for (var i = 1; i <= 12; i++) {
                    scheduleStr += '\nID:' + currentSchedule[i].ID + '  CIRCUIT:(' + currentSchedule[i].CIRCUITNUM + ')' + currentSchedule[i].CIRCUIT
                    if (currentSchedule[i].CIRCUIT !== 'NOT USED') {
                        if (currentSchedule[i].MODE == 'Egg Timer') {
                            scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' DURATION:' + currentSchedule[i].DURATION
                        } else {
                            scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' START_TIME:' + currentSchedule[i].START_TIME + '  END_TIME:' + currentSchedule[i].END_TIME + '  DAYS:' + currentSchedule[i].DAYS
                        }
                    }
                }
                logger.info('%s\n\n', scheduleStr)
                container.checkForChange[2] = 1
            } else if (container.checkForChange[2] === 1) {
                //Explicitly writing out the old/new packets because if we call .whatsDifferent and the schedule switches from an egg timer to schedule (or vice versa) it will throw an error)

                var scheduleChgStr = 'Msg# ' + counter + '  Schedule ' + 'ID:' + schedule.ID + ' changed from:\n'
                    //FROM string
                if (currentSchedule[schedule.ID].MODE === 'Egg Timer') {

                    scheduleChgStr += 'ID:' + currentSchedule[schedule.ID].ID + ' CIRCUIT:(' + data[6] + ')' + currentSchedule[schedule.ID].CIRCUIT + ' MODE:' + currentSchedule[schedule.ID].MODE + ' DURATION:' + currentSchedule[schedule.ID].DURATION
                } else {

                    scheduleChgStr += 'Schedule: ID:' + currentSchedule[schedule.ID].ID + ' CIRCUIT:(' + data[6] + ')' + currentSchedule[schedule.ID].CIRCUIT + ' MODE:' + currentSchedule[schedule.ID].MODE + ' START_TIME:' + currentSchedule[schedule.ID].START_TIME + ' END_TIME:' + currentSchedule[schedule.ID].END_TIME + ' DAYS:(' + data[12] + ')' + currentSchedule[schedule.ID].DAYS
                }


                scheduleChgStr += '\n'
                    //TO string
                if (schedule.MODE == 'Egg Timer') {

                    scheduleChgStr += ' CIRCUIT:(' + data[6] + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' DURATION:' + schedule.DURATION
                } else {

                    scheduleChgStr += ' CIRCUIT:(' + data[6] + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' START_TIME:' + schedule.START_TIME + ' END_TIME:' + schedule.END_TIME + ' DAYS:(' + data[12] + ')' + schedule.DAYS
                }
                logger.verbose(scheduleChgStr)
            }

            currentSchedule[schedule.ID] = schedule;
            if (schedule.ID === 12) {
                container.io.emit('schedule')
            }
        }
        decoded = true;

        return decoded
    }


    return {
        process: process
    }
}
