const fetch = require('node-fetch');
const axios = require("axios");
const { usersService, walletsService } = require('../service');
const dataplan = require("../dataplan.json")
const {   detectNetwork } = require('../utils/vtu');
const { generateRandomNumber, verifyMonnifySignature, calculateFee, isNotableEmail, removeCountryCode, combineAndSortDataPlan } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/responder');
const { sendNotification } = require('../utils/onesignal');

// const vendor = "QUICKVTU"  //'QUICKVTU' or 'BILALSDATAHUB'

// Helper function to make authenticated requests to Monify API
async function korraPay(endpoint, method, body = null, apikey) {
  // const url = `${MONIFY_BASE_URL}${endpoint}`;
  const url = "https://api.korapay.com/merchant" + endpoint
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apikey ? apikey : process.env.KORRA_SECRET_KEY}`,
  };
  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  };

  const response = await fetch(url, options);
  return await response.json();
} 

async function quickVTU(endpoint, method, body = null, vendor) {
  // const url = `${MONIFY_BASE_URL}${endpoint}`;
  var result
  if(vendor == 'quickvtu'){
    const config = {
      headers: {
        Authorization: `Token ${process.env.QUICKVTU_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
     result = await axios.post('https://quickvtu.com' + endpoint, JSON.stringify(body), config)
  } else  if(vendor == 'bilal') {
    const config = {
      headers: {
        Authorization: `Token ${process.env.BILALSHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
     result = await axios.post('https://bilalsadasub.com' + endpoint, JSON.stringify(body), config)
  } else {
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        "Api-Token": process.env.MOBILEVTU_API_TOKEN,
        "Request-Id": body["request-id"],
      },
    };
    var operator = body.network == 1 ? 'MTN' : body.network == 2 ? "Airtel"  : body.network == 3 ? "Glo" : "9Mobile"
    console.log(config)
     result = await axios.post(`https://api.mobilevtu.com/v1/${process.env.MOBILEVTU_API_KEY}/topup`, `operator=${operator}&type=data&value=${body.data_plan}&phone=${body.phone}`, config)
  }

  return result.data
}

async function monnify(endpoint, method, body = null) {
  const url = `https://api.monnify.com${endpoint}`;
  // const url = "https://api.korapay.com/merchant"+endpoint
  const base64encode = `${Buffer.from(`${process.env.MONIFY_API_KEY}:${process.env.MONIFY_SECRET_KEY}`).toString('base64')}`
  const requestToken = await fetch("https://api.monnify.com/api/v1/auth/login", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Basic ${base64encode}`
    },
    body: {}
  })

  const getToken = await requestToken.json()
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken?.responseBody?.accessToken}`,

  };
  // console.log(getToken?.responseBody?.accessToken)
  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  };

  const response = await fetch(url, options);
  return await response.json();
}

