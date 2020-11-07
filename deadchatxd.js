#!/usr/bin/env node
// for systemd

// dead chat xd Discord bot - MIT License - https://github.com/saucylegs/deadchatxd

'use strict';

const Discord = require('discord.js');
const mysql = require('mysql');
const client = new Discord.Client();

// const gifRegex = /dead_chat_xd/g;
const cmdRegex = /(help|query|enable|disable|edit)/g;

var cl = [];
var tl = [];
var st = [];
// channel list, timer list, stored timeouts

// Embed for the help command
const helpEmbed = {
    color: 0xffcc4d,
    title: "dead chat xd bot",
    description: 'This bot will send a "dead chat xd" meme gif if chat is inactive for a certain amount of time.',
    fields: [
        {
            name: "Commands",
            value: "The enable, disable, and edit commands require Manage Channels permissions to use. Also, make sure I have Embed Links permissions before enabling me. \n \u200b \n- `@dead chat xd help` - Outputs the message you're looking at right now. \n- `@dead chat xd query` - Tells you if dead chat xd is enabled in this channel; and if it is, how long the timer is. \n- `@dead chat xd enable <time>` - Enables dead chat xd in this channel. You must replace <time> with the amount of time this channel should be inactive for the bot to activate. For example, `enable 2m` will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days. \n- `@dead chat xd disable` - Disables dead chat xd in this channel. \n- `@dead chat xd edit <time>` - Use this to edit the timer for this channel. Same instructions as the enable command. \n \u200b",
        },
        {
            name: "Bot Info",
            value: "[Bot Invite Link](https://discord.com/api/oauth2/authorize?client_id=747345374309777428&permissions=379904&scope=bot) | [GitHub](https://github.com/saucylegs/deadchatxd) | Creator: Saucy#6942",
        },
    ],
};

var pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
})

pool.on('release', function() {
    console.log("SQL connection released");
})

function sendImg(chId) {
    client.channels.fetch(chId).then(channel => {
        switch (Math.floor(Math.random() * 7)) {
            case 0:
                channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747767766467084288/dead_chat_xd_2.gif");
                break;
            case 1:
                channel.send("https://cdn.discordapp.com/attachments/366776253124050947/748499440192454747/dead_chat_xd_3.gif");
                break;
            case 2:
                channel.send("https://cdn.discordapp.com/attachments/366776253124050947/752805605583880192/dead_chat_xd_4.gif");
                break;
            case 3:
                channel.send("https://cdn.discordapp.com/attachments/671076353944059905/758165638387728434/dead_chat_xd_5.gif");
                break;
            case 4:
                channel.send("https://cdn.discordapp.com/attachments/366776253124050947/759711661468155914/dead_chat_xd_6.gif");
                break;
            default:
                channel.send("https://cdn.discordapp.com/attachments/366776253124050947/747354851570090004/dead_chat_xd.gif");
                break;
        }
    })
    .catch(error => {
        console.error(error);
        console.log("Could not fetch the requested channel! Channel:", chId);
        // Channel is presumably deleted or no longer accessible, send sql request to delete it from the database
        let sqlCommand = "DELETE FROM channels WHERE channel = " + pool.escape(chId);
        pool.query(sqlCommand, function (error, results) {
            if (error) {
                console.error("Error deleting row from the database:", error);
            } else {
                console.log("Deleted " + results.affectedRows + " row(s) from the database.");
            }
        });
    });
}

function startTimer(ch, index) {
    var interval = Number(tl[index]);
    st[index] = setTimeout(()=>{
        sendImg(ch);
    }, interval);
}

// Converts milliseconds to human-understandable time
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
    switch (day) {case 0: break; case 1: units.push("1 day"); break; default: units.push(day + " days");};
    switch (hour) {case 0: break; case 1: units.push("1 hour"); break; default: units.push(hour + " hours");};
    switch (minute) {case 0: break; case 1: units.push("1 minute"); break; default: units.push(minute + " minutes");};
    switch (seconds) {case 0: break; case 1: units.push("1 second"); break; default: units.push(seconds + " seconds");};

    return units.join(", ");
}

