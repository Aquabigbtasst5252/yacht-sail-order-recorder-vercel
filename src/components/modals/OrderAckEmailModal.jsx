// src/components/modals/OrderAckEmailModal.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, functions } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const OrderAckEmailModal = ({ order, user, onClose }) => {
    const [toEmails, setToEmails] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch settings
                const settingsDoc = await getDoc(doc(db, "settings", "main"));
                const settings = settingsDoc.exists() ? settingsDoc.data() : {};

                // Fetch customer
                let customerEmail = '';
                let customerName = order.customerCompanyName || '';
                if (order.customerId) {
                    const customerDoc = await getDoc(doc(db, "customers", order.customerId));
                    if (customerDoc.exists()) {
                        const customerData = customerDoc.data();
                        customerEmail = customerData.email || '';
                        if (!customerName) {
                            customerName = customerData.contactName || customerData.companyName || '';
                        }
                    }
                }

                setToEmails(customerEmail);

                // Generate Subject
                let generatedSubject = '';
                if (order.customerPO && order.customerPO.trim() !== '' && order.customerPO.trim().toUpperCase() !== 'NA') {
                    generatedSubject = order.customerPO;
                } else {
                    const desc = `${order.productName} - ${order.material}`;
                    generatedSubject = `${desc} - ${order.aquaOrderNumber}`;
                }
                setSubject(generatedSubject);

                // Generate Body
                let template = settings.orderAckEmailBody || '';
                const orderDate = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
                const orderDescription = `${order.productName} - ${order.material}`;

                template = template.replace(/{{CustomerName}}/g, customerName)
                                   .replace(/{{PONumber}}/g, order.customerPO || 'N/A')
                                   .replace(/{{AquaOrderNumber}}/g, order.aquaOrderNumber || 'N/A')
                                   .replace(/{{OrderDescription}}/g, orderDescription)
                                   .replace(/{{OrderDate}}/g, orderDate)
                                   .replace(/{{Quantity}}/g, order.quantity || 1)
                                   .replace(/{{SailType}}/g, order.orderTypeName || 'N/A');

                setBody(template);
            } catch (error) {
                console.error("Error loading email data:", error);
                toast.error("Failed to load email template data.");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [order]);

    const handleSend = async () => {
        if (!toEmails.trim()) {
            toast.error("Please provide at least one recipient email address.");
            return;
        }

        if (order.orderAckEmailSent) {
            const confirmResend = window.confirm("This Order Acknowledgment has already been emailed to the customer. Are you sure you want to resend it?");
            if (!confirmResend) return;
        } else {
        // Implement custom confirm if needed, but for now we'll stick to window.confirm per instructions, or we can use a state for confirm modal.
            const confirmSend = window.confirm("Are you sure you want to send this Order Acknowledgment to the customer?");
            if (!confirmSend) return;
        }

        setIsSending(true);
        const toastId = toast.loading("Sending email...");

        try {
            const sendOrderAckEmail = httpsCallable(functions, 'sendOrderAckEmail');
            await sendOrderAckEmail({
                orderId: order.id,
                toEmails: toEmails,
                subject: subject,
                body: body,
                sentBy: user?.name || 'Unknown User'
            });

            toast.success("Order Acknowledgment successfully sent to customer.", { id: toastId });
            onClose();
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Failed to send email. Check console for details.", { id: toastId });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Send Order Acknowledgment</h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={isSending}></button>
                    </div>
                    <div className="modal-body">
                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                            </div>
                        ) : (
                            <>
                                {order.orderAckEmailSent && (
                                    <div className="alert alert-warning">
                                        This Order Acknowledgment has already been emailed to the customer by <strong>{order.orderAckEmailSentBy}</strong> on <strong>{order.orderAckEmailSentAt?.toDate ? order.orderAckEmailSentAt.toDate().toLocaleString() : 'N/A'}</strong>.
                                    </div>
                                )}
                                <div className="mb-3">
                                    <label className="form-label">To (comma-separated for multiple)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={toEmails}
                                        onChange={(e) => setToEmails(e.target.value)}
                                        disabled={isSending}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Subject</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        disabled={isSending}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Message Body</label>
                                    <textarea
                                        className="form-control"
                                        rows="10"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        disabled={isSending}
                                    ></textarea>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleSend} disabled={isLoading || isSending}>
                            {isSending ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderAckEmailModal;
