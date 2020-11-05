#!/usr/bin/env node
// for systemd

/* -- THIS FILE IS NOT USED ANYMORE --

This is the code that was used before the bot was made public. I didn't put much effort into this.
It only worked in 2 Discord channels which are hard-coded into the bot. Hence why it wasn't public.

I'm keeping it here for archival purposes, and if anyone wants to self-host a very simple version of the bot.
If you do want to use this, make sure to change the channel IDs.
*/

// Command to start the bot:
// TOKEN='DISCORD BOT TOKEN' node ./monerbot-github.js

'use strict';

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log("Connected as ", client.user.tag);
    // client.user.setActivity(" ");
})

var IH_timeout;
var IH_channel;
var testserver_timeout;
var testserver_channel;

function IH_send() {
    switch (Math.floor(Math.random() * 7)) {
        case 0:
            IH_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/748499440192454747/dead_chat_xd_3.gif");
            break;
        case 1:
            IH_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747767766467084288/dead_chat_xd_2.gif");
            break;
        case 2:
            IH_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/752805605583880192/dead_chat_xd_4.gif");
            break;
        case 3:
            IH_channel.send("https://cdn.discordapp.com/attachments/671076353944059905/758165638387728434/dead_chat_xd_5.gif");
            break;
        case 4:
            IH_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/759711661468155914/dead_chat_xd_6.gif");
            break;
        default:
            IH_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747354851570090004/dead_chat_xd.gif");
            break;
    }
}

function testserver_send() {
    switch (Math.floor(Math.random() * 7)) {
        case 0:
            testserver_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/748499440192454747/dead_chat_xd_3.gif");
            break;
        case 1:
            testserver_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747767766467084288/dead_chat_xd_2.gif");
            break;
        case 2:
            testserver_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/752805605583880192/dead_chat_xd_4.gif");
            break;
        case 3:
            testserver_channel.send("https://cdn.discordapp.com/attachments/671076353944059905/758165638387728434/dead_chat_xd_5.gif");
            break;
        case 4:
            testserver_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/759711661468155914/dead_chat_xd_6.gif");
            break;
        default:
            testserver_channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747354851570090004/dead_chat_xd.gif");
            break;
    }
}

client.on('message', message => {
    switch (message.channel.id) {
        case "746215515378417674":
            // Irony Hub general
            if (message.author.id == "747345374309777428") {
                // Prevent bot from restarting the timer after its own message
                break;
            }
            if (!IH_channel) {
                IH_channel = message.channel;
            }
            clearTimeout(IH_timeout);
            IH_timeout = setTimeout(IH_send, 120000);
            break;
        case "747347527585628250":
            // A channel in my own server that I used for testing
            if (message.author.id == "747345374309777428") {
                // Prevent bot from restarting the timer after its own message
                break;
            }
            if (!testserver_channel) {
                testserver_channel = message.channel;
            }
            clearTimeout(testserver_timeout);
            testserver_timeout = setTimeout(testserver_send, 120000);
            break;
        default:
            break;
    }
})

// Use bot token from https://discord.com/developers/applications/
client.login(process.env.TOKEN);