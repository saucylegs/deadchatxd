// Configuration for dead chat xd bot
// !!! This file may contain sensitive information. If this file is configured, DO NOT make this public.

module.exports = {

    // == Discord Bot Token ==
    token: "token", // Your bot's token from https://discord.com/developers.

    // == SQL Database information ==
    dialect: "mysql", // Database software; one of "mysql" | "mariadb" | "postgres"
    host: "localhost",
    username: "username",
    password: "password",
    database: "database",

    // == Top.gg settings ==
    // Settings for the Top.gg API, for if the bot is listed on Top.gg.

    topgg: false, // Keep this false if you are not using Top.gg. All of the other Top.gg settings will then have no effect.
    topggToken: "token",

    // == Discord behavior settings ==

    emojis: {
        error: "❌",
        success: "✅",
        info: "ℹ️",
        warn: "⚠️"
    },

    // If there was a database error or some unknown error while executing a command, this will be appended to the message that is sent to the user.
    tryAgainMsg: "Please try again later, or open an issue on the GitHub page (<https://github.com/saucylegs/deadchatxd>) if the error persists.",

    defaultResponses: [ // If responses haven't been configured by the user, these will be the defaults.
        "https://cdn.discordapp.com/attachments/366776253124050947/747354851570090004/dead_chat_xd.gif",
        "https://cdn.discordapp.com/attachments/366776253124050947/747767766467084288/dead_chat_xd_2.gif",
        "https://tenor.com/view/dead-chat-gif-18800792",
        "https://cdn.discordapp.com/attachments/366776253124050947/752805605583880192/dead_chat_xd_4.gif",
        "https://cdn.discordapp.com/attachments/671076353944059905/758165638387728434/dead_chat_xd_5.gif",
        "https://cdn.discordapp.com/attachments/366776253124050947/759711661468155914/dead_chat_xd_6.gif",
        "https://tenor.com/view/dead-chat-xd-gif-19206088",
        "https://cdn.discordapp.com/attachments/671076353944059905/802811004828123136/dead_chat_xd_8.gif"
    ],

    embedColor: 0xffcc4d, // The color that should be used for all embeds.

    infoEmbed: { // The embed that the bot will respond with when the /info command is used.
        color: 0xffcc4d,
        title: "dead chat xd bot",
        fields: [
            {
                name: "Bot Info",
                value: "This bot will send a message if chat is inactive for a certain amount of time. It can be enabled in any regular text channel using the `/enable` command. By default, it will send a random GIF from an assortment of dead chat xd meme GIFs, but you can configure the possible responses using the `/responses` and `/editresponses` commands. Responses are synced across all channels in a given server. \n \u200b"
            },
            {
                name: "Commands",
                value: "This bot uses Slash Commands. If you have the requisite permissions, you can just type `/` to look at available commands. \n \u200b",
            },
            {
                name: "Links",
                value: "[Bot Invite Link](https://discord.com/api/oauth2/authorize?client_id=747345374309777428&permissions=379904&scope=bot) | [top.gg](https://top.gg/bot/747345374309777428) | [GitHub](https://github.com/saucylegs/deadchatxd)",
            },
        ],
    },

    activity: "" // String that will show on Discord as what the bot is "playing". Leave empty to disable this

};