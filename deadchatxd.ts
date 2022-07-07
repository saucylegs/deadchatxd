#!/usr/bin/env node

// dead chat xd Discord bot - MIT License - https://github.com/saucylegs/deadchatxd

"use strict";

import Discord from "discord.js";
import { Sequelize, DataTypes, Model } from "sequelize";
import AutoPoster from "topgg-autoposter";
import config from "./config.js";
import { deploy, deployToGuild } from "./registerCommands.js";

const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES]});
const poster = config.topgg ? AutoPoster(config.topggToken, client) : null;

const cmdRegex = /(help|info|query|enable|disable|edit)/i;

const sql = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect
});

// Defining the servers table of the database
const Servers = sql.define("servers", {
    server: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    responses: {
        type: DataTypes.JSON,
        allowNull: false
    }
});

// Defining the channels table of the database
const Channels = sql.define("channels", {
    channel: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    timer: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

class BotError extends Error {
    userMsg: string;
    reply: string;

    constructor (userMsg: string, ...args) {
        super(...args);
        Error.captureStackTrace(this, BotError);
        this.userMsg = userMsg;
        this.name = "BotError";
        this.reply = `${config.emojis.error} ${this.userMsg}`;
    }

    log() {
        console.error(`${this.name}: (${this.userMsg}) ${this.message} \n${this.stack}`);
    }
}

class DatabaseError extends BotError {
    constructor (userMsg?: string, ...args) {
        super((userMsg ? userMsg : "There was an error while trying to contact the database."), ...args);
        this.name = "DatabaseError";
        this.reply += " " + config.tryAgainMsg;
        this.log();
    }
}

const servers = new Map<string, Responses>();
const channels = new Map<string, Chat>();

const emptyPage: Discord.MessageEmbedOptions = {
    color: config.embedColor, 
    title: "Responses", 
    description: "There are no responses. Use the `/editresponses add` command to add one."
};

class Chat {
    readonly channel: Discord.TextChannel;
    readonly server: string;
    private ms: number;
    private humanTime: string;
    private timeout: NodeJS.Timeout;

    constructor (channel: Discord.TextChannel, time: number) {
        this.channel = channel;
        this.server = channel.guild.id;
        this.ms = time;
        this.humanTime = msToTime(time);
        this.timeout = setTimeout((function () {this.respond();}).bind(this), this.ms);
    }

    /**
     * Resets the timer.
     */
    reset() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout((function () {this.respond();}).bind(this), this.ms);
    }

    respond() {
        this.channel.send( servers.get(this.server).getResponse() );
    }

    edit(time: number) {
        this.ms = time;
        this.humanTime = msToTime(time);
        this.reset();
        return this.humanTime;
    }

    stop() {
        clearTimeout(this.timeout);
    }

    async delete() {
        this.stop();
        channels.delete(this.channel.id);

        await Channels.destroy({where: {channel: this.channel.id}})
        .catch(() => {throw new DatabaseError("The timer has been stopped, but there was an error while trying to delete it from the database.");});
    }

    get time() {
        return this.humanTime;
    }
}

class Responses {
    readonly server: string;
    private responses: string[];
    private pages: Discord.MessageEmbed[];

    constructor (server: string, responses: string[]) {
        this.server = server;
        this.responses = responses;
        this.makePages();
    }

    private static validateInput(str: string): void {
        if (str.length > 300) 
            throw new BotError("Responses must be less than 300 characters long.");
    }

    private addField(field: Discord.EmbedFieldData) {
        if (this.pages.length == 0 || this.pages[this.pages.length - 1].fields.length >= 10) {
            // Add a new page if there are no pages or if the last page already has 10 fields in it.
            this.pages.push(
                new Discord.MessageEmbed()
                    .setColor(config.embedColor)
                    .setTitle("Responses")
                    .setDescription("When activated, I'll choose one of these responses at random to send to the channel. The `/editresponses` command can be used to change these.")
            );
        }

        this.pages[this.pages.length - 1].addFields(field);
    }

    private updateFooters() {
        for (let i = 0; i < this.pages.length; i++) {
            this.pages[i].setFooter({text: `Page ${i + 1} of ${this.pages.length} • ${this.responses.length} total responses`});
        }
    }

    makePages() {
        this.pages = [];
        for (let i = 0; i < this.responses.length; i++) {
            this.addField({ name: (i + 1) + "", value: this.responses[i] });
        }
        this.updateFooters();
    }

    getPage(index = 1) {
        return this.pages[index];
    }

    // Returns what page a response of the specified index (should be) located in.
    getPageOf(index: number) {
        return Math.floor((index - 1) / 10);
    }

    /**
     * Returns the message options (embed & buttons) for the first page. This should be used when the /responses command is first called.
     */
    get message(): Discord.InteractionReplyOptions {
        if (this.numResponses === 0) {
            return {embeds: [emptyPage]};
        } else if (this.pages.length === 1) {
            return {embeds: [this.pages[0]]};
        } else {
            let buttons = new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton({style: "PRIMARY", customId: "2", emoji: "➡️", label: "Next page"})
            );
            return {embeds: [this.pages[0]], components: [buttons]};
        }
    }

    // Returns the message options (embed & buttons) for the specified 1-indexed page.
    switchToPage(newPage: number): Discord.InteractionUpdateOptions {
        let buttons = new Discord.MessageActionRow();
        if (this.pages[newPage - 2]) buttons.addComponents(new Discord.MessageButton({style: "PRIMARY", customId: (newPage - 1) + "", emoji: "⬅️", label: "Previous page"}));
        if (this.pages[newPage]) buttons.addComponents(new Discord.MessageButton({style: "PRIMARY", customId: (newPage + 1) + "", emoji: "➡️", label: "Next page"}));

        return { embeds: [this.pages[newPage - 1]], components: [buttons] };
    }

    async add(content: string) {
        if (this.responses.length >= 100) throw new BotError("You cannot have more than 100 responses.");
        Responses.validateInput(content);

        let temp = this.responses; // Copying the array to a temporary variable, so the changes revert back if there is a database error.
        temp.push(content);
        
        await Servers.update( {responses: temp}, {where: {server: this.server} }).catch(() => {throw new DatabaseError();});

        this.responses = temp;
        this.addField({ name: this.responses.length + "", value: content });
        this.updateFooters();
    }

    async delete(index) {
        if (index > this.responses.length || index <= 0)
            throw new BotError("That response item does not exist. Please refer to a response by its ID number.");

        let temp = this.responses;

        temp.splice(index - 1, 1);

        await Servers.update( {responses: temp}, {where: {server: this.server} }).catch(() => {throw new DatabaseError();});
        
        this.responses = temp;
        this.makePages();
    }

    async edit(index, content: string) {
        if (index > this.responses.length || index <= 0)
            throw new BotError("That response item does not exist. Please refer to a response by its ID number.");

        Responses.validateInput(content);
        
        let temp = this.responses;
        temp[index - 1] = content;

        await Servers.update( {responses: temp}, {where: {server: this.server} }).catch(() => {throw new DatabaseError();});

        this.responses = temp;
        this.makePages();
    }

    /**
     * @returns A random response.
     */
    getResponse() {
        let rand = Math.floor(Math.random() * this.responses.length);
        return this.responses[rand];
    }

    get numResponses() {
        return this.responses.length;
    }
}


