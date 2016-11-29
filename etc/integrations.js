var Bottle = require('bottlejs');
var bottle = Bottle.pop('pentair-Bottle');
var fs = bottle.container.fs
var path = require('path')
    //var glob = require('glob')


if (bottle.container.logModuleLoading)
    console.log('Loading: integrations.js')

var configurationFile = 'config.json';
var configFile = JSON.parse(fs.readFileSync(configurationFile));


//['../integrations'].forEach(dir)

//from http://stackoverflow.com/a/28289589
// async version with basic error handling
function walk(currentDirPath, callback) {
    //console.log('dir:', __dirname)
    fs.readdir(currentDirPath, function(err, files) {
        if (err) {
            throw new Error(err);
        }
        files.forEach(function(name) {
            var filePath = path.join(currentDirPath, name);
            var stat = fs.statSync(filePath);
            if (stat.isFile()) {
                callback(filePath, name, stat);
            } else if (stat.isDirectory()) {
                walk(filePath, callback);
            }
        });
    });
}

function stripJS(name) {
    var arrayOfStrings;
    arrayOfStrings = name.split('.')
    if (arrayOfStrings.length > 2) {
        bottle.container.logger.error('Please only use integration names with no "." other than "*.js".  Error with %s', name)
        process.exit(1)
    }
    return arrayOfStrings[0]
}



walk(__dirname + '/../integrations', function(filePath, name, stat) {
    // do something with "filePath"...
    //console.log('filePath: ', filePath)
    //console.log('name: ', name)
    //console.log('strippedName: ', stripJS(name))
    //console.log('stat: ', stat)
    var shortName = stripJS(name)
    if (configFile.Integrations[shortName] === 1) {
        bottle.factory(shortName, require(filePath)) //add the integration to Bottle
        bottle.digest(["'" + shortName + "'"]) //Initialize the integration immediately
        bottle.container[shortName].init() //call the init function to enable it  (this might be unnecessary since we digest it)
    }
});



if (bottle.container.logModuleLoading)
    console.log('Loaded: integrations.js')
