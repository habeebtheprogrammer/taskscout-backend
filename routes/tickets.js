const express = require('express')
const {ticketController} = require('../controllers/ticketController.js');
const auth = require('../middleware/auth/index.js')

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
router.post("/sendTicket", ticketController.sendTicket);

module.exports = router
