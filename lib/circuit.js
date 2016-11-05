function Circuit(number, numberStr, name, circuitFunction, status, freeze) {
    this.number = number; //1
    this.numberStr = numberStr; //circuit1
    this.name = name; //Pool
    this.circuitFunction = circuitFunction; //Generic, Light, etc
    this.status = status; //On, Off
    this.freeze = freeze; //On, Off
}

Circuit.prototype.circuitArrObj = function() {
    var circuit1 = new Circuit();
    var circuit2 = new Circuit();
    var circuit3 = new Circuit();
    var circuit4 = new Circuit();
    var circuit5 = new Circuit();
    var circuit6 = new Circuit();
    var circuit7 = new Circuit();
    var circuit8 = new Circuit();
    var circuit9 = new Circuit();
    var circuit10 = new Circuit();
    var circuit11 = new Circuit();
    var circuit12 = new Circuit();
    var circuit13 = new Circuit();
    var circuit14 = new Circuit();
    var circuit15 = new Circuit();
    var circuit16 = new Circuit();
    var circuit17 = new Circuit();
    var circuit18 = new Circuit();
    var circuit19 = new Circuit();
    var circuit20 = new Circuit();
    //array of circuit objects.  Since Pentair uses 1-20, we'll just use a placeholder for the 1st [0] element in the array
    return ['blank', circuit1, circuit2, circuit3, circuit4, circuit5, circuit6, circuit7, circuit8, circuit9, circuit10, circuit11, circuit12, circuit13, circuit14, circuit15, circuit16, circuit17, circuit18, circuit19, circuit20];
}

module.exports = Circuit;
