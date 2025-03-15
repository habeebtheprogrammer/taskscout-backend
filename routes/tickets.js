const express = require('express')
const {ticketController} = require('../controllers/ticketController.js');
const auth = require('../middleware/auth/index.js')
const client = require('twilio')(process.env.accountSid, process.env.authToken);
const  Tickets  =  require('../models/taskscoutTickets.js')
const  User  =  require('../models/taskscoutUsers.js');
const { isNumber } = require('../utils/index.js');

const router = express.Router();

// Ticket management routes
router.post('/getAvailableTicketsNumber', auth.checkToken, ticketController.getAvailableTicketsNumber);
router.post('/createTicket', auth.checkToken, ticketController.createTicket);
router.post('/updateTicket', auth.checkToken, ticketController.updateTicket);
router.post('/rejectTicket', ticketController.rejectTicket);
router.post('/acceptTicket', auth.checkToken, ticketController.acceptTicket);
router.post('/submitCard', auth.checkToken, ticketController.submitCard);
router.post('/approve', auth.checkToken, ticketController.approveTicket);
router.post('/uploadWaitingParts', ticketController.uploadWaitingParts);
router.post('/jobCompletedStore', auth.checkToken, ticketController.jobCompletedStore);
router.post('/jobCompleted', auth.checkToken, ticketController.jobCompleted);
router.post('/uploadWorkOrder', ticketController.uploadWorkOrder);
router.post('/uploadInvoice', ticketController.uploadInvoice);
router.post('/fetchTicket', ticketController.fetchTicket);
router.post('/fetchTicketByNumber', ticketController.fetchTicketByNumber);
router.get('/getTickets', auth.checkToken, ticketController.getTickets);
router.get('/getTicketById', auth.checkToken, ticketController.getTicketById);

// Ticket chat routes
router.post('/createTicketChat', auth.checkToken, ticketController.createTicketChat);
router.get('/getUnreadChat', auth.checkToken, ticketController.getUnreadChat);
router.get('/getTicketChat', auth.checkToken, ticketController.getTicketChat);

// Delete ticket
router.post('/delete', auth.checkToken, auth.checkPass, ticketController.deleteTicket);

// Send ticket
router.post("/sendTicket", ticketController.sendTicket)


