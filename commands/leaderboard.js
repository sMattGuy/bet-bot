const { getAllUsers } = require('../helper.js');
const { codeBlock , SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Shows who is winning the most bets, and who has the most coins!'),
	async execute(interaction) {
		await interaction.reply({content:`Processing Leaderboard, please wait!`});
		let users = await getAllUsers();
		let leaderMap = new Map();
		for(let i=0;i<users.length;i++){
			let score = users[i].balance + (10 * users[i].wins) - (10 * users[i].loses);
			leaderMap.set(users[i].user_id, {"balance":users[i].balance,"wins":users[i].wins,"loses":users[i].loses,"score":score});
		}
		let sorterdMap = new Map([...leaderMap.entries()].sort((a,b)=>b[1].score-a[1].score));
		let position = 1;
		let leaderboardMessage =  'The Leaderboard\n';
		for(let [key, value] of sorterdMap){
			try{
				const username = await interaction.client.users.fetch(key).then(userf => {return userf.username});
				leaderboardMessage += `(${position}). ${username}: ${value.balance}\$ W:${value.wins} L:${value.loses} SCORE:${value.score}\n`;
				position++;
			}
			catch(error){
				console.log(`error in leaderboard for user ${key}`);
			}
			if(position > 10)
				break;
		}
		interaction.editReply({content:codeBlock(`${leaderboardMessage}`) });
	},
};