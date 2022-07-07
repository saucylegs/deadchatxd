const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes, PermissionFlagsBits } = require("discord-api-types/v10");
const config = require("./config.js");

const rest = new REST({version: "10"}).setToken(config.token);

const commands = [
    
    // "INFO" command
    new SlashCommandBuilder()
    .setName("info")
    .setDescription("Shows information about this bot"),

    // "QUERY" command
    new SlashCommandBuilder()
    .setName("query")
    .setDescription("Tells you whether dead chat xd is enabled in the current channel")
    .setDMPermission(false),

    // "ENABLE" command
    // Requires Manage Channels permissions by default
    new SlashCommandBuilder()
    .setName("enable")
    .setDescription("Enables dead chat xd in this channel")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option => 
        option.setName("timer")
        .setDescription("How long the channel should be inactive for the bot to be activated. For example, `2m 30s`")
        .setRequired(true)
    ),

    // "DISABLE" command
    // Requires Manage Channels permissions by default
    new SlashCommandBuilder()
    .setName("disable")
    .setDescription("Disables dead chat xd in this channel")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    // "EDIT" command
    // Requires Manage Channels permissions by default
    new SlashCommandBuilder()
    .setName("edit")
    .setDescription("Edits the timer for when dead chat xd should be activated")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option =>
        option.setName("timer")
        .setDescription("How long the channel should be inactive for the bot to be activated. For example, `2m 30s`")
        .setRequired(true)
    ),

    // "RESPONSES" command
    new SlashCommandBuilder()
    .setName("responses")
    .setDescription("Get the list of all possible messages I'll respond with")
    .setDMPermission(false),

    // "EDITRESPONSES" command and subcommands
    // Requires Manage Channels permissions by default
    new SlashCommandBuilder()
    .setName("editresponses")
    .setDescription("Edit what I will respond with when activated")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand => 
        // "EDITRESPONSES ADD" subcommand
        subcommand.setName("add")
        .setDescription("Add a response")
        .addStringOption(option => 
            option.setName("content")
            .setDescription("The content of the message I would respond with")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        // "EDITRESPONSES EDIT" subcommand
        subcommand.setName("edit")
        .setDescription("Edits the content of a particular response")
        .addIntegerOption(option =>
            option.setName("index")
            .setDescription("The number that appears before the response in the `/responses view` command")
            .setRequired(true)
        )
        .addStringOption(option => 
            option.setName("content")
            .setDescription("The new content of the response")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        // "EDITRESPONSES DELETE" subcommand
        subcommand.setName("delete")
        .setDescription("Deletes a particular response")
        .addIntegerOption(option =>
            option.setName("index")
            .setDescription("The number that appears before the response in the `/responses view` command")
            .setRequired(true)
        )
    )

];

let commandsJSON = [];
for (let command of commands)
    commandsJSON.push(command.toJSON());

/**
 * Registers the bot's commands globally with the Discord API.
 * @param {string} clientId The application ID of the bot (you can use client.application.id)
 */
async function deploy(clientId) {
    await rest.put(
        Routes.applicationCommands(clientId),
        {body: commandsJSON}
    );
    console.log("Successfully sent application commands to the API");
}

/**
 * Registers the bot's commands as guild commands (only usable on one particular server) with the Discord API.
 * @param {string} clientId The application ID of the bot (you can use client.application.id)
 * @param {string} guildId The ID of the guild you want to register the commands to
 */
async function deployToGuild(clientId, guildId) {
    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        {body: commandsJSON}
    );
    console.log("Successfully sent application commands to the API for guild " + guildId);
}


exports.commands = commands;
exports.commandsJSON = commandsJSON;
exports.deploy = deploy;
exports.deployToGuild = deployToGuild;
