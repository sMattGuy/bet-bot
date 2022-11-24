const { Users } = require('./dbObjects.js');
const { EmbedBuilder } = require('discord.js');

const activeMap = new Map();

//creates a new user for the database
async function createNewUser(userId){
	const newUser = Users.create({"user_id": userId, "balance": 10, "wins": 0, "loses": 0, "karma": 0});
	return newUser;
}

async function getUser(userId){
	const user = await Users.findOne({where:{"user_id":userId}});
	if(user){
		//user found
		return user;
	}
	else{
		//new user
		const result = await createNewUser(userId);
		return result;
	}
}

async function getAllUsers(){
	let users = await Users.findAll();
	return users;
}
//adds the two challengers IDs to the map
//doesnt add if already in map, or if one user is broke
async function addChallengers(challenger1Id, challenger2Id, amount){
	if(activeMap.has(challenger1Id) || activeMap.has(challenger2Id)){
		//someone is already in a bet
		return {"result": false, "code": 0};
	}
	
	let user1 = await getUser(challenger1Id);
	let user2 = await getUser(challenger2Id);
	
	if(user1.balance - amount < 0 || user2.balance - amount < 0 ){
		return {"result": false, "code": 1};
	}
	
	//both users arent busy and have enough money, add them to the challenge pool
	activeMap.set(challenger1Id, {"bet": amount, "opp": challenger2Id});
	activeMap.set(challenger2Id, {"bet": amount, "opp": challenger1Id});
	return {"result": true, "code": 2};
}
async function getChallengers(challenger1Id){
	if(activeMap.has(challenger1Id)){
		let amount = activeMap.get(challenger1Id).bet;
		let user2 = activeMap.get(challenger1Id).opp;
		return {"code": 0, "bet": amount, "opp": user2};
	}
	else{
		return {"code": 1};
	}
}
async function removeChallengers(challenger1Id){
	if(activeMap.has(challenger1Id)){
		let amount = activeMap.get(challenger1Id).bet;
		let user2 = activeMap.get(challenger1Id).opp;
		activeMap.delete(challenger1Id);
		activeMap.delete(user2);
		return {"code": 0, "bet": amount, "opp": user2};
	}
	else{
		return {"code": 1};
	}
}

async function processResult(user, amount, win, loss, karma){
	user.balance += amount;
	if(user.balance < 0)
		user.balance = 0;
	user.wins += win;
	user.loses += loss;
	user.karma += karma;
	if(user.karma > 10)
		user.karma = 10;
	else if(user.karma < -10)
		user.karma = -10;
	return user.save();
}

module.exports = { getUser, addChallengers, removeChallengers, getChallengers, processResult, getAllUsers };