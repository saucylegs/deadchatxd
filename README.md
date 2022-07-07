# deadchatxd
dead chat xd is a Discord bot that will send a message if chat is inactive for a certain amount of time. It can be enabled in any regular text channel using the `/enable` command. By default, it will send a random GIF from an assortment of dead chat xd meme GIFs, but you can configure the possible responses using the `/responses` and `/editresponses` commands. Responses are synced across all channels in a given server.

[Invite me to your server](https://discord.com/api/oauth2/authorize?client_id=747345374309777428&permissions=379904&scope=bot)

## Using the bot
Make sure the bot has Embed Links permissions, otherwise it will not be able to embed gifs.

### Commands
As the bot uses Slash Commands, you can just type <code>/</code> for a list of available commands!

- <code>/info</code> - Shows info about the bot
- <code>/query</code> - Tells you if dead chat xd is enabled in this channel; and if it is, how long the timer is.
- <code>/enable <i>timer</i></code> - Enables dead chat xd in this channel. You must replace <i>timer</i> with the amount of time this channel should be inactive for the bot to activate. For example, <code>enable 2m</code> will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days. (Requires Manage Channels permissions by default)
- <code>/disable</code> - Disables dead chat xd in this channel. (Requires Manage Channels permissions by default)
- <code>/edit <i>timer</i></code> - Use this to edit the timer for this channel. Same instructions as the enable command. (Requires Manage Channels permissions by default)
- <code>/responses</code> - Shows a list of all the possible messages the bot will respond with. Responses are synced across all channels in a given server.
- <code>/editresponses add <i>content</i></code> - Adds the message <i>content</i> to the list of possible responses. (Requires Manage Channels permissions by default)
- <code>/editresponses delete <i>index</i></code> - Removes the specified message from the list of responses. The index of the message is the number listed before the message on the /responses command. (Requires Manage Channels permissions by default)
- <code>/editresponses edit <i>index</i> <i>content</i></code> - Edits the specified message to <i>content</i>. The index of the message is the number listed before the message on the /responses command. (Requires Manage Channels permissions by default)

## Issues, Bugs, Suggestions
If you have a bug to report or an idea to suggest, use the [issues page](https://github.com/saucylegs/deadchatxd/issues)!

## Self-hosting
If you want to host a version of this bot yourself, you'll need the latest versions of Node.js, npm, and a database. 
These instructions assume you're using Linux and have some experience with this kind of stuff.

### Making a database
This bot uses an SQL database. It has been tested with MySQL, but should theoretically also work with MariaDB and PostgreSQL.

Before you try to start the bot, you need to create a database and add these tables to it:
```SQL
CREATE TABLE channels (channel VARCHAR(18), timer INT, createdAt DATETIME, updatedAt DATETIME);
CREATE TABLE servers (server VARCHAR(18), responses JSON, createdAt DATETIME, updatedAt DATETIME);
```

### Getting & running the code
1. Go to where you want the bot stored, clone the repository, and go into the directory
```bash
git clone https://github.com/saucylegs/deadchatxd
cd deadchatxd
```
2. Install node.js dependencies
```bash
npm install
npm install mysql2 # Only if you're using MySQL
npm install pg pg-hstore # Only if you're using PostgreSQL
npm install mariadb # Only if you're using MariaDB
```
3. Configure the bot by editing the `config.js` file.
3. Start the bot.
```bash
node deadchatxd.js
```