// Top.gg API
if (poster) {
    poster.on("posted", stats => {
        console.log(`Posted stats to Top.gg: in ${stats.serverCount} servers`);
    });
}


function catchCommandError(error: any) {
    if (error instanceof BotError) {
        return error.reply;
    } else {
        console.error(error);
        return `${config.emojis.error} There was an unrecognized error while executing this command. ${config.tryAgainMsg}`;
    }
}

/**
 * Converts milliseconds to human-understandable time
 * @param ms A number representing milliseconds
 * @returns A string representing that time, divided into days, hours, minutes, and seconds as necessary. e.g. "2h 20m 30s"
 */
function msToTime(ms: number): string {
    let day, hour, minute, seconds;
    seconds = Math.floor(ms / 1000);
    minute = Math.floor(seconds / 60);
    seconds = seconds % 60;
    hour = Math.floor(minute / 60);
    minute = minute % 60;
    day = Math.floor(hour / 24);
    hour = hour % 24;

    let units = [];
    switch (day) {case 0: break; case 1: units.push("1 day"); break; default: units.push(day + " days");};
    switch (hour) {case 0: break; case 1: units.push("1 hour"); break; default: units.push(hour + " hours");};
    switch (minute) {case 0: break; case 1: units.push("1 minute"); break; default: units.push(minute + " minutes");};
    switch (seconds) {case 0: break; case 1: units.push("1 second"); break; default: units.push(seconds + " seconds");};

    return units.join(", ");
}

