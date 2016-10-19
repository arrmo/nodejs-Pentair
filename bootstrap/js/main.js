String.prototype.capitalizeFirstLetter = function() {
	return this.charAt(0).toUpperCase() + this.toLowerCase().slice(1);
}

String.prototype.toTitleCase = function() {
	return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function dayOfWeekAsInteger(strDay) {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(strDay.capitalizeFirstLetter(strDay));
}

function dayOfWeekAsString(indDay) {
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][indDay];
}

function dataAssociate(strControl, varJSON) {
	for (var currProperty in varJSON) {
		if (typeof varJSON[currProperty] !== "object") {
			$('#' + strControl).data(currProperty, varJSON[currProperty]);
		} else {
			if (Array.isArray(varJSON)) {
				dataAssociate(strControl, varJSON[currProperty]);								
			} else {
				dataAssociate(currProperty, varJSON[currProperty]);				
			}
		}
	}
}

function fmtScheduleTime(strInpStr) {
	splitInpStr = strInpStr.split(":");
	if (splitInpStr[0] < 12)
		strAMPM = 'am';
	else
		strAMPM = 'pm';
	strHours = (parseInt(splitInpStr[0]) % 12).toFixed(0);
	strMins = ('0' + parseInt(splitInpStr[1])).slice(-2);
	return strHours + ':' + strMins + ' ' + strAMPM;
}

function buildDaysButtons(strDays) {
	var arrDays = Array(7).fill(false);
	splitDays = strDays.split(" ");
	for (var currDay of splitDays) {
		if (currDay !== "")
			arrDays[dayOfWeekAsInteger(currDay)] = true;
	}
	strHTML = '';
	for (var iterDay in arrDays) {
		strCurrDay = dayOfWeekAsString(iterDay);
		if (arrDays[iterDay] === true) {
			strHTML += '<button class="btn btn-success btn-xs" id="' + strCurrDay + '">';
		} else {
			strHTML += '<button class="btn btn-default btn-xs" id="' + strCurrDay + '">';	
		}
		strHTML += strCurrDay + '</button>';
	}
	return strHTML;
}

