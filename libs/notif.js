const axios = require('axios')
const config = require('../config.json')

module.exports = {

    send: function (title, msg, tags) {

        const options = {
            method: 'POST',
            url: 'https://ntfy.sh/' + config.notifTopic,
            headers: {
                'Content-Type': 'text/plain',
                Title: title,
                Priority: '1',
                Tags: tags
            },
            data: msg
        };

        axios.request(options).then(function (response) {
            console.log("Notifs sent with success !");
        }).catch(function (error) {
            console.error(error);
        });
    }

}
