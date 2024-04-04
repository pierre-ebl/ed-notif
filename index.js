const notif = require('./libs/notif')

const config = require('./config.json')
const fs = require('fs')
const responsesConfiguration = require('./reponses.json')

const { isDeepStrictEqual } = require('util');
const { log } = require('console');
const port = 80;

let dir = "./db"
let isDebugMode = false;

start()

function Debug(message) {
    if (isDebugMode) {
        console.log(message);
    }
}

async function getDataFromUrl(url, token, data) {
    const headers = {
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
        // "User-Agent": "EDMOBILE"
    };

    const options = {
        method: "POST",
        headers: headers,
        body: data
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        const message = `Erreur login ${response.status}`;
        console.log(message);
        throw new Error(message);
    }

    return await response.json();
}

async function start() {
        //notif.send('Ecole Directe Notifs', "On demarre", '')
      try
        {
                account = await getToken(config.username, config.pass)
                await checkIfNew(account[0], account[1])
        }
      catch (error) {
              console.error("Exception !!!!" + error)
      }
}

async function getToken(username, password) {
    let account = {};
    let token = {};
    const encodedUser = encodeString(username);
    const encodedPass = encodeString(password);

    const loginUrl = "https://api.ecoledirecte.com/v3/login.awp?v=4.53.4";
    const loginData = `data={
        "uuid": "",
        "identifiant": "${encodedUser}",
        "motdepasse": "${encodedPass}",
        "isReLogin": false
    }`;

    const loginResponse = await getDataFromUrl(loginUrl, "", loginData);
    const code = loginResponse['code'];
    token = loginResponse['token'];
    console.log("Standard login: " + code + " token=" + token);

    if (code === 200) {
        account = loginResponse['data']['accounts']['0']['profile']['eleves']['0'];
    } else if (code === 250) {
        const doubleAuthUrl = "https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=get&v=4.53.4";
        const doubleAuthData = "data={}";

        const doubleAuthResponse = await getDataFromUrl(doubleAuthUrl, loginResponse['token'], doubleAuthData);
        console.log("Get questions: " + doubleAuthResponse['code']);

        const question = Buffer.from(doubleAuthResponse["data"]["question"], 'base64').toString('utf-8');
        console.log("Question posée = " + question);

        const encodedResp = Buffer.from(responsesConfiguration[question]).toString('base64');
        console.log("Reponse si trouvée = " + responsesConfiguration[question] + "*** encoded=" + encodedResp);

        const propositions = doubleAuthResponse["data"]["propositions"];
        for (const key in propositions) {
            process.stdout.write(Buffer.from(propositions[key], 'base64').toString('utf-8') + ",");
        }
        console.log("");

        const setQuestionUrl = "https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=post&v=4.53.4";
        const setQuestionData = `data={
            "choix": "${encodedResp}"
        }`;

        const setQuestionResponse = await getDataFromUrl(setQuestionUrl, loginResponse['token'], setQuestionData);
        console.log("set question: " + setQuestionResponse['code']);

        if (setQuestionResponse['code'] === 200) {
            const cn = setQuestionResponse['data']['cn'];
            const cv = setQuestionResponse['data']['cv'];

            const loginAfterQuestionUrl = "https://api.ecoledirecte.com/v3/login.awp?v=4.53.4";
            const loginAfterQuestionData = `data={
                "uuid": "",
                "identifiant": "${encodedUser}",
                "motdepasse": "${encodedPass}",
                "isReLogin": false,
                "cn": "${cn}",
                "cv": "${cv}",
                "fa": [{
                    "cn": "${cn}",
                    "cv": "${cv}"
                }]
            }`;

            const loginAfterQuestionResponse = await getDataFromUrl(loginAfterQuestionUrl, loginResponse['token'], loginAfterQuestionData);
            console.log("login après question: " + loginAfterQuestionResponse['code']);

            if (loginAfterQuestionResponse['code'] === 200) {
                token = loginAfterQuestionResponse['token'];
                account = loginAfterQuestionResponse['data']['accounts']['0']['profile']['eleves']['0'];
            }
        }
    }
    if (!account) {
        const message = `Erreur login`;
        console.log(message);
        throw new Error(message);
    }
    return [account, token];
}

function encodeString(str) {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}

async function checkIfNew(account, token) {
    console.log("check new");
    console.log("check new: get all OK, ID=" + account.id + " token=" + token);

    const oldNote = retrieveAllNotes();
    const oldComp = retrieveAllComp();

    const [newNotes, newCompetences] = await getNewNotes(account.id, token);

    console.log("check new: get all2 OK");

    checkAndNotify(oldNote, newNotes, "note");
    checkAndNotify(oldComp, newCompetences, "competence");
}

function checkAndNotify(oldData, newData, type) {
    const differences = findDifferent(oldData, newData);

    if (differences.length === 0) {
        console.log(`Pas de nouvelle ${type}`);
        return;
    }

    console.log(`check new: Start find different ${type}`);
    const threshold = 4;
    if (differences.length > threshold) {
        console.log(`check new: plus de ${threshold} ${type}s`);
        const dataString = differences.map(element => element.matiere).join(" ");
        notif.send(`Plus de ${threshold} ${type}s: ${dataString}`);
    } else {
        for (const element of differences) {
            console.log(element);
            notif.send(`Une nouvelle ${type} est arrivée`, formatNotificationMessage(element, type));
        }
    }
    console.log(`check new: find ${type} ended`);

    if (type === "note") {
        saveNotes(newData);
    } else if (type === "competence") {
        saveComp(newData);
    }
}

function formatNotificationMessage(element, type) {
    if (type === "note") {
        return `${element.matiere} ${element.type} ${element.note}/${element.noteSur}`;
    } else if (type === "competence") {
        return `${element.matiere} ${element.nom} ${element.type}`;
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
    const url = `https://api.ecoledirecte.com/v3/eleves/${id}/notes.awp?verbe=get&v=4.53.4`;
    const data = "data={\n    \"anneeScolaire\": \"\"\n}";

    const body = await getDataFromUrl(url, token, data);
    console.log("Get note: " + body['code']);

    const allNotes = [];
    const allCompetences = [];

    body['data']['notes'].forEach(n => {
        const commonData = {
            id: n.id,
            nom: n.devoir,
            matiere: n.libelleMatiere,
            type: n.typeDevoir,
            date: n.date
        };

        if (n.valeur !== "") {
            const noteData = {
                ...commonData,
                coef: n.coef,
                note: n.valeur,
                noteSur: n.noteSur,
                MClasse: n.moyenneClasse,
                MinClasse: n.minClasse,
                MaxClasse: n.maxClasse
            };
            allNotes.push(noteData);
        } else {
            allCompetences.push(commonData);
        }
    });

    //Debug(allNotes); // Afficher les notes détaillées
    // Debug(allCompetences); // Afficher les compétences

    return [allNotes, allCompetences];
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
