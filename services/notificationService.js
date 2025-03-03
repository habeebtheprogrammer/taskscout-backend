const jwt = require('jsonwebtoken')
const moment = require('moment')
const { Notification } = require('../models/taskscoutNotifications.js')
const { GeneralNotification } = require('../models/taskscoutNotifications.js')
const { User } = require('../models/taskscoutUsers.js')
const { onesignal } = require('../utils/onesignal.js')
const { sendVendorTicketConfirmation, uploadWorkOrder } = require('../utils/index.js')

exports.notificationService = {
  // Create notification for new ticket
  createTicketNotification: async (ticket, userId, fullname, organisationId) => {
    const admin = await User.findOne({ level: 0 });
    
    // Create notification
    await Notification.create({
      for: 'ticket',
      title: "A new ticket has been created",
      userList: [admin._id],
      initiatedBy: userId,
      "affectedId": ticket._id
    });
    
    // Create general notification
    await GeneralNotification.create({
      for: 'ticket',
      title: `${fullname} created a new ticket #${ticket.ticketNumber}`,
      description: `${fullname} created a new ticket #${ticket.ticketNumber}`,
      userList: [admin._id],
      initiatedBy: userId,
      referenceId: ticket._id,
      createdAt: new Date(),
      organisationId
    });
    
    // Send push notification
    onesignal.sendNotification({
      headings: { "en": "A new ticket has been created" },
      contents: { "en": `Hi ${admin.fullname || 'admin'}, ${fullname} created a new ticket #${ticket.ticketNumber}` },
      include_player_ids: [admin.oneSignalUserId]
    });
  },

  // Handle notifications for ticket updates
  handleTicketUpdateNotifications: async (ticket, userId, organisationId) => {
    const vendor = await User.findOne({ _id: ticket.vendor });
    
    if (!vendor) return;
    
    // Get ticket details
    const { approved, provider, issue, explain, placedBy, otherNotes, dateOfService, siteName, ticketNumber } = ticket;
    
    // Handle approval notifications
    if (approved === 'yes') {
      // Create general notification for approval
      await GeneralNotification.create({
        for: 'ticket',
        title: `Admin has approved your ticket #${ticketNumber}`,
        description: `Admin has approved your ticket #${ticketNumber}`,
        userList: [ticket.createdBy],
        initiatedBy: userId,
        referenceId: ticket._id,
        organisationId,
        createdAt: new Date()
      });
      
      // Create general notification for vendor
      await GeneralNotification.create({
        for: 'ticket',
        title: `${siteName} placed a ticket #${ticketNumber}. please check your email and upload your work order`,
        description: `Store ${siteName} approved a ticket #${ticketNumber}. please check your email`,
        userList: [vendor._id],
        initiatedBy: userId,
        referenceId: ticket._id,
        organisationId,
        createdAt: new Date()
      });
      
      // Send push notification to vendor
      onesignal.sendNotification({
        headings: { "en": `New ticket pending approval` },
        contents: { "en": `Hi ${vendor.fullname}, Store ${siteName} printed a new ticket #${ticketNumber} with the following details.  
        provider: ${provider},  issue: ${issue}, explanation  with the following details.  
        provider: ${provider},  issue: ${issue}, explanation: ${explain}, placed by: ${placedBy}, other notes: ${otherNotes}, date of work order: ${dateOfService}` },
        include_player_ids: [vendor.oneSignalUserId]
      });
    }
    
    if (approved === 'no') {
      // Create general notification for rejection
      await GeneralNotification.create({
        for: 'ticket',
        title: `Admin has rejected your ticket #${ticketNumber}`,
        description: `Admin has rejected your ticket #${ticketNumber}`,
        userList: [ticket.createdBy],
        initiatedBy: userId,
        referenceId: ticket._id,
        organisationId,
        createdAt: new Date()
      });
      
      // Send push notification for rejection
      onesignal.sendNotification({
        headings: { "en": "Ticket has been rejected" },
        contents: { "en": `Hi ${vendor.fullname}, Admin has rejected your ticket #${ticketNumber}` },
        include_player_ids: [vendor.oneSignalUserId]
      });
    }
    
    // Send email and SMS to vendor
    const body = `Hi ${vendor.fullname}, Store ${siteName} printed a new ticket #${ticketNumber} with the following details.  
    provider: ${provider}, issue: ${issue}, explanation: ${explain}, placed by: ${placedBy}, other notes: ${otherNotes}, date of work order: ${dateOfService}`;
    
    const ticketToken = jwt.sign({ticketId: ticket._id, ticketNumber, email: vendor.email}, 'tick');
    
    // Send email notification
    sendVendorTicketConfirmation({
      email: vendor.email, 
      acceptLink: `https://byzpal.com/acceptTicket?token=${ticketToken}`, 
      rejectLink: `https://byzpal.com/rejectTicket?token=${ticketToken}`, 
      body
    });
    
    // Send SMS notification
    // twilioClient.messages
    //   .create({
    //     body,  
    //     to: vendor.phone,
    //     from: '(864) 383-3723'
    //   })
    //   .then(message => console.log(message))
    //   .catch((err) => console.log(err))
    //   .done();
  },

  // Handle notifications for ticket acceptance
  handleTicketAcceptanceNotifications: async (ticket, userId, ETA, token, email) => {
    // Send email to technician
    const data = jwt.decode(token);
    const ticketToken = jwt.sign({ticketId: ticket._id, ticketNumber: ticket.ticketNumber}, 'tick');
    
    const body = `Hi, thank you for accepting this order at ${ticket.siteName}. your estimated date and time of arrival is ${moment(ETA).format("DD/MM/yy HH:mm")}. Once job is completed please click on the link below to upload your work order.`;
    
    uploadWorkOrder({
      email: data?.email || email, 
      link: `https://byzpal.com/uploadWorkOrder?token=${ticketToken}`, 
      body
    });
    
    // Send notification to technician
    const technician = await User.findById(ticket.technician);
    if (technician) {
      onesignal.sendNotification({
        headings: { "en": "You have been assigned to a job" },
        contents: { "en": `Hi ${technician.fullname}, You have a pending ticket` },
        include_player_ids: [technician.oneSignalUserId]
      });
    }
    
    // Get vendor and admin
    const vendor = await User.findOne({_id: ticket.vendor}).populate("vendorSubadmin");
    const admin = await User.findOne({level: 0});
    const userAccepting = await User.findOne({_id: userId});
    
    // Prepare user IDs for notifications
    const userIds = [vendor._id];
    const signalIds = [vendor.oneSignalUserId];
    
    // Add vendor subadmins to notification list
    for (const key in vendor?.vendorSubadmin) {
      userIds.push(vendor?.vendorSubadmin[key]?._id);
      signalIds.push(vendor?.vendorSubadmin[key]?.oneSignalUserId);
    }
    
    // Create notification
    await Notification.create({
      for: 'ticket',
      title: "Ticket has been accepted by " + userAccepting.fullname,
      userList: [...userIds, admin._id],
      initiatedBy: ticket.vendor,
      "affectedId": ticket._id
    });
    
    // Send push notification
    onesignal.sendNotification({
      headings: { "en": "Ticket has been accepted" },
      contents: { "en": `Ticket at ${ticket.siteName} has been accepted by ${userAccepting?.fullname}. estimated date and time of arrival is ${moment(ETA).format("DD/MM/yy HH:mm")}` },
      include_player_ids: [...signalIds, admin.oneSignalUserId]
    });
  },

  // Send notification for ticket approval
  sendTicketApprovalNotification: async (ticket, userId) => {
    const admin = await User.findOne({level: 0});
    
    // Create notification
    await Notification.create({
      for: 'ticket',
      title: "Ticket has been approved",
      userList: [admin._id],
      initiatedBy: userId,
      "affectedId": ticket._id
    });
    
    // Send push notification
    onesignal.sendNotification({
      headings: { "en": "Ticket has been approved" },
      contents: { "en": `Hi ${admin.fullname}, Your ticket has been approved` },
      include_player_ids: [admin.oneSignalUserId]
    });
  },

  // Send notification for waiting parts
  sendWaitingPartsNotification: async (ticket) => {
    const vendor = await User.findOne({_id: ticket.vendor});
    
    // Send push notification
    onesignal.sendNotification({
      headings: { "en": "waiting part was submited by technician" },
      contents: { "en": `Hi ${vendor.fullname}, waiting part was submited by technician` },
      include_player_ids: [vendor.oneSignalUserId]
    });
  },

  // Send notification for work order submission
  sendWorkOrderSubmittedNotification: async (ticket) => {
    const admin = await User.findOne({level: 0});
    
    // Create notification
    await Notification.create({
      for: 'ticket',
      title: "Work order has been submitted",
      userList: [admin._id],
      initiatedBy: ticket.vendor,
      "affectedId": ticket._id
    });
    
    // Send push notification
    onesignal.sendNotification({
      headings: { "en": "Work order was submited" },
      contents: { "en": `Hi ${admin.fullname || 'admin'}, A new work order was submitted` },
      include_player_ids: [admin.oneSignalUserId]
    });
  },

  // Send notifications for invoice submission
  sendInvoiceNotifications: async (ticket, userId) => {
    const admin = await User.findOne({level: 0});
    
    // Create notification for admin
    await Notification.create({
      for: 'invoice',
      title: "Vendor has claimed they have completed a task. please comfirm",
      userList: [admin._id],
      initiatedBy: userId,
      "affectedId": ticket._id
    });
    
    // Create notifications for users with access to this location
    const userList = await User.find({$or: [{level: 0}, {locationIds: {$in: ticket.locationId}}]});
    const userIds = userList.map(u => u._id);
    
    if (userIds.length) {
      await Notification.create({
        for: 'invoice',
        title: "A new invoice is waiting for approval",
        userList: userIds,
        initiatedBy: userId,
        "affectedId": ticket._id
      });
    }
  }
};