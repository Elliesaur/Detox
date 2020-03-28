import { Guild } from "discord.js";
import { MongoClient, ObjectId } from "mongodb";

const connectionUrl = "mongodb://localhost:27017/";
const dbName = "toxi";
const collectionName = "toxiGuildConfig";

export let db = undefined;
class InternalConfigDatabase {

    constructor() {
        this.getOrAddGuild = this.getOrAddGuild.bind(this);
        this.getOrAddGuildById = this.getOrAddGuildById.bind(this);
        this.getGuild = this.getGuild.bind(this);
        this.getGuildById = this.getGuildById.bind(this);
        this.updateDeletePercentage = this.updateDeletePercentage.bind(this);
        this.updateDeletePercentageById = this.updateDeletePercentageById.bind(this);
        this.updateWarnPercentage = this.updateWarnPercentage.bind(this);
        this.updateWarnPercentageById = this.updateWarnPercentageById.bind(this);
        this.updateLogPercentage = this.updateLogPercentage.bind(this);
        this.updateLogPercentageById = this.updateLogPercentageById.bind(this);
        this.updateDeleteMessage = this.updateDeleteMessage.bind(this);
        this.updateDeleteMessageById = this.updateDeleteMessageById.bind(this);
        this.updateProfanityCheck = this.updateProfanityCheck.bind(this);
        this.updateProfanityCheckById = this.updateProfanityCheckById.bind(this);
        this.updateToxicityCheck = this.updateToxicityCheck.bind(this);
        this.updateToxicityCheckById = this.updateToxicityCheckById.bind(this);
        this.updateDmUser = this.updateDmUser.bind(this);
        this.updateDmUserById = this.updateDmUserById.bind(this);
        this.getExemptChannels = this.getExemptChannels.bind(this);
        this.getExemptChannelsById = this.getExemptChannelsById.bind(this);
        this.addExemptChannels = this.addExemptChannels.bind(this);
        this.addExemptChannelsById = this.addExemptChannelsById.bind(this);
        this.removeExemptChannels = this.removeExemptChannels.bind(this);
        this.removeExemptChannelsById = this.removeExemptChannelsById.bind(this);
        this.getExemptRoles = this.getExemptRoles.bind(this);
        this.getExemptRolesById = this.getExemptRolesById.bind(this);
        this.addExemptRoles = this.addExemptRoles.bind(this);
        this.addExemptRolesById = this.addExemptRolesById.bind(this);
        this.removeExemptRoles = this.removeExemptRoles.bind(this);
        this.removeExemptRolesById = this.removeExemptRolesById.bind(this);
        MongoClient.connect(connectionUrl).then(a => {
            db = a.db(dbName);
        });
    }

    public async getGuild(guild: Guild): Promise<GuildConfig> {
        return await this.getGuildById(guild.id);
    }

