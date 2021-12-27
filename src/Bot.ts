import Perspective from 'perspective-api-client';
import {
    Client,
    Message,
    TextChannel,
    Constants,
} from 'discord.js';
import logs from 'discord-logs';
import { ConfigDatabase, GuildConfig } from './ConfigDatabase';

const perspective = new Perspective({apiKey: process.env.PERSPECTIVE_API_KEY});
const client = new Client({ partials: Object.values(Constants.PartialTypes)  });
const commands = ['exemptchannels', 'settoxchannel', 'addexemptchannels', 'removeexemptchannels', 
                    'exemptroles', 'addexemptroles', 'removeexemptroles', 'configsummary',
                    'setdeletepercentage', 'setwarnpercentage', 'setlogpercentage', 'setprofanitycheck',
                    'settoxicitycheck', 'setdeletemessage', 'setdmuser', 'addblacklist', 'removeblacklist', 'blacklist',
                    'addblacklistchannels', 'removeblacklistchannels', 'blacklistchannels', 'removetox'];
logs(client);

class Bot {

    constructor() {
        this.performChecks = this.performChecks.bind(this);
        this.chunkString = this.chunkString.bind(this);
        this.safe = this.safe.bind(this);
        this.start = this.start.bind(this);
        this.handleCommands = this.handleCommands.bind(this);
        this.handleBlacklist = this.handleBlacklist.bind(this);
        this.handleProfanity = this.handleProfanity.bind(this);
    }

    private async handleProfanity(guildConfig: GuildConfig, message: Message) {
        // Check if the channel is exempt
        if (guildConfig.exemptChannels.find(id => id == message.channel.id)) {
            return;
        }
        
        // Check if the user is exempt
        if (message.member.roles.cache.filter(x => guildConfig.exemptRoles.includes(x.id)).size > 0) {
            return;
        }

        // Chunk by 2047.
        const contents = this.chunkString(message.cleanContent, 2047);

        // Get scores for each.
        const resultPromises = contents.map(text => 
            perspective.analyze({
                comment: { text },
                languages: ['en'],
                doNotStore: true,
                requestedAttributes: {TOXICITY: {}, PROFANITY: {}},
            })
        );

        Promise.all(resultPromises).then(async results => {
            let resultScores = [];

            results.forEach(result => {
                if (guildConfig.toxicityCheck) {
                    resultScores.push(result.attributeScores.TOXICITY.summaryScore.value);
                }
                if (guildConfig.profanityCheck) {
                    resultScores.push(result.attributeScores.PROFANITY.summaryScore.value);
                }
            });

            // Calculate whether this is rude based on toxicity and profanity.
            const percentage = resultScores.map(parseFloat).reduce((sum, current) => sum + current, 0) / (contents.length * 2) * 100;
            const resultText = `Processed by Perspective Moderation with a score of ${percentage}%`;

            if (percentage > parseFloat(guildConfig.logPercentage)) {
                const logChannel = <TextChannel>message.guild.channels.cache.get(guildConfig.logChannelId);
                if (!!logChannel) {
                    await logChannel.send(`[LOGGED MESSAGE] <@${message.author.id}> (${message.author.tag}) - ${resultText} \`\`\`${this.safe(message.cleanContent).substring(0, 1024)}\`\`\``);
                }
            }

            // Log % < Warn % < Delete %, check delete, then warn, ALWAYS log.
            if (percentage > parseFloat(guildConfig.deletePercentage) && guildConfig.deleteMessage) {
                try {
                    const hasAttachment = message.attachments.size > 0;
                    let attachmentUrl = '';
                    if (hasAttachment) {
                        attachmentUrl = message.attachments.first().proxyURL;
                    }

                    // Delete message with a nice reason for auditing.
                    await message.delete({ reason: resultText });

                    const logChannel = <TextChannel>message.guild.channels.cache.get(guildConfig.logChannelId);
                    if (!!logChannel) {
                        await logChannel.send(`[DELETED MESSAGE] <@${message.author.id}> (${message.author.tag}) - ${resultText} \`\`\`${this.safe(message.cleanContent).substring(0, 1024)}\`\`\` ${(hasAttachment ? ' with attachment ' + attachmentUrl : '')}`);
                        
                    }
                    // Should we DM them telling them they've been rude?
                    if (guildConfig.dmUser) {
                        const dmChannel = await message.member.createDM();
                        if (!!dmChannel) {
                            await dmChannel.send(`Your message sent in '${message.guild.name}' was removed due to excessive toxicity or profanity. Please be respecful in the future and think before you send messages.`);
                        }
                    }
                } catch (e) { 
                    console.log('Failed when processing positive message', e);
                }
            } else if (percentage > parseFloat(guildConfig.warnPercentage)) {
                await message.reply(`Please think before you send messages like that again.`);
                return;
            } 
            
        });
    }

