# Tox
Toxicity and profanity filter for Discord. This bot makes use of the [Perspective API](https://www.perspectiveapi.com/).
Add exemptions to specific roles and channels and customise percentages per server to log, warn or delete messages.

This bot was made in 3 hours and should be considered unstable for production use. As the days go past I will attempt to improve it.

# Invite Link
If you'd like to use the bot how it is, without customising it feel free to [click here to invite it to your server](https://discordapp.com/oauth2/authorize?client_id=693392652456034384&scope=bot&permissions=388096).

It requires several permissions, the biggest being managing messages. You are free to remove any that you think are too dangerous. 
Note that the bot will not be able to function entirely if you do remove them.

# Installation
- Install mongodb server community edition
- Clone repo
- Copy `example.env` to `.env` and supply a Perspective API key, along with Discord Bot Token
- Install node modules - `npm install`
- Run typescript compiler - `tsc`
- Start with node - `node ./dist/index.js`

# Usage
When the bot joins a server you'll need to set the log channel before anything can happen.
All commands are case insensitive. Arguments to them are not.

All commands excluding !SetToxChannel **must** be executed from the log channel.

---

# Command Reference

### !SetToxChannel
#### Description
Sets the logging channel (and command channel) to use.
Only an ADMINISTRATOR can execute this command. It may be executed from any channel.
Use by mentioning a channel.
#### Arguments
- Channel mention
#### Example
User> !settoxchannel \#event_log

Bot> Set the log channel to 123456789

---

### !ExemptChannels
#### Description
Get a list of exempt channels that the bot will not inspect.
#### Arguments
- None
#### Example
User> !exemptchannels

Bot> Exempt Channels: 
```
test1 - ID: 6934300518562
test2 - ID: 6934300518563
```

---

### !AddExemptChannels
#### Description
Add a list of exempt channels by mentioning channels.
#### Arguments
- Channel mentions.
#### Example
User> !addexemptchannels #test1 #test2 #test3

Bot> Successfully added 3 channel(s) to be exempted.

---

### !RemoveExemptChannels
#### Description
Remove a list of exempt channels by mentioning channels.
#### Arguments
- Channel mentions.
#### Example
User> !removeexemptchannels #test1 #test2 #test3

Bot> Successfully removed 3 channel(s) from being exempt.

---

### !ExemptRoles
#### Description
Get a list of exempt roles. A user with an exempt role will be unfiltered.
#### Arguments
- None
#### Example
User> !exemptroles

Bot> Exempt Roles: 
```
Unfiltered - ID: 6934300518562
RudePerson - ID: 6934300518563
```

---

### !AddExemptRoles
#### Description
Add a list of exempt roles by mentioning roles.
#### Arguments
- Role mentions.
#### Example
User> !addexemptroles @test @test2

Bot> Successfully added 3 roles(s) to be exempted.

---

### !RemoveExemptRoles
#### Description
Remove a list of exempt roles by mentioning roles.
#### Arguments
- Role mentions.
#### Example
User> !removeexemptroles @test @test2

Bot> Successfully removed 3 roles(s) from being exempt.

---

### !ConfigSummary
#### Description
Show a summary of the config for the current server.
#### Arguments
- None
#### Example
User> !configsummary

Bot> Server Config Summary: 
```
Warn in Channel Percentage: 85%
Delete Message Percentage: 90%
Log Percentage: 75%

Delete Message on Detect: false
DM User on Detect: false
Profanity Check: true
Toxicity Check: true
Exempt: 3 channel(s), 1 role(s)
```

---


### !SetLogPercentage, !SetWarnPercentage, !SetDeletePercentage
#### Description
Set the percentage for an action:
- Log - Logs a message to the tox log channel
- Warn - Alerts the user with a message in the message the channel was sent in
- Delete - The percentage at which a message will be deleted if delete message is on

Note that the bot will not warn if the delete percentage is reached, it will still log if the log percentage has been reached.
#### Arguments
- Percentage, 0 to 100, decimals accepted.
#### Example
User> !setlogpercentage 85

Bot> Successfully set the log percentage to 85%

---

### !SetToxicityCheck, !SetProfanityCheck
#### Description
Set whether the toxicity or profanity check will occur.
#### Arguments
- true or yes will turn it on, anything else will disable the check.
#### Example
User> !setprofanitycheck no thanks

Bot> Successfully set profanity check to false

---

### !SetDeleteMessage
#### Description
Whether or not to delete the message if it exceeds the delete percentage.
Deleting will log a message to the tox channel.
#### Arguments
- true or yes will turn it on, anything else will disable the check.
#### Example
User> !setdeletemessage true

Bot> Successfully set delete message to true

---

### !SetDmUser
#### Description
Whether or not to DM the user when the message has been deleted.
Requires delete message to be triggered in order to send a DM.
#### Arguments
- true or yes will turn it on, anything else will disable the check.
#### Example
User> !setdmuser no

Bot> Successfully set DM user to false