/**
 * Converts a value such as "2m" or "2h 20m 30s" to milliseconds.
 * @param msg A string that containing numbers paired with s, m, h, or d to denote seconds, minutes, hours, and days.
 * @returns A number corresponding to the total number of milliseconds expressed in the msg parameter.
 * @throws A string describing that the specified time value is too long, too short, or does not exist.
 */
function timeToMs(msg: string): number {
    const timeRegex = /(?<num>[0-9]+) ?(?<unit>s|m|h|d)/g;

    if (!msg.match(timeRegex)) {
        throw "Please provide a valid amount of time in the `time` option for how long this channel should be dead until a response is sent. For example, `2m` will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days.";
    
    } else {
        let ms = 0;

        for (let match of msg.matchAll(timeRegex)) {
            let num = Number(match.groups.num);

            switch (match.groups.unit) {
                case "s":
                    ms += num * 1000;
                    break;
                case "m":
                    ms += num * 60000;
                    break;
                case "h":
                    ms += num * 3.6e+6;
                    break;
                case "d":
                    ms += num * 8.64e+7;
                    break;
            }

            if (ms > 604800000) throw "Your timer is too long. It must be less than 7 days.";
        }

        if (ms < 10000)
            throw "Your timer is too short. It must be at least 10 seconds.";
        else if (ms > 604800000)
            throw "Your timer is too long. It must be less than 7 days.";
        else
            return ms;
    }
}


async function startup() {
    let dbServers: any[] = await Servers.findAll();
    let dbChannels: any[] = await Channels.findAll();

    for (let row of dbServers) {
        servers.set(row.server, new Responses(row.server, row.responses));
    }

    for (let row of dbChannels) {
        let discordChannel;
        try {
            discordChannel = await client.channels.fetch(row.channel);
        } catch (error) {
            // handleChatError(row.channel, error);
            console.warn(error);
            continue;
        }

        if (discordChannel instanceof Discord.TextChannel) {
            channels.set(
                row.channel,
                new Chat(discordChannel, row.timer)
            );
        } else {
            console.warn(`Fetched channel ${row.channel} is of an invalid type (not a TextChannel):`, discordChannel);
        }
    }
}

process.on("unhandledRejection", error => {
    console.warn("Unhandled promise rejection:", error);
});

client.on('ready', () => {
    console.log("Connected as ", client.user.tag);

    startup().catch(error => {
        console.error(error);
        console.log("Startup failed (database error)");
        process.exit(1);
    });

    // Send application commands to the API
    deploy(client.application.id);

    if (config.activity)
        client.user.setActivity(config.activity);
});


