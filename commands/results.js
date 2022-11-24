const { removeChallengers, getChallengers, getUser, processResult } = require('../helper.js');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('results')
		.setDescription('Finishes a bet and decides the winner!'),
	async execute(interaction) {
		let usersReal = await getChallengers(interaction.user.id);
		if(usersReal.code == 0){
			//users in activeMap remove them now and prepare for decision
			//with both challengers, set up buttons
			let user1 = interaction.user;
			let user2 = await interaction.client.users.fetch(usersReal.opp);
			const filter = i => i.customId === 'user1' || i.customId === 'user2';
			const choiceRow = new ActionRowBuilder()
				.addComponents(
				new ButtonBuilder()
					.setCustomId('user1')
					.setLabel(`${user1.username}`)
					.setStyle(1),
				new ButtonBuilder()
					.setCustomId('user2')
					.setLabel(`${user2.username}`)
					.setStyle(1),
			);
			await interaction.reply(`${user1.username}, check your DM to pick who won, ${user2.username} you will be messaged after they pick!`);
			//set up DM
			const user1DM = await user1.createDM();
			const user2DM = await user2.createDM();
			const user1Collector = await user1DM.createMessageComponentCollector({filter,time:60000});
			const user2Collector = await user2DM.createMessageComponentCollector({filter,time:120000});
			//send message for picking a winner
			user1.send({content:`Select the Winner!`,components:[choiceRow]}).then(challMsg => {
				user1Collector.once('collect', async bi => {
					bi.update({content:`Got it, collecting other users response...`,components:[]});
					user2.send({content:`Select the Winner!`,components:[choiceRow]}).then(oppMsg => {
						user2Collector.once('collect', async obi => {
							await bi.editReply({content:`Go back to the original channel for the results!`,components:[]});
							await obi.update({content:`Go back to the original channel for the results!`,components:[]});
							
							let user1Choice = bi.customId;
							let user2Choice = obi.customId;
							
							if(user1Choice  == user2Choice){
								//both agree on who won
								let winnerName = '';
								let loserName = '';
								let winner = '';
								let loser = '';
								if(user1Choice == 'user1'){
									winner = await getUser(user1.id);
									winnerName = user1.username;
									loser = await getUser(user2.id);
									loserName = user2.username;
								}
								else{
									winner = await getUser(user2.id);
									winnerName = user2.username;
									loser = await getUser(user1.id);
									loserName = user1.username;
								}
								//start processing
								//winner gets coins, both get 1 karma for being honest
								//amount win loss karma
								await removeChallengers(user1.id);
								await processResult(winner, usersReal.bet, 1, 0, 1);
								await processResult(loser, -usersReal.bet, 0, 1, 1);
								const betEmbed = new EmbedBuilder()
									.setColor('#00AF2F')
									.setTitle('We have a winner!')
									.setDescription(`${winnerName} has won against ${loserName}, winning ${usersReal.bet} coins! Both users got 1 Karma for their honesty!`);
								return interaction.editReply({content:``,components:[],embeds:[betEmbed]});
							}
							else{
								//people didnt agree on who won
								//fetch this servers owner
								let ownerId = interaction.guild.ownerId;
								let ownerUser = await interaction.client.users.fetch(ownerId);
								const betEmbed = new EmbedBuilder()
									.setColor('#D60700')
									.setTitle('Someone is lying!')
									.setDescription(`Both users didn't agree on who won! Get ${ownerUser} to select the true winner!`);
								const liarFilter = i => i.user.id === ownerId && (i.customId === 'user1' || i.customId === 'user2');
								const accCollector = await interaction.channel.createMessageComponentCollector({filter:liarFilter, time: 180000});
								await interaction.editReply({content:``,components:[choiceRow],embeds:[betEmbed]}).then(msg => {
									accCollector.once('collect', async buttInteraction => {
										//process what the admin picked
										let winnerName = '';
										let loserName = '';
										let winner = '';
										let loser = '';
										if(buttInteraction.customId == 'user1'){
											winner = await getUser(user1.id);
											winnerName = user1.username;
											loser = await getUser(user2.id);
											loserName = user2.username;
										}
										else{
											winner = await getUser(user2.id);
											winnerName = user2.username;
											loser = await getUser(user1.id);
											loserName = user1.username;
										}
										//discover who lied
										if(user1Choice != buttInteraction.customId){
											//user1 lied
											let liarUser = await getUser(user1.id);
											liarUser.karma += -3;
											let truthUser = await getUser(user2.id);
											truthUser.karma += 3;
											await liarUser.save();
											await truthUser.save();
										}
										else{
											//user2 lied
											let liarUser = await getUser(user2.id);
											liarUser.karma += -3;
											let truthUser = await getUser(user1.id);
											truthUser.karma += 3;
											await liarUser.save();
											await truthUser.save();
										}
										
										await removeChallengers(user1.id);
										await processResult(winner, usersReal.bet, 1, 0, 0);
										await processResult(loser, -usersReal.bet, 0, 1, 0);

										const betEmbed = new EmbedBuilder()
											.setColor('#00AF2F')
											.setTitle('We have a winner!')
											.setDescription(`${winnerName} has won against ${loserName}, winning ${usersReal.bet} coins!`);
										return interaction.editReply({content:``,components:[],embeds:[betEmbed]});
									});
									accCollector.once('end',async collected => {
										if(collected.size == 0){
											await removeChallengers(user1.id);
											await interaction.editReply({content:'Admin didn\'t respond in time, the bet is VOIDED',components:[]}).catch(e => console.log('no interaction exists'));
											return;
										}
									});
								});
							}
						});
						user2Collector.once('end',async collected => {
							if(collected.size == 0){
								await removeChallengers(user1.id);
								await interaction.editReply(`User didn't respond in time, the bet is VOIDED!`);
								oppMsg.delete();
							}
						});
					});
				});
				user1Collector.once('end',async collected => {
					if(collected.size == 0){
						await removeChallengers(user1.id);
						await interaction.editReply(`User didn't respond in time, the bet is VOIDED!`);
						challMsg.delete();
					}
				});
			});
		}
		else{
			//user not betting, error and leave
			betEmbed = new EmbedBuilder()
				.setColor('#D60700')
				.setTitle(`No active bets!`)
				.setDescription(`You're not betting someone right now!`);
			return interaction.reply({embeds: [betEmbed]});
		}
	},
};