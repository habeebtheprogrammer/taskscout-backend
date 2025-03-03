const jwt =  require('jsonwebtoken')
const moment =  require('moment')
const  Tickets  =  require('../models/taskscoutTickets.js')
const  User =  require('../models/taskscoutUsers.js')
const { sendVendorTicketConfirmation, generateRandomNumber, uploadWorkOrder, unique, sendTicket } =  require('../utils/index.js')

exports.ticketService = {
  // Get next available ticket number
  getNextTicketNumber: async (locationId) => {
    const getEntries = await Tickets.find({ locationId }).sort({ ticketNumber: -1 }).limit(1);
    
    if (getEntries.length === 0) {
      return generateRandomNumber(7);
    } else {
      return getEntries[0].ticketNumber + 1;
    }
  },

  // Check if ticket exists
  checkTicketExists: async (locationId, ticketNumber) => {
    return await Tickets.findOne({ locationId, ticketNumber });
  },

  // Create a new ticket
  createTicket: async (ticketData) => {
    return await Tickets.create(ticketData);
  },

  // Update an existing ticket
  updateTicket: async (ticketData) => {
    const { dateOfService, expDateService, ticketNumber, siteNumber, siteName, timeSpent, cost, issue, explain, approved, provider, reason, vendor, locationId, otherNotes, photos, placedBy } = ticketData;
    
    return await Tickets.findOneAndUpdate(
      { ticketNumber }, 
      {
        dateOfService: new Date(dateOfService),
        photos,
        ticketNumber, 
        siteNumber, 
        siteName, 
        timeSpent, 
        cost, 
        issue, 
        approved, 
        provider, 
        explain, 
        reason, 
        vendor, 
        placedBy, 
        otherNotes, 
        locationId
      }
    );
  },

  // Reject a ticket
  rejectTicket: async (token, ticketId, reason) => {
    const data = jwt.decode(token);
    return await Tickets.updateOne(
      { _id: data?.ticketId || ticketId }, 
      {
        reason, 
        approvedByVendor: false
      }
    );
  },

  // Accept a ticket
  acceptTicket: async (token, ticketId, ETA, technician) => {
    const data = jwt.decode(token);
    return await Tickets.findOneAndUpdate(
      { _id: data?.ticketId || ticketId }, 
      {
        approvedByVendor: true,
        ETA,
        technician
      }
    );
  },

  // Submit card details
  submitCard: async (ticketId, cardType, cardNumber) => {
    return await Tickets.updateOne(
      { _id: ticketId }, 
      { 
        cardDetails: { cardType, cardNumber } 
      }
    );
  },

  // Approve a ticket
  approveTicket: async (ticketId) => {
    return await Tickets.findOneAndUpdate(
      { _id: ticketId }, 
      {
        "invoice.approved": true
      }
    );
  },

  // Upload waiting parts
  uploadWaitingParts: async (ticketId, waitingParts) => {
    return await Tickets.findOneAndUpdate(
      { _id: ticketId }, 
      {
        "waitingParts": waitingParts
      }
    );
  },

  // Mark job as completed by store
  markJobCompletedByStore: async (ticketId, status, photos) => {
    return await Tickets.findOneAndUpdate(
      { _id: ticketId }, 
      {
        "jobCompletedStore": status,
        $addToSet: { photos }
      }
    );
  },

  // Mark job as completed
  markJobCompleted: async (ticketId, status) => {
    return await Tickets.findOneAndUpdate(
      { _id: ticketId }, 
      {
        "jobCompleted": status
      }
    );
  },

  // Upload work order
  uploadWorkOrder: async (token, ticketId, workOrderData) => {
    const { images, savedParts, totalWorkTime, managerSignatureUrl, vendorSignatureUrl, explain, jobCompleted, url } = workOrderData;
    const data = jwt.decode(token);
    
    const query = {
      $addToSet: {
        workOrder: {
          submittedAt: new Date(),
          images,
          explain,
          savedParts,
          totalWorkTime,
          managerSignatureUrl,
          vendorSignatureUrl,
        },
      }
    };
    
    if (url) query.$addToSet.photos = url;
    
    return await Tickets.findOneAndUpdate(
      { _id: data?.ticketId || ticketId }, 
      {
        jobCompleted,
        ...query
      }
    );
  },

  // Upload invoice
  uploadInvoice: async (invoiceData) => {
    const { totalWorkTime, images, labourAmount, partAmount, totalAmount, ticketNumber, managerSignatureUrl, vendorSignatureUrl, totalLaborCost, totalPartCost, workOrder, savedParts, expenses } = invoiceData;
    
    return await Tickets.findOneAndUpdate(
      { ticketNumber }, 
      {
        workOrder,
        invoice: {
          submittedAt: new Date(),
          additionalExpenses: expenses,
          images,
          savedParts,
          totalWorkTime,
          labourAmount, 
          partAmount, 
          totalAmount,
          managerSignatureUrl,
          vendorSignatureUrl,
          totalLaborCost,
          totalPartCost
        }
      }
    );
  },

  // Fetch ticket by token
  fetchTicketByToken: async (token) => {
    const data = jwt.decode(token);
    return await Tickets.findOne({ _id: data.ticketId });
  },

  // Fetch ticket by number
  fetchTicketByNumber: async (ticketNumber) => {
    return await Tickets.findOne({ ticketNumber })
      .populate("locationId")
      .populate("vendor");
  },

  // Get all tickets
  getTickets: async (filters) => {
    const { userLevel, userType, userId, filterBy, date, stations, organisationId } = filters;
    let query = userLevel != 0 ? { '$or': [] } : {};
    
    // Add organization filter
    query.organisationId = organisationId;
    
    // Add user type filters
    if (userType == 'vendor') {
      query.vendor = userId;
    }
    
    // Add filter by status
    if (filterBy) {
      if (filterBy == "closed") {
        if (query["$or"]) {
          query['$or'].push({ 'cardDetails.cardType': 'Credit Card' }, { 'cardDetails.cardType': 'Check' });
        } else {
          query["$or"] = [{ 'cardDetails.cardType': 'Credit Card' }, { 'cardDetails.cardType': 'Check' }];
        }
      } else if (filterBy == "open") {
        query["cardDetails.cardType"] = { $nin: ['Credit Card', 'Check'] };
      } else {
        query.approved = filterBy;
      }
    }
    
    // Add date filter
    if (date) {
      const [startDate, endDate] = date.split(',');
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.dateOfService = { '$lt': end, '$gt': start };
    }
    
    // Add stations filter
    if (stations && userLevel == 1) {
      query['$or'].push({ "locationId": stations.split(',') });
    }
    
    return await Tickets.find(query)
      .sort({ "_id": -1 })
      .populate("locationId")
      .populate("vendor")
      .populate("technician")
      .populate("photos.uploadedBy");
  },

  // Get ticket by ID with filters
  getTicketById: async (filters) => {
    const { userLevel, userType, userId, filterBy, date } = filters;
    let query = {};
    
    // Add user type filters
    if (userType != 'vendor') {
      const users = await User.find({ "vendorSubadmin": { "$in": userId } });
      if (users?.length) {
        const vendorIds = users.map(sub => sub._id);
        query['$or'] = [{ vendor: { $in: vendorIds } }, { 'technician': userId }];
      }
    }
    
    if (userType == 'vendor') {
      query.vendor = userId;
    }
    
    // Add filter by status
    if (filterBy) {
      query.approved = filterBy;
    }
    
    // Add date filter
    if (date) {
      const [startDate, endDate] = date.split(',');
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.dateOfService = { '$lt': end, '$gt': start };
    }
    
    return await Tickets.find(query)
      .sort({ "_id": -1 })
      .populate("locationId")
      .populate("vendor")
      .populate("technician")
      .populate("photos.uploadedBy");
  },

  // Create ticket chat
  // createTicketChat: async (text, ticketId, ticketNumber, locationId, userId) => {
  //   const users = await User.find({ $or: [{ locationIds: { $in: locationId } }, { level: 0 }] });
  //   const unread = users.map(u => (u._id != userId) ? u._id : null).filter(Boolean);
    
  //   return await TicketsChat.create({
  //     text, 
  //     ticketId, 
  //     createdBy: userId, 
  //     ticketNumber, 
  //     createdAt: new Date(), 
  //     unread
  //   });
  // },

  // Get unread chat messages
  // getUnreadChat: async (userId) => {
  //   const msgs = await TicketsChat.find({ unread: { $in: userId } });
  //   const ids = msgs.map(item => item.ticketId.toString());
  //   const uniqueIds = unique(ids);
    
  //   return uniqueIds.map(item => ({
  //     ticketId: item,
  //     count: ids.filter(x => x == item).length
  //   }));
  // },

  // Get ticket chat messages
  // getTicketChat: async (ticketNumber, limit, pageNum, userId) => {
  //   const query = { ticketNumber };
    
  //   const chats = await TicketsChat.find(query)
  //     .sort({ _id: 1 })
  //     .populate('createdBy');
    
  //   // Mark messages as read
  //   await TicketsChat.updateMany(query, {
  //     $pull: { 'unread': userId }
  //   });
    
  //   return chats;
  // },

  // Delete ticket
  deleteTicket: async (id) => {
    return await Tickets.findByIdAndRemove(id);
  },

  // Send ticket
  sendTicket: async (data) => {
    return await sendTicket(data);
  }
};