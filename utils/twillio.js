const { formatPhoneNumber } = require('.');

const accountSid = process.env.accountSid
const authToken = process.env.authToken
const client = require('twilio')(accountSid, authToken);

exports.sendSmsMesg = async ({ body, to }) => {
    try {
        const message = await client.messages.create({
            body,
            from: process.env.phone, // Ensure this is a Twilio-verified number
            to
        });
        console.log(`SMS sent: ${message.sid}`);
        return message.sid;
    } catch (error) {
        console.error(`Error sending SMS: ${error.message}`);
        return null;
    }
};

exports.sendWhatsappMesg = async ({ otp, phone }) => {
    try {
        console.log(formatPhoneNumber(phone))
        const message = await client.messages.create({
            from: 'whatsapp:+14155238886', // Twilio sandbox/test number
            to: `whatsapp:${formatPhoneNumber(phone)}`,
            contentSid: 'HX229f5a04fd0510ce1b071852155d3e75', // Ensure this is correct
            contentVariables: JSON.stringify({ "1": otp.toString() }) // Proper JSON format
        });
        console.log(`WhatsApp message sent: ${message.sid}`);
        return message.sid;
    } catch (error) {
        console.error(`Error sending WhatsApp message: ${error.message}`);
        return null;
    }
};
