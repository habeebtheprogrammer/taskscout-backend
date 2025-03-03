const userAuthService  = require('../services/userService.js')

exports.userController = {
  // Refresh authentication token
  refreshToken: async (req, res) => {
    try {
      const user = await userAuthService.findUserById(req.user);
      
      if (user) {
        if (user.isActive != null) {
          user.password = null;
          const token = userAuthService.createToken(user.toObject());
          res.json({ token, user });
        } else {
          res.status(400).send({
            err: "Account has been deactivated!",
          });
        }
      } else {
        res.status(400).send({
          err: "Login Failed!",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(400).send({
        err: "Something went wrong!",
      });
    }
  },

  // Sign in with phone and OTP
  signin: async (req, res) => {
    try {
      let { phone, otp } = req.body;
      phone = phone.replace(/\s+/g, '');
      
      const user = await userAuthService.findUserByPhone(phone);
      
      if (user !== null) {
        const finalUserData = user.toObject();
        
        if (otp == finalUserData.otp) {
          if (user.isActive) {
            user.password = null;
            const token = userAuthService.createToken(finalUserData);
            
            // Clear OTP after successful login
            await userAuthService.clearOTP(phone);
            
            res.status(200).send({
              success: true,
              message: "User authenticated successfully",
              token,
              user: finalUserData,
            });
          } else {
            res.status(400).send({
              err: "Account has been deactivated!",
            });
          }
        } else {
          res.status(400).send({
            err: "The OTP is incorrect!",
          });
        }
      } else {
        res.status(400).send({
          err: "User does not exists!",
        });
      }
    } catch (err) {
      console.error(err);
      res.status(400).send({
        err: "Something went wrong!",
      });
    }
  },

  // Sign up new user
  signup: async (req, res) => {
    try {
      let { phone, fullName } = req.body;
      phone = phone.replace(/\s+/g, '');
      
      const existingUser = await userAuthService.findUserByPhone(phone);
      
      if (existingUser !== null) {
        res.status(400).send({
          message: "Phone already exists",
        });
      } else {
        const otp = userAuthService.generateOTP();
        
        await userAuthService.createUser({
          phone,
          fullName,
          otp
        });
        
        // Send OTP via WhatsApp
        await userAuthService.sendOTPWhatsApp(phone, otp);
        
        res.status(200).send({
          success: true,
          message: "Kindly check your sms or whatsapp for OTP Code",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(400).send({
        message: "Something went wrong!",
      });
    }
  },

  // Send OTP to existing user
  sendOTP: async (req, res) => {
    try {
      let { phone } = req.body;
      phone = phone.replace(/\s+/g, '');
      
      const otp = userAuthService.generateOTP();
      
      const user = await userAuthService.updateUserOTP(phone, otp);
      
      if (user) {
        const token = userAuthService.createToken(user.toObject());
        
        // Send OTP via WhatsApp
        await userAuthService.sendOTPWhatsApp(phone, otp);
        
        res.status(200).send({
          success: true,
          message: "OTP sent successfully",
          token,
          user: user.toObject()
        });
      } else {
        res.status(400).send({
          err: "User does not exists",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(400).send({
        err: "Something went wrong!",
      });
    }
  }
};