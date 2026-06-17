const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

let mailTransport = null;
const getMailTransport = () => {
    if (!mailTransport) {
        mailTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailEmail.value(),
                pass: gmailPassword.value(),
            },
        });
    }
    return mailTransport;
};

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
                cc: [
                    "chamal@aquadynamics.lk"
                ],
                subject: subject,
                text: body,
            };

            await getMailTransport().sendMail(mailOptions);
            logger.log(`QC email sent successfully to ${recipientEmail} for order ${orderData.aquaOrderNumber}`);

            transaction.update(orderRef, { qcEmailSent: true });
        });
    } catch (error) {
        logger.error(`Failed to send QC email for order ${orderId}:`, error);
    }
});

exports.sendOrderAckEmail = onCall(async (request) => {
    const { orderId, toEmails, subject, body, sentBy } = request.data;

    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to send emails.');
    }

    if (!orderId || !toEmails || !subject || !body) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    logger.info(`Starting Order Acknowledgment email process for order: ${orderId}`);

    try {
        const orderRef = db.collection("orders").doc(orderId);

        await db.runTransaction(async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new HttpsError('not-found', `Order ${orderId} does not exist.`);
            }

            const orderData = orderDoc.data();
            if (orderData.orderAckEmailSent) {
                logger.warn(`Order Acknowledgment email already sent for order ${orderId}. Allowing resend, but updating timestamp.`);
            }

            const recipientEmails = toEmails.split(',').map(e => e.trim()).filter(e => e);
            if (recipientEmails.length === 0) {
                throw new HttpsError('invalid-argument', 'No valid email addresses provided.');
            }

            const mailOptions = {
                from: `"Aqua Dynamics" <${gmailEmail.value()}>`,
                to: recipientEmails,
                cc: [
                    "chamal@aquadynamics.lk"
                ],
                subject: subject,
                text: body,
            };

            await getMailTransport().sendMail(mailOptions);
            logger.log(`Order Acknowledgment email sent successfully to ${recipientEmails.join(', ')} for order ${orderId}`);

            transaction.update(orderRef, {
                orderAckEmailSent: true,
                orderAckEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                orderAckEmailSentBy: sentBy || request.auth.token.name || 'Unknown User'
            });
        });

        return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
        logger.error(`Failed to send Order Acknowledgment email for order ${orderId}:`, error);
        throw new HttpsError('internal', `Failed to send email: ${error.message}`);
    }
});