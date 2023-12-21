const notif = require('./libs/notif')

const config = require('./config.json')
const fs = require('fs')

const { isDeepStrictEqual } = require('util');
const { log } = require('console');
const port = 80;

let token = ""
let account = ""
let dir = "./db"

start()

async function start() {
	//notif.send('Ecole Directe Notifs', "On demarre", '')
	try
	{	
		await getToken(config.username, config.pass)
		await checkIfNew()
	}
	catch (error) {
		console.error("Exception !!!!" + error)
	} 
}

async function getToken(username, password) {
	var encodedUser = username.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
		return '&#' + i.charCodeAt(0) + ';';
	});

	var encodedPass = password.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
		return '&#' + i.charCodeAt(0) + ';';
	});
	var data = 'data= {' +
		'"identifiant": "' + encodedUser + '" , "motdepasse": "' + encodedPass + '"}';
	
	const response = await fetch("https://api.ecoledirecte.com/v3/login.awp?v=4.27.8", {
		"headers": {
			"accept": "application/json, text/plain, */*",
			"accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
			"content-type": "application/x-www-form-urlencoded",
			"sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-site",
			"x-token": "",
			"Referer": "https://www.ecoledirecte.com/",
			"Referrer-Policy": "strict-origin-when-cross-origin"
		},
		"body": "data={\n    \"uuid\": \"\",\n    \"identifiant\": \"" + encodedUser + "\",\n    \"motdepasse\": \"" + encodedPass + "\",\n    \"isReLogin\": false\n}",
		"method": "POST"
	});
	if (!response.ok)
	{
		const message = "Erreur login ${response.status}";
		console.log(message);
		throw new Error(message);
	}
	const body = await response.json();

	token = body['token'];
	//console.log(token);
	account = body['data']['accounts']['0']['profile']['eleves']['0'];
	//console.log(account);
}

async function checkIfNew() {

	console.log("check new");
	oldNote = getAllNotes()
	oldComp = getAllComp()
	console.log("check new: get all OK");
	try
	{
		fs.renameSync('./db/list.json', './db/list.json.old');
	}
	catch (err) 
	{
	}
	try
	{
		fs.renameSync('./db/notes.json', './db/notes.json.old');
	}
	catch (err)
	{
	}
	try
	{
		fs.renameSync('./db/competences.json', './db/competences.json.old');
	}
	catch (err)
	{
	}
      
	//console.log(account)
	
	await saveNotes(account.id, token)
	console.log("check new: Save note ok");

	newNote = getAllNotes()
	newComp = getAllComp()
	console.log("check new: get all2 OK");

	if (isDeepStrictEqual(oldNote, newNote)) {
		console.log("Pas de nouvelle note");
	} else if (isDeepStrictEqual(oldNote, newNote)) {
		console.log("Une nouvelle note est arrivée !");
	}
	if (isDeepStrictEqual(oldComp, newComp)) {
		console.log("Pas de nouvelle compétence");
	} else if (isDeepStrictEqual(oldComp, newComp)) {
		console.log("Une nouvelle compétence est arrivée !");
	}

	if (!isDeepStrictEqual(oldNote, newNote)) {
		console.log("check new: Start find different note");
		let bb = findDifferent(oldNote, newNote)
		for (let i = 0; i < bb.length; i++) {
			let element = bb[i]
			console.log(element);
			notif.send("Une nouvelle note est arrivee", element.matiere + " " + element.type + " " + element.note + "/" + element.noteSur)
		}
		console.log("check new: find note ended");
	}

	if (!isDeepStrictEqual(oldComp, newComp)) {
		console.log("check new: Start find different competence");
		let bb = findDifferent(oldComp, newComp)
		for (let i = 0; i < bb.length; i++) {
			let element = bb[i]
			console.log(element);
			notif.send("Une nouvelle competence est arrivee", element.matiere + " " + element.nom + " " + element.type)
		}
		console.log("check new: find competence ended");
	}


}

function findDifferent(old, newnotes) {
	let nouvelles = [];
	let found = false;

	for (let i = 0; i < newnotes.length; i++) {
		found = false;
		for (let ii = 0; ii < old.length && !found; ii++) {
			if (newnotes[i].id == old[ii].id) {
				found = true
			}
		}
		if (!found) {
			nouvelles.push(newnotes[i])
		}
	}
	return nouvelles;
}


async function saveNotes(id, token) {
	
	const res = await fetch("https://api.ecoledirecte.com/v3/eleves/" + id + "/notes.awp?verbe=get&v=4.29.0", {
		"headers": {
			"accept": "application/json, text/plain, */*",
			"accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
			"content-type": "application/x-www-form-urlencoded",
			"sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-site",
			"x-token": token
		},
		"referrer": "https://www.ecoledirecte.com/",
		"referrerPolicy": "strict-origin-when-cross-origin",
		"body": "data={\n    \"anneeScolaire\": \"\"\n}",
		"method": "POST",
		"mode": "cors",
		"credentials": "omit"
	})

	if (!res.ok)
	{
		const message = "Erreur login ${res.status}";
		console.log(message);
		throw new Error(message);
	}
	const body = await res.json();
	//console.log(body)
	let notes = body['data']['notes']
	//console.log(notes)
	
	console.log("check dir" + dir);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	
	console.log("check file" + dir + "/notes.json");
	if (fs.existsSync(dir + "/notes.json")) {
		fs.unlinkSync(dir + "/notes.json")
	}

	console.log("check file" + dir + "/competences.json");
	if (fs.existsSync(dir + "/competences.json")) {
		fs.unlinkSync(dir + "/competences.json")
	}

	let allNotes = []
	let allCompetences = []
	notes.forEach(n => {
		if (n.valeur != "") {
			let data = {
				id: n.id,
				nom: n.devoir,
				matiere: n.libelleMatiere,
				type: n.typeDevoir,
				coef: n.coef,
				note: n.valeur,
				noteSur: n.noteSur,
				date: n.date,
				MClasse: n.moyenneClasse,
				MinClasse: n.minClasse,
				MaxClasse: n.maxClasse
			}
			allNotes.push(data)
			
		} else {
			let data = {
				id: n.id,
				nom: n.devoir,
				matiere: n.libelleMatiere,
				type: n.typeDevoir,
				date: n.date
			}
			allCompetences.push(data)
			
		}

	});
	
	console.log('Write Notes');
	fs.writeFileSync(dir + '/notes.json', JSON.stringify(allNotes), function (err) {
		if (err) throw err;
		console.log('Notes successfully updated !');
	});

	console.log('Write competences');
	fs.writeFileSync(dir + '/competences.json', JSON.stringify(allCompetences), function (err) {
		if (err) throw err;
		console.log('Competences successfully updated !');
	});

	// Write list

	console.log("check file" + dir + "/list.json");
	if (fs.existsSync(dir + "/list.json")) {
		fs.unlinkSync(dir + "/list.json")
	}

	let all = '['

	notes.forEach(n => {
		all = all + `"${n.id}",`
	});
	all = all.slice(0, -2) + '"]'
	fs.writeFileSync(dir + '/list.json', all, function (err) {
		if (err) throw err;
		console.log('List successfully updated !');
	});

	console.log("fin saveNotes");
}



function getAllNotes() {

	let notes = {}
	try
	{
		notes = JSON.parse(fs.readFileSync(dir + '/notes.json'))
	}
	catch (err) {}
	return notes

}

function getAllComp() {
	let comp = {}
	try
	{
		comp = JSON.parse(fs.readFileSync( dir + '/competences.json'))
	}
	catch {}

	return comp

}


