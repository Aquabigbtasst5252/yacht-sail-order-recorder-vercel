const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const { defineString } = require("firebase-functions/params"); // Import defineString
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// Define parameters that will be loaded from your .env file
const gmailEmail = defineString("GMAIL_EMAIL");
const gmailPassword = defineString("GMAIL_PASSWORD");
const appUrl = defineString("APP_URL");

const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        // Use .value() to access the secret
        user: gmailEmail.value(),
        pass: gmailPassword.value(),
    },
});

exports.sendQcPhotoEmail = onDocumentCreated("orders/{orderId}/qcPhotos/{photoId}", async (event) => {
    const orderId = event.params.orderId;
    const orderRef = db.collection("orders").doc(orderId);

    logger.info(`New photo detected for order: ${orderId}. Starting email process.`);

    try {
        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                logger.warn(`Order ${orderId} does not exist.`);
                return;
            }
            const orderData = orderDoc.data();

            if (orderData.qcEmailSent) {
                logger.info(`Email already sent for order ${orderData.aquaOrderNumber}.`);
                return;
            }

            if (!orderData.customerId) {
                throw new Error(`Order ${orderId} is missing a customerId.`);
            }
            const customerDoc = await db.collection("customers").doc(orderData.customerId).get();
            if (!customerDoc.exists) {
                throw new Error(`Customer ${orderData.customerId} not found.`);
            }
            const customerData = customerDoc.data();
            const recipientEmail = customerData.email;

            if (!recipientEmail) {
                logger.warn(`Customer ${customerData.companyName} has no email address. Skipping email.`);
                return;
            }

            const subject = `QC Photos for Order: ${orderData.aquaOrderNumber} (PO: ${orderData.customerPO || "N/A"})`;

            const body = `Dear ${customerData.contactName || customerData.companyName},

The QC photos are ready to view for your reference.

You can view them by logging into the portal: ${appUrl.value()}

Thanks & best regards,
Yacht sail team.`;

            const mailOptions = {
                from: `"Aqua Dynamics" <${gmailEmail.value()}>`,
                to: recipientEmail,
                cc: "chamal@aquadynamics.lk, bandu@aquadynamics.lk, prasannaw@aquadynamics.lk, udana@aquadynamics.lk",
                subject: subject,
                text: body,
            };

            await mailTransport.sendMail(mailOptions);
            logger.log(`QC email sent successfully to ${recipientEmail} for order ${orderData.aquaOrderNumber}`);

            transaction.update(orderRef, { qcEmailSent: true });
        });
    } catch (error) {
        logger.error(`Failed to send QC email for order ${orderId}:`, error);
    }
});