    private async handleBlacklist(guildConfig: GuildConfig, message: Message): Promise<boolean> {

        // Check whether we are to check blacklist for the message's channel.
        if (guildConfig.blacklistChannels && !guildConfig.blacklistChannels.find(id => id == message.channel.id)) {
            return;
        }

        // Check if the channel is exempt
        if (guildConfig.exemptChannels.find(id => id == message.channel.id)) {
            return;
        }
        
        // Check if the user is exempt
        if (message.member.roles.cache.filter(x => guildConfig.exemptRoles.includes(x.id)).size > 0) {
            return;
        }

        // When dealing with the blacklist, we do not alert the user they have triggered a blacklist.
        if (guildConfig.blacklistRegex.length > 0) {
                for (const reg of guildConfig.blacklistRegex) {
                    const regexObj = new RegExp(reg, 'gi');
                    try {

                    if (regexObj.test(message.cleanContent)) {
                        // Delete message with a nice reason for auditing.
                        await message.delete({ reason: 'Blacklisted Word Found' });
                        return true;
                    }
                    
                }
                catch (e) {
                    console.log('Failed when processing regex:', e);
                    console.log('Skipping.')
                }
                
            } 
        }
        return false;
    }

    private async performChecks(message: Message) {
        if (message.cleanContent === '') {
            return;
        }

        ConfigDatabase.getOrAddGuild(message.guild).then(async guildConfig => {
            // Do not check messages if config is not set up.
            if (guildConfig.logChannelId === '') {
                return;
            }
            try {
                // If the blacklist has triggered, ignore the profanity check.
                if (await this.handleBlacklist(guildConfig, message)) {
                    return;
                }
                await this.handleProfanity(guildConfig, message);
            } catch (e) {
                console.error('performChecks', e);
            }
        });
    }

    private chunkString(str: string, size: number) {
        const numChunks = Math.ceil(str.length / size)
        const chunks = new Array(numChunks)

        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substr(o, size)
        }

