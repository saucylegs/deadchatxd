# deadchatxd
dead chat xd is a Discord bot that will send a "dead chat xd" meme gif if a channel is inactive for a certain amount of time.

## Using the bot
Make sure the bot has Embed Links permissions, otherwise it will not be able to embed gifs.

### Commands
The enable, disable, and edit commands require you to have Manage Channels permissions to use.

- `@dead chat xd help` - Outputs the help message, which shows a list of commands and info about the bot.
- `@dead chat xd query` - Tells you if dead chat xd is enabled in this channel; and if it is, how long the timer is.
- `@dead chat xd enable <time>` - Enables dead chat xd in this channel. You must replace <time> with the amount of time this channel should be inactive for the bot to activate. For example, `enable 2m` will activate the bot if no messages are sent for 2 minutes. Use the letters s, m, h, and d to specify seconds, minutes, hours, and days.
- `@dead chat xd disable` - Disables dead chat xd in this channel.
- `@dead chat xd edit <time>` - Use this to edit the timer for this channel. Same instructions as the enable command.
  
### GIFs
Once the timer goes off and the bot activates, it will send one of the following gifs:
[1](https://cdn.discordapp.com/attachments/366776253124050947/747354851570090004/dead_chat_xd.gif) (highest chance), [2](https://cdn.discordapp.com/attachments/366776253124050947/747767766467084288/dead_chat_xd_2.gif), [3](https://cdn.discordapp.com/attachments/366776253124050947/748499440192454747/dead_chat_xd_3.gif), [4](https://cdn.discordapp.com/attachments/366776253124050947/752805605583880192/dead_chat_xd_4.gif), [5](https://cdn.discordapp.com/attachments/671076353944059905/758165638387728434/dead_chat_xd_5.gif), [6](https://cdn.discordapp.com/attachments/366776253124050947/759711661468155914/dead_chat_xd_6.gif)

## Issues, Bugs, Suggestions
If you have a bug to report or an idea to suggest, use the [issues page](https://github.com/saucylegs/deadchatxd/issues)!

If there's a critical issue, such as the bot not being able to contact the database, please send me a Discord DM if you can (Saucy#6942) so I can fix it ASAP.

## Self-hosting
If you want to host a version of this bot yourself, you'll need the latest versions of Node.js, npm, and MySQL. 
These instructions assume you're using Linux and have some experience with this kind of stuff.

### Making a database
This bot uses MySQL as a database.

Before you try to start the bot, you need to create a database and add this table to it:
```SQL
CREATE TABLE channels (channel VARCHAR(18), timer INT(10));
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
```
3. Start the bot.
```bash
TOKEN='<discord bot token>' ACTIVITY='<discord activity>' MYSQL_HOST='<host ip>' MYSQL_USER='<username>' MYSQL_PASSWORD='<password>' MYSQL_DATABASE='<database>' node deadchatxd.js
```
`<TOKEN>` is your Discord bot token that you get from the [Discord developer dashboard](https://discord.com/developers/applications). `<ACTIVITY>` is optional, that's what shows up on Discord as the game your bot is playing. `<MYSQL_HOST>` is the IP address of the MySQL server you're using, if it's running on the same machine as the bot, you can just use localhost. `<MYSQL_USER>` and `<MYSQL_PASSWORD>` is the username and password your bot will use to log in to the MySQL database. `<MYSQL_DATABASE>` is the name of the database where the table you created earlier is stored.