exports.fetch = async (req, res, next) => {
  try {
    var wallet = await walletsService.getWallets({ userId: req.userId })
    if (wallet.totalDocs == 0) {
      var user = await usersService.getUsers({ "$or": [{ _id: req.userId }, { email: "archive." + req.email }] })
      var checkForDevice = await usersService.getUsers({ deviceid: req.headers.deviceid })
 
      // if ((user.totalDocs == 1) && req.headers.deviceid && (checkForDevice.totalDocs == 1 && checkForDevice.docs[0]._id == req.userId)) {
      //   wallet = await walletsService.createWallet({
      //     userId: req.userId,
      //     balance: 50
      //   })
      //   const bonus = {
      //     "amount": 50,
      //     "userId": req.userId,
      //     "reference": "SignupBonus" + '--' + generateRandomNumber(10),
      //     "narration": "Signup bonus",
      //     "currency": "NGN",
      //     "type": 'credit',
      //     "status": "successful"
      //   }
      //   await walletsService.saveTransactions(bonus)
      //   sendNotification({
      //     headings: { "en": `₦50 was credited to your wallet` },
      //     contents: { "en": `Congratulations ${req.firstName}! You just earned ₦50 signup bonus. Refer more friends download 360gadgetsafrica to earn more.` },
      //     include_subscription_ids: [req.oneSignalId],
      //     url: 'gadgetsafrica://profile',
      //   })
      // } else {
      //   wallet = await walletsService.createWallet({
      //     userId: req.userId,
      //     balance: 0
      //   })
      // }
      wallet = await walletsService.createWallet({
        userId: req.userId,
        balance: 0
      })
      console.log("is notable", req.email)
      if ((checkForDevice.totalDocs == 1 && checkForDevice.docs[0]._id == req.userId) && isNotableEmail(req.email) ) {
        if (user.docs[0].referredBy?._id && user.docs[0].verificationCode == '' && user.totalDocs == 1) {

          await walletsService.updateWallet({ userId: user.docs[0].referredBy?._id }, { $inc: { balance: 50 } })
          const bonus1 = {
            "amount": 50,
            "userId": user.docs[0]?.referredBy?._id,
            "reference": "Referral" + '--' + generateRandomNumber(10),
            "narration": "Referral bonus for new user",
            "currency": "NGN",
            "type": 'credit',
            "status": "successful"
          }
          await walletsService.saveTransactions(bonus1)
          sendNotification({
            headings: { "en": `₦50 was credited to your wallet` },
            contents: { "en": `Congratulations ${user.docs[0].referredBy?.firstName}! Your just earned ₦50 on referral bonus. Refer more friends to download 360gadgetsafrica to earn more.` },
            include_subscription_ids: [user.docs[0].referredBy?.oneSignalId],
            url: 'gadgetsafrica://profile',
          })
        }

      } else if (req.headers.deviceid && user.docs[0].deviceid == '') {
        await usersService.updateUsers({ _id: req.userId }, { deviceid: req.headers.deviceid })
      }

    }

    var result = await monnify('/api/v2/bank-transfer/reserved-accounts/' + req.userId, 'GET');
    if (!result.requestSuccessful) {
      const walletData = {
        "accountName": req.firstName + ' ' + req.lastName,
        "currencyCode": "NGN",
        "contractCode": process.env.MONIFY_CONTRACT_CODE,
        "customerName": req.firstName + ' ' + req.lastName,
        "customerEmail": req.email,
        "accountReference": req.userId,
        "bvn": "22325291031"
      }
      result = await monnify('/api/v1/bank-transfer/reserved-accounts', 'POST', walletData);
    }
    if (result?.requestSuccessful) {
      var accounts = result.responseBody.accounts?.map(account => ({
        accountName: result.responseBody.accountName,
        accountNumber: account.accountNumber,
        bankName: account.bankName
      }))
    }
    res.json({
      balance: wallet.totalDocs == 1 ? wallet?.docs[0]?.balance : 0,
      accounts
    });

  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}


exports.fetchTransactions = async (req, res, next) => {
  try {
    var transactions = await walletsService.fetchTransactions({ userId: req.userId }, { sort: { _id: -1 }, limit: 30 })
    successResponse(res, transactions)
  } catch (error) {
    errorResponse(res, error)
  }
}


exports.withdraw = async (req, res, next) => {
  try {
    const fee = (req.body.fee || calculateFee(1.7, req.body.amount))
    var wallet = await walletsService.getWallets({ userId: req.userId })
    if (wallet.docs[0].balance < parseInt(req.body.amount)) throw new Error("Insufficient balance. please fund your wallet");
    var wall = await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: -(parseInt(req.body.amount) + fee) } })
    const data = {
      "amount": req.body.amount,
      "userId": req.userId,
      "fee": req.body.fee,
      "reference": req.body.reference + '--' + generateRandomNumber(10),
      "narration": "Withdrawal to ******" + req.body.accountNumber.substr(6),
      "destinationBankCode": req.body.bankCode,
      "destinationBankName": req.body.bankName,
      "destinationAccountNumber": req.body.accountNumber,
      "destinationAccountName": req.body.accountName,
      "currency": "NGN",
      "type": 'debit',
      "status": "pending"
    }
    const transaction = await walletsService.saveTransactions(data)
    successResponse(res, transaction)
    const notUsers = await usersService.getUsers({ email: { $in: ['habibmail31@gmail.com'] } });
    var include_player_ids = notUsers.docs?.map?.(u => u.oneSignalId)
    sendNotification({
      headings: { "en": `Withdrawal request.` },
      contents: { "en": `Hi There, You have a new withdrawal request of N${req.body.amount}` },
      include_subscription_ids: [...include_player_ids],
      url: 'gadgetsafrica://profile',
    })
  } catch (error) {
    console.log(error)
    errorResponse(res, error)
  }
}
exports.fetchDataPlan = async (req, res, next) => {
  try {
    res.json({ dataplan });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
}
 
exports.buyDataPlan = async (req, res, next) => {
  var wallet = await walletsService.getWallets({ userId: req.userId })
  if (wallet.docs[0].balance < parseInt(req.body.plan.amount) || wallet.totalDocs == 0) throw new Error("Insufficient balance. please fund your wallet");
  var wall = await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: -parseInt(req.body.plan.amount) } })
  const ref = "Data_"  + generateRandomNumber(11)
  const data = {
    "amount": req.body.plan.amount,
    "userId": req.userId,
    "reference": ref,
    "narration": "Data topup to " + req.body.phone,
    "currency": "NGN",
    "type": 'debit',
    "status": "successful"
  }
  const transaction = await walletsService.saveTransactions(data)

  var plan =  dataplan.find(d => (d.planId == req.body.plan.planId && req.body.plan.vendor  == d.vendor))  
  var net = plan.network == 'MTN' ? 1 : plan.network == "AIRTEL" ? 2 : plan.network == "GLO" ? 3 : 4
  var obj = {
    network: net,
    data_plan: plan.planId,
    phone: removeCountryCode(req.body.phone.replace(/\s+/g, "")),
    bypass: false,
    'request-id': ref,
  }
  console.log(obj)

  const notUsers = await usersService.getUsers({ email: { $in: ['habibmail31@gmail.com'] } });
  var include_player_ids = notUsers.docs?.map?.(u => u.oneSignalId)

  try {
    const vtc = await quickVTU('/api/data', "POST", obj, req.body.plan.vendor )
    console.log(vtc, obj, 'resp')


    if (vtc?.status == 'fail' || vtc?.status == 'error' ) {
      res.status(500).json({ errors: ['Network failed. Try another plan'] });
      await walletsService.updateTransactions({ _id: transaction._id }, { status: 'failed' })
      await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: +parseInt(req.body.plan.amount) } })
      await walletsService.saveTransactions({
        ...data,
        "reference": "Data_" +   generateRandomNumber(10),
        "narration": "RVSL for Data topup ",
        "status": 'successful', type: 'credit'
      })
      sendNotification({
        headings: { "en": `Network issues. Try another plan` },
        contents: { "en": `Hi ${req.firstName}, we’re currently experiencing some network challenges for ${req.body.plan.planName} ${req.body.plan.network} ${req.body.plan.planType} Data. Please try another plan or try again later.` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    } else {
      successResponse(res, transaction)
      sendNotification({
        headings: { "en": `Payment successful` },
        contents: { "en": `Congratulations ${req.firstName}! Your have successfully sent ${plan.planName} ${req.body.plan.network} ${req.body.plan.planType} data to ${req.body.phone}. Refer a friend to try our mobile app and earn ₦50` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    }

  } catch (error) {
    console.log(error)
    if (error?.response?.data?.status == "fail") {
      res.status(500).json({ errors: ['Network failed. Try another plan'] });
      await walletsService.updateTransactions({ _id: transaction._id }, { status: 'failed' })
      await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: +parseInt(req.body.plan.amount) } })
      await walletsService.saveTransactions({
        ...data,
        "reference": "Data" + '--' + generateRandomNumber(10),
        "narration": "RVSL for Data topup ",
        "status": 'successful', type: 'credit'
      })
      sendNotification({
        headings: { "en": `Network issues. Try another plan` },
        contents: { "en": `Hi ${req.firstName}, we’re currently experiencing some network challenges for ${req.body.plan.planName} ${req.body.plan.network} ${req.body.plan.planType} Data. Please try another plan or try again later.` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    } else errorResponse(res, error, "Transaction failed due to network. please try again")
  }
}

exports.buyAirtime = async (req, res, next) => {
  var wallet = await walletsService.getWallets({ userId: req.userId })
  if (wallet.docs[0].balance < parseInt(req.body.amount) || wallet.totalDocs == 0) throw new Error("Insufficient balance. please fund your wallet");
  await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: -parseInt(req.body.amount) } })
  const ref =  "Airtime_" +   + generateRandomNumber(11)
  const data = {
    "amount": req.body.amount,
    "userId": req.userId,
    "reference":ref,
    "narration": "Airtime topup to " + req.body.phone,
    "currency": "NGN",
    "type": 'debit',
    "status": "successful"
  }
  const transaction = await walletsService.saveTransactions(data)

  const provider = detectNetwork(req.body.phone)
  var net = provider == 'MTN' ? 1 : provider == "AIRTEL" ? 2 : provider == "GLO" ? 3 : 4
  var obj = {
    network: net,
    phone: removeCountryCode(req.body.phone.replace(/\s+/g, "")),
    amount: req.body.amount,
    bypass: false,
    plan_type: 'VTU',
    'request-id': ref,
  }
  const notUsers = await usersService.getUsers({ email: { $in: ['habibmail31@gmail.com'] } });
  var include_player_ids = notUsers.docs?.map?.(u => u.oneSignalId)

  try {
    const vtc = await quickVTU('/api/topup', "POST", obj, 'quickvtu')
    console.log(vtc, obj)
    if (vtc?.status == 'fail') {
      res.status(500).json({ errors: ["Transaction failed. please try again later"] });
      await walletsService.updateTransactions({ _id: transaction._id }, { status: 'failed' })
      await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: +parseInt(req.body.amount) } })
      await walletsService.saveTransactions({
        ...data,
        "reference": "Airtime" + '--' + generateRandomNumber(10),
        "narration": "RVSL for Airtime topup ",
        "status": 'successful', type: 'credit'
      })
      sendNotification({
        headings: { "en": `Network challanges` },
        contents: { "en": `Hi ${req.firstName}, we’re currently experiencing some network challenges caused by the service provider. Please try again later.` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    } else {
      successResponse(res, transaction)
      sendNotification({
        headings: { "en": `Payment successful` },
        contents: { "en": `Congratulations ${req.firstName}! Your have successfully sent ₦${req.body.amount} airtime to ${req.body.phone}. Refer a friend to try our mobile app and earn ₦50` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    }
  } catch (error) {
    console.log(error?.response?.data)
    if (error?.response?.data?.status == "fail") {
      res.status(500).json({ errors: ["Transaction failed. please try again later"] });
      await walletsService.updateTransactions({ _id: transaction._id }, { status: 'failed' })
      await walletsService.updateWallet({ userId: req.userId }, { $inc: { balance: +parseInt(req.body.amount) } })
      await walletsService.saveTransactions({
        ...data,
        "reference": "Airtime" + '--' + generateRandomNumber(10),
        "narration": "RVSL for Airtime topup ",
        "status": 'successful', type: 'credit'
      })
      sendNotification({
        headings: { "en": `Network challanges` },
        contents: { "en": `Hi ${req.firstName}, we’re currently experiencing some network challenges caused by the service provider. Please try again later.` },
        include_subscription_ids: [req.oneSignalId, ...include_player_ids],
        url: 'gadgetsafrica://profile',
      })
    } else errorResponse(res, error, "Transaction failed due to network. please try again")
  }
}
exports.fetchBanks = async (req, res, next) => {
  try {
    const listOfBanks = await monnify('/api/v1/banks', "GET")
    if (listOfBanks.requestSuccessful) {
      successResponse(res, listOfBanks.responseBody)
    } else throw Error("Error fetching banks")
  } catch (error) {
    errorResponse(res, error)
  }
}

exports.verifyBank = async (req, res, next) => {
  try {
    const {
      bankCode,
      accountNumber
    } = req.body
    const verifyAcct = await monnify(`/api/v1/disbursements/account/validate?accountNumber=${accountNumber}&bankCode=${bankCode.replace(/^0+/, "")}`, "GET")
    console.log(verifyAcct)
    if (verifyAcct.requestSuccessful) {
      successResponse(res, verifyAcct?.responseBody)
    } else throw Error(verifyAcct?.responseMessage)
  } catch (error) {
    errorResponse(res, error)
  }
}




exports.webhook = async (req, res, next) => {
  try {
    const signature = req.headers["monnify-signature"];
    const payload = req.body;
    const trans = await walletsService.fetchTransactions({ 'reference': payload.eventData.transactionReference })
    // Verify the signature
    if (!verifyMonnifySignature(payload, signature)) {
      return res.status(401).json({ message: "Invalid signature" });
    }
    if (trans.totalDocs != 0) {
      return res.status(200).json({ message: "Webhook received successfully" });
    }

    // Extract payment details from the webhook payload

    const {
      eventType,
      eventData: {
        settlementAmount,
        product,
        amountPaid,
        transactionReference,
        destinationAccountInformation: { bankCode, bankName, accountNumber },
      }
    } = payload;
    // Process the reserved account payment
    if (req.body.eventType === "SUCCESSFUL_TRANSACTION" && product.type == "RESERVED_ACCOUNT") {
      var user = await usersService.getUsers({ _id: product.reference })

      if (user.totalDocs) {
        const data = {
          "amount": amountPaid,
          "userId": user.docs[0]._id,
          "reference": transactionReference,
          "narration": "Wallet funding",
          "destinationBankCode": bankCode,
          "destinationBankName": bankName,
          "destinationAccountNumber": accountNumber,
          // "destinationAccountName": req.body.accountName,
          "currency": "NGN",
          "type": 'credit',
          "status": "successful"
        }
        await walletsService.saveTransactions(data)
        await walletsService.updateWallet({ userId: user.docs[0]._id }, { $inc: { balance: parseInt(amountPaid) } })
        sendNotification({
          headings: { "en": `₦${amountPaid} was credited to your wallet` },
          contents: { "en": `Congratulations ${user.docs[0].firstName}! You have successfully funded your wallet with ₦${amountPaid}. Refer a friend to try our mobile app and earn ₦50.` },
          include_subscription_ids: [user.docs[0].oneSignalId],
          url: 'gadgetsafrica://transactions',
        })
      }

    } else {
      console.log(`Event received but not handled: ${eventType}`);
    }

    // Send a response to Monnify
    return res.status(200).json({ message: "Webhook received successfully" });

  } catch (error) {
    console.log(error)

  }
}


// Webhook Endpoint
exports.flwhook = async (req, res, next) => {
  console.log('received')
  // Verify the request is from Flutterwave
  const signature = req.headers["verif-hash"]; // Flutterwave sends this
  if (!signature || signature !== process.env.FLW_SECRET_HASH) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload = req.body;

  // Process the event based on its type
  if (payload.event === "charge.completed" && payload.data.status == 'successful') {
    var { customer, created_at, charged_amount, amount, id, tx_ref } = payload.data
    console.log("Received Flutterwave webhook:", id);

    var headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`
    }
    try {
      // const res = await axios({ method: 'get', url: `https://api.flutterwave.com/v3/transactions/${id}/verify`, data: {}, headers, json: true });
      // const result = res && res.data;
      // if ((result.status == 'success' || result.status == 'successful') &&  result?.data?.meta?.type == 'funding') {
        // var {bankname, originatoraccountnumber, } = result?.data?.meta
        var user = await usersService.getUsers({ email: customer.email })
        if (user.totalDocs) {
          const data = {
            "amount": amount,
            "userId": user.docs[0]._id,
            "reference": tx_ref,
            "narration": "Wallet funding",
            "destinationBankCode": "N/A",
            "destinationBankName": "N/A",
            "destinationAccountNumber": "N/A",
            // "destinationAccountName": req.body.accountName,
            "currency": "NGN",
            "type": 'credit',
            "status": "successful",
          }
          await walletsService.saveTransactions(data)
          await walletsService.updateWallet({ userId: user.docs[0]._id }, { $inc: { balance: parseInt(amount) } })
          sendNotification({
            headings: { "en": `₦${amount} was credited to your wallet` },
            contents: { "en": `Congratulations ${user.docs[0].firstName}! You have successfully funded your wallet with ₦${amount}. Refer a friend to try our mobile app and earn ₦50.` },
            include_subscription_ids: [user.docs[0].oneSignalId],
            url: 'gadgetsafrica://transactions',
          })
        }
        res.status(200)
      // }
    } catch (error) {
      console.log(error)
      
    }
   
    // Update your database, send emails, etc.
  } else if (payload.event === "transfer.completed") {
    console.log("Transfer completed:", payload.data);
  }

  // Send a response to acknowledge receipt
  res.status(200).json({ message: "Webhook received successfully" });
}