        return chunks;
    }

    private safe(str: string) {
        return str.replace(/`/g, '');
    }

    public start() {

        (<any>client).on('messageContentEdited', this.handleCommands);
        client.on('message', this.handleCommands);
        client.on("guildCreate", guild => {
            console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
            
            // Start by getting or creating the guild.
            ConfigDatabase.getOrAddGuild(guild).then(guildConfig => {
                if (guildConfig.logChannelId === '') {
                    // New or unset channel.
                    console.log(`Guild has not been configured with a channel yet.`);
                }
            });

            client.user.setActivity(`Serving ${client.guilds.cache.size} servers`);
        });

        client.on('ready', () => {
            console.log(`Bot has started, with ${client.users.cache.size} users in cache, in ${client.channels.cache.size} cached channels of ${client.guilds.cache.size} cached guilds.`); 
            client.user.setActivity(`Serving ${client.guilds.cache.size} servers`);
            console.log(`Logged in as ${client.user.tag}!`);
        });
        
        client.login(process.env.DISCORD_BOT_TOKEN);
    }


    private async handleCommands(message: Message) {
        // Fetch the full message if partial.
        if (message.partial)
            await message.fetch();
        // Skip itself, do not allow it to process its own messages.
        if (message.author.id === client.user.id)
            return;
        // Skip other bots now.
        if (message.author.bot)
            return;
        // Check for commands always before.
        if (message.content.indexOf('!') === 0) {
            const args = message.content.slice(1).trim().split(/ +/g);
            const command = args.shift().toLowerCase();
            if (command === 'settoxchannel') {
                if (!message.member.hasPermission("ADMINISTRATOR")) {
                    return;
                }
                let channelMentions = message.mentions.channels;
                if (channelMentions.size > 0) {
                    let firstChannel = channelMentions.keys().next().value;
                    ConfigDatabase.updateGuildLogChannel(message.guild, firstChannel).then(x => {
                        if (x.ok) {
                            message.reply(`Set the log channel to ${firstChannel}`);
                        }
                        else {
                            message.reply(`Failed to set the log channel to ${firstChannel}`);
                        }
                    });
                }
            }
            else if (command === 'removetox') {
                if (!message.member.hasPermission("ADMINISTRATOR")) {
                    return;
                }
                ConfigDatabase.removeGuild(message.guild).then(async res => {
                    await message.reply(`Successfully removed all data related to this server from my database. I'll now leave the server. Thanks for having me!`);
                    message.guild.leave().then(left => {
                        console.log(`Left guild gracefully - ${message.guild.name}`);
                    }).catch(async err => {
                        console.error(`Failed to leave guild gracefully - ${message.guild.name}`);
                        await message.reply(`Unfortunately I couldn't leave by myself. You may kick me.`);
                    });
                });
            }
            else if (!commands.includes(command)) {
                // Process profanity check
                await this.performChecks(message);
                return;
            }
            // Only allow commands to be executed in the log channel.
            ConfigDatabase.getOrAddGuild(message.guild).then(guildConfig => {
                if (message.channel.id !== guildConfig.logChannelId) {
                    return;
                }
                if (command === 'setdeletepercentage' && args.length > 0) {
                    const percentage = args[0].replace(/\%/g, '');
                    ConfigDatabase.updateDeletePercentage(message.guild, percentage).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set the delete percentage to ${percentage}%`);
                        }
                        else {
                            message.reply(`Failed to set the delete percentage.`);
                        }
                    });
                }
                if (command === 'setwarnpercentage' && args.length > 0) {
                    const percentage = args[0].replace(/\%/g, '');
                    ConfigDatabase.updateWarnPercentage(message.guild, percentage).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set the warn percentage to ${percentage}%`);
                        }
                        else {
                            message.reply(`Failed to set the warn percentage.`);
                        }
                    });
                }
                if (command === 'setlogpercentage' && args.length > 0) {
                    const percentage = args[0].replace(/\%/g, '');
                    ConfigDatabase.updateLogPercentage(message.guild, percentage).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set the log percentage to ${percentage}%`);
                        }
                        else {
                            message.reply(`Failed to set the log percentage.`);
                        }
                    });
                }
                if (command === 'setdeletemessage' && args.length > 0) {
                    const enable = args[0] === 'true' || args[0] === 'yes';
                    ConfigDatabase.updateDeleteMessage(message.guild, enable).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set delete message to ${enable}`);
                        }
                        else {
                            message.reply(`Failed to set delete message.`);
                        }
                    });
                }
                if (command === 'setdmuser' && args.length > 0) {
                    const enable = args[0] === 'true' || args[0] === 'yes';
                    ConfigDatabase.updateDmUser(message.guild, enable).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set DM user to ${enable}`);
                        }
                        else {
                            message.reply(`Failed to set DM user.`);
                        }
                    });
                }
                if (command === 'setprofanitycheck' && args.length > 0) {
                    const enable = args[0] === 'true' || args[0] === 'yes';
                    ConfigDatabase.updateProfanityCheck(message.guild, enable).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set profanity check to ${enable}`);
                        }
                        else {
                            message.reply(`Failed to set profanity check.`);
                        }
                    });
                }
                if (command === 'settoxicitycheck' && args.length > 0) {
                    const enable = args[0] === 'true' || args[0] === 'yes';
                    ConfigDatabase.updateToxicityCheck(message.guild, enable).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully set toxicity check to ${enable}`);
                        }
                        else {
                            message.reply(`Failed to set toxicity check.`);
                        }
                    });
                }
                if (command === 'configsummary') {
                    ConfigDatabase.getOrAddGuild(message.guild).then(guildConfig => {
                        let formattedMessage = `Server Config Summary: 
\`\`\`
Warn in Channel Percentage: ${guildConfig.warnPercentage}%
Delete Message Percentage: ${guildConfig.deletePercentage}%
Log Percentage: ${guildConfig.logPercentage}%\n
Delete Message on Detect: ${guildConfig.deleteMessage}
DM User on Detect: ${guildConfig.dmUser}
Profanity Check: ${guildConfig.profanityCheck}
Toxicity Check: ${guildConfig.toxicityCheck}
Exempt: ${guildConfig.exemptChannels.length} channel(s), ${guildConfig.exemptRoles.length} role(s)\n
\`\`\``;
                        message.reply(formattedMessage);
                    });
                }
                if (command === 'addexemptchannels') {
                    const channelMentions = message.mentions.channels;
                    if (channelMentions.size > 0) {
                        const channelIds = channelMentions.map(channel => channel.id);
                        ConfigDatabase.addExemptChannels(message.guild, channelIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully added ${channelIds.length} channel(s) to be exempted.`);
                            }
                            else {
                                message.reply(`Failed to add the channels.`);
                            }
                        });
                    }
                }
                if (command === 'removeexemptchannels') {
                    const channelMentions = message.mentions.channels;
                    if (channelMentions.size > 0) {
                        const channelIds = channelMentions.map(channel => channel.id);
                        ConfigDatabase.removeExemptChannels(message.guild, channelIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully removed ${channelIds.length} channel(s) from being exempt.`);
                            }
                            else {
                                message.reply(`Failed to remove the channels.`);
                            }
                        });
                    }
                }
                if (command === 'exemptchannels') {
                    ConfigDatabase.getExemptChannels(message.guild).then(channelIds => {
                        const channelNames = channelIds.map(id => {
                            const channel = message.guild.channels.cache.find(c => c.id == id);
                            const channelName = !!channel ? `${channel.name} - ID: ${id}` : `Unknown Channel - ID: ${id}`;
                            return channelName;
                        });
                        let formattedEvents = `Exempt Channels: 
\`\`\`
${channelNames.join('\n').trim()}
\`\`\``;
                        message.reply(formattedEvents);
                    });
                }
                if (command === 'addexemptroles') {
                    const roleMentions = message.mentions.roles;
                    if (roleMentions.size > 0) {
                        const roleIds = roleMentions.map(channel => channel.id);
                        ConfigDatabase.addExemptRoles(message.guild, roleIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully added ${roleIds.length} role(s) to be exempted.`);
                            }
                            else {
                                message.reply(`Failed to add the roles.`);
                            }
                        });
                    }
                }
                if (command === 'removeexemptroles') {
                    const roleMentions = message.mentions.roles;
                    if (roleMentions.size > 0) {
                        const roleIds = roleMentions.map(channel => channel.id);
                        ConfigDatabase.removeExemptRoles(message.guild, roleIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully removed ${roleIds.length} role(s) from being exempt.`);
                            }
                            else {
                                message.reply(`Failed to remove the roles.`);
                            }
                        });
                    }
                }
                if (command === 'exemptroles') {
                    ConfigDatabase.getExemptRoles(message.guild).then(roleIds => {
                        const roleNames = roleIds.map(id => {
                            const role = message.guild.roles.cache.find(c => c.id == id);
                            const roleName = !!role ? `${role.name} - ID: ${id}` : `Unknown Role - ID: ${id}`;
                            return roleName;
                        });
                        let formatted = `Exempt Roles: 
\`\`\`
${roleNames.join('\n').trim()}
\`\`\``;
                        message.reply(formatted);
                    });
                }


                if (command === 'addblacklist' && args.length > 0) {
                    let blacklistRegex = args.join(' ').replace(/`/g, '');
                    ConfigDatabase.addBlacklistRegex(message.guild, [blacklistRegex]).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully added the blacklisted word.`);
                        }
                        else {
                            message.reply(`Failed to add the blacklisted word.`);
                        }
                    });
                }
                if (command === 'removeblacklist' && args.length > 0) {
                    let blacklistRegex = args.join(' ').replace(/`/g, '');
                    ConfigDatabase.removeBlacklistRegex(message.guild, [blacklistRegex]).then(x => {
                        if (x.ok) {
                            message.reply(`Successfully removed blacklisted word.`);
                        }
                        else {
                            message.reply(`Failed to remove the blacklisted word.`);
                        }
                    });
                }
                if (command === 'blacklist') {
                    ConfigDatabase.getBlacklistRegex(message.guild).then(blacklistRegexes => {
                        let formattedRegexes = `Blacklisted Words/Regex: 
\`\`\`
${blacklistRegexes.join('\n').trim()}
\`\`\``;
                        message.reply(formattedRegexes);
                    });
                }

                if (command === 'addblacklistchannels') {
                    const channelMentions = message.mentions.channels;
                    if (channelMentions.size > 0) {
                        const channelIds = channelMentions.map(channel => channel.id);
                        ConfigDatabase.addBlacklistChannels(message.guild, channelIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully added ${channelIds.length} channel(s) to be blacklist checked.`);
                            }
                            else {
                                message.reply(`Failed to add the channels.`);
                            }
                        });
                    }
                }
                if (command === 'removeblacklistchannels') {
                    const channelMentions = message.mentions.channels;
                    if (channelMentions.size > 0) {
                        const channelIds = channelMentions.map(channel => channel.id);
                        ConfigDatabase.removeBlacklistChannels(message.guild, channelIds).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully removed ${channelIds.length} channel(s) from being blacklist checked.`);
                            }
                            else {
                                message.reply(`Failed to remove the channels.`);
                            }
                        });
                    }
                }
                if (command === 'blacklistchannels') {
                    ConfigDatabase.getBlacklistChannels(message.guild).then(channelIds => {
                        const channelNames = channelIds.map(id => {
                            const channel = message.guild.channels.cache.find(c => c.id == id);
                            const channelName = !!channel ? `${channel.name} - ID: ${id}` : `Unknown Channel - ID: ${id}`;
                            return channelName;
                        });
                        let formattedChannels = `Blacklist Check Channels: 
\`\`\`
${channelNames.join('\n').trim()}
\`\`\``;
                        message.reply(formattedChannels);
                    });
                }
            });
        }
        else {
            await this.performChecks(message);
        }
    }
}

export = new Bot();