// Converts a value such as "2m" or "2h 20m 30s" to milliseconds.
function timeToMs(msg) {
    const timeRegex = /([0-9]+)( |)(s|m|h|d)/g;
    const numRegex = /([0-9]+)/g;
    const unitRegex = /(s|m|h|d)/g;
    var initialMatch = msg.match(timeRegex);

    if (!initialMatch) {
        return [false, "<:error:772980320680542238> Please provide an amount of time for how long this channel should be dead until a gif is sent. For example, `enable 2m` will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days."];
    } else {
        var msValues = [];
        initialMatch.forEach(match => {
            let num = Number(match.match(numRegex)[0]);
            let unit = match.match(unitRegex)[0];

            switch (unit) {
                case "s":
                    var ms = num * 1000;
                    break;
                case "m":
                    var ms = num * 60000;
                    break;
                case "h":
                    var ms = num * 3.6e+6;
                    break;
                case "d":
                    var ms = num * 8.64e+7;
                    break;
            }

            if (ms > 604800000) {
                return [false, "<:error:772980320680542238> Your timer is too long. It must be less than 7 days."];
            } else {
                msValues.push(ms);
            }
        });

        var totalMs = 0;
        msValues.forEach(val => {
            totalMs += val;
        });

        if (totalMs < 10000) {
            return [false, "<:error:772980320680542238> Your timer is too short. It must be at least 10 seconds."];
        } else if (totalMs > 604800000) {
            return [false, "<:error:772980320680542238> Your timer is too long. It must be less than 7 days."];
        } else {
            var successMsg = "<:success:772980011065802772> Success! I will send a dead chat xd gif if this channel has no activity for " + msToTime(totalMs) + " (" + totalMs + " milliseconds).";
            console.log("Converted time value to milliseconds:", totalMs);
            return [true, successMsg, totalMs];
        }
    }
}

function startup() {
    pool.query("SELECT * FROM channels", function (error, results) {
        if (error) throw error;
        results.forEach(function (row) {
            cl.push(row.channel);
            tl.push(row.timer);
        });
        console.log("Got channel list from database: ", cl);
        console.log("Got timer list from database: ", tl);
        if (cl.length != tl.length) {throw "!!! The channel and timer arrays do not match in length! How"};
        cl.forEach((item, index) => startTimer(item, index));
        console.log("Created " + st.length + " timeouts");
    });
}
startup();

client.on('ready', () => {
    console.log("Connected as ", client.user.tag);

    if (process.env.ACTIVITY) {
        client.user.setActivity(process.env.ACTIVITY);
    }
})

