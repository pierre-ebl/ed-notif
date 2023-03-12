const libs = require('./libs/api')
const notif = require('./libs/notif')

const config = require('./config.json')
const axios = require('axios')
const fs = require('fs')

const express = require("express");
const path = require('path')
const { isDeepStrictEqual } = require('util')
const app = express();
const port = 80;

let token = ""
let account = ""

start()

function start() {

    getToken(config.username, config.pass)
    setTimeout(function () {

        startWebsite()
        while (true) {
            setTimeout(checkIfNew, 60000);
        }
    }, 3000);

}

function startWebsite() {
    notif.send('Ecole Directe Notifs', "Website was started !", '')
    app.get("/", function (req, res) {
        res.render('index',{
            acc: account,
            notes: libs.getAllNotes()
        })

    });

    app.post("/update", function (req, res) {
        libs.saveNotes(account.id, token)
        res.sendStatus(200)
    });
    
    app.set('view engine', 'ejs');
    
    app.listen(port, function () {
        console.log(`Website started on ${"http://127.0.0.1:" + port}`);
    });
    

}

function getToken(username, password){
    var data = 'data= {'+
    '"identifiant": "' + username + '" , "motdepasse": "' + password + '"}';
    
    axios.post(
        "https://api.ecoledirecte.com/v3/login.awp",
        data
    ).then((res) => {
        
        if (res.data.code == 200) {

            token = res.data.token
            account = res.data.data.accounts[0]

            console.log("Connected to the account -> " + account.prenom + " " + account.nom);

        }else{
            console.log("Erreur : " + JSON.stringify(res.data.message).slice(1,-1));
        }

    }).catch((e) => {
        console.log(e)
    })
}

function checkIfNew() {

    oldNote = libs.getAllNotes()
    oldComp = libs.getAllComp()

    fs.renameSync('./db/list.json', './db/list.json.old');
    fs.renameSync('./db/notes.json', './db/notes.json.old');
    fs.renameSync('./db/competences.json', './db/competences.json.old');

    libs.saveNotes(account.id, token)

    setTimeout(function () {

        newNote = libs.getAllNotes()
        newComp = libs.getAllComp()

        if(isDeepStrictEqual(oldNote, newNote)){
            console.log("Pas de nouvelle note");
        }else if(isDeepStrictEqual(oldNote, newNote)){
            console.log("Une nouvelle note est arrivée !");
        }
        if(isDeepStrictEqual(oldComp, newComp)){
            console.log("Pas de nouvelle compétence");
        }else if(isDeepStrictEqual(oldComp, newComp)){
            console.log("Une nouvelle compétence est arrivée !");
        }

        if(!isDeepStrictEqual(oldNote, newNote)){
            let bb = findDifferent(oldNote, newNote)
            for (let i = 0; i < bb.length; i++) {
                let element = bb[i]
                console.log(element);
                notif.send("Une nouvelle note est arrivee", element.matiere + " " + element.type + " " + element.note + "/" + element.noteSur)
            }         
    
        }

        if(!isDeepStrictEqual(oldComp, newComp)){
            let bb = findDifferent(oldComp, newComp)
            for (let i = 0; i < bb.length; i++) {
                let element = bb[i]
                console.log(element);
                notif.send("Une nouvelle competence est arrivee", element.matiere + " " + element.nom + " " + element.type)
            }    
        }

    }, 3000);

}

function findDifferent(old, newnotes) {
    let nouvelles = [];
    let found = false;

    for (let i = 0; i < newnotes.length; i++) {
        found = false;
        for (let ii = 0; ii < old.length && !found; ii++) {
            if(newnotes[i].id == old[ii].id){
                found = true
            }
        }
        if(!found){
            nouvelles.push(newnotes[i])
        }
    }
    return nouvelles;
}


