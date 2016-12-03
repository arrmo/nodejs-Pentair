module.exports = function(container) {

    var logger = container.logger
    var ISYConfig = container.settings.ISYConfig
    var ISYTimer = container.nanoTimer

    if (container.logModuleLoading)
        logger.info('Loading: helpers.js')


    if (container.logModuleLoading)
        logger.info('Loaded: helpers.js')

        function formatTime(hour, min){
          hour = parseInt(hour)
          min = parseInt(min)
          var timeStr = ''
          var ampm = ''
          if (hour >= 12) {
              ampm += " PM"
          } else {
              ampm += " AM"
          }
          if (hour >= 13)
              hour = hour - 12
          else if (hour === 0) {
              hour += 12
          }
          if (min < 10)
              min = '0' + min.toString();

          timeStr += hour + ':' + min + ampm

          return timeStr
        }

        //Credit to this function http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript  Changed it to be enumerable:false for SerialPort compatibility.
        Object.defineProperty(Object.prototype, "equals", {
            enumerable: false,
            writable: true,
            value: function(object2) {
                //For the first loop, we only check for types
                for (propName in this) {
                    //Check for inherited methods and properties - like .equals itself
                    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
                    //Return false if the return value is different
                    if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                        return false;
                    }
                    //Check instance type
                    else if (typeof this[propName] != typeof object2[propName]) {
                        //Different types => not equal
                        return false;
                    }
                }
                //Now a deeper check using other objects property names
                for (propName in object2) {
                    //We must check instances anyway, there may be a property that only exists in object2
                    //I wonder, if remembering the checked values from the first loop would be faster or not
                    if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                        return false;
                    } else if (typeof this[propName] != typeof object2[propName]) {
                        return false;
                    }
                    //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
                    if (!this.hasOwnProperty(propName))
                        continue;
                    //Now the detail check and recursion

                    //This returns the script back to the array comparing
                    /**REQUIRES Array.equals**/
                    if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                        // recurse into the nested arrays
                        if (!this[propName].equals(object2[propName]))
                            return false;
                    } else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                        // recurse into another objects
                        //console.log("Recursing to compare ", this[propName],"with",object2[propName], " both named \""+propName+"\"");
                        if (!this[propName].equals(object2[propName]))
                            return false;
                    }
                    //Normal value comparison for strings and numbers
                    else if (this[propName] != object2[propName]) {
                        return false;
                    }
                }
                //If everything passed, let's say TRUE
                return true;
            }
        })


        //This function adapted from the prototype.equals method above
        Object.defineProperty(Object.prototype, "whatsDifferent", {
            enumerable: false,
            writable: true,
            value: function(object2) {
                //For the first loop, we only check for types
                var diffString = '';
                for (propName in this) {
                    //Check for inherited methods and properties - like .equals itself
                    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
                    //Return false if the return value is different
                    if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                        diffString += ' ' + this.hasOwnProperty(propName);
                        //return this.hasOwnProperty(propName);
                    }
                    //Check instance type
                    else if (typeof this[propName] != typeof object2[propName]) {
                        //Different types => not equal
                        diffString += ' Object type '
                            //return 'Object type';
                    }
                }
                //Now a deeper check using other objects property names
                for (propName in object2) {
                    //We must check instances anyway, there may be a property that only exists in object2
                    //I wonder, if remembering the checked values from the first loop would be faster or not
                    if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                        diffString += ' ' + this.hasOwnProperty(propName);
                        //return this.hasOwnProperty(propName);
                    } else if (typeof this[propName] != typeof object2[propName]) {
                        diffString += ' Object type '
                            //return 'Object type';
                    }
                    //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
                    if (!this.hasOwnProperty(propName))
                        continue;
                    //Now the detail check and recursion

                    //This returns the script back to the array comparing
                    /**REQUIRES Array.equals**/
                    if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                        // recurse into the nested arrays
                        if (!this[propName].equals(object2[propName])) {
                            //diffString += ' (arr) ', propName, ': ', this[propName], ' --> ', object2[propName];
                            diffString += ' ', propName, ': ', this[propName], ' --> ', object2[propName];
                        }
                        //return (propName + ': ' + this[propName]);
                    } else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                        // recurse into another objects
                        console.log("Recursing to compare ", this[propName], "with", object2[propName], " both named \"" + propName + "\"");
                        if (!this[propName].equals(object2[propName])) {
                            diffString += ' (obj) ', this[propName], '  propname:' + propName + '///'
                                //return (propName + ': ' + this[propName]);
                            logger.debug("Recursing to compare ", this[propName], "with", object2[propName], " both named \"" + propName + "\"");
                            console.log(' ', Object.keys(this))
                            console.log(propName + ': ' + this[propName])
                        }
                    }
                    //Normal value comparison for strings and numbers
                    else if (this[propName] != object2[propName]) {
                        diffString += ' ' + propName + ': ' + this[propName] + ' --> ' + object2[propName]
                            //return (propName + ': ' + this[propName]);
                    }
                }
                if (diffString == '') {
                    //console.log('What\'s different (from function): Nothing')
                    return 'Nothing!';
                } else {
                    //console.log('What\'s different (from function): %s', diffString)
                    return diffString;
                }
            }
        });
        //Credit for this function belongs to: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
        function clone(obj) {
            if (null == obj || "object" != typeof obj)
                return obj;
            var copy = obj.constructor();
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr))
                    copy[attr] = obj[attr];
            }
            return copy;
        }


    function allEquipmentInOneJSON() {
      var pool = {}
      pool.circuits = container.circuit.getCurrentCircuits()
      pool.heat = container.heat.getCurrentHeat()
      pool.pumps = container.pump.getCurrentPumpStatus()
      pool.schedule = container.schedule.getCurrentSchedule()
      pool.temperatures = container.temperatures.getTemperatures()
      pool.time = container.time.getTime()
      pool.UOM = container.UOM.getUOM()
      pool.valves = container.valves.getValves()
      return pool
    }

    return {
        formatTime: formatTime,
        allEquipmentInOneJSON: allEquipmentInOneJSON
    }

}
