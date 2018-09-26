const express = require('express');
const app = express();
const port = 3000;

var options = {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*')
    }
};
// Our WWW folders
app.use(express.static('www', options));

//app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

