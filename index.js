const notif = require('./libs/notif')

const config = require('./config.json')
const fs = require('fs')
const responsesConfiguration = require('./reponses.json')

const { isDeepStrictEqual } = require('util');
const { log } = require('console');
const port = 80;

let token = ""
let account = ""
let dir = "./db"

start()

async function getDataFromUrl(url, token, data)
{
        const response = await fetch(url, {
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
                        "x-token": token,
                        "Referer": "https://www.ecoledirecte.com/",
                        "Referrer-Policy": "strict-origin-when-cross-origin",
                        //"User-Agent":"EDMOBILE"
                },
                "body": data,
                "method": "POST"
        });

        if (!response.ok)
        {
                const message = "Erreur login ${response.status}";
                console.log(message);
                throw new Error(message);
        }
        const body = await response.json();
        return body;

}

async function start() {
        //notif.send('Ecole Directe Notifs', "On demarre", '')
//      try
        {
                await getToken(config.username, config.pass)
                await checkIfNew()
        }
//      catch (error) {
//              console.error("Exception !!!!" + error)
//      }
}

async function getToken(username, password) {
        var encodedUser = username.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                return '&#' + i.charCodeAt(0) + ';';
        });

        var encodedPass = password.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
                return '&#' + i.charCodeAt(0) + ';';
        });

        const body = await getDataFromUrl("https://api.ecoledirecte.com/v3/login.awp?v=4.53.4", "",
                "data={\n    \"uuid\": \"\",\n    \"identifiant\": \"" + encodedUser + "\",\n    \"motdepasse\": \"" +
encodedPass + "\",\n    \"isReLogin\": false\n}" )

        token = body['token'];
        console.log("Standard login:" + body['code']);

        if (body['code'] == 200)
        {
                //console.log(body);
                account = body['data']['accounts']['0']['profile']['eleves']['0'];
                //console.log(account);
        }
        else (body['code'] == 250)
        {
                const body = await getDataFromUrl("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=get&v
=4.53.4", token, "data={}" )

                console.log("Get questions:" + body['code']);

                //console.log(body);
                question = body["data"]["question"]
                var buf = Buffer.from(question, 'base64').toString('utf-8');
                console.log("Question posée=" + buf);
                var encodedResp = Buffer.from(responsesConfiguration[buf]).toString('base64');
                console.log("Reponse si trouvée=" + responsesConfiguration[buf] + "*** encoded="+encodedResp)

                let propositions = body["data"]["propositions"]
                for (key in propositions)
                {
                        process.stdout.write(Buffer.from(propositions[key], 'base64').toString('utf-8') + ",");
                };
                console.log("")
                {
                        const body = await getDataFromUrl("https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?ver
be=post&v=4.53.4", token,  "data={\n\"choix\": \"" + encodedResp + "\"\n}" )

                        console.log("set question:" + body['code']);
                        const cn = body['data']['cn']
                        const cv = body['data']['cv']

                        if (body['code'] == 200)
                        {
                                const body = await getDataFromUrl("https://api.ecoledirecte.com/v3/login.awp?v=4.53.4",
 token,
                                        "data={\n    \"uuid\": \"\",\n    \"identifiant\": \"" + encodedUser + "\",\n
  \"motdepasse\": \"" + encodedPass + "\",\n    \"isReLogin\": false,\n"
                                                + "    \"cn\":\"" + cn + "\",\n    \"cv\":\""  + cv + "\",\n"
                                                + "    \"fa\": [\n    {\n        \"cn\":\"" + cn +  "\",\n        \"cv\
":\""  + cv + "\"\n        }\n    ]\n}")

                                console.log("login apres question:" + body['code']);
                                token = body['token'];
                                if (body['code'] == 200)
                                {
//                                      console.log(body['data']['accounts']['0']['profile']['eleves']['0'])
                                        account = body['data']['accounts']['0']['profile']['eleves']['0'];
                                        //console.log(account);
                                }

                        }
                }
        }

}

async function checkIfNew() {

        console.log("check new");
        oldNote = retrieveAllNotes()
        oldComp = retrieveAllComp()
        console.log("check new: get all OK");

        const Values = await getNewNotes(account.id, token);

        NewNotes = Values[0]
        NewCompetences = Values[1]

        console.log("check new: get all2 OK");
        //console.log("Notes=" + NewNotes);

        if (!isDeepStrictEqual(oldNote, NewNotes)) {
                console.log("check new: Start find different note");
                let bb = findDifferent(oldNote, NewNotes)
                if (bb.length > 4) {
                        console.log("check new: plus de 4 notes");
                        let matieres = "Plus de 4 notes: "
                        for (let i = 0; i < bb.length; i++) {
                                let element = bb[i]
                                console.log(element);
                                matieres += element.matiere + " ";
                        }
                        notif.send(matieres);
                } else {
                        for (let i = 0; i < bb.length; i++) {
                                let element = bb[i]
                                console.log(element);
                                notif.send("Une nouvelle note est arrivee", element.matiere + " " + element.type + " "
+ element.note + "/" + element.noteSur)
                        }
                }
                console.log("check new: find note ended");
                saveNotes(NewNotes)
        }
        else
        {
                console.log("Pas de nouvelle note");
        }

        if (!isDeepStrictEqual(oldComp, NewCompetences)) {
                console.log("check new: Start find different competence");
                let bb = findDifferent(oldComp, NewCompetences)
                if (bb.length > 4) {
                        console.log("check new: plus de 4 competences");
                        let competences = "Plus de 4 competences: "
                        for (let i = 0; i < bb.length; i++) {
                                let element = bb[i]
                                console.log(element);
                                competences += element.matiere + " ";
                        }
                        notif.send(competences);
                } else {
                        for (let i = 0; i < bb.length; i++) {
                                let element = bb[i]
                                console.log(element);
                                notif.send("Une nouvelle competence est arrivee", element.matiere + " " + element.nom +
 " " + element.type)
                        }
                }
                console.log("check new: find competence ended");
                saveComp(NewCompetences)
        }
        else
        {
                console.log("Pas de nouvelle competence");
        }
}

function saveNotes(allNotes) {

        console.log("check dir" + dir);
        if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
        }

        try
        {
                fs.renameSync(dir + 'notes.json', dir + 'notes.json.old');
                fs.unlinkSync(dir + "/notes.json")
        }
        catch (err)
        {
        }

        console.log('Write Notes');
        fs.writeFileSync(dir + '/notes.json', JSON.stringify(allNotes), function (err) {
                if (err) throw err;
                console.log('Notes successfully updated !');
        });

        console.log("fin saveNotes");
}

