const { getUser } = require('../helper.js');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setkarma')
		.setDescription('ADMIN ONLY sets a users karma to a specific amount')
		.addUserOption(option => 
			option
				.setName("user")
				.setDescription("Who to modify?")
				.setRequired(true))
		.addIntegerOption(option => 
			option
				.setName("amount")
				.setDescription("The new value.")
				.setMinValue(-10)
				.setMaxValue(10)
				.setRequired(true))
		.setDefaultMemberPermissions(0),
	async execute(interaction) {
		let user = interaction.options.getUser('user');
		let amount = interaction.options.getInteger('amount');
		if(user.bot){
			return interaction.reply({content:'Bots cannot be modified',ephemeral: true});
		}
		let userData = await getUser(user.id);
		userData.karma = amount;
		await userData.save();
		return interaction.reply({content:`${user.username} karma has been set to ${userData.karma}.`,ephemeral: true})
	},
};