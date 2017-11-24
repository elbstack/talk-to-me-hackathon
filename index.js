require('dotenv').config();

const { authorize } = require('./quickstart');
const express = require('express');
const moment = require('moment');
const app = express();

app.get('/', function(req, res){
  console.log(authorize);
  res.send('Hello World ');
});

app.listen(3000, () => {
  console.log('Express started on port 3000');
});