function saveComp(allCompetences)
{
        console.log("check dir" + dir);
        if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
        }

        try
        {
                fs.renameSync(dir + '/competences.json', dir + '/competences.json.old');
                fs.unlinkSync(dir + '/competences.json')
        }
        catch (err)
        {
        }

        console.log('Write competences');
        fs.writeFileSync(dir + '/competences.json', JSON.stringify(allCompetences), function (err) {
                if (err) throw err;
                console.log('Competences successfully updated !');
        });
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

async function getNewNotes(id, token) {

        const body = await getDataFromUrl("https://api.ecoledirecte.com/v3/eleves/" + id + "/notes.awp?verbe=get&v=4.53
.4", token,   "data={\n    \"anneeScolaire\": \"\"\n}" )

        console.log("Get note:" + body['code']);
        let notes = body['data']['notes']
        //console.log(notes)

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
        //console.log(allNotes)
        return [allNotes, allCompetences]
}

function retrieveAllNotes() {
  let allNotesData = {};
  try {
    allNotesData = JSON.parse(fs.readFileSync(`${dir}/notes.json`));
  } catch {
    // Do nothing
 }
  return allNotesData;
}

function retrieveAllComp() {
        let allCompData = {};
        try
        {
                allCompData = JSON.parse(fs.readFileSync(`${dir}/competences.json`))
        } catch {
                // Do nothing
        }

        return allCompData;
}
