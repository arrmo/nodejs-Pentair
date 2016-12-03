# nodejs-Pentiar - Version 2.0

[![Join the chat at https://gitter.im/pentair_pool/Lobby](https://badges.gitter.im/pentair_pool/Lobby.svg)](https://gitter.im/pentair_pool/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## What is nodejs-Pentiar

nodejs-Pentair is an application to communicate and control your Pentair compatible pool equipment.

 Want to include a low cost controller for your pool?
 Want a web interface for your system?
 Want to turn your pumps on remotely?
 Want to have your home automation system talk to your pool?
 Want to control your pumps or chlorinator without a pool controller?

 Controllers:  Intellitouch, EasyTouch, Intermatic, SunTouch, IntellicomII
 Pumps: Intelliflow, older models
 Chlorinator: Intellichlor, Aqua-Rite and OEM brands
 Home Automation:  ISY.  (Soon to include Siri, Echo, more?)

<img src="https://raw.githubusercontent.com/tagyoureit/tagyoureit.github.io/master/images/bootstrap.png?raw=true" height="300">

***

## Installation Instructions

**This code requires a physical [RS485](#module_nodejs-Pentair--RS485) adapter to work.**

```
npm install nodejs-Pentair
```

If you don't know anything about NodeJS, these directions might be helpful.
1. Install Nodejs. (https://nodejs.org/en/download/)
1. Update NPM (https://docs.npmjs.com/getting-started/installing-node).
1. Download the latest [code release](https://github.com/tagyoureit/nodejs-Pentair/releases)
1. Unzip into nodejs-Pentair.
1. Run 'npm install' in the new folder (where package.json exists).  This will automatically install all the dependencies (serial-port, express, sockets.io, etc).
1. Run the app by calling 'node index.js' (again, in the root directory). It should now run properly.

***

## Support

For support you can open a [github issue](https://github.com/tagyoureit/nodejs-Pentair/issues/new),
for discussions, designs, and clarifications, we recommend you join our [Gitter Chat room](https://gitter.im/pentair_pool/Lobby).

***

## Web Interfaces

  - A slick [Bootstrap](http://getbootstrap.com/) interface by [@arrmo](https://github.com/arrmo). Set variable: <code>["expressDir": "/bootstrap"](#module_nodejs-Pentair--config)</code>  
  - A boring, basic, functional interface. Set variable:  <code>["expressDir": "/public"](#module_nodejs-Pentair--config)</code>
  To choose, set the `expressDir` variable in the 'config.json'.  Load both interfaces from `http://localhost:3000/index.html`

## Useful URL's included with the boring, basic, functional interface

  -  Control standalone pumps: http://_your_machine_name_:3000/pump.html
  -  Listen for specific messages: `http://_your_machine_name_:3000/debug.html`

#### Technical notes:

 The web UI will dynamically load as the information is received from the app.  Yes, Socket.io, we love you!  Full loading may take 20-30 seconds depending on your equipment setup.

***

##  REST Interface & Socket.IO


 You can also call REST URI's like:  
 * Get circuit status: /circuit/# to get the status of circuit '#'
 * Toggle circuit status: /circuit/#/toggle to get the toggle circuit '#'
 * Get system status: /status
 * Get schedules: /schedule
 * Get pump status: /pump
 * Get all equipment as one JSON: /all
 * Set spa heat setpoint: /spaheat/setpoint/#
 * Set spa heat mode: /spaheat/mode/#  (0=off, 1=heater, 2=solar pref, 3=solar only)
 * Set pool heat setpoint: /poolheat/setpoint/#
 * Set pool heat mode: /poolheat/mode/# (0=off, 1=heater, 2=solar pref, 3=solar only)
 * Run pumps in stand-alone mode

 ### Socket.IO
 You can use Sockets.IO  (see the "basic UI" example).  Valid sockets:

| Direction | Socket | Description |
| --- | --- | --- |
| To app | <code>toggleCircuit(equipment)</code> | toggles the variable `equipment` (as a circuit number)  |
| To app | <code>search(mode, src, dest, action)</code> | Searches for specific packets that match all four bytes and outputs to the socket <code>searchResults</code>
| To app | <code>sendPacket(packet)</code> | Send a `packet` as a string of values (xx,yy,zz,etc) to the bus in .  Pump and Controller packets should start with [SRC, DEST...].  Chlorinator packets should start with [16,2...]
| To app | <code>spasetpoint(spasetpoint)</code> | Change the `spa to setpoint` (degrees)
| To app | <code>spaheatmode(spaheatmode)</code> | Change the `spa heat mode` (integer 0=off, 1=heater, 2=solar pref, 3=solar only)
| To app | <code>poolsetpoint(poolsetpoint)</code> | Change the `pool to setpoint` (degrees)
| To app | <code>poolheatmode(poolheatmode)</code> | Change the `pool heat mode` (integer 0=off, 1=heater, 2=solar pref, 3=solar only)
| To app | <code>pumpCommand(equip, program, value, duration)</code> | Save `pump` (96=pump 1, 97=pump 2) to  `program
| To client | <code>searchResults</code> | outputs packets that match the <code>search</code> socket
| To client | <code>circuit</code> | outputs an object of circuits and their status
| To client | <code>config</code> | outputs an object with the pool controller status
| To client | <code>pump</code> | outputs an object with the pump information
| To client | <code>heat</heat> | outputs an object with the heat information
| To client | <code>schedule</heat> | outputs an object with the schedule information
| To client | <code>chlorinator</heat> | outputs an object with the chlorinator information
| To client | <code>all</heat> | outputs an object with all equipment in one JSON

***

## Config.JSON

<a name="module_nodejs-Pentair--config"></a>
See below for descriptions

```
{
    "Equipment": {
        "intellicom": 0,
        "intellitouch": 1,
        "pumpOnly": 0,
        "numberOfPumps": 0,
        "chlorinator": 1,
        "appAddress": 33
    },
    "Misc": {
        "expressDir": "/bootstrap",
        "expressPort": 3000,
        "expressTransport": "https",
        "expressAuth": 0,
        "expressAuthFile": "/users.htpasswd"
    },
    "Network": {
        "rs485Port": "/dev/ttyUSB0",
        "netConnect": 1,
        "netHost": "raspberrypi.local",
        "netPort": 9801
    },
    "Log": {
        "logLevel": "info",
        "extLogLevel": "info",
        "logPumpMessages": 0,
        "logDuplicateMessages": 0,
        "logConsoleNotDecoded": 0,
        "logConfigMessages": 0,
        "logMessageDecoding": 0,
        "logChlorinator": 0,
        "logPacketWrites": 0,
        "logPumpTimers": 0,
        "logApi": 0
    },
    "Integrations": {
        "socketISY": 0,
        "alexaskills": 0,
        "outputToConsole": 0
    },
    "socketISY": {
        "username": "blank",
        "password": "blank",
        "ipaddr": "127.0.0.1",
        "port": 12345,
        "Variables": {
            "chlorinator": {
                "saltPPM": 16
            },
            "pump": {
                "1": {
                    "watts": 25,
                    "rpm": 24,
                    "currentprogram": 13,
                    "program1rpm": 10,
                    "program2rpm": 11,
                    "program3rpm": 12,
                    "program4rpm": 13,
                    "power": 14,
                    "timer": 15
                }
            }
        }
    },
    "outputToConsole": {
      "level": "warn"
    }
}

```

***

### Equipment


#### intellicom, intellitouch, pumpOnly
For your pool equipment, choose the appropriate variable.  
Only one of these should be 1 (true).  The other two should be 0 (false).

#### numberOfPumps
1 = 1 pump, 2 = 2 pumps
(This variable is only applicable with `pumpOnly=1`)

#### Chlorinator
1 = there is a chlorinator in your equipment, 0 = no chlorinator
(This variable is only applicable with `pumpOnly=1`)

#### appAddress
The address on the serial bus that this app will use.
The pumps don't seem to care what number you use, but Intellitouch won't respond unless this address is one of 32, 33, 34.


### Misc

#### expressDir
set to `/bootstrap` for the fancy UI or `/public` for a basic

#### expressPort
set to the value that you want the web pages to be served to.  3000 = http://localhost:3000

#### expressTransport
`http` for unencrypted traffic.  `https` for encryption.  

#### expressAuth & expressAuthFile
`expressAuth = 0` for no username/password.  `expressAuth = 1` for username/password.
`expressAuthFile=/users.htpasswd`  If you have expressAuth=1 then create the file users.htpasswd in the root of the application.  Use a tool such as http://www.htaccesstools.com/htpasswd-generator/ and paste your user(s) into this file.  You will now be prompted for authentication.

### Network

#### rs485Port
If you are running the code on the same machine as your local rs485 adapter, set the address of the adapter here.

### Connect to native rs485 traffic for connectivity/debugging
For SOCAT functionality
        "netConnect": 1,
        "netHost": "raspberrypi",
        "netPort": "9801"

### Log

#### logLevel & extLogLevel
`logLevel` is the console output level
`extLogLevel` is the bootstrap UI output level in the debug panel

| --- | --- |
| Error | Only output error messages |
| Warn | Output the above, plus warnings |
| **Info** | Output the above, plus information about circuit/status changes |
| Debug | Output the above, plus debugging information |
| Silly | Output the above, plus code-level troubleshooting messages |

#### logPumpMessages
1 = show messages from the pump in the logs, 0 = hide


#### logDuplicateMessages
1 = show messages that are repeated on the bus in the logs, 0 = hide

#### logConsoleNotDecoded
1 = log any messages that have not been [documented](https://github.com/tagyoureit/nodejs-Pentair/wiki)

#### logConfigMessages
1 = log messages that relate to the configuration of the pool (from controllers), 0 = hide

#### logMessageDecoding
1 = log the internal decoding of packets

#### logChlorinator
1 = log messages directly from the chlorinator, 0 = hide
(If you have Intellitouch, status will be received from the controller directly)

#### logPacketWrites
1 = log debug messages about packet writes, 0 = hide

#### logPumpTimers
1 = log debug messages about pump timers, 0 = hide

### Integrations
See below for Integration instructions

### socketISY
This is an Integration (see below) that comes with the app.
If you use ISY, put in your system information.

#### Configuration
Set the username/password/ip address/port.

#### Variables
Any number of ISY variables can go here.  
Format should be `"equipment": {"parameter": port#}`
For pumps, where there can be multiple of the same parameter, use `"pump": {"pumpNumber": {"parameter": port#}}`
To see all of the potential equipment, call `http://localhost:3000/all`

<a name="module_nodejs-Pentair--RS485"></a>

***

## RS485 Adapter

1. This code **REQUIRES** a RS485 serial module.  There are plenty of sites out there that describe the RS485 and differences from RS232 so I won't go into detail here.  
The inexpensive [JBTek](https://www.amazon.com/gp/product/B00NKAJGZM/ref=oh_aui_search_detailpage?ie=UTF8&psc=1) adapter works great.

2.  Connect the DATA+ and DATA-.

3.  To see if you are getting the proper communications from the bus, before you even try to run this program, run from your unix command line

```
od -x < /dev/ttyUSB0
```

Of course, you'll need to change the address of your RS-485 adapter if it isn't the same as mine (here and in the code).

*   You'll know you have the wires right when the output of this command looks like (you should see multiple repetitions of ffa5ff):

```
0002240 0000 0000 0000 0000 0000 ff00 ffff ffff
0002260 **ffff 00ff a5ff** 0f0a 0210 161d 000c 0040
0002300 0000 0000 0300 4000 5004 2050 3c00 0039
0002320 0400 0000 597a 0d00 af03 00ff a5ff 100a
0002340 e722 0001 c901 ffff ffff ffff ffff ff00
```

*  This is the WRONG wiring (no ffa5ff present).
```
0001440 0000 0000 0000 0000 0000 0000 0000 6a01
0001460 e1d6 fbdf d3c5 fff3 ff7f ffff ffff f9ff
0001500 7fff 5ff7 bf5f 87ff ff8d f7ff ffff 4d0b
0001520 e5ff adf9 0000 0000 0000 0000 0100 d66a
0001540 dfe1 c5fb f3d3 7fff ffff ffff ffff fff9
```

***

## Sample Output

Set the <code>["logLevel": "info"](#module_nodejs-Pentair--config)</code> variable to your liking.


The RS-485 bus is VERY active!  It sends a lot of broadcasts, and instructions/acknowledgements.  Many commands are known, but feel free to help debug more if you are up for the challenge!  See the wiki for what we know.  Below are a sample of the message

Request for a status change:
```
08:47:51.368 INFO User request to toggle PATH LIGHTS to On

```

When the app starts, it will show the circuits that it discovers.  For my pool, the circuits are:
```
08:45:46.948 INFO
  Custom Circuit Names retrieved from configuration:
	["WtrFall 1","WtrFall 1.5","WtrFall 2","WtrFall 3","Pool Low2","USERNAME-06","USERNAME-07","USERNAME-08","USERNAME-09","USERNAME-10"]

08:45:50.989 INFO
  Circuit Array Discovered from configuration:
Circuit 1: SPA Function: Spa Status: 0 Freeze Protection: Off
Circuit 2: JETS Function: Generic Status: 0 Freeze Protection: Off
Circuit 3: AIR BLOWER Function: Generic Status: 0 Freeze Protection: Off
Circuit 4: CLEANER Function: Master Cleaner Status: 0 Freeze Protection: Off
Circuit 5: WtrFall 1.5 Function: Generic Status: 0 Freeze Protection: Off
Circuit 6: POOL Function: Pool Status: 0 Freeze Protection: Off
Circuit 7: SPA LIGHT Function: Light Status: 0 Freeze Protection: Off
Circuit 8: POOL LIGHT Function: Light Status: 0 Freeze Protection: Off
Circuit 9: PATH LIGHTS Function: Light Status: 0 Freeze Protection: Off
Circuit 10: NOT USED Function: Generic Status: 0 Freeze Protection: Off
Circuit 11: SPILLWAY Function: Spillway Status: 0 Freeze Protection: Off
Circuit 12: WtrFall 1 Function: Generic Status: 0 Freeze Protection: Off
Circuit 13: WtrFall 2 Function: Generic Status: 0 Freeze Protection: Off
Circuit 14: WtrFall 3 Function: Generic Status: 0 Freeze Protection: Off
Circuit 15: Pool Low2 Function: Generic Status: 1 Freeze Protection: Off
Circuit 16: NOT USED Function: Spillway Status: 0 Freeze Protection: Off
Circuit 17: NOT USED Function: Spillway Status: 0 Freeze Protection: Off
Circuit 18: NOT USED Function: Spillway Status: 0 Freeze Protection: Off
Circuit 19: NOT USED Function: Generic Status: 0 Freeze Protection: Off
Circuit 20: AUX EXTRA Function: Generic Status: 0 Freeze Protection: Off

08:45:54.136 INFO Msg# 69  Schedules discovered:
ID: 1  CIRCUIT:(6)POOL  MODE:Schedule START_TIME:9:25 END_TIME:15:55 DAYS:Sunday Monday Tuesday Wednesday Thursday Friday Saturday
ID: 2  CIRCUIT:(13)WtrFall 2  MODE:Schedule START_TIME:14:57 END_TIME:15:8 DAYS:Sunday Tuesday Thursday Saturday
ID: 3  CIRCUIT:(4)CLEANER  MODE:Schedule START_TIME:10:15 END_TIME:11:0 DAYS:Sunday Monday Tuesday Wednesday Thursday Friday Saturday
ID: 4  CIRCUIT:(6)POOL  MODE:Egg Timer DURATION:7:15
ID: 5  CIRCUIT:(4)CLEANER  MODE:Egg Timer DURATION:4:0
ID: 6  CIRCUIT:(15)Pool Low2  MODE:Schedule START_TIME:21:10 END_TIME:23:55 DAYS:Sunday Monday Tuesday Wednesday Thursday Friday Saturday
ID: 7  CIRCUIT:(15)Pool Low2  MODE:Schedule START_TIME:0:5 END_TIME:9:20 DAYS:Sunday Monday Tuesday Wednesday Thursday Friday Saturday
ID: 8  CIRCUIT:(7)SPA LIGHT  MODE:Egg Timer DURATION:2:0
ID: 9  CIRCUIT:(2)JETS  MODE:Egg Timer DURATION:3:45
ID:10  CIRCUIT:(9)PATH LIGHTS  MODE:Egg Timer DURATION:4:15
ID:11  CIRCUIT:(11)SPILLWAY  MODE:Schedule START_TIME:13:0 END_TIME:13:11 DAYS:Sunday Monday Tuesday Wednesday Thursday Friday Saturday
ID:12  CIRCUIT:(5)WtrFall 1.5  MODE:Schedule START_TIME:13:20 END_TIME:13:40 DAYS:Sunday Tuesday Thursday


```

To display the messages below, change the logging level to VERBOSE.
```
08:47:51.606 VERBOSE Msg# 266:

                                  S       L                                           V           H   P   S   H       A   S           H
                                  O       E           M   M   M                       A           T   OO  P   T       I   O           E
                              D   U       N   H       O   O   O                   U   L           R   L   A   R       R   L           A                           C   C
                              E   R   C   G   O   M   D   D   D                   O   V           M   T   T   _       T   T           T                           H   H
                              S   C   M   T   U   I   E   E   E                   M   E           D   M   M   O       M   M           M                           K   K
                              T   E   D   H   R   N   1   2   3                       S           E   P   P   N       P   P           D                           H   L
Orig:               165, 16, 15, 16,  2, 29,  8, 57,  0, 64,  0,  0,  0,  0,  0,  0,  3,  0, 64,  4, 61, 61, 32,  0, 49, 45,  0,  0,  4,  0,  0,137,192,  0, 13,  4,13
 New:               165, 16, 15, 16,  2, 29,  8, 57,  0, 65,  0,  0,  0,  0,  0,  0,  3,  0, 64,  4, 61, 61, 32,  0, 49, 45,  0,  0,  4,  0,  0,137,192,  0, 13,  4,14
Diff:                                                     *                                                                                                        

08:47:51.609 DEBUG No change in time.
08:47:51.624 VERBOSE Msg# 266   Circuit PATH LIGHTS change:  Status: Off --> On
```

An example of pump communication.  To show these, change logPumpMessages from 0 to 1.

```
08:50:10.805 VERBOSE Msg# 79   Main --> Pump 1: Pump power to on: [165,0,96,16,6,1,10,1,38]
```

=======

<a name="module_nodejs-Pentair--socat"></a>

***

## Integrations
You can now (pretty) easily add your own code to interface with any other home automation (or other) systems.  See https://github.com/tagyoureit/nodejs-Pentair/wiki/Integrations-in-2.0

The "outputToConsole" is a very simple module that echos out additional messages.  The ISY sample is a bit more complex and keeps track of the state of variables.

***

## Socat

Want to have a RaspberryPi Zero, or other $5 computer, sitting by your pool equipment while the main code runs elsewhere on your network?  
Or want to help get involved with the project and debug in an app like [Netbeans](https://netbeans.org/)?

@arrmo was super slick in getting this to run.

There are two options:

1. Run socat each time to enable the pipe
1. Setup a daemon to automatically start socat

### The "run it each time" method
Run these commands on the remote machine

1. `sudo apt-get install socat` to install socat
1. `/usr/bin/socat TCP-LISTEN:9801,fork,reuseaddr FILE:/dev/ttyUSB0,b9600,raw`
1. Setup the app parameters (below)

### The "run under a daemon" method
Run these commands on the remote machine

1.  `sudo apt-get install socat` to install socat
1.  `sudo apt-get install daemon` to install daemon
1.  Copy the `poolTTY` file (in /scripts directory) to your remote machine directory `/etc/init.d`
1.  Run the following command to make the daemon run the socat upon startup:
`sudo update-rc.d poolTTY defaults`
1. Setup the app parameters (below)

#### Test socat

From your local machine, you should be able to telnet to port 9801 and see incoming packets.

#### nodejs-Pentair app configuration
In the <code>["network"](#module_nodejs-Pentair--config)</code> section, set `netConnet=1`.  `netHost` is your remote machine.  `netPort` should be 9801 if you followed these instructions.

***

## Standalone mode

### Pump Standalone
To use the pumps in standalone mode, set the following in `config.json`:
`"pumpOnly":1`
`"numberOfPumps":#` #=1 or 2
`"expressDir":"/public"`
Start the app and navigate to http://localhost:3000/pump.html.  Addition of the pump control to `/bootstrap` is in progress

### Chlorinator Standalone
To use the chlorinator in standalone mode, set the following in `config.json`:
`"chlorinator":1`
(Intellitouch, Intellicom should be set to 0)
Start the app to set the chlorinator level, call http://localhost:3000/chlorinator/LEVEL.  Level should be 0-101.  0 = off, 1-100=%, 101=Super Chlorinate (or Boost).  Addition of the chlorinator to the `/bootstrap` UI is in progress.

***

# Versions
0.0.1 - This version was the first cut at the code

0.0.2 - Many, many improvements.  

* No duplicate messages!  I realized the way my code was running that I was parsing the same message multiple times.  The code now slices the buffer after each message that is parsed.  
* Logging.  The program now uses Winston to have different logs.  The Pentair bus has a LOT of messages.  All the output, debug messages, etc, are being saved to 'pentair_full_dump.log' and successful messages are being logged to 'pentair_info.log'.  I will update these names, but if you want less logging, set the transports to ```level: 'error'``` from 'level: 'silly'.  It's just silly how much it logs at this level!
* Decoding.  The code is getting pretty good at understanding the basic message types.  There are some that I know and still have to decode; some that I know mostly what they do, and some that are still mysteries!  Please help here.

0.0.3 - More bug fixes.  Now detects heat mode changes for both pool & spa.  Logging is set to very low (console), but still nearly everything will get written to the logs (see 0.0.2 notes). I've noticed that if any material change is made to the configuration (temp, heat mode, circuit names, etc) Pentair will spit out about 40 lines of configuration.  Reading this is a little challenging but I have figured out a few things.

0.0.4 - Added UOM (Celsius or Farenheit) thank you rflemming for your contributions!  Also added a 'Diff' line to the equipment output to easily see what has changed at the byte level.

0.0.5 - Added a very simple websocket resource (http://server:3000) which will display the output from the pool.  Will make it pretty, and interactive, shortly.

0.0.6 -
* Circuits, custom names, and schedules can now be read from the configuration broadcast by the pool.  However, you need to force the configuration to be re-broadcast by changing the heat set point.  This will change in future versions when successful writing to the serial bus is included.
* http://_your_machine_name_:3000 to see a basic UI (websockets with persistent updates on status)
* http://_your_machine_name_:3000/debug.html for a way to listen for specific messages
* It is clear that I will need to change around the internal structure of how the circuits and equipment information is stored so that it can be better presented in the UI and display can be dependent on circuit type (pool, spa, lights, etc) and desired changes (on/off, set temperature, set mode, etc) can know what information is needed

0.0.7 -
* Writeback enabled!  (after much frustration)
* UI for web updated
* Refactored code in many different ways
* Really messed up the logging in the course of debugging.  I need to fix this.
* Need to still update the web UI for the status of the system and also the REST api for hooks to other HA apps.
* I'm having trouble with the RS485 cable above, but purchased another one for <$5 from Amazon that is working better.


0.0.8 -
* Significantly revised the logging.  It now comes with more options, and by default, is much quieter.
* Got rid of the logging to the files.  It wasn't useful.  Winston can easily be modified to write back to the log files if your situation dictates this.
* Sockets.io compatability
* REST API

0.0.9 -
* Added REST API and Sockets.io call to change heat set point and change heat mode
* Updated UI to reflect new Socket calls (you can now change the heat mode and pool temp).  
* Updated SerialPort to 4.0.1.

0.1.0 -
* Something weird happened and my Intellitouch stopped responding to packets starting with 255,0,255,165,10,DEST,SRC...  The 10 changed to a 16.  I don't know why, but it drove me crazy for 5 days.  Now the app dynamically reads this packet.
* Much more information debugged for my friends over at CocoonTech.  
* Bug fixes galore.  More clear logging messages.  

0.1.1 -
* For those of you with stand-alone pumps you can now control them!
* Chlorinators are now understood
* Lot of rework on understanding and decoding packets and their responses in general
* Make sure you set the variables properly as multiple configurations are now supported.
* Stand alone pump mode!  New pump.html for the pump(s) only configuration
* Write packets now controlled via a timer (MUCH faster!)
* Many more changes!

1.0.0 -
 * Much of the code reworked and refactored
 * Added Bootstrap UI by @arrmo
 * Better standalone pump control (@bluemantwo was super-helpful here, too!)
 * More accurate recognition of packets
 * Super fast speed improvements
 * Outgoing packets are now sent based on a timer (previously number of incoming packets)
 * Added ISY support (@bluemantwo was super-helpful here, too!)

2.0.0 -
 * https, Authentication
 * Completely refactored code.  Integrated BottleJS (https://github.com/young-steveo/bottlejs) for dependency injection and service locator funcctions
 * Integrations to loosely couple add-ons

# Wish list
1.  Still many messages to debug
2.  Alexa, Siri integration coming soon!  
3.  Integration directly with Screenlogic (IP based).  Awesome job @ceisenach.  https://github.com/ceisenach/screenlogic_over_ip


# Protocol
If you read through the below links, you'll quickly learn that the packets can vary their meaning based upon who they are sending the message to, and what they want to say.  It appears the same message can come in 35, 38 or 32 bytes, but of course there will be some differences there.


# Credit

1.  [Jason Young](http://www.sdyoung.com/home/decoding-the-pentair-easytouch-rs-485-protocol) (Read both posts, they are a great baseline for knowledge)
2.  [Michael (lastname unknown)](http://cocoontech.com/forums/topic/13548-intelliflow-pump-rs485-protocol/?p=159671) - Registration required.  Jason Young used this material for his understanding in the protocol as well.  There is a very detailed .txt file with great information ~~that I won't post unless I get permission~~. Looks like it was publicly posted to [Pastebin](http://pastebin.com/uiAmvNjG).
3.  [Michael Usner](https://github.com/michaelusner/Home-Device-Controller) for taking the work of both of the above and turning it into Javascript code.  
4.  [rflemming](https://github.com/rflemming) for being the first to contribute some changes to the code.
5.  Awesome help from @arrmo and @blueman2 on Gitter
