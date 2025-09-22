import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { 
    doc,
    onSnapshot,
    collection,
    addDoc,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

const NewOrderForm = ({ user, onOrderCreated, lastGeneratedOrderNumber }) => {
    const [orderTypes, setOrderTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedOrderType, setSelectedOrderType] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [material, setMaterial] = useState('');
    const [ifsOrderNo, setIfsOrderNo] = useState('');
    const [customerPO, setCustomerPO] = useState('');
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isIHC, setIsIHC] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubOrderTypes = onSnapshot(collection(db, "orderTypes"), snap => {
            setOrderTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        });
        const unsubProducts = onSnapshot(collection(db, "products"), snap => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        });
        const unsubCustomers = onSnapshot(collection(db, "customers"), snap => {
            setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.companyName || "").localeCompare(b.companyName || "")));
        });
        return () => { unsubOrderTypes(); unsubProducts(); unsubCustomers(); };
    }, []);

    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.companyName })), [customers]);
    
    const filteredProducts = useMemo(() => {
        if (!selectedOrderType) return [];
        return products.filter(p => p.orderTypeId === selectedOrderType);
    }, [selectedOrderType, products]);

    const productOptions = useMemo(() => filteredProducts.map(p => ({ value: p.id, label: p.name })), [filteredProducts]);

    const isSailTypeSelected = useMemo(() => {
        const selectedType = orderTypes.find(ot => ot.id === selectedOrderType);
        return selectedType?.name.toLowerCase() === 'sail';
    }, [selectedOrderType, orderTypes]);


    const handleOrderTypeChange = (e) => {
        setSelectedOrderType(e.target.value);
        setSelectedProduct(null);
        setIsIHC(false);
    };
    
    const resetForm = () => {
        setSelectedCustomer(null);
        setSelectedOrderType('');
        setSelectedProduct(null);
        setMaterial('');
        setIfsOrderNo('');
        setCustomerPO('');
        setSize('');
        setQuantity(1);
        setIsIHC(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedProduct || !selectedOrderType) {
            toast.error("Please select a customer, order type, and product.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading("Creating order...");
        
        const data = {
            customerId: selectedCustomer.value,
            orderTypeId: selectedOrderType,
            productId: selectedProduct.value,
            material,
            ifsOrderNo,
            customerPO,
            size,
            quantity: Number(quantity),
            isIHC: isSailTypeSelected ? isIHC : false
        };
        
        try {
            const newOrderNumber = await runTransaction(db, async (transaction) => {
                const settingsRef = doc(db, "settings", "main");
                const settingsDoc = await transaction.get(settingsRef);
                if (!settingsDoc.exists()) throw new Error("Settings document does not exist!");
                const settings = settingsDoc.data();
                const orderTypeDoc = orderTypes.find(ot => ot.id === data.orderTypeId);
                const isSail = orderTypeDoc?.name.toLowerCase() === 'sail';
                const prefix = isSail ? 'S' : 'A';
                const lastNumberField = isSail ? 'lastSailOrder' : 'lastAccessoryOrder';
                const lastNumber = Number(settings[lastNumberField] || 0);
                const orderNumberDisplay = data.quantity === 1 ? `${prefix}${lastNumber + 1}` : `${prefix}${lastNumber + 1}-${prefix}${lastNumber + data.quantity}`;
                transaction.update(settingsRef, { [lastNumberField]: lastNumber + data.quantity });
                
                const productDoc = products.find(p => p.id === data.productId);

                addDoc(collection(db, 'orders'), { 
                    ...data, 
                    aquaOrderNumber: orderNumberDisplay, 
                    customerCompanyName: selectedCustomer.label, 
                    productName: productDoc?.name || 'N/A',
                    orderTypeName: orderTypeDoc?.name || 'N/A',
                    createdAt: serverTimestamp(), 
                    createdBy: user.name,
                    status: 'New' 
                });
                return orderNumberDisplay;
            });
            onOrderCreated(newOrderNumber);
            toast.success(`Order ${newOrderNumber} created!`, { id: toastId });
            resetForm();
        } catch (error) {
            console.error("Transaction failed: ", error);
            toast.error("Failed to create order.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="row justify-content-center">
            <div className="col-lg-10">
                <div className="card w-100">
                    <div className="card-header">
                        <h2 className="h4 mb-0">Create New Order</h2>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label htmlFor="customerId" className="form-label">Customer</label>
                                    <Select id="customerId" options={customerOptions} value={selectedCustomer} onChange={setSelectedCustomer} isClearable required />
                                </div>
                                <div className="col-md-4">
                                    <label htmlFor="orderTypeId" className="form-label">Order Type</label>
                                    <select id="orderTypeId" value={selectedOrderType} className="form-select" required onChange={handleOrderTypeChange}>
                                        <option value="">Choose...</option>
                                        {orderTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label htmlFor="productId" className="form-label">Product</label>
                                    <Select id="productId" options={productOptions} value={selectedProduct} onChange={setSelectedProduct} isClearable required isDisabled={!selectedOrderType} />
                                </div>

                                {isSailTypeSelected && (
                                    <div className="col-12">
                                        <div className="form-check mt-2">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="isIHC"
                                                checked={isIHC}
                                                onChange={(e) => setIsIHC(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="isIHC">
                                                Is this an IHC Sail?
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="col-md-4"><label htmlFor="material" className="form-label">Material</label><input type="text" id="material" value={material} onChange={e => setMaterial(e.target.value)} className="form-control" /></div>
                                <div className="col-md-4"><label htmlFor="ifsOrderNo" className="form-label">IFS Order No</label><input type="text" id="ifsOrderNo" value={ifsOrderNo} onChange={e => setIfsOrderNo(e.target.value)} className="form-control" /></div>
                                <div className="col-md-4"><label htmlFor="customerPO" className="form-label">Customer PO</label><input type="text" id="customerPO" value={customerPO} onChange={e => setCustomerPO(e.target.value)} className="form-control" /></div>
                                <div className="col-md-8"><label htmlFor="size" className="form-label">Size</label><input type="text" id="size" value={size} onChange={e => setSize(e.target.value)} className="form-control" /></div>
                                <div className="col-md-4"><label htmlFor="quantity" className="form-label">Quantity</label><input type="number" id="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} className="form-control" min="1" required /></div>
                            </div>
                            <div className="text-end mt-4">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {lastGeneratedOrderNumber && (
                    <div className="card w-100 mt-4 text-center">
                        <div className="card-body">
                            <h5 className="card-title text-success">Order Created Successfully!</h5>
                            <p className="card-text mb-1">Generated Aqua Order Number:</p>
                            <p className="display-5 text-primary fw-bold">{lastGeneratedOrderNumber}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewOrderForm;
