const  User  =  require('../models/taskscoutUsers.js')
const { generateRandomNumber, sendWhatsappMesg } =  require('../utils/index.js')
const auth =  require('../middleware/auth/index.js')

exports.userService = {
  // Find user by ID
  findUserById: async (userId) => {
    return await User.findById(userId);
  },
  
  // Find user by phone number
  findUserByPhone: async (phone) => {
    return await User.findOne({ phone });
  },
  
  // Create a new user
  createUser: async (userData) => {
    return await User.create(userData);
  },
  
  // Update user's OTP
  updateUserOTP: async (phone, otp) => {
    return await User.findOneAndUpdate({ phone }, { otp }, { new: true });
  },
  
  // Clear OTP after successful login
  clearOTP: async (phone) => {
    return await User.findOneAndUpdate({ phone }, { otp: "" });
  },
  
  // Generate OTP
  generateOTP: () => {
    return generateRandomNumber(6);
  },
  
  // Send OTP via WhatsApp
  sendOTPWhatsApp: async (phone, otp) => {
    return await sendWhatsappMesg({ phone, otp });
  },
  
  // Create authentication token
  createToken: (userData) => {
    return auth.createToken(userData);
  }
};