.post("/twillio-hook", async (req, res) => {
    try {
  
      var goBack =  `\n\n(Type \`restart\` to start all over or type \`back\` to go back)`
      // Ticket creation stages
      const TICKET_CREATION_STAGES = [
        { key: "stationName", prompt: "Please select a location (Type a number):" },
        { key: "dateOfWorkOrder", prompt: "Please enter the date of work order (DD/MM/YYYY): " },
        // { key: "ticketNumber", prompt: "Please enter the ticket number:" },
        { key: "placedBy", prompt: "Who placed this ticket?" },
        { key: "issue", prompt: "What was the issue?" },
        // { key: "approved", prompt: "Is this approved? (Yes/No)" },
        { key: "explanation", prompt: "Please provide an explanation: " },
        { key: "vendor", prompt: "Please select vendor (Type a number): " },
        { key: "otherNotes", prompt: "Any other notes? (Type 'none' if none)" },
      ];
      const { From, To, Body } = req.body;
  
      // Get or initialize conversation state
      if (!req.session[From]) {
        req.session[From] = {
          stage: 'start',
          ticketData: {}
        };
      }
  
      const state = req.session[From];
      let responseMessage = '';
  
      const user = await User.findOne({ phone: From.split(':')[1] , userType: "user"}, { password: 0 }).populate('locationIds')
      const vendLists = await User.find({ userType: 'vendor' }, { password: 0 });
  
  
      // Handle conversation based on current stage
      if (state.stage === 'start' || Body.toLowerCase() === 'restart' || (state.stage == 'stationName' && Body.toLowerCase() === 'back')) {
  
        if (Body.toLowerCase() === 'create ticket') {
          state.stage = 'stationName';
          var locStr = ``
          user.locationIds.map((loc, k) => {
            locStr += `\n${k + 1}. ${loc.name}`
            return loc
          })
          responseMessage = "Let's create a new ticket.\n\n" + TICKET_CREATION_STAGES[0].prompt + locStr;
        } else if (Body.toLowerCase().startsWith('update ticket')) {
          // Extract ticket number from message
          const ticketNumber = Body.split(' ').slice(2).join(' ');
          if (ticketNumber) {
            const ticket = await Tickets.findOne({ ticketNumber });
            if (ticket) {
              state.stage = 'update_options';
              state.ticketData.ticketNumber = ticketNumber;
              responseMessage = `What would you like to update for ticket ${ticketNumber}? Reply with one of: Status, Notes, Vendor`;
            } else {
              responseMessage = `Ticket ${ticketNumber} not found. Please check the ticket number and try again.`;
            }
          } else {
            responseMessage = "Please provide a ticket number. Example: 'update ticket 12345'";
          }
        }
        else {
          state.stage = 'start';
          responseMessage = `*Birdiesstore*: Hi ${user?.fullname||""} 👋🏻, Welcome to our ticketing system. ${user?.fullname ? "Reply with \`create ticket\` to create a new ticket or \`update ticket [ticket number]\` to update an existing ticket." : "We notice you do not have an active account with us. Kindly contact us at support@birdiesstore.com to create an account. \nIf you already have an account but we can't find it, please update your number to " + `\`${From.split(':')[1]}\``}`;
        }
      } 
      else if (Body.toLowerCase() === 'back') {
        var prevStage 
        var currentStageIndex = TICKET_CREATION_STAGES.findIndex(stage => stage.key === state.stage);
        if (state.stage != 'start') {
          prevStage = TICKET_CREATION_STAGES[currentStageIndex - 1];
          state.stage = prevStage.key;
          responseMessage = prevStage.prompt;
        } else {
          s = TICKET_CREATION_STAGES[currentStageIndex];
          state.stage = s.key;
          responseMessage = s.prompt;
        }
      }
        else if (state.stage === 'update_options') {
        // Handle update options
        const option = Body.toLowerCase();
        if (['status', 'notes', 'vendor'].includes(option)) {
          state.stage = `update_${option}`;
          responseMessage = `Please provide the new ${option} for ticket ${state.ticketData.ticketNumber}:`;
        } else {
          responseMessage = "Invalid option. Reply with one of: Status, Notes, Vendor";
        }
      } else if (state.stage.startsWith('update_')) {
        // Handle update value submission
        const updateType = state.stage.split('_')[1];
        const field = updateType === 'notes' ? 'otherNotes' : updateType;
  
        // Update the ticket
        const updatedTicket = await Tickets.findOneAndUpdate({ ticketNumber: state.ticketData.ticketNumber }, { [field]: Body });
  
        if (updatedTicket) {
          responseMessage = `Ticket ${state.ticketData.ticketNumber} has been updated with new ${updateType}: ${Body}`;
        } else {
          responseMessage = `Failed to update ticket ${state.ticketData.ticketNumber}. Ticket not found.`;
        }
  
        state.stage = 'start';
        state.ticketData = {};
      } else {
        // Handle ticket creation flow
        var currentStageIndex = TICKET_CREATION_STAGES.findIndex(stage => stage.key === state.stage);
        console.log(currentStageIndex, state.stage)
  
        if (currentStageIndex >= 0) {
          // Save the answer to the current question
          state.ticketData[state.stage] = Body;
          if (state.stage == 'vendor') {
            if (isNumber(Body) && (Body <= vendLists.length)) {
              state.ticketData[state.stage] = vendLists[Body - 1]._id
            } else {
              currentStageIndex -= 1
            }
          }
          if (state.stage == 'stationName') {
            if (isNumber(Body) && (Body <= user.locationIds.length)) {
              state.ticketData[state.stage] = user.locationIds[Body - 1]._id
            } else {
              currentStageIndex -= 1
            }
          }
  
          // Move to the next question or finish
          if (currentStageIndex < TICKET_CREATION_STAGES.length - 1) {
            const nextStage = TICKET_CREATION_STAGES[currentStageIndex + 1];
            state.stage = nextStage.key;
            if (nextStage.key == "vendor") {
              var str = ``
              vendLists.map((v, k) => {
                str += `\n${k + 1}. ${v.fullname}`
                return v
              })
              nextStage.prompt += str
            }
  
            responseMessage = nextStage.prompt;
          } else {
            // All questions answered, create the ticket
            const newTicket = await Tickets.create({ ...state.ticketData, ticketNumber: generateRandomNumber(10), locationId: state.ticketData.stationName, organisationId: user.organisationId, createdBy: user._id })
            // const nTicket = await Tickets.findOne({ ticketNumber: state.ticketData.ticketNumber })
  
            responseMessage = "Thank you! Your ticket has been created with the following details:\n\n" +
              Object.entries(state.ticketData)
                .map(([key, value]) => {
                  var resstr = `*${key.charAt(0).toUpperCase() + key.slice(1)}*: \`${value}\``
                  if (key == 'stationName')  user.locationIds.map(loc => {
                    if (loc._id == value) resstr = `*${key.charAt(0).toUpperCase() + key.slice(1)}*: \`${loc.name}\``
                  })
                  if (key == 'vendor')  vendLists.map(vend => {
                    if (vend._id == value) resstr = `*${key.charAt(0).toUpperCase() + key.slice(1)}*: \`${vend.fullname}\``
                  })
                  return resstr
                })
                .join('\n') +
              `\n\nTicket ID: ${newTicket.id}`;
  
            state.stage = 'start';
            state.ticketData = {};
          }
        }
      }
  
      // Save session
      req.session.save();
      if(state.stage != 'start') responseMessage += goBack
      // Send response via Twilio
      await client.messages.create({
        body: responseMessage,
        from: To,
        to: From
      });
  
      // Respond to Twilio
      res.status(200).send({
        success: true,
        message: 'Message processed successfully'
      });
    } catch (error) {
      console.error('Error processing WhatsApp message:', error);
      res.status(500).send({
        success: false,
        error: 'Failed to process message'
      });
    }
  })
  
  .get("/twillio-hook", async (req, res) => {
    try {
      console.log(req.query, 'featchchh')
    } catch (error) {
      console.log(error)
    }
  })
module.exports = router
