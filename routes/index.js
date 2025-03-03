
const tickets = require("./tickets") 
const users = require("./users") 

var express = require('express');
var router = express.Router();

router.use("/tickets", tickets);
router.use("/users", users);


module.exports = router
