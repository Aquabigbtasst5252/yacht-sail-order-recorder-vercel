import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc,
    query,
    orderBy,
    writeBatch
} from 'firebase/firestore';


const ProductionStatusManagement = ({ orderTypes, products }) => {
    const [statuses, setStatuses] = useState([]);
    const [description, setDescription] = useState('');
    const [selectedOrderTypes, setSelectedOrderTypes] = useState({});
    const [selectedProductTypes, setSelectedProductTypes] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "productionStatuses"), orderBy("order"));
        const unsub = onSnapshot(q, (snap) => {
            setStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const resetForm = () => {
        setDescription('');
        setSelectedOrderTypes({});
        setSelectedProductTypes({});
        setEditingId(null);
    };

    const handleSelectAll = (type, checked) => {
        if (type === 'orderTypes') {
            const newSelection = {};
            if (checked) {
                orderTypes.forEach(ot => newSelection[ot.id] = true);
            }
            setSelectedOrderTypes(newSelection);
        } else {
            const newSelection = {};
            if (checked) {
                products.forEach(p => newSelection[p.id] = true);
            }
            setSelectedProductTypes(newSelection);
        }
    };
    
    const handleSave = async (e) => {
        e.preventDefault();
        if (!description) {
            toast.error("Description cannot be empty.");
            return;
        }
        setIsLoading(true);

        const data = {
            description,
            orderTypeIds: Object.keys(selectedOrderTypes).filter(k => selectedOrderTypes[k]),
            productTypeIds: Object.keys(selectedProductTypes).filter(k => selectedProductTypes[k]),
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "productionStatuses", editingId), data);
                toast.success("Status updated.");
            } else {
                const newOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.order || 0)) + 1 : 0;
                await addDoc(collection(db, "productionStatuses"), { ...data, order: newOrder });
                toast.success("Status added.");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving production status:", error);
            toast.error("Failed to save status.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEdit = (status) => {
        setEditingId(status.id);
        setDescription(status.description);
        setSelectedOrderTypes((status.orderTypeIds || []).reduce((acc, id) => ({ ...acc, [id]: true }), {}));
        setSelectedProductTypes((status.productTypeIds || []).reduce((acc, id) => ({ ...acc, [id]: true }), {}));
    };
    
    const confirmDelete = (id) => {
         toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete this status?</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button className="btn btn-sm btn-danger" onClick={() => { handleDelete(id); toast.dismiss(t.id); }}>Yes, Delete</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => toast.dismiss(t.id)}>Cancel</button>
                </div>
            </div>
        ));
    };
    
    const handleDelete = async (id) => {
        await deleteDoc(doc(db, "productionStatuses", id));
        toast.success("Status deleted.");
    };

    const handleMove = async (index, direction) => {
        const itemA = statuses[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= statuses.length) return;
        
        const itemB = statuses[swapIndex];

        const batch = writeBatch(db);
        batch.update(doc(db, "productionStatuses", itemA.id), { order: itemB.order });
        batch.update(doc(db, "productionStatuses", itemB.id), { order: itemA.order });
        await batch.commit();
        toast.success("Order updated.");
    };

    return (
        <div className="card">
            <div className="card-body">
                <h3 className="h5 mb-3">Production Status Management</h3>
                <form onSubmit={handleSave} className="mb-4 p-3 border rounded bg-body-tertiary">
                    <div className="mb-3">
                        <label htmlFor="statusDescription" className="form-label">Status Description</label>
                        <input
                            id="statusDescription"
                            type="text"
                            className="form-control"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Cutting, Stitching, QC"
                            required
                        />
                    </div>
                    <div className="d-flex gap-3 mb-3">
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                Order Types ({Object.values(selectedOrderTypes).filter(Boolean).length} selected)
                            </button>
                            <div className="dropdown-menu p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <div className="form-check"><input type="checkbox" className="form-check-input" id="selectAllOrder" onChange={e => handleSelectAll('orderTypes', e.target.checked)} /><label className="form-check-label" htmlFor="selectAllOrder">Select/Deselect All</label></div><hr className="my-1"/>
                                {orderTypes.map(ot => (<div className="form-check" key={ot.id}><input type="checkbox" className="form-check-input" id={`ot-${ot.id}`} checked={!!selectedOrderTypes[ot.id]} onChange={() => setSelectedOrderTypes(prev => ({...prev, [ot.id]: !prev[ot.id]}))} /><label className="form-check-label" htmlFor={`ot-${ot.id}`}>{ot.name}</label></div>))}
                            </div>
                        </div>
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside">
                                Product Types ({Object.values(selectedProductTypes).filter(Boolean).length} selected)
                            </button>
                             <div className="dropdown-menu p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <div className="form-check"><input type="checkbox" className="form-check-input" id="selectAllProd" onChange={e => handleSelectAll('productTypes', e.target.checked)} /><label className="form-check-label" htmlFor="selectAllProd">Select/Deselect All</label></div><hr className="my-1"/>
                                {products.map(p => (<div className="form-check" key={p.id}><input type="checkbox" className="form-check-input" id={`pt-${p.id}`} checked={!!selectedProductTypes[p.id]} onChange={() => setSelectedProductTypes(prev => ({...prev, [p.id]: !prev[p.id]}))} /><label className="form-check-label" htmlFor={`pt-${p.id}`}>{p.name}</label></div>))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>{editingId ? 'Update' : 'Save'} Status</button>
                        {editingId && <button type="button" className="btn btn-link" onClick={resetForm}>Cancel Edit</button>}
                    </div>
                </form>

                <ul className="list-group">
                    {statuses.map((status, index) => (
                        <li key={status.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <span>{status.description}</span>
                            <div>
                                <button className="btn btn-sm btn-light me-2" onClick={() => handleMove(index, 'up')} disabled={index === 0}>&uarr;</button>
                                <button className="btn btn-sm btn-light me-2" onClick={() => handleMove(index, 'down')} disabled={index === statuses.length - 1}>&darr;</button>
                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(status)}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(status.id)}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const DataManagementTab = () => {
    const [orderTypes, setOrderTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [stockSubCategories, setStockSubCategories] = useState([]);
    
    const [newOrderTypeName, setNewOrderTypeName] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductOrderType, setNewProductOrderType] = useState('');
    const [newSubCategory, setNewSubCategory] = useState({ name: '', mainCategory: 'Sail Materials' });
    const [productFile, setProductFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const productFileInputRef = useRef(null);

    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        const unsubOrderTypes = onSnapshot(query(collection(db, "orderTypes"), orderBy("order")), snap => setOrderTypes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubProducts = onSnapshot(query(collection(db, "products"), orderBy("order")), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubStockSubCategories = onSnapshot(collection(db, "stockSubCategories"), snap => setStockSubCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        return () => {
            unsubOrderTypes();
            unsubProducts();
            unsubStockSubCategories();
        };
    }, []);

    const categorizedProducts = useMemo(() => {
        const sailOrderType = orderTypes.find(ot => ot.name.toLowerCase() === 'sail');
        const sailId = sailOrderType ? sailOrderType.id : null;
        
        return products.reduce((acc, product) => {
            if (product.orderTypeId === sailId) {
                acc.sail.push(product);
            } else {
                acc.accessory.push(product);
            }
            return acc;
        }, { sail: [], accessory: [] });

    }, [products, orderTypes]);

    const handleAdd = async (collectionName, data, itemList) => {
        const newOrder = itemList.length > 0 ? Math.max(...itemList.map(i => i.order || 0)) + 1 : 0;
        await addDoc(collection(db, collectionName), { ...data, order: newOrder });
        toast.success("Item added!");
    };
    
    const confirmDeleteItem = (collectionName, id) => {
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete this item?</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button className="btn btn-sm btn-danger" onClick={() => { handleDelete(collectionName, id); toast.dismiss(t.id); }}>Yes, Delete</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => toast.dismiss(t.id)}>Cancel</button>
                </div>
            </div>
        ));
    };

    const handleDelete = async (collectionName, id) => {
        await deleteDoc(doc(db, collectionName, id));
        toast.success("Item deleted.");
    };
    
    const handleMove = async (list, index, direction, collectionName) => {
        const itemA = list[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= list.length) return;

        const itemB = list[swapIndex];
        const orderA = itemA.order ?? 0;
        const orderB = itemB.order ?? 0;

        const batch = writeBatch(db);
        batch.update(doc(db, collectionName, itemA.id), { order: orderB });
        batch.update(doc(db, collectionName, itemB.id), { order: orderA });
        await batch.commit();
        toast.success("Order updated.");
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const collectionName = editingItem.type === 'orderType' ? 'orderTypes' : 'products';
        const updatedData = {};
        if (editingItem.type === 'orderType') {
            updatedData.name = e.target.elements.name.value;
        } else {
            updatedData.name = e.target.elements.name.value;
            updatedData.orderTypeId = e.target.elements.orderTypeId.value;
        }
        await updateDoc(doc(db, collectionName, editingItem.data.id), updatedData);
        toast.success("Item updated.");
        setEditingItem(null);
    };

    const handleAddOrderType = (e) => {
        e.preventDefault();
        if (!newOrderTypeName) return;
        handleAdd('orderTypes', { name: newOrderTypeName }, orderTypes);
        setNewOrderTypeName('');
    };

    const handleAddProduct = (e) => {
        e.preventDefault();
        if (!newProductName || !newProductOrderType) return;
        handleAdd('products', { name: newProductName, orderTypeId: newProductOrderType }, products);
        setNewProductName('');
        setNewProductOrderType('');
    };

    const handleAddSubCategory = async (e) => {
        e.preventDefault();
        if(!newSubCategory.name) return;
        await addDoc(collection(db, 'stockSubCategories'), newSubCategory);
        toast.success("Sub-category added.");
        setNewSubCategory({ name: '', mainCategory: 'Sail Materials' });
    };

    const handleProductUpload = () => {
        if (!productFile) {
            toast.error("Please select a file first.");
            return;
        }
        if (typeof window.XLSX === 'undefined') {
            toast.error("Excel library is not loaded yet. Please try again.");
            return;
        }
        setIsUploading(true);
        const toastId = toast.loading("Uploading products...");

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const workbook = window.XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const jsonData = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const orderTypeMap = new Map(orderTypes.map(ot => [ot.name.toLowerCase(), ot.id]));
                const existingProductsSet = new Set(products.map(p => `${p.name.toLowerCase()}|${p.orderTypeId}`));
                let currentMaxOrder = products.length > 0 ? Math.max(...products.map(p => p.order || 0)) : -1;
                
                const batch = writeBatch(db);
                let productsAdded = 0;

                for (const row of jsonData) {
                    const productName = row.product_name?.trim();
                    const orderTypeName = row.order_type_name?.trim().toLowerCase();

                    if (!productName || !orderTypeName) continue;

                    const orderTypeId = orderTypeMap.get(orderTypeName);
                    if (!orderTypeId) {
                        console.warn(`Skipping product "${productName}": Order Type "${row.order_type_name}" not found.`);
                        continue;
                    }
                    
                    if (existingProductsSet.has(`${productName.toLowerCase()}|${orderTypeId}`)) {
                        continue;
                    }
                    
                    currentMaxOrder++;
                    const newProductRef = doc(collection(db, "products"));
                    batch.set(newProductRef, {
                        name: productName,
                        orderTypeId: orderTypeId,
                        order: currentMaxOrder
                    });
                    productsAdded++;
                }

                if (productsAdded > 0) {
                    await batch.commit();
                    toast.success(`${productsAdded} new products uploaded.`, { id: toastId });
                } else {
                    toast.success("No new products to upload.", { id: toastId });
                }

            } catch (err) {
                console.error("Error processing Excel file:", err);
                toast.error("Error processing file.", { id: toastId });
            } finally {
                setIsUploading(false);
                setProductFile(null);
                if (productFileInputRef.current) productFileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(productFile);
    };

    return (
        <div>
            <div className="row">
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-body">
                            <h3 className="h5 mb-3">Order Types</h3>
                            <form onSubmit={handleAddOrderType} className="d-flex gap-2 mb-3">
                                <input value={newOrderTypeName} onChange={e => setNewOrderTypeName(e.target.value)} placeholder="New Order Type" className="form-control" required/>
                                <button type="submit" className="btn btn-primary">Add</button>
                            </form>
                            <ul className="list-group">
                                {orderTypes.map((item, index) => (
                                    <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>{item.name}</span>
                                        <div>
                                            <button className="btn btn-sm btn-light me-2" onClick={() => handleMove(orderTypes, index, 'up', 'orderTypes')} disabled={index === 0}>&uarr;</button>
                                            <button className="btn btn-sm btn-light me-2" onClick={() => handleMove(orderTypes, index, 'down', 'orderTypes')} disabled={index === orderTypes.length - 1}>&darr;</button>
                                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingItem({ type: 'orderType', data: item })}>Edit</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteItem('orderTypes', item.id)}>Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-body d-flex flex-column">
                            <h3 className="h5 mb-3">Product Types</h3>
                            <form onSubmit={handleAddProduct} className="d-flex gap-2 mb-3">
                                <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="New Product Name" className="form-control" required/>
                                <select value={newProductOrderType} onChange={e => setNewProductOrderType(e.target.value)} className="form-select" required>
                                    <option value="">Assign Type...</option>
                                    {orderTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                                </select>
                                <button type="submit" className="btn btn-primary">Add</button>
                            </form>
                            
                             <div className="mt-2 mb-3 p-3 border rounded bg-body-tertiary">
                                <h6 className="mb-2">Bulk Upload from Excel</h6>
                                <div className="d-flex gap-2">
                                    <input type="file" className="form-control" ref={productFileInputRef} onChange={e => setProductFile(e.target.files[0])} accept=".xlsx, .xls"/>
                                    <button onClick={handleProductUpload} className="btn btn-secondary" disabled={!productFile || isUploading}>
                                        {isUploading ? "Uploading..." : "Upload"}
                                    </button>
                                </div>
                                <div className="form-text">File must have columns: `product_name` and `order_type_name`.</div>
                            </div>
                            
                            <div className="flex-grow-1" style={{overflowY: 'auto', maxHeight: '400px'}}>
                                <h6 className="mt-3">Sail Products ({categorizedProducts.sail.length})</h6>
                                <ul className="list-group">
                                    {categorizedProducts.sail.map((item) => (
                                        <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{item.name}</span>
                                            <div>
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingItem({ type: 'product', data: item })}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteItem('products', item.id)}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <h6 className="mt-4">Accessory Products ({categorizedProducts.accessory.length})</h6>
                                <ul className="list-group">
                                    {categorizedProducts.accessory.map((item) => (
                                        <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{item.name}</span>
                                            <div>
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingItem({ type: 'product', data: item })}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteItem('products', item.id)}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <hr className="my-4"/>

            <div className="row">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                             <h3 className="h5 mb-3">Stock Sub-Categories</h3>
                             <form onSubmit={handleAddSubCategory} className="d-flex gap-2 mb-3">
                                <input value={newSubCategory.name} onChange={e => setNewSubCategory({...newSubCategory, name: e.target.value})} placeholder="New Sub-Category" className="form-control" required/>
                                <select value={newSubCategory.mainCategory} onChange={e => setNewSubCategory({...newSubCategory, mainCategory: e.target.value})} className="form-select">
                                    <option>Sail Materials</option>
                                    <option>Sail Hardware</option>
                                </select>
                                <button type="submit" className="btn btn-primary">Add</button>
                            </form>
                            <ul className="list-group">
                                {stockSubCategories.map(cat => (
                                    <li key={cat.id} className="list-group-item d-flex justify-content-between align-items-center">
                                       <span>{cat.name} <small className="text-muted">({cat.mainCategory})</small></span>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDeleteItem('stockSubCategories', cat.id)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                 <div className="col-md-6">
                   <ProductionStatusManagement orderTypes={orderTypes} products={products} />
                </div>
            </div>

            {editingItem && (
                 <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit {editingItem.type === 'orderType' ? 'Order Type' : 'Product'}</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingItem(null)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Name</label>
                                        <input name="name" defaultValue={editingItem.data.name} className="form-control" required />
                                    </div>
                                    {editingItem.type === 'product' && (
                                        <div className="mb-3">
                                            <label className="form-label">Order Type</label>
                                            <select name="orderTypeId" defaultValue={editingItem.data.orderTypeId} className="form-select" required>
                                                {orderTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Close</button>
                                    <button type="submit" className="btn btn-primary">Save changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagementTab;
