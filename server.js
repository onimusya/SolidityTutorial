const express = require('express');
const app = express();
const port = 3000;

// Our WWW folders
app.use(express.static('www'));

//app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

