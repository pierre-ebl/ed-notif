//const notif = require('./libs/notif')

const config = require('./config.json')
const fs = require('fs')

const { Api, Auth } = require('ecoledirecte-client')

let dir = "./db"

const responsePath = "./questions.json"

start()

async function start() {
       
      try
        {
            const auth = new Auth(responsePath);
            const loginResponse = await auth.login(config.username, config.pass);
            
            console.log("Connexion réussie, token :", loginResponse.token);
    
            const api = new Api(loginResponse.token, loginResponse.profile);

            const students = await api.getStudents();

            students.forEach(async (student) => {
                console.log(`${student.getFullName()} Checking if new notes`);
                await checkIfNew(student)
            });
        
        }
      catch (error) {
              console.error("Exception !!!!" + error)
      }
}

async function checkIfNew(student) {
    console.log("check new");
    console.log("check new: get all OK, ID=" + student.id);

    const oldNote = retrieveAllNotes(student.getFullName());
    const oldComp = retrieveAllComp(student.getFullName());

    const newNotes = await student.getNotes();
    let competences = [];
    let notes = [];
    for (const note of newNotes) {
        if(note.enLettre) {
            competences.push(note);
        } else {
            notes.push(note);
        }
    }
    console.log("check new: get all2 OK");

    await checkAndNotify(oldNote, notes, "note", student.getFullName());
    await checkAndNotify(oldComp, competences, "competence", student.getFullName());
}

function checkAndNotify(oldData, newData, type, studentName) {
    const differences = findDifferent(oldData, newData);

    if (differences.length === 0) {
        console.log(`Pas de nouvelle ${type} pour ${studentName}`);
        return;
    }

    console.log(`check new: Start find different ${type}`);
    const threshold = 4;
    if (differences.length > threshold) {
        console.log(`check new: plus de ${threshold} ${type}s pour ${studentName}`);
        const dataString = differences.map(element => element.matiere).join(" ");
        console.log(`Plus de ${threshold} ${type}s: ${dataString}`);
       // notif.send(`Plus de ${threshold} ${type}s: ${dataString}`);
    } else {
        for (const element of differences) {
            console.log(`Une nouvelle ${type} est arrivée pour ${studentName}`, formatNotificationMessage(element, type));
            //notif.send(`Une nouvelle ${type} est arrivée`, formatNotificationMessage(element, type));
        }
    }
    console.log(`check new: find ${type} ended`);

    if (type === "note") {
        saveNotes(newData, studentName);
    } else if (type === "competence") {
        saveComp(newData, studentName);
    }
}

function formatNotificationMessage(element, type) {
    if (type === "note") {
        return `${element.libelleMatiere} ${element.typeDevoir} ${element.valeur}/${element.noteSur}`;
    } else if (type === "competence") {
        return `${element.libelleMatiere} ${element.typeDevoir} ${element.valeur}`;
    }
}

function saveNotes(allNotes, studentName) {

        console.log("check dir" + dir);
        if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
        }
        const fileName = `${dir}/notes_${studentName}.json`;  
        try
        {   
              
            fs.unlinkSync(fileName + '.old')
            fs.renameSync(fileName, fileName + '.old');
            fs.unlinkSync(fileName)
        }
        catch (err)
        {
        }

        console.log('Write Notes');
        fs.writeFileSync(fileName, JSON.stringify(allNotes), function (err) {
                if (err) throw err;
                console.log('Notes successfully updated !');
        });

        console.log("fin saveNotes");
}

function saveComp(allCompetences, studentName)
{
        console.log("check dir" + dir);
        if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
        }
        const fileName = `${dir}/competences_${studentName}.json`;
        try
        {
            
            fs.unlinkSync(fileName + '.old')
            fs.renameSync(fileName, fileName + '.old');
            fs.unlinkSync(fileName)
        }
        catch (err)
        {
        }

        console.log('Write competences');
        fs.writeFileSync(fileName, JSON.stringify(allCompetences), function (err) {
                if (err) throw err;
                console.log('Competences successfully updated !');
        });
        console.log("fin saveComp");
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

function retrieveAllNotes(studentName) {
  let allNotesData = {};
  try {
    allNotesData = JSON.parse(fs.readFileSync(`${dir}/notes_${studentName}.json`));
  } catch {
    // Do nothing
 }
  return allNotesData;
}

function retrieveAllComp(studentName) {
        let allCompData = {};
        try
        {
                allCompData = JSON.parse(fs.readFileSync(`${dir}/competences_${studentName}.json`))
        } catch {
                // Do nothing
        }

        return allCompData;
}
