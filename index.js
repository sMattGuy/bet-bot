// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Users } = require('./dbObjects.js');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./auth.json');
const cron = require('cron');

const client = new Client({intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

let dailyRefresh = new cron.CronJob('0 0 * * *', async () => {
	const users = await Users.findAll();
	for(let i=0;i<users.length;i++){
		if(users[i].balance < 5){
			users[i].balance = 5;
			users[i].save();
			console.log(`gave coin to ${users[i].user_id}`);
		}
	}
});
dailyRefresh.start();

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);