client.on("interactionCreate", async action => {
    var chat = channels.get(action.channelId);

    if (action.isCommand()) {
        if (action.commandName == "info") {
            // "INFO" command
            await action.reply({embeds: [config.infoEmbed]});
            return;
        }

        if (!action.guild) {
            await action.reply(`${config.emojis.error} This command cannot be used outside of a server.`);
            return;
        }
        if (!(action.channel instanceof Discord.TextChannel)) {
            await action.reply(`${config.emojis.error} This command can only be used inside a standard text channel. It cannot be used in a thread or announcement channel.`);
            return;
        }

        if (action.commandName == "query") {
            // "QUERY" command
            if (chat) {
                await action.reply(`dead chat xd is enabled in this channel. I will send a message when there is no activity in this channel for ${chat.time}.`);
            } else {
                await action.reply("dead chat xd is not enabled in this channel.");
            }

        } else if (action.commandName == "enable") {
            // "ENABLE" command
            if (chat) {
                await action.reply(`${config.emojis.error} dead chat xd is already enabled in this channel. If you want to change the timer, use the \`/edit\` command instead.`);
                return;
            } else {
                let parsedTime: number;
                try {
                    parsedTime = timeToMs(action.options.getString("timer").toLowerCase());
                } catch (error) {
                    await action.reply(`${config.emojis.error} ${error}`);
                    return;
                }

                try {
                    if (!servers.has(action.guildId)) {
                        // Set the responses for the server if it doesn't exist already
                        await Servers.create({
                            server: action.guildId, 
                            responses: config.defaultResponses
                        });
                        servers.set(action.guildId, new Responses(action.guildId, config.defaultResponses));
                    }
                    await Channels.create({channel: action.channelId, timer: parsedTime});
                } catch (error) {
                    console.error(error);
                    await action.reply(`${config.emojis.error} There was an error while trying to contact the database. ${config.tryAgainMsg}`);
                    return;
                }

                let initChat = new Chat(action.channel, parsedTime);
                channels.set(action.channelId, initChat);

                await action.reply(`${config.emojis.success} Success! I will send a message when there is no activity in this channel for ${initChat.time}. Use the \`/editresponses\` command to change what I will respond with.`);
            }

        } else if (action.commandName == "disable") {
            // "DISABLE" command
            if (!chat) {
                await action.reply(`${config.emojis.error} Cannot disable; dead chat xd is not enabled in this channel.`);
                return;
            } else {
                chat.stop();
                channels.delete(action.channelId);

                try {
                    await Channels.destroy({where: {channel: action.channelId}});
                } catch (error) {
                    console.error(error);
                    await action.reply(`${config.emojis.warn} The timer has been stopped, but there was an error trying to delete it from the database. If I start responding again, try the \`/disable\` command again.`);
                    return;
                }

                await action.reply(`${config.emojis.success} dead chat xd has been disabled in this channel successfully.`);
            }

        } else if (action.commandName == "edit") {
            // "EDIT" command
            if (!chat) {
                await action.reply(`${config.emojis.error} Cannot edit; dead chat xd is not enabled in this channel. To enable it, use the \`/enable\` command instead.`);
                return;
            } else {
                let parsedTime: number;
                try {
                    parsedTime = timeToMs(action.options.getString("timer").toLowerCase());
                } catch (error) {
                    await action.reply(`${config.emojis.error} ${error}`);
                    return;
                }

                try {
                    await Channels.update({timer: parsedTime}, {where: {channel: action.channelId}});
                } catch (error) {
                    console.error(error);
                    await action.reply(`${config.emojis.error} There was an error while trying to contact the database. ${config.tryAgainMsg}`);
                    return;
                }

                let humanTime = chat.edit(parsedTime);

                await action.reply(`${config.emojis.success} Success! I will send a message when there is no activity in this channel for ${humanTime}. Use the \`/editresponses\` command to change what I will respond with.`);
            }

        }


        else if (action.commandName == "responses") {
            // "RESPONSES" command
            const responses = servers.get(action.guildId);

            if (responses)
                await action.reply( responses.message );
            else
                await action.reply({ embeds: [emptyPage] });
        
        } else if (action.commandName == "editresponses") {
            // "EDITRESPONSES" command and subcommands
            // Cannot be made a subcommand of "RESPONSES", because these commands have different permission requirements.
            const responses = servers.get(action.guildId);

            if (action.options.getSubcommand() == "add") {
                // "EDITRESPONSES ADD" subcommand
                try {
                    await responses.add( action.options.getString("content") );
                } catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config.emojis.success} Response added.`);
                
            } else if (action.options.getSubcommand() == "edit") {
                // "EDITRESPONSES EDIT" command
                try {
                    await responses.edit( action.options.getInteger("index"), action.options.getString("content") );
                } catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config.emojis.success} Response edited.`);

            } else if (action.options.getSubcommand() == "delete") {
                // "EDITRESPONSES DELETE" command
                try {
                    await responses.delete( action.options.getInteger("index") );
                } catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config.emojis.success} Response deleted.`);

            } else {
                await action.reply(`${config.emojis.error} Please use a valid subcommand, such as \`/editresponses add\`.`);
            }

        }

    } else if (action.isButton()) {
        await action.update( servers.get(action.guildId).switchToPage(Number(action.customId)) );
    }
});


client.on("messageCreate", async message => {
    var chat = channels.get(message.channelId);

    if (chat && (message.author.id != client.user.id))
        chat.reset();

    if (message.mentions.has(client.user) && cmdRegex.test(message.content))
        await message.reply("dead chat xd has switched to Slash Commands. For example, to use the query command, type `/query`. You may need Use Application Commands permissions to do this.");
});


client.on("guildDelete", async guild => {
    // When the bot is kicked/banned from a server, disable all channels of the server
    for (let channelId in guild.channels.cache) {
        let chat = channels.get(channelId);
        if (chat)
            await chat.delete();
    }
});

client.on("channelDelete", async channel => {
    // If a channel is deleted, also disable it and delete it from our database.
    let chat = channels.get(channel.id);
    if (chat)
        await chat.delete();
});


client.login(config.token);
