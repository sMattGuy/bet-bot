const { getUser } = require('../helper.js');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Checks your stats or another users!')
		.addUserOption(option => 
			option
				.setName("user")
				.setDescription("Who you want to challenge?")),
	async execute(interaction) {
		let pickedUser =  interaction.options.getUser('user') ?? interaction.user;
		if(pickedUser.bot){
			return interaction.reply({content:'Bots have no interest in material wealth',ephemeral: true});
		}
		let userData = await getUser(pickedUser.id);
		const betEmbed = new EmbedBuilder()
			.setColor('#00AF2F')
			.setTitle(`${pickedUser.username} stats`)
			.addFields(
				{name:`Balance`, value:`${userData.balance}`, inline:true},
				{name:`Wins`, value:`${userData.wins}`, inline:true},
				{name:`Loses`, value:`${userData.loses}`, inline:true},
				{name:`Karma`, value:`${userData.karma}`, inline:true},
			);
		return interaction.reply({content:``,embeds:[betEmbed]});
	},
};