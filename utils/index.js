// Utility functions

// Generate a random number of specified length
exports.generateRandomNumber = (length) => {
  return Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1));
};

// Send vendor ticket confirmation email
exports.sendVendorTicketConfirmation = async ({ email, acceptLink, rejectLink, body }) => {
  try {
    // Implementation would typically use an email service
    console.log(`Sending ticket confirmation email to ${email}`);
    console.log(`Body: ${body}`);
    console.log(`Accept link: ${acceptLink}`);
    console.log(`Reject link: ${rejectLink}`);
    
    // In a real implementation, you would use a service like Nodemailer, SendGrid, etc.
    return { success: true };
  } catch (error) {
    console.error('Error sending vendor ticket confirmation:', error);
    return { success: false, error };
  }
};

// Send work order upload link
exports.uploadWorkOrder = async ({ email, link, body }) => {
  try {
    // Implementation would typically use an email service
    console.log(`Sending work order upload link to ${email}`);
    console.log(`Body: ${body}`);
    console.log(`Link: ${link}`);
    
    // In a real implementation, you would use a service like Nodemailer, SendGrid, etc.
    return { success: true };
  } catch (error) {
    console.error('Error sending work order upload link:', error);
    return { success: false, error };
  }
};

// Get unique values from array
exports.unique = (arr) => {
  return [...new Set(arr)];
};

// Send ticket
exports.sendTicket = async (data) => {
  try {
    // Implementation would handle sending ticket data
    console.log('Sending ticket:', data);
    
    // In a real implementation, this might involve database operations, notifications, etc.
    return { success: true };
  } catch (error) {
    console.error('Error sending ticket:', error);
    return { success: false, error };
  }
};