client.on('message', message => {
    if (!message || !message.guild || !message.channel) return;

    // Find if the message's channel is in the activated channels list
    let index = cl.indexOf(message.channel.id);
    if (index > -1) {
        // Prevent timer from restarting if message is from the bot itself
        /* I wanted to only prevent the timer from restarting if the message is from the bot AND contains a gif. But this only works sometimes and sometimes it doesn't work, I have no idea why. So I'm just preventing it for all self messages
        if (message.author.id == client.user.id && gifRegex.test(message.content)) {
        } else {
            clearTimeout(st[index]);
            startTimer(message.channel.id, index);
        }*/
        if (message.author.id != client.user.id) {
            clearTimeout(st[index]);
            startTimer(message.channel.id, index);
        }
    }

    if (message.mentions.has(message.guild.me) && !message.author.bot && cmdRegex.test(message.content)) {
        var chId = message.channel.id;
        let userPerms = message.channel.permissionsFor(message.member);
        let cmdMatch = ((message.content).toLowerCase()).match(cmdRegex);
        switch (cmdMatch[0]) {
            case "help":
                message.channel.send({embed:helpEmbed});
                break;
            case "query":
                if (index < 0) {
                    message.channel.send("dead chat xd is not enabled in this channel.");
                } else {
                    let timerVal = msToTime(tl[index]);
                    message.channel.send("dead chat xd is enabled in this channel, with a timer of " + timerVal);
                }
                break;
            case "enable":
                if (userPerms.has("MANAGE_CHANNELS")) {
                    if (index > -1) {
                        message.channel.send("<:error:772980320680542238> dead chat xd is already enabled in this channel. If you would like to disable it, use the `@dead chat xd disable` command. If you would like to edit the timer, use the `@dead chat xd edit *time*` command.");
                    } else {
                        let myPerms = message.channel.permissionsFor(message.guild.me);
                        if (myPerms.has("EMBED_LINKS")) {
        
                            var toMs = timeToMs((message.content).toLowerCase());
                            if (toMs[0] == false) {
                                message.channel.send(toMs[1]);
                            } else {
                                let ms = toMs[2];
                                // Jarvis, connect to the database and insert the channel and timer.
                                let sqlValues = [chId, ms];
                                pool.query("INSERT INTO channels (channel, timer) VALUES (?, ?)", sqlValues, function (error, results) {
                                    if (error) {
                                        console.error("Error inserting into the database:", error);
                                        message.channel.send("<:error:772980320680542238> There was an error while trying to contact the database. Please try again later or contact Saucy#6942 if the issue persists.");
                                    } else {
                                        console.log(results.message);
                                        console.log("Successfully inserted into the database:", sqlValues);
                                        // Push values to the arrays
                                        cl.push(chId);
                                        tl.push(ms);
                                        startTimer(chId, cl.indexOf(chId));
                                        message.channel.send(toMs[1]);
                                    }
                                });
                            }
                            
                        } else {
                            message.channel.send("<:error:772980320680542238> I don't seem to have Embed Links permissions in this channel. Please give me this permission so I can embed images.");
                        }
                    }
                } else {
                    message.channel.send("<:error:772980320680542238> You must have Manage Channels permissions to use this command.");
                }
                break;
            case "disable":
                if (userPerms.has("MANAGE_CHANNELS")) {
                    if (index < 0) {
                        message.channel.send("<:error:772980320680542238> Cannot disable, dead chat xd is not enabled in this channel.");
                    } else {
                        let sqlCommand = "DELETE FROM channels WHERE channel = " + pool.escape(chId);
                        pool.query(sqlCommand, function (error, results) {
                            if (error) {
                                console.error("Error deleting row from the database:", error);
                                message.channel.send("<:error:772980320680542238> There was an error while trying to contact the database. Please try again later or contact Saucy#6942 if the issue persists.");
                            } else {
                                console.log("Deleted " + results.affectedRows + " row(s) from the database.");
                                console.log("Successfully deleted channel " + chId + " from the database.");
                                clearTimeout(st[index]);
                                cl.splice(index, 1);
                                tl.splice(index, 1);
                                message.channel.send("<:success:772980011065802772> dead chat xd has been disabled in this channel.");
                            }
                        });
                    }
                } else {
                    message.channel.send("<:error:772980320680542238> You must have Manage Channels permissions to use this command.");
                }
                break;
            case "edit":
                if (userPerms.has("MANAGE_CHANNELS")) {
                    if (index < 0) {
                        message.channel.send("<:error:772980320680542238> Cannot edit, dead chat xd is not enabled in this channel.");
                    } else {
                        var toMs = timeToMs((message.content).toLowerCase());
                        if (toMs[0] == false) {
                            message.channel.send(toMs[1]);
                        } else {
                            let ms = toMs[2];
                            let sqlCommand = "UPDATE channels SET timer = " + pool.escape(ms) + " WHERE channel = " + pool.escape(chId);
                            pool.query(sqlCommand, function (error, results) {
                                if (error) {
                                    console.error("Error updating row in the database:", error);
                                    message.channel.send("<:error:772980320680542238> There was an error while trying to contact the database. Please try again later or contact Saucy#6942 if the issue persists.");
                                } else {
                                    console.log(results.message);
                                    console.log("Successfully updated the database: changed timer of " + chId + " to " + ms);
                                    clearTimeout(st[index]);
                                    tl[index] = ms;
                                    startTimer(chId, index);
                                    message.channel.send(toMs[1]);
                                }
                            })
                        }
                    }
                } else {
                    message.channel.send("<:error:772980320680542238> You must have Manage Channels permissions to use this command.");
                }
                break;
        }
    }
})

// Use bot token from https://discord.com/developers/applications/
client.login(process.env.TOKEN);
