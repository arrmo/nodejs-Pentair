module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: Schedule.js')

    //var bufferArr = []; //variable to process buffer.  interimBufferArr will be copied here when ready to process
    //var interimBufferArr = []; //variable to hold all serialport.open data; incomind data is appended to this with each read
    var currentSchedule = ["blank"]; //schedules
    var initialSchedulesDiscovered = 0
    var logger = container.logger

    function getCurrentSchedule() {
        return currentSchedule
    }

    function addScheduleDetails(id, circuit, days, time1, time2, time3, time4, counter) {

        var schedule = {}

        schedule.ID = id;
        schedule.CIRCUIT = circuit === 0 ? container.constants.strCircuitName[circuit] : container.circuit.getCircuitName(circuit); //Correct???
        schedule.CIRCUITNUM = circuit

        if (time1 == 25) //25 = Egg Timer
        {
            schedule.MODE = 'Egg Timer'
            schedule.DURATION = time3 + ':' + time4;
        } else {
            schedule.MODE = 'Schedule'
            schedule.DURATION = 'n/a'
            schedule.START_TIME = time1 + ':' + time2;
            schedule.END_TIME = time3 + ':' + time4;
            schedule.DAYS = '';
            // if (data[12] == 255) { //not sure this is needed as it is really x1111111 with the x=1 being unknown.  See following note.
            //    schedule[id].DAYS += 'EVERY DAY'
            //} else { //0 = none;  My Pentiar Intellitouch always adds a leading 1xxxxxxx to the schedule[id].  Don't know the significance of that.
            if ((days === 0))
                schedule.DAYS += 'None';
            if ((days & 1) === 1)
                schedule.DAYS += 'Sunday '; //1
            if ((days & 2) >> 1 === 1)
                schedule.DAYS += 'Monday '; // 2
            if ((days & 4) >> 2 === 1)
                schedule.DAYS += 'Tuesday '; // 4
            if ((days & 8) >> 3 === 1)
                schedule.DAYS += 'Wednesday '; //8
            if ((days & 16) >> 4 === 1)
                schedule.DAYS += 'Thursday '; //16
            if ((days & 32) >> 5 === 1)
                schedule.DAYS += 'Friday '; //32
            if ((days & 64) >> 6 === 1)
                schedule.DAYS += 'Saturday '; //64
            //}
        }

        if (currentSchedule[id] === undefined) {
            currentSchedule[id] = schedule
        }
        if (id === 12 && initialSchedulesDiscovered === 0) {
            broadcastInitialSchedules()
            initialSchedulesDiscovered = 1
        } else
        if (initialSchedulesDiscovered === 0 ) {//TODO: AND A CHANGE.  Either circuit by circuit or all of them?
            broadcastScheduleChange(id, schedule, counter)
            currentSchedule[id] = schedule
        } else if ('no change') {  //TODO: and finally, no change
            if (container.settings.logConfigMessages)
                logger.debug('Msg# %s:  Schedule %s has not changed.', counter, id)
        }
        if (id === 12) {
            container.io.emit('schedule')
        }
    }


    function broadcastInitialSchedules() {
        var scheduleStr = 'Msg# ' + counter + '  Schedules discovered:'
        for (var i = 1; i <= 12; i++) {
            scheduleStr += '\nID:' + currentSchedule[i].ID + '  CIRCUIT:(' + currentSchedule[i].CIRCUITNUM + ')' + currentSchedule[i].CIRCUIT
            if (currentSchedule[i].CIRCUIT !== 'NOT USED') {
                if (currentSchedule[i].MODE === 'Egg Timer') {
                    scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' DURATION:' + currentSchedule[i].DURATION
                } else {
                    scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' START_TIME:' + currentSchedule[i].START_TIME + '  END_TIME:' + currentSchedule[i].END_TIME + '  DAYS:' + currentSchedule[i].DAYS
                }
            }
        }
        logger.info('%s\n\n', scheduleStr)
    }

    function broadcastScheduleChange(id, schedule, counter) {
        //Explicitly writing out the old/new packets because if we call .whatsDifferent and the schedule switches from an egg timer to schedule (or vice versa) it will throw an error)

        var scheduleChgStr = 'Msg# ' + counter + '  Schedule ' + 'ID:' + id + ' changed from:\n'
            //FROM string
        if (currentSchedule[id].MODE === 'Egg Timer') {

            scheduleChgStr += 'ID:' + currentSchedule[id].ID + ' CIRCUIT:(' + id + ')' + currentSchedule[id].CIRCUIT + ' MODE:' + currentSchedule[id].MODE + ' DURATION:' + currentSchedule[id].DURATION
        } else {

            scheduleChgStr += 'Schedule: ID:' + currentSchedule[id].ID + ' CIRCUIT:(' + id + ')' + currentSchedule[id].CIRCUIT + ' MODE:' + currentSchedule[id].MODE + ' START_TIME:' + currentSchedule[id].START_TIME + ' END_TIME:' + currentSchedule[id].END_TIME + ' DAYS:' + currentSchedule[id].DAYS
        }


        scheduleChgStr += '\n'
            //TO string
        if (schedule.MODE === 'Egg Timer') {

            scheduleChgStr += ' CIRCUIT:(' + id + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' DURATION:' + schedule.DURATION
        } else {

            scheduleChgStr += ' CIRCUIT:(' + id + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' START_TIME:' + schedule.START_TIME + ' END_TIME:' + schedule.END_TIME + ' DAYS:' + schedule.DAYS
        }
        logger.verbose(scheduleChgStr)


    }

    function numberOfSchedulesRegistered() {
        return currentSchedule.length
    }

    if (container.logModuleLoading)
        container.logger.info('Loaded: Schedule.js')

    return {
        getCurrentSchedule: getCurrentSchedule,
        addScheduleDetails: addScheduleDetails,
        numberOfSchedulesRegistered: numberOfSchedulesRegistered,
        currentSchedule
    }


}
