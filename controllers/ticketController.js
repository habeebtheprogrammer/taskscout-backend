const { ticketService } = require('../services/ticketService.js')
const { notificationService } = require( '../services/notificationService.js')
const { userService } = require('../services/userService.js')
const bcrypt = require('bcryptjs')

exports.ticketController = {
  // Get available ticket numbers
  getAvailableTicketsNumber: async (req, res) => {
    try {
      const { dateChoosen, locationId } = req.body;
      const ticketNumber = await ticketService.getNextTicketNumber(locationId);
      
      res.status(200).send({
        success: true,
        ticketNumber
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Create a new ticket
  createTicket: async (req, res) => {
    try {
      const ticketData = {
        ...req.body,
        createdBy: req.user,
        organisationId: req.organisationId
      };
      
      // Check if ticket number already exists
      const exists = await ticketService.checkTicketExists(ticketData.locationId, ticketData.ticketNumber);
      if (exists) {
        return res.status(400).send({
          err: 'Ticket number has been used'
        });
      }
      
      const ticket = await ticketService.createTicket(ticketData);
      
      // Create notifications
      await notificationService.createTicketNotification(ticket, req.user, req.fullname, req.organisationId);
      
      res.json({
        message: 'Ticket has been added successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Update an existing ticket
  updateTicket: async (req, res) => {
    try {
      const ticketData = req.body;
      const ticket = await ticketService.updateTicket(ticketData);
      
      res.json({
        message: 'Ticket has been saved successfully',
      });
      
      // Handle notifications based on approval status
      await notificationService.handleTicketUpdateNotifications(ticket, req.user, req.organisationId);
      
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Reject a ticket
  rejectTicket: async (req, res) => {
    try {
      const { reason, ticketId, email, token } = req.body;
      await ticketService.rejectTicket(token, ticketId, reason);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Accept a ticket
  acceptTicket: async (req, res) => {
    try {
      const { token, ETA, ticketId, email, technician } = req.body;
      const ticket = await ticketService.acceptTicket(token, ticketId, ETA, technician);
      
      // Send notifications
      await notificationService.handleTicketAcceptanceNotifications(ticket, req.user, ETA);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Submit card details
  submitCard: async (req, res) => {
    try {
      const { cardType, ticketId, cardNumber } = req.body;
      await ticketService.submitCard(ticketId, cardType, cardNumber);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Approve a ticket
  approveTicket: async (req, res) => {
    try {
      const { ticketId } = req.body;
      const ticket = await ticketService.approveTicket(ticketId);
      
      // Send notifications
      await notificationService.sendTicketApprovalNotification(ticket, req.user);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Upload waiting parts
  uploadWaitingParts: async (req, res) => {
    try {
      const { ticketId, waitingParts } = req.body;
      const ticket = await ticketService.uploadWaitingParts(ticketId, waitingParts);
      
      // Send notification
      await notificationService.sendWaitingPartsNotification(ticket);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Mark job as completed by store
  jobCompletedStore: async (req, res) => {
    try {
      const { ticketId, status, photos } = req.body;
      await ticketService.markJobCompletedByStore(ticketId, status, photos);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Mark job as completed
  jobCompleted: async (req, res) => {
    try {
      const { ticketId, status } = req.body;
      await ticketService.markJobCompleted(ticketId, status);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Upload work order
  uploadWorkOrder: async (req, res) => {
    try {
      const { images, ticketId, token, savedParts, totalWorkTime, managerSignatureUrl, vendorSignatureUrl, explain, jobCompleted, url } = req.body;
      const ticket = await ticketService.uploadWorkOrder(token, ticketId, {
        images, savedParts, totalWorkTime, managerSignatureUrl, vendorSignatureUrl, explain, jobCompleted, url
      });
      
      // Send notification
      await notificationService.sendWorkOrderSubmittedNotification(ticket);
      
      res.json({
        message: 'Ticket has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Upload invoice
  uploadInvoice: async (req, res) => {
    try {
      const invoiceData = req.body;
      const ticket = await ticketService.uploadInvoice(invoiceData);
      
      // Send notifications
      await notificationService.sendInvoiceNotifications(ticket, req.user);
      
      res.json({
        message: 'Invoice has been updated successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Fetch ticket by token
  fetchTicket: async (req, res) => {
    try {
      const { token } = req.body;
      const ticket = await ticketService.fetchTicketByToken(token);
      
      res.json({
        ticket
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Fetch ticket by number
  fetchTicketByNumber: async (req, res) => {
    try {
      const { ticketNumber } = req.body;
      const ticket = await ticketService.fetchTicketByNumber(ticketNumber);
      
      res.json({
        ticket
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Get all tickets
  getTickets: async (req, res) => {
    try {
      const filters = {
        userLevel: req.level,
        userType: req.userType,
        userId: req.user,
        filterBy: req.query.filterBy,
        date: req.query.date,
        stations: req.query.stations,
        organisationId: req.organisationId
      };
      
      const tickets = await ticketService.getTickets(filters);
      
      res.json({
        tickets
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Get ticket by ID
  getTicketById: async (req, res) => {
    try {
      const filters = {
        userLevel: req.level,
        userType: req.userType,
        userId: req.user,
        filterBy: req.query.filterBy,
        date: req.query.date
      };
      
      const tickets = await ticketService.getTicketById(filters);
      
      res.json({
        tickets
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Create ticket chat
  createTicketChat: async (req, res) => {
    try {
      const { text, ticketId, ticketNumber, locationId } = req.body;
      const chat = await ticketService.createTicketChat(text, ticketId, ticketNumber, locationId, req.user);
      
      res.json({
        chat
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Get unread chat messages
  getUnreadChat: async (req, res) => {
    try {
      const chatNotifications = await ticketService.getUnreadChat(req.user);
      
      res.json({
        data: chatNotifications
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Get ticket chat messages
  getTicketChat: async (req, res) => {
    try {
      const { limit, pageNum, ticketNumber } = req.query;
      const chats = await ticketService.getTicketChat(ticketNumber, parseInt(limit), parseInt(pageNum), req.user);
      
      res.json({
        chats
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Delete ticket
  deleteTicket: async (req, res) => {
    try {
      const { id, confirmPassword } = req.body;
      const user = await userService.findUserById(req.user);
      
      const isPasswordValid = await bcrypt.compare(confirmPassword, user.password);
      
      if (isPasswordValid || req.confirmPassword) {
        const data = await ticketService.deleteTicket(id);
        
        res.status(200).send({
          success: true,
          message: 'Ticket deleted successfully',
          data
        });
      } else {
        res.status(400).send({
          err: 'Password is incorrect!'
        });
      }
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  },

  // Send ticket
  sendTicket: async (req, res) => {
    try {
      await ticketService.sendTicket(req.body);
      
      res.json({
        'message': "Your complaint has been sent successfully"
      });
    } catch (error) {
      console.log(error);
      res.status(400).send({
        err: 'Something went wrong!'
      });
    }
  }
};