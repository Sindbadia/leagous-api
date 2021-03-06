const { LolApi, Constants } = require('twisted')

const express = require('express')
const router = express.Router()

const api = new LolApi({
	rateLimitRetry: true,
	rateLimitRetryAttempts: 1,
	concurrency: undefined,
	key: process.env.API_KEY,
	debug: {
		logTime: false,
		logUrls: false,
		logRatelimit: false,
	},
})

router.get('/summoner', async function (req, res, next) {
	const summonerName = req.query.name
	const region = req.query.region
	console.log('Summoner Name: ', summonerName)
	console.log('Region: ', region)
	try {
		const summoner = await api.Summoner.getByName(summonerName, Constants.Regions[region])
		res.status(200).json({ summoner: summoner.response })
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}
		next(err)
	}
})

router.get('/matches', async function (req, res, next) {
	const summonerId = req.query.summonerId
	const region = req.query.region
	try {
		const data = await api.Match.list(summonerId, Constants.Regions[region])
		const first5matches = data.response.matches.slice(1, 6)
		let minifiedArray = []
		minifiedArray = first5matches.map(async match => {
			const championName = await getChampionName(match.champion)
			const game = await getMatchData(match.gameId, region)
			return {
				...match,
				game: game, // match populate
				champion: championName,
			}
		})
		minifiedArray = await Promise.all(minifiedArray)
		res.status(200).json({ matches: minifiedArray })
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}
		next(err)
	}
})

router.get('/champion', async function (req, res, next) {
	const championId = req.query.id
	getChampionName(championId).then(champ => {
		res.status(200).json(champ)
	})
})

async function getMatchData(gameId, region) {
	try {
		const match = await api.Match.get(gameId, Constants.Regions[region])
		let newParticipants = []
		for (const part of match.response.participants) {
			for (const partId of match.response.participantIdentities) {
				if (part.participantId === partId.participantId) {
					newParticipants.push({
						...part,
						...partId,
					})
				}
			}
		}
		let total = []
		for (const team of match.response.teams) {
			for (const part of newParticipants) {
				if (team.teamId === part.teamId) {
					const championName = await getChampionName(part.championId)
					total.push({ ...team, ...part, championId: championName })
				}
			}
		}
		return total
	} catch (error) {
		return error
	}
}

async function getChampionName(championId) {
	try {
		const champions = await api.DataDragon.getChampion()
		const championNames = Object.keys(champions.data)
		const champion = championNames.find(champ => {
			return champions.data[champ].key == championId
		})
		return champions.data[champion].id // championName
	} catch (error) {
		return error
	}
}

module.exports = router

// router.get('/match', async function (req, res, next) {
// 	const matchId = req.query.id
// 	try {
// 		const match = await api.Match.get(matchId, Constants.Regions.EU_WEST)
// 		const teams = match.response.teams.map(team => ({
// 			teamId: team.teamId,
// 			win: team.win,
// 		}))
// 		const participants = match.response.participants.map(async part => {
// 			const champion = await getChampionName(part.championId)
// 			return {
// 				participantId: part.participantId,
// 				teamId: part.teamId,
// 				champion,
// 			}
// 		})
// 		const parts = await Promise.all(participants)

// 		const participantIdentities = match.response.participantIdentities.map(partId => ({
// 			participantId: partId.participantId,
// 			player: partId.player.summonerName,
// 			profileIcon: partId.player.profileIcon,
// 		}))

// 		let newParts = []
// 		for (const part of parts) {
// 			for (const partId of participantIdentities) {
// 				if (part.participantId === partId.participantId) {
// 					// console.log('Champion ID', part.championId)
// 					newParts.push({
// 						...part,
// 						player: partId.player,
// 						profileIcon: partId.profileIcon,
// 					})
// 				}
// 			}
// 		}
// 		let total = []
// 		for (const team of teams) {
// 			for (const part of newParts) {
// 				if (team.teamId === part.teamId) {
// 					total.push({ ...team, ...part })
// 				}
// 			}
// 		}
// 		console.log('newParts: ', newParts)
// 		console.log('total: ', total)
// 		console.log('teams: ', teams)
// 		console.log('participants: ', participants)
// 		console.log('participantIdentities: ', participantIdentities)
// 		res.status(200).json({
// 			match: {
// 				gameMode: match.response.gameMode,
// 				total,
// 			},
// 		})
// 		const total = await getMatchData(matchId)
// 		res.status(200).json({
// 			total,
// 		})
// 	} catch (error) {
// 		console.log(error)
// 	}
// })
