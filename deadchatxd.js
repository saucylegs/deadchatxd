#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const sequelize_1 = require("sequelize");
const topgg_autoposter_1 = __importDefault(require("topgg-autoposter"));
const config_js_1 = __importDefault(require("./config.js"));
const registerCommands_js_1 = require("./registerCommands.js");
const client = new discord_js_1.default.Client({ intents: [discord_js_1.default.Intents.FLAGS.GUILDS, discord_js_1.default.Intents.FLAGS.GUILD_MESSAGES] });
const poster = config_js_1.default.topgg ? (0, topgg_autoposter_1.default)(config_js_1.default.topggToken, client) : null;
const cmdRegex = /(help|info|query|enable|disable|edit)/i;
const sql = new sequelize_1.Sequelize(config_js_1.default.database, config_js_1.default.username, config_js_1.default.password, {
    host: config_js_1.default.host,
    dialect: config_js_1.default.dialect
});
const Servers = sql.define("servers", {
    server: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    responses: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: false
    }
});
const Channels = sql.define("channels", {
    channel: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    timer: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    }
});
class BotError extends Error {
    constructor(userMsg, ...args) {
        super(...args);
        Error.captureStackTrace(this, BotError);
        this.userMsg = userMsg;
        this.name = "BotError";
        this.reply = `${config_js_1.default.emojis.error} ${this.userMsg}`;
    }
    log() {
        console.error(`${this.name}: (${this.userMsg}) ${this.message} \n${this.stack}`);
    }
}
class DatabaseError extends BotError {
    constructor(userMsg, ...args) {
        super((userMsg ? userMsg : "There was an error while trying to contact the database."), ...args);
        this.name = "DatabaseError";
        this.reply += " " + config_js_1.default.tryAgainMsg;
        this.log();
    }
}
const servers = new Map();
const channels = new Map();
const emptyPage = {
    color: config_js_1.default.embedColor,
    title: "Responses",
    description: "There are no responses. Use the `/editresponses add` command to add one."
};
class Chat {
    constructor(channel, time) {
        this.channel = channel;
        this.server = channel.guild.id;
        this.ms = time;
        this.humanTime = msToTime(time);
        this.timeout = setTimeout((function () { this.respond(); }).bind(this), this.ms);
    }
    reset() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout((function () { this.respond(); }).bind(this), this.ms);
    }
    respond() {
        this.channel.send(servers.get(this.server).getResponse());
    }
    edit(time) {
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
        await Channels.destroy({ where: { channel: this.channel.id } })
            .catch(() => { throw new DatabaseError("The timer has been stopped, but there was an error while trying to delete it from the database."); });
    }
    get time() {
        return this.humanTime;
    }
}
class Responses {
    constructor(server, responses) {
        this.server = server;
        this.responses = responses;
        this.makePages();
    }
    static validateInput(str) {
        if (str.length > 300)
            throw new BotError("Responses must be less than 300 characters long.");
    }
    addField(field) {
        if (this.pages.length == 0 || this.pages[this.pages.length - 1].fields.length >= 10) {
            this.pages.push(new discord_js_1.default.MessageEmbed()
                .setColor(config_js_1.default.embedColor)
                .setTitle("Responses")
                .setDescription("When activated, I'll choose one of these responses at random to send to the channel. The `/editresponses` command can be used to change these."));
        }
        this.pages[this.pages.length - 1].addFields(field);
    }
    updateFooters() {
        for (let i = 0; i < this.pages.length; i++) {
            this.pages[i].setFooter({ text: `Page ${i + 1} of ${this.pages.length} • ${this.responses.length} total responses` });
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
    getPageOf(index) {
        return Math.floor((index - 1) / 10);
    }
    get message() {
        if (this.numResponses === 0) {
            return { embeds: [emptyPage] };
        }
        else if (this.pages.length === 1) {
            return { embeds: [this.pages[0]] };
        }
        else {
            let buttons = new discord_js_1.default.MessageActionRow().addComponents(new discord_js_1.default.MessageButton({ style: "PRIMARY", customId: "2", emoji: "➡️", label: "Next page" }));
            return { embeds: [this.pages[0]], components: [buttons] };
        }
    }
    switchToPage(newPage) {
        let buttons = new discord_js_1.default.MessageActionRow();
        if (this.pages[newPage - 2])
            buttons.addComponents(new discord_js_1.default.MessageButton({ style: "PRIMARY", customId: (newPage - 1) + "", emoji: "⬅️", label: "Previous page" }));
        if (this.pages[newPage])
            buttons.addComponents(new discord_js_1.default.MessageButton({ style: "PRIMARY", customId: (newPage + 1) + "", emoji: "➡️", label: "Next page" }));
        return { embeds: [this.pages[newPage - 1]], components: [buttons] };
    }
    async add(content) {
        if (this.responses.length >= 100)
            throw new BotError("You cannot have more than 100 responses.");
        Responses.validateInput(content);
        let temp = this.responses;
        temp.push(content);
        await Servers.update({ responses: temp }, { where: { server: this.server } }).catch(() => { throw new DatabaseError(); });
        this.responses = temp;
        this.addField({ name: this.responses.length + "", value: content });
        this.updateFooters();
    }
    async delete(index) {
        if (index > this.responses.length || index <= 0)
            throw new BotError("That response item does not exist. Please refer to a response by its ID number.");
        let temp = this.responses;
        temp.splice(index - 1, 1);
        await Servers.update({ responses: temp }, { where: { server: this.server } }).catch(() => { throw new DatabaseError(); });
        this.responses = temp;
        this.makePages();
    }
    async edit(index, content) {
        if (index > this.responses.length || index <= 0)
            throw new BotError("That response item does not exist. Please refer to a response by its ID number.");
        Responses.validateInput(content);
        let temp = this.responses;
        temp[index - 1] = content;
        await Servers.update({ responses: temp }, { where: { server: this.server } }).catch(() => { throw new DatabaseError(); });
        this.responses = temp;
        this.makePages();
    }
    getResponse() {
        let rand = Math.floor(Math.random() * this.responses.length);
        return this.responses[rand];
    }
    get numResponses() {
        return this.responses.length;
    }
}
if (poster) {
    poster.on("posted", stats => {
        console.log(`Posted stats to Top.gg: in ${stats.serverCount} servers`);
    });
}
function catchCommandError(error) {
    if (error instanceof BotError) {
        return error.reply;
    }
    else {
        console.error(error);
        return `${config_js_1.default.emojis.error} There was an unrecognized error while executing this command. ${config_js_1.default.tryAgainMsg}`;
    }
}
function msToTime(ms) {
    let day, hour, minute, seconds;
    seconds = Math.floor(ms / 1000);
    minute = Math.floor(seconds / 60);
    seconds = seconds % 60;
    hour = Math.floor(minute / 60);
    minute = minute % 60;
    day = Math.floor(hour / 24);
    hour = hour % 24;
    let units = [];
    switch (day) {
        case 0: break;
        case 1:
            units.push("1 day");
            break;
        default: units.push(day + " days");
    }
    ;
    switch (hour) {
        case 0: break;
        case 1:
            units.push("1 hour");
            break;
        default: units.push(hour + " hours");
    }
    ;
    switch (minute) {
        case 0: break;
        case 1:
            units.push("1 minute");
            break;
        default: units.push(minute + " minutes");
    }
    ;
    switch (seconds) {
        case 0: break;
        case 1:
            units.push("1 second");
            break;
        default: units.push(seconds + " seconds");
    }
    ;
    return units.join(", ");
}
function timeToMs(msg) {
    const timeRegex = /(?<num>[0-9]+) ?(?<unit>s|m|h|d)/g;
    if (!msg.match(timeRegex)) {
        throw "Please provide a valid amount of time in the `time` option for how long this channel should be dead until a response is sent. For example, `2m` will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days.";
    }
    else {
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
            if (ms > 604800000)
                throw "Your timer is too long. It must be less than 7 days.";
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
    let dbServers = await Servers.findAll();
    let dbChannels = await Channels.findAll();
    for (let row of dbServers) {
        servers.set(row.server, new Responses(row.server, row.responses));
    }
    for (let row of dbChannels) {
        let discordChannel;
        try {
            discordChannel = await client.channels.fetch(row.channel);
        }
        catch (error) {
            console.warn(error);
            continue;
        }
        if (discordChannel instanceof discord_js_1.default.TextChannel) {
            channels.set(row.channel, new Chat(discordChannel, row.timer));
        }
        else {
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
    (0, registerCommands_js_1.deploy)(client.application.id);
    if (config_js_1.default.activity)
        client.user.setActivity(config_js_1.default.activity);
});
client.on("interactionCreate", async (action) => {
    var chat = channels.get(action.channelId);
    if (action.isCommand()) {
        if (action.commandName == "info") {
            await action.reply({ embeds: [config_js_1.default.infoEmbed] });
            return;
        }
        if (!action.guild) {
            await action.reply(`${config_js_1.default.emojis.error} This command cannot be used outside of a server.`);
            return;
        }
        if (!(action.channel instanceof discord_js_1.default.TextChannel)) {
            await action.reply(`${config_js_1.default.emojis.error} This command can only be used inside a standard text channel. It cannot be used in a thread or announcement channel.`);
            return;
        }
        if (action.commandName == "query") {
            if (chat) {
                await action.reply(`dead chat xd is enabled in this channel. I will send a message when there is no activity in this channel for ${chat.time}.`);
            }
            else {
                await action.reply("dead chat xd is not enabled in this channel.");
            }
        }
        else if (action.commandName == "enable") {
            if (chat) {
                await action.reply(`${config_js_1.default.emojis.error} dead chat xd is already enabled in this channel. If you want to change the timer, use the \`/edit\` command instead.`);
                return;
            }
            else {
                let parsedTime;
                try {
                    parsedTime = timeToMs(action.options.getString("timer").toLowerCase());
                }
                catch (error) {
                    await action.reply(`${config_js_1.default.emojis.error} ${error}`);
                    return;
                }
                try {
                    if (!servers.has(action.guildId)) {
                        await Servers.create({
                            server: action.guildId,
                            responses: config_js_1.default.defaultResponses
                        });
                        servers.set(action.guildId, new Responses(action.guildId, config_js_1.default.defaultResponses));
                    }
                    await Channels.create({ channel: action.channelId, timer: parsedTime });
                }
                catch (error) {
                    console.error(error);
                    await action.reply(`${config_js_1.default.emojis.error} There was an error while trying to contact the database. ${config_js_1.default.tryAgainMsg}`);
                    return;
                }
                let initChat = new Chat(action.channel, parsedTime);
                channels.set(action.channelId, initChat);
                await action.reply(`${config_js_1.default.emojis.success} Success! I will send a message when there is no activity in this channel for ${initChat.time}. Use the \`/editresponses\` command to change what I will respond with.`);
            }
        }
        else if (action.commandName == "disable") {
            if (!chat) {
                await action.reply(`${config_js_1.default.emojis.error} Cannot disable; dead chat xd is not enabled in this channel.`);
                return;
            }
            else {
                chat.stop();
                channels.delete(action.channelId);
                try {
                    await Channels.destroy({ where: { channel: action.channelId } });
                }
                catch (error) {
                    console.error(error);
                    await action.reply(`${config_js_1.default.emojis.warn} The timer has been stopped, but there was an error trying to delete it from the database. If I start responding again, try the \`/disable\` command again.`);
                    return;
                }
                await action.reply(`${config_js_1.default.emojis.success} dead chat xd has been disabled in this channel successfully.`);
            }
        }
        else if (action.commandName == "edit") {
            if (!chat) {
                await action.reply(`${config_js_1.default.emojis.error} Cannot edit; dead chat xd is not enabled in this channel. To enable it, use the \`/enable\` command instead.`);
                return;
            }
            else {
                let parsedTime;
                try {
                    parsedTime = timeToMs(action.options.getString("timer").toLowerCase());
                }
                catch (error) {
                    await action.reply(`${config_js_1.default.emojis.error} ${error}`);
                    return;
                }
                try {
                    await Channels.update({ timer: parsedTime }, { where: { channel: action.channelId } });
                }
                catch (error) {
                    console.error(error);
                    await action.reply(`${config_js_1.default.emojis.error} There was an error while trying to contact the database. ${config_js_1.default.tryAgainMsg}`);
                    return;
                }
                let humanTime = chat.edit(parsedTime);
                await action.reply(`${config_js_1.default.emojis.success} Success! I will send a message when there is no activity in this channel for ${humanTime}. Use the \`/editresponses\` command to change what I will respond with.`);
            }
        }
        else if (action.commandName == "responses") {
            const responses = servers.get(action.guildId);
            if (responses)
                await action.reply(responses.message);
            else
                await action.reply({ embeds: [emptyPage] });
        }
        else if (action.commandName == "editresponses") {
            const responses = servers.get(action.guildId);
            if (action.options.getSubcommand() == "add") {
                try {
                    await responses.add(action.options.getString("content"));
                }
                catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config_js_1.default.emojis.success} Response added.`);
            }
            else if (action.options.getSubcommand() == "edit") {
                try {
                    await responses.edit(action.options.getInteger("index"), action.options.getString("content"));
                }
                catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config_js_1.default.emojis.success} Response edited.`);
            }
            else if (action.options.getSubcommand() == "delete") {
                try {
                    await responses.delete(action.options.getInteger("index"));
                }
                catch (error) {
                    await action.reply(catchCommandError(error));
                    return;
                }
                await action.reply(`${config_js_1.default.emojis.success} Response deleted.`);
            }
            else {
                await action.reply(`${config_js_1.default.emojis.error} Please use a valid subcommand, such as \`/editresponses add\`.`);
            }
        }
    }
    else if (action.isButton()) {
        await action.update(servers.get(action.guildId).switchToPage(Number(action.customId)));
    }
});
client.on("messageCreate", async (message) => {
    var chat = channels.get(message.channelId);
    if (chat && (message.author.id != client.user.id))
        chat.reset();
    if (message.mentions.has(client.user) && cmdRegex.test(message.content))
        await message.reply("dead chat xd has switched to Slash Commands. For example, to use the query command, type `/query`. You may need Use Application Commands permissions to do this.");
});
client.on("guildDelete", async (guild) => {
    for (let channelId in guild.channels.cache) {
        let chat = channels.get(channelId);
        if (chat)
            await chat.delete();
    }
});
client.on("channelDelete", async (channel) => {
    let chat = channels.get(channel.id);
    if (chat)
        await chat.delete();
});
client.login(config_js_1.default.token);
