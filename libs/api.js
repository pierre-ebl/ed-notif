const axios = require('axios')
const fs = require('fs')

const config = require('../config.json')

module.exports = {

    login: function(username, password){
        var data = 'data= {'+
        '"identifiant": "' + username + '" , "motdepasse": "' + password + '"}';
        
        axios.post(
            "https://api.ecoledirecte.com/v3/login.awp",
            data
        ).then((res) => {
            
            if (res.data.code == 200) {
                console.log("Connected");
                return new Promise(token => {
                    setTimeout(() => {
                        token(res.data.token);
                    }, 2000);
                });
            }else{
                console.log("Erreur : " + JSON.stringify(res.data.message).slice(1,-1));
            }

        }).catch((e) => {
            console.log(e)
        });
    },

    saveNotes: function(id, token) {
        var data = 'data= {'+
        '"token": "' + token + '"}';
        
        axios.post(
            "https://api.ecoledirecte.com/v3/eleves/" + id + "/notes.awp?verbe=get&v=4.22.0",
            data
        ).then((res) => {
            if (res.data.code == 200) {
                let notes = res.data.data.notes

                let dir = "./db"

                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
            
                if(fs.existsSync(dir + "/notes.json")){

                    fs.unlinkSync(dir + "/notes.json")

                }
                if(fs.existsSync(dir + "/competences.json")){

                    fs.unlinkSync(dir + "/competences.json")

                }

                let allNotes = []
                let allCompetences = []
                notes.forEach(n => {
                    if(n.valeur != ""){
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
                    }else{
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
                
                fs.writeFile(dir + '/notes.json', JSON.stringify(allNotes), function (err) {
                    if (err) throw err;
                    console.log('Notes successfully updated !');
                });

                fs.writeFile(dir + '/competences.json', JSON.stringify(allCompetences), function (err) {
                    if (err) throw err;
                    console.log('Competences successfully updated !');
                });

                // Write list

                if(fs.existsSync(dir + "/list.json")){

                    fs.unlinkSync(dir + "/list.json")

                }

                let all = '['

                notes.forEach(n => {
                    all = all + `"${n.id}",`
                });
                all = all.slice(0, -2) + '"]'
                fs.writeFile(dir + '/list.json', all, function (err) {
                    if (err) throw err;
                    console.log('List successfully updated !');
                });
            }

        }).catch((e) => {
            console.log(e)
        });
    },

    getOneNote: function(id){

        let notes = JSON.parse(fs.readFileSync('./db/notes.json'))
        return notes.find((n) => n.id === id)

    },

    getAllNotes: function(){

        let notes = JSON.parse(fs.readFileSync('./db/notes.json'))
        
        return notes

    },

    getOneComp: function(id){

        let notes = JSON.parse(fs.readFileSync('./db/competences.json'))
        return notes.find((n) => n.id === id)

    },

    getAllComp: function(){

        let notes = JSON.parse(fs.readFileSync('./db/competences.json'))
        
        return notes

    }

}