    public async getGuildById(guildId: string): Promise<GuildConfig> {
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOne({ id: guildId });
            return v;
        } catch (e) {
            console.error('getGuildById', e);
            return undefined;
        }
    }

    public async getOrAddGuild(guild: Guild): Promise<GuildConfig> {
        return await this.getOrAddGuildById(guild.id);
    }

    public async getOrAddGuildById(guildId: string): Promise<GuildConfig> {
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $setOnInsert: {
                    id: guildId,
                    logChannelId: '',
                    exemptChannels: [],
                    exemptRoles: [],
                    deletePercentage: '95',
                    warnPercentage: '80',
                    dmUser: false,
                    deleteMessage: false,
                    logPercentage: '75',
                    profanityCheck: true,
                    toxicityCheck: true
                }
            }, {
                upsert: true,
                returnOriginal: false,
            });
            return v.value;
        } catch (e) {
            console.error('addGuildById', e);
            return undefined;
        }
    }

    public async updateGuildLogChannel(guild: Guild, channelId: string) {
       return await this.updateGuildLogChannelById(guild.id, channelId);
    }

    public async updateGuildLogChannelById(guildId: string, channelId: string) {
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $set: {
                    logChannelId: channelId,
                }
            });
            return v;
        } catch (e) {
            console.error('updateGuildLogChannelById', e);
            return undefined;
        }
    }

    public async updateDeletePercentage(guild: Guild, deletePercentage: string) {
        return await this.updateDeletePercentageById(guild.id, deletePercentage);
    }
 
     public async updateDeletePercentageById(guildId: string, deletePercentage: string) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                     deletePercentage: deletePercentage,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateDeletePercentageById', e);
             return undefined;
         }
    }

    public async updateWarnPercentage(guild: Guild, deletePercentage: string) {
        return await this.updateWarnPercentageById(guild.id, deletePercentage);
    }
 
     public async updateWarnPercentageById(guildId: string, warnPercentage: string) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    warnPercentage: warnPercentage,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateWarnPercentageById', e);
             return undefined;
         }
    }

    public async updateLogPercentage(guild: Guild, deletePercentage: string) {
        return await this.updateLogPercentageById(guild.id, deletePercentage);
    }
 
     public async updateLogPercentageById(guildId: string, logPercentage: string) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    logPercentage: logPercentage,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateLogPercentageById', e);
             return undefined;
         }
    }

    public async updateDeleteMessage(guild: Guild, deleteMessage: boolean) {
        return await this.updateDeleteMessageById(guild.id, deleteMessage);
    }
 
     public async updateDeleteMessageById(guildId: string, deleteMessage: boolean) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    deleteMessage: deleteMessage,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateDeleteMessageById', e);
             return undefined;
         }
    }

    public async updateDmUser(guild: Guild, dmUser: boolean) {
        return await this.updateDmUserById(guild.id, dmUser);
    }
 
     public async updateDmUserById(guildId: string, dmUser: boolean) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    dmUser: dmUser,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateDmUserById', e);
             return undefined;
         }
    }

    public async updateProfanityCheck(guild: Guild, profanityCheck: boolean) {
        return await this.updateProfanityCheckById(guild.id, profanityCheck);
    }
 
     public async updateProfanityCheckById(guildId: string, profanityCheck: boolean) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    profanityCheck: profanityCheck,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateProfanityCheckById', e);
             return undefined;
         }
    }

    public async updateToxicityCheck(guild: Guild, toxicityCheck: boolean) {
        return await this.updateToxicityCheckById(guild.id, toxicityCheck);
    }
 
     public async updateToxicityCheckById(guildId: string, toxicityCheck: boolean) {
         const collection = db.collection(collectionName);
         try {
             const v = await collection.findOneAndUpdate({ id: guildId }, {
                 $set: {
                    toxicityCheck: toxicityCheck,
                 }
             });
             return v;
         } catch (e) {
             console.error('updateToxicityCheckById', e);
             return undefined;
         }
    }

    public async getExemptChannels(guild: Guild): Promise<string[]> {
        return await this.getExemptChannelsById(guild.id);
    }

    public async getExemptChannelsById(guildId: string): Promise<string[]> {
        const collection = db.collection(collectionName);
        try {
            const results = (await collection.findOne({ id: guildId }))
            if (results && results.exemptChannels) {
                return results.exemptChannels;
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getExemptChannelsById', e);
            return [];
        }
    }

    public async addExemptChannels(guild: Guild, exemptChannels: string[]) {
        return await this.addExemptChannelsById(guild.id, exemptChannels);
    }

    public async addExemptChannelsById(guildId: string, exemptChannels: string[]) { 
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                // Avoid dupes.
                $addToSet: {
                    exemptChannels: {
                        $each: exemptChannels
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('addExemptChannelsById', e);
            return undefined;
        }
    }

    public async removeExemptChannels(guild: Guild, channels: string[]) {
        return await this.removeExemptChannelsById(guild.id, channels);
    }

    public async removeExemptChannelsById(guildId: string, channels: string[]) {
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $pull: {
                    exemptChannels: {
                        $in: channels
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('removeExemptChannelsById', e);
            return undefined;
        }
    }




    public async getExemptRoles(guild: Guild): Promise<string[]> {
        return await this.getExemptRolesById(guild.id);
    }

    public async getExemptRolesById(guildId: string): Promise<string[]> {
        const collection = db.collection(collectionName);
        try {
            const results = (await collection.findOne({ id: guildId }))
            if (results && results.exemptRoles) {
                return results.exemptRoles;
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getExemptRolesById', e);
            return [];
        }
    }

    public async addExemptRoles(guild: Guild, exemptRoles: string[]) {
        return await this.addExemptRolesById(guild.id, exemptRoles);
    }

    public async addExemptRolesById(guildId: string, exemptRoles: string[]) { 
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                // Avoid dupes.
                $addToSet: {
                    exemptRoles: {
                        $each: exemptRoles
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('addExemptRolesById', e);
            return undefined;
        }
    }

    public async removeExemptRoles(guild: Guild, channels: string[]) {
        return await this.removeExemptRolesById(guild.id, channels);
    }

    public async removeExemptRolesById(guildId: string, channels: string[]) {
        const collection = db.collection(collectionName);
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $pull: {
                    exemptRoles: {
                        $in: channels
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('removeExemptRolesById', e);
            return undefined;
        }
    }
}

export interface GuildConfig { 
    id: string;
    logChannelId: string;
    deletePercentage: string;
    warnPercentage: string;
    logPercentage: string;
    deleteMessage: boolean;
    profanityCheck: boolean;
    toxicityCheck: boolean;
    dmUser: boolean;
    exemptChannels: string[];
    exemptRoles: string[];

}

export const ConfigDatabase = new InternalConfigDatabase();