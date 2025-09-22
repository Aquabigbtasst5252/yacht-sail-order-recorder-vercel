// src/pages/CustomerStock.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { 
    collection, 
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    writeBatch,
    serverTimestamp
} from "firebase/firestore";

// This is a smaller, helper component used only within CustomerStock
const CategorySelector = ({ item, selectedCustomer, subCategories, isAdmin }) => {
    const handleCategoryChange = async (newCategory) => {
        if (!selectedCustomer || !item.id) return;
        const itemRef = doc(db, "stock", selectedCustomer, "items", item.id);
        try {
            await updateDoc(itemRef, { category: newCategory });
        } catch (error)
        {
            console.error("Failed to update category:", error);
        }
    };

    if (!isAdmin) {
        return <span className="badge bg-secondary">{item.category || 'Unassigned'}</span>;
    }

    return (
        <select 
            className="form-select form-select-sm"
            value={item.category || 'Unassigned'}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={{ minWidth: '150px' }}
        >
            <option value="Unassigned">Unassigned</option>
            {subCategories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
        </select>
    );
};


const CustomerStock = ({ user }) => {
    const [allStockItems, setAllStockItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false); // For uploads/deletes
    const [isListLoading, setIsListLoading] = useState(true); // For fetching the list
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [stockSubCategories, setStockSubCategories] = useState([]);
    const [lastUploadDate, setLastUploadDate] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const fileInputRef = useRef(null);
    const isAdmin = user.role === 'super_admin' || user.role === 'production';
    const isCustomer = user.role === 'customer';

    // This hook dynamically loads the XLSX library when the component mounts
    useEffect(() => {
        if (typeof window.XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        const unsubSubCategories = onSnapshot(collection(db, "stockSubCategories"), snap => {
            setStockSubCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        let otherUnsub = () => {};

        if (isAdmin) {
            otherUnsub = onSnapshot(collection(db, "customers"), snap => {
                const customerList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCustomers(customerList);
            });
        } else if (isCustomer && user.customerCompanyId) {
            otherUnsub = onSnapshot(doc(db, "customers", user.customerCompanyId), (docSnap) => {
                if(docSnap.exists()){
                    setCustomerData(docSnap.data());
                }
            });
        }

        return () => {
            unsubSubCategories();
            otherUnsub();
        };
    }, [isAdmin, isCustomer, user.customerCompanyId]);
    
    useEffect(() => {
        if (isAdmin) {
            const currentCustomerData = customers.find(c => c.id === selectedCustomer);
            if (currentCustomerData && currentCustomerData.lastStockUpdate) {
                setLastUploadDate(currentCustomerData.lastStockUpdate.toDate().toLocaleDateString());
            } else {
                setLastUploadDate(null);
            }
        } else if (isCustomer && customerData) {
            if (customerData.lastStockUpdate) {
                 setLastUploadDate(customerData.lastStockUpdate.toDate().toLocaleDateString());
            } else {
                 setLastUploadDate(null);
            }
        }
    }, [selectedCustomer, customers, customerData, isAdmin, isCustomer]);

    useEffect(() => {
        if (!user) return;
        const customerId = isAdmin ? selectedCustomer : user.customerCompanyId;
        
        if (!customerId) {
            setIsListLoading(false);
            setAllStockItems([]);
            return;
        }
        
        setIsListLoading(true);
        const unsub = onSnapshot(collection(db, "stock", customerId, "items"), (snapshot) => {
            setAllStockItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setIsListLoading(false);
        }, (err) => {
            console.error("Error fetching stock data:", err);
            setError("Could not load stock data.");
            setIsListLoading(false);
        });

        return () => unsub();
    }, [user, selectedCustomer, isAdmin, isCustomer]);
    
    const handleDeleteStock = async () => {
        if (!selectedCustomer) {
            alert("Please select a customer whose stock you want to delete.");
            return;
        }

        const customerName = customers.find(c => c.id === selectedCustomer)?.companyName || "the selected customer";
        if (!window.confirm(`DANGER: Are you sure you want to delete ALL stock items for ${customerName}? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            const stockCollectionRef = collection(db, "stock", selectedCustomer, "items");
            const snapshot = await getDocs(stockCollectionRef);
            
            const batchSize = 500;
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = snapshot.docs.slice(i, i + batchSize);
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            alert(`Successfully deleted all stock items for ${customerName}.`);

        } catch (err) {
            console.error("Error deleting stock:", err);
            setError("Failed to delete stock. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedCustomer) {
            setError("Please select a customer first.");
            return;
        }
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }
        if (typeof window.XLSX === 'undefined') {
            setError("The Excel parsing library is not ready. Please try again in a moment.");
            return;
        }

        setLoading(true);
        setError("");

        const existingStockSnapshot = await getDocs(collection(db, "stock", selectedCustomer, "items"));
        const existingStockMap = new Map(existingStockSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = window.XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    setError("The selected Excel file is empty.");
                    return;
                }

                const requiredHeaders = ['PART_NO', 'DESCRIPTION', 'TOTAL_QTY'];
                if (!requiredHeaders.every(header => header in json[0])) {
                    throw new Error(`File is missing one of the required column headers: ${requiredHeaders.join(', ')}`);
                }

                const batch = writeBatch(db);
                const collectionRef = collection(db, "stock", selectedCustomer, "items");
                let newItemsCount = 0;
                let updatedItemsCount = 0;

                json.forEach((row) => {
                    const partNo = String(row.PART_NO).trim();
                    if (partNo) {
                        const docRef = doc(collectionRef, partNo);
                        const existingItem = existingStockMap.get(partNo);

                        if (existingItem) {
                            batch.set(docRef, {
                                PART_NO: partNo,
                                DESCRIPTION: row.DESCRIPTION || '',
                                TOTAL_QTY: row.TOTAL_QTY || 0,
                            }, { merge: true });
                            updatedItemsCount++;
                        } else {
                            batch.set(docRef, {
                                PART_NO: partNo,
                                DESCRIPTION: row.DESCRIPTION || '',
                                TOTAL_QTY: row.TOTAL_QTY || 0,
                                category: 'Unassigned'
                            });
                            newItemsCount++;
                        }
                    }
                });
                
                const customerDocRef = doc(db, "customers", selectedCustomer);
                batch.update(customerDocRef, { lastStockUpdate: serverTimestamp() });

                await batch.commit();
                alert(`Stock updated successfully!\n- ${updatedItemsCount} items updated.\n- ${newItemsCount} new items added.`);
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }

            } catch (err) {
                console.error("Error processing file: ", err);
                setError(`Failed to process file. ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const groupedAndFilteredItems = useMemo(() => {
        if (isListLoading) return { unassigned: [], "Sail Materials": {}, "Sail Hardware": {} };

        const subCategoryMap = stockSubCategories.reduce((acc, cat) => {
            acc[cat.name] = cat.mainCategory;
            return acc;
        }, {});

        const initialGroups = {
            unassigned: [],
            "Sail Materials": {},
            "Sail Hardware": {},
        };

        const filteredItems = allStockItems.filter(item => searchTerm ? Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())) : true);

        const grouped = filteredItems.reduce((acc, item) => {
            const category = item.category || 'Unassigned';
            if (category === 'Unassigned') {
                acc.unassigned.push(item);
                return acc;
            }

            const mainCategory = subCategoryMap[category] || "Sail Materials";
            if (!acc[mainCategory]) {
                acc[mainCategory] = {};
            }
            if (!acc[mainCategory][category]) {
                acc[mainCategory][category] = [];
            }
            acc[mainCategory][category].push(item);

            return acc;
        }, initialGroups);

        const sortFn = (a, b) => (a.DESCRIPTION || '').localeCompare(b.DESCRIPTION || '');
        for (const mainCat in grouped) {
            if (mainCat !== 'unassigned') {
                for (const subCat in grouped[mainCat]) {
                    grouped[mainCat][subCat].sort(sortFn);
                }
            }
        }
        
        return grouped;
    }, [allStockItems, stockSubCategories, searchTerm, isListLoading]);

    return (
        <div className="card w-100">
             <div className="card-header d-flex justify-content-between align-items-center">
                <h2 className="h4 mb-0">My Stock</h2>
                 <div className="col-md-4">
                     <input
                        type="text"
                        className="form-control"
                        placeholder="Search stock..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="card-body">
                 {isAdmin && (
                    <div className="mb-4 p-3 border rounded bg-body-tertiary">
                         <h3 className="h5 mb-3">
                            Admin: Upload Stock Data
                            {lastUploadDate && <small className="text-muted fs-6 fw-normal ms-2">(Last Updated: {lastUploadDate})</small>}
                        </h3>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <div className="row g-3 align-items-end">
                            <div className="col-md-4">
                                <label htmlFor="customer-select" className="form-label">Select Customer</label>
                                <select 
                                    id="customer-select" 
                                    className="form-select" 
                                    value={selectedCustomer} 
                                    onChange={e => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="">Choose a customer...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                             <div className="col-md-4">
                                <label htmlFor="stock-file-upload" className="form-label">
                                    Upload Excel File
                                </label>
                                <input 
                                    type="file" 
                                    id="stock-file-upload"
                                    className="form-control"
                                    ref={fileInputRef}
                                    onChange={e => setSelectedFile(e.target.files[0])}
                                    accept=".xlsx, .xls"
                                />
                            </div>
                            <div className="col-md-2">
                                <button onClick={handleUpload} className="btn btn-primary w-100" disabled={loading || !selectedCustomer || !selectedFile}>
                                    {loading ? 'Uploading...' : 'Upload Stock'}
                                </button>
                            </div>
                            <div className="col-md-2">
                                <button onClick={handleDeleteStock} className="btn btn-outline-danger w-100" disabled={loading || !selectedCustomer}>
                                    {loading ? '...' : 'Delete All Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {isCustomer && lastUploadDate && (
                    <p className="text-muted mb-3">Stock data last updated on: {lastUploadDate}</p>
                )}
                
                {isListLoading ? (
                    <div className="text-center p-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {groupedAndFilteredItems.unassigned.length > 0 && (
                            <div className="card mb-4 border-warning">
                                <div className="card-header bg-warning-subtle">
                                    <h3 className="h5 mb-0">Unassigned Stock Items ({groupedAndFilteredItems.unassigned.length})</h3>
                                {isAdmin && <p className="mb-0 text-muted small">These new items need to be assigned a category below.</p>}
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>PART_NO</th>
                                                    <th>DESCRIPTION</th>
                                                    <th className="text-center">TOTAL_QTY</th>
                                                    <th>Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedAndFilteredItems.unassigned.map(item => (
                                                    <tr key={item.id}>
                                                        <td>{item.PART_NO}</td>
                                                        <td>{item.DESCRIPTION}</td>
                                                        <td className="text-center">{item.TOTAL_QTY}</td>
                                                        <td>
                                                            <CategorySelector item={item} selectedCustomer={selectedCustomer} subCategories={stockSubCategories} isAdmin={isAdmin} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}


                        <h3 className="h5 mb-3 mt-4">Categorized Stock</h3>
                        <div className="table-responsive">
                            <table className="table table-sm table-hover table-bordered">
                                <thead>
                                    <tr>
                                        <th>PART_NO</th>
                                        <th>DESCRIPTION</th>
                                        <th className="text-center">TOTAL_QTY</th>
                                        <th>Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries({ "Sail Materials": groupedAndFilteredItems["Sail Materials"], "Sail Hardware": groupedAndFilteredItems["Sail Hardware"] }).map(([mainCategory, subCategories]) => (
                                        (subCategories && Object.keys(subCategories).length > 0) && (
                                            <React.Fragment key={mainCategory}>
                                                <tr className="table-light"><th colSpan="4">{mainCategory}</th></tr>
                                                {Object.entries(subCategories).sort(([a],[b])=>a.localeCompare(b)).map(([subCategory, items]) => (
                                                    <React.Fragment key={subCategory}>
                                                        <tr className="bg-body-tertiary">
                                                            <td colSpan="4" className="fw-bold ps-3">{subCategory}</td>
                                                        </tr>
                                                        {items.map(item => (
                                                            <tr key={item.id}>
                                                                <td>{item.PART_NO}</td>
                                                                <td>{item.DESCRIPTION}</td>
                                                                <td className="text-center">{item.TOTAL_QTY}</td>
                                                                <td>
                                                                    <CategorySelector item={item} selectedCustomer={selectedCustomer} subCategories={stockSubCategories} isAdmin={isAdmin} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomerStock;