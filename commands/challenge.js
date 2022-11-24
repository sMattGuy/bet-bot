const { addChallengers, getUser } = require('../helper.js');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bet')
		.setDescription('Set up a bet with another user!')
		.addUserOption(option => 
			option
				.setName("user")
				.setDescription("Who you want to challenge?")
				.setRequired(true))
		.addIntegerOption(option => 
			option
				.setName("amount")
				.setDescription("How much to wager?")
				.setMinValue(1)
				.setRequired(true))
		.addStringOption(option => 
			option
				.setName("reason")
				.setDescription("The reason for the bet?")),
	async execute(interaction) {
		let asker = interaction.user
		let responder = interaction.options.getUser('user');
		let amount = interaction.options.getInteger('amount');
		let reason = '';
		if(interaction.options.getString('reason')){
			reason = `Reason: ${interaction.options.getString('reason')}`
		}
		//house keeping on data
		if(asker.id == responder.id){
			return interaction.reply({content:'You cannot bet against yourself!',ephemeral: true});
		}
		if(responder.bot){
			return interaction.reply({content:'Your mortal flesh is no match for the perfection of the machine.',ephemeral: true});
		}
		//get approval from the responder
		const startFilter = i => i.user.id === responder.id && (i.customId === 'accept' || i.customId === 'deny');
		const accRow = new ActionRowBuilder()
			.addComponents(
			new ButtonBuilder()
				.setCustomId('accept')
				.setLabel('Accept')
				.setStyle(3),
			new ButtonBuilder()
				.setCustomId('deny')
				.setLabel('Deny')
				.setStyle(4),
		);
		await getUser(asker.id);
		await getUser(responder.id);
		const accCollector = await interaction.channel.createMessageComponentCollector({filter:startFilter, time: 60000});
		await interaction.reply({content:`${responder}! ${asker} has bet ${amount} coins against you! Will you accept their challenge? ${reason}`,components:[accRow]}).then(msg => {
			accCollector.once('collect', async buttInteraction => {
				if(buttInteraction.customId == 'accept'){
					//user accepted bet proposal
					let challengeResult = await addChallengers(asker.id, responder.id, amount);
					let betEmbed = '';
					if(challengeResult.result){
						//added to challenge pool
						betEmbed = new EmbedBuilder()
							.setColor('#00AF2F')
							.setTitle('Let the games begin!')
							.setDescription(`It's ${asker.username} vs. ${responder.username} use /result to decide who won at the end!`);
					}
					else{
						if(challengeResult.code == 0){
							betEmbed = new EmbedBuilder()
								.setColor('#D60700')
								.setTitle('Someone is already betting another user!')
								.setDescription(`You can't start a new bet until the previous one finishes!`);
						}
						else if(challengeResult.code == 1){
							betEmbed = new EmbedBuilder()
								.setColor('#D60700')
								.setTitle(`Someone doesn't have enough coins!`)
								.setDescription(`Make sure you have enough coins before challenging!`);
						}
					}
					await interaction.editReply({content:``,embeds: [betEmbed], components:[]});
					return;
				}
				else if(buttInteraction.customId == 'deny'){
					await buttInteraction.update({content:`You have declined the bet!`,components:[]});
					return;
				}
			});
			accCollector.once('end',async collected => {
				if(collected.size == 0){
					await interaction.editReply({content:'Opponent didn\'t respond!',components:[]}).catch(e => console.log('no interaction exists'));
					return;
				}
			});
		});
	},
};