$(function () {
	$.getJSON('configPanel.json', function(json) {
		// enable / disable panels as configured (in json file)
		for (var currPanel in json.panelState) {
			if (json.panelState[currPanel]["state"] === "visible")		
				$('#' + currPanel).show();
			else
				$('#' + currPanel).hide();				
		}
	});

	$.getJSON('configData.json', function(json) {
		// configData loaded -> call routine to recursively parse the file, setting associated data for DOM elements 
		dataAssociate("base", json);
	});
	
    // Initialize variables
	var $hideAUX = true;
    var socket = io();

    $('body').on('click', 'button', function () {
        if (!($(this).attr('id').includes('HeatMode'))) {
            setEquipmentStatus($(this).data($(this).attr('id')));
        }
    })

    //listen for temp adjustments.
    $('#circuit').on('click', 'button', function () {
        setHeatSetPoint($(this).data('equip'), $(this).data('adjust'));
    })

    $('#spaHeatMode').on('click', 'button', function () {
		var currButtonPressed = $(this).attr('id');
		if ((currButtonPressed === 'spaHeatModeUp') || (currButtonPressed === 'spaHeatModeDown')) {
			var spaHeatModeCurr = $('#spaHeatMode').data('spaHeatMode');
			var newSpaHeatMode = (spaHeatModeCurr + 4 + $(this).data('heatModeDirn')) % 4;
			setHeatMode($('#spaHeatMode').data('equip'), newSpaHeatMode)			
		}
    })

    $('#poolHeatMode').on('click', 'button', function () {
		var currButtonPressed = $(this).attr('id');
		if ((currButtonPressed === 'poolHeatModeUp') || (currButtonPressed === 'poolHeatModeDown')) {
			var poolHeatModeCurr = $('#poolHeatMode').data('poolHeatMode');
			var newPoolHeatMode = (poolHeatModeCurr + 4 + $(this).data('heatModeDirn')) % 4;
			setHeatMode($('#poolHeatMode').data('equip'), newPoolHeatMode)			
		}
    })

    function showPump(data) {
        $('#pump1').html(data[1].name + '<br>Watts: ' + data[1].watts + '<br>RPM: ' + data[1].rpm + '<br>Error: ' + data[1].err + '<br>Mode: ' + data[1].mode + '<br>Drive state: ' + data[1].drivestate + '<br>Run Mode: ' + data[1].run)
        $('#pump2').html(data[1].name + '<br>Watts: ' + data[2].watts + '<br>RPM: ' + data[2].rpm + '<br>Error: ' + data[2].err + '<br>Mode: ' + data[2].mode + '<br>Drive state: ' + data[2].drivestate + '<br>Run Mode: ' + data[2].run)
    }

    function showConfig(data) {
        if (data != null) {
            $('#currTime').html(data.time);
            $('#airTemp').html(data.airTemp);
            $('#solarTemp').html(data.solarTemp);
            $('#runMode').html(data.runmode);
            $('#stateHeater').html(data.HEATER_ACTIVE);
            $('#poolCurrentTemp').html(data.poolTemp);
            $('#spaCurrentTemp').html(data.spaTemp);
        }
    }

    function showSchedule(data) {
		for (var currSchedule of data) {
			if (currSchedule == null) {
				//console.log("Schedule: Dataset empty.")
			} else {
				if (currSchedule.MODE === "Schedule") {
					// Schedule Event
					if (typeof currSchedule.CIRCUIT !== 'undefined') {
						schName = 'schItem' + currSchedule.ID;
						schHTML = '<tr name="' + schName + '" id="' + schName +'"><td>' + currSchedule.ID + '</td>' + '<td>' + currSchedule.CIRCUIT.capitalizeFirstLetter() + '</td>' +
							'<td>' + fmtScheduleTime(currSchedule.START_TIME) + '</td>' + '<td>' + fmtScheduleTime(currSchedule.END_TIME) + '</td>' + '<td>' + buildDaysButtons(currSchedule.DAYS) + '</td></tr>'
						if (document.getElementById(schName)) {
							$(schName).html(schHTML);
						} else {
							$('#schedules tr:last').after(schHTML);
						}
					}
				} else {
					// EggTimer
				}
			}
        }
    }

    function showHeat(data) {
        $('#poolHeatSetPoint').html(data.poolSetPoint);
        $('#poolHeatMode').data('poolHeatMode', data.poolHeatMode)
		$('#poolHeatModeStr').html(data.poolHeatModeStr);
        $('#spaHeatSetPoint').html(data.spaSetPoint)
        $('#spaHeatMode').data('spaHeatMode', data.spaHeatMode)
		$('#spaHeatModeStr').html(data.spaHeatModeStr);
    }

    function showCircuit(data) {
		for (var currCircuit of data) {
            if (currCircuit.hasOwnProperty('name')) {
                if (currCircuit.name != "NOT USED") {
					if (document.getElementById(currCircuit.name)) {
						$('#' + currCircuit.name).html(currCircuit.status.capitalizeFirstLetter());
					} else if (document.getElementById(currCircuit.numberStr)) {
						$('#' + currCircuit.numberStr).html(currCircuit.status.capitalizeFirstLetter());
					} else if (($hideAUX === false) || (currCircuit.name.indexOf("AUX") === -1)) {
							$('#features tr:last').after('<tr><td>' + currCircuit.name.toLowerCase().toTitleCase() + '</td><td><button class="btn btn-primary btn-xs" name="' + currCircuit.numberStr + '" id="' + currCircuit.numberStr + '">---</button></td></tr>');
							$('#' + currCircuit.numberStr).html(currCircuit.status.capitalizeFirstLetter());
							$('#' + currCircuit.numberStr).data(currCircuit.numberStr, currCircuit.number)															
					}
                }
            }
        }
    }

    // Socket events
    function setHeatSetPoint(equip, change) {
        socket.emit('setHeatSetPoint', equip, change)
    }

    function setHeatMode(equip, change) {
        socket.emit('setHeatMode', equip, change)
    }

    function setEquipmentStatus(equipment) {
        socket.emit('toggleCircuit', equipment)
    };

    socket.on('circuit', function (data) {
        showCircuit(data);
    });

    socket.on('config', function (data) {
        showConfig(data);
    });

    socket.on('pump', function (data) {
        showPump(data);
    })

    socket.on('heat', function (data) {
        showHeat(data);
    })

    socket.on('schedule', function (data) {
        showSchedule(data);
    })
});