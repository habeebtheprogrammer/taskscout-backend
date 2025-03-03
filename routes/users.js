const express = require('express')
const { userController } = require('../controllers/userController.js')
const auth = require('../middleware/auth/index.js')

const router = express.Router();

// Authentication routes
router.get('/refreshToken', auth.checkToken, userController.refreshToken);
router.post('/signin', userController.signin);
router.post('/signup', userController.signup);
router.post('/sendOTP', userController.sendOTP);

module.exports = router