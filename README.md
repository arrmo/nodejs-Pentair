# nodejs-Pentiar - Version 2.0 ALPHA 1

[![Join the chat at https://gitter.im/pentair_pool/Lobby](https://badges.gitter.im/pentair_pool/Lobby.svg)](https://gitter.im/pentair_pool/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## What is nodejs-Pentiar

nodejs-Pentair is an application to communicate and control your Pentair compatible pool equipment.

 Want to include a low cost controller for your pool?
 Want a web interface for your system?
 Want to turn your pumps on remotely?
 Want to have your home automation system talk to your pool?

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


## Config.JSON

<a name="module_nodejs-Pentair--config"></a>
See below for descriptions

```
{
    "Equipment": {
        "intellicom": 0,   
        "intellitouch": 1,
        "pumpOnly": 0,
        "numberOfPumps": 2,
        "chlorinator": 1,
        "ISYController": 0,
        "appAddress": 33

    },
    "Misc": {
          // "/bootstrap" for the nice UI, "/public" for a basic UI
        "expressDir": "/bootstrap",
        "expressPort": 3000
    },
    "Network": {
          //netConnect enables remote debugging.  See other section
        "netConnect": 0,
        "netHost": "raspberrypi",
        "netPort": 9801
    },
    "Log": {
        "logType": "info",
        "logPumpMessages": 0,
        "logDuplicateMessages": 0,
        "logConsoleNotDecoded": 0,
        "logConfigMessages": 0,
        "logMessageDecoding": 0,
        "logChlorinator": 0,
        "logPacketWrites": 0,
        "logPumpTimers": 0
    },
    "ISY": {
        "username": "blank",
        "password": "blank",
        "ipaddr": "127.0.0.1",
        "port":12345,
        "Variables": {
            "currentPumpStatus[1].watts": 25,
            "currentPumpStatus[1].rpm": 24,
            "currentPumpStatus[1].currentprogram": 13,
            "currentPumpStatus[1].program1rpm": 10,
            "currentPumpStatus[1].program2rpm": 11,
            "currentPumpStatus[1].program3rpm": 12,
            "currentPumpStatus[1].program4rpm": 13,
            "currentPumpStatus[1].power": 14,
            "currentPumpStatus[1].timer": 15,
            "currentChlorinatorStatus.saltPPM": 16
        }
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

#### ISY Controller
1 (true), 0 (false)
See below for ISY configuration.

#### appAddress
The address on the serial bus that this app will use.
The pumps don't seem to care what number you use, but Intellitouch won't respond unless this address is one of 32, 33, 34.
<<<<<<< HEAD


### Misc

#### expressDir
set to `/bootstrap` for the fancy UI or `/public` for a basic


### Network
For SOCAT functionality
        "netConnect": 1,
        "netHost": "raspberrypi",
        "netPort": "9801"


### Log

#### logType
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

=======


### Misc

#### expressDir
set to `/bootstrap` for the fancy UI or `/public` for a basic


### Network
For SOCAT functionality
        "netConnect": 1,
        "netHost": "raspberrypi",
        "netPort": "9801"


### Log

#### logType
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

#### logChlorinator
1 = log messages directly from the chlorinator, 0 = hide
(If you have Intellitouch, status will be received from the controller directly)

#### logPacketWrites
1 = log debug messages about packet writes, 0 = hide

#### logPumpTimers
1 = log debug messages about pump timers, 0 = hide

### ISY
If you use ISY, put in your system information.

#### Variables
Any number of ISY variables can go here.  
Format should be "currentPumpStatus[pump number].xyz": port #
xyz is one of: number, time, run, mode, drivestate, watts, rpm, ppc, err, timer, duration, currentprogram, program1rpm, program2rpm, program3rpm, program4rpm, remotecontrol, power

<a name="module_nodejs-Pentair--RS485"></a>

***

## RS485 Adapter

1. This code **REQUIRES** a RS485 serial module.  There are plenty of sites out there that describe the RS485 and differences from RS232 so I won't go into detail here.  
The inexpensive [JBTek](https://www.amazon.com/gp/product/B00NKAJGZM/ref=oh_aui_search_detailpage?ie=UTF8&psc=1) adapter works great.

2.  Connect the DATA+ and DATA-.

3.  To see if you are getting the proper communications from the bus, before you even try to run this program, run from your *nix command line

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



## Sample Output

Set the <code>["logType": "info"](#module_nodejs-Pentair--config)</code> variable to your liking.


The RS-485 bus is VERY active!  It sends a lot of broadcasts, and instructions/acknowledgements.  Many commands are known, but feel free to help debug more if you are up for the challenge!  See the wiki for what we know.  Below are a sample of the message

Request for a status change:
```
22:14:20.171 INFO Msg# 739   Wireless asking Main to change pool heat mode to Solar Only (@ 88 degrees) & spa heat mode to Solar Only (at 100 degrees): [16,34,136,4,88,100,15,0,2,56]

```

When the app starts, it will show the circuits that it discovers.  For my pool, the circuits are:
```
22:07:59.241 INFO Msg# 51  Initial circuits status discovered:
SPA : off
JETS : off
AIR BLOWER : off
CLEANER : off
WtrFall 1.5 : off
POOL : on
SPA LIGHT : off
POOL LIGHT : off
PATH LIGHTS : off
SPILLWAY : off
WtrFall 1 : off
WtrFall 2 : off
WtrFall 3 : off
Pool Low2 : on
NOT USED : off
NOT USED : off
NOT USED : off
AUX EXTRA : off
```

To dispaly the messages below, change the logging level to VERBOSE.
```
Msg# 25   What's Different?:  uom: ° Celsius --> ° Farenheit
                          S       L                                                           W               A   S
                          O       E           M   M   M                                       T               I   O
                      D   U       N   H       O   O   O                   U                   R   T           R   L                                       C   C
                      E   R       G   O   M   D   D   D                   O                   T   M           T   T                                       H   H
                      S   C       T   U   I   E   E   E                   M                   M   P           M   M                                       K   K
                      T   E       H   R   N   1   2   3                                       P   2           P   P                                       H   L
Orig:                15, 16,  2, 29,  8, 57,  0, 64,  0,  0,  0,  0,  0,  4,  3,  0, 64,  4, 26, 26, 32,  0, 18, 18,  0,  0,  3,  0,  0,170,223,  0, 13,  3,202
 New:                15, 16,  2, 29,  8, 57,  0, 64,  0,  0,  0,  0,  0,  0,  3,  0, 64,  4, 26, 26, 32,  0, 18, 18,  0,  0,  3,  0,  0,170,186,  0, 13,  3,161
Diff:                                                                     *                                                                   *            
```

An example of pump communication.  To show these, change logPumpMessages from 0 to 1.

```
--> PUMP  Pump1
 Pump Status:  {"pump":"Pump1","power":1,"watts":170,"rpm":1250}
 Full Payload:  [16,96,7,15,10,0,0,0,170,4,226,0,0,0,0,0,1,22,14,2,234]
<-- PUMP  Pump1
```


An example of an unknown payload:  
```
Unknown chatter:  [97,16,4,1,255,2,26]
```

=======

<a name="module_nodejs-Pentair--socat"></a>

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


# Known Issues
1.  Still many messages to debug
2.  Still many messages to debug
3.  Still many messages to debug


# Protocol
If you read through the below links, you'll quickly learn that the packets can vary their meaning based upon who they are sending the message to, and what they want to say.  It appears the same message can come in 35, 38 or 32 bytes, but of course there will be some differences there.


# Credit

1.  [Jason Young](http://www.sdyoung.com/home/decoding-the-pentair-easytouch-rs-485-protocol) (Read both posts, they are a great baseline for knowledge)
2.  [Michael (lastname unknown)](http://cocoontech.com/forums/topic/13548-intelliflow-pump-rs485-protocol/?p=159671) - Registration required.  Jason Young used this material for his understanding in the protocol as well.  There is a very detailed .txt file with great information ~~that I won't post unless I get permission~~. Looks like it was publicly posted to [Pastebin](http://pastebin.com/uiAmvNjG).
3.  [Michael Usner](https://github.com/michaelusner/Home-Device-Controller) for taking the work of both of the above and turning it into Javascript code.  
4.  [rflemming](https://github.com/rflemming) for being the first to contribute some changes to the code.
5.  Awesome help from @arrmo and @blueman2 on Gitter
