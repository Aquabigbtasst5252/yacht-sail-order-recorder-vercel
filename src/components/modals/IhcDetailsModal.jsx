import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { db, storage } from '../../firebase.js';
import {
    doc,
    updateDoc,
    onSnapshot,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    deleteDoc
} from "firebase/firestore";
import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

const IhcDetailsModal = ({ order, user, onClose }) => {
    const [ihcSerialNumber, setIhcSerialNumber] = useState('');
    const [ihcRoyaltyNumber, setIhcRoyaltyNumber] = useState('');
    const [photos, setPhotos] = useState([]);
    const [uploads, setUploads] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, "orders", order.id, "ihcStickerImages"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching IHC photos:", err);
            setIsLoading(false);
        });

        const orderRef = doc(db, "orders", order.id);
        const unsubscribeOrder = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIhcSerialNumber(data.ihcSerialNumber || '');
                setIhcRoyaltyNumber(data.ihcRoyaltyNumber || '');
            }
        });

        return () => {
            unsubscribe();
            unsubscribeOrder();
        };
    }, [order.id]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const fileNameWithTimestamp = `${Date.now()}-${file.name}`;
            const storageRef = ref(storage, `ihc-stickers/${order.id}/${fileNameWithTimestamp}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploads(prev => ({ ...prev, [file.name]: progress }));
                },
                (uploadError) => {
                    console.error(`Upload failed for ${file.name}:`, uploadError);
                    toast.error(`Upload failed for ${file.name}.`);
                    setUploads(prev => {
                        const newUploads = { ...prev };
                        delete newUploads[file.name];
                        return newUploads;
                    });
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        await addDoc(collection(db, "orders", order.id, "ihcStickerImages"), {
                            url: downloadURL,
                            fileName: file.name,
                            fullPath: uploadTask.snapshot.ref.fullPath,
                            uploadedBy: user.name,
                            createdAt: serverTimestamp()
                        });
                        toast.success(`${file.name} uploaded.`);
                    } catch (firestoreError) {
                        console.error("Error saving photo metadata:", firestoreError);
                        toast.error(`Failed to save photo ${file.name}.`);
                        await deleteObject(uploadTask.snapshot.ref);
                    } finally {
                        setUploads(prev => {
                            const newUploads = { ...prev };
                            delete newUploads[file.name];
                            return newUploads;
                        });
                    }
                }
            );
        });
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const confirmDelete = (photoToDelete) => {
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete sticker image?</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                            handleDelete(photoToDelete);
                            toast.dismiss(t.id);
                        }}
                    >
                        Yes, Delete
                    </button>
                    <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => toast.dismiss(t.id)}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ));
    };

    const handleDelete = async (photoToDelete) => {
        try {
            await deleteObject(ref(storage, photoToDelete.fullPath));
            await deleteDoc(doc(db, "orders", order.id, "ihcStickerImages", photoToDelete.id));
            toast.success("Sticker image deleted.");
        } catch (err) {
            console.error("Error deleting photo:", err);
            toast.error("Failed to delete photo.");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const orderRef = doc(db, "orders", order.id);
            await updateDoc(orderRef, {
                ihcSerialNumber: ihcSerialNumber,
                ihcRoyaltyNumber: ihcRoyaltyNumber
            });
            toast.success("IHC details saved!");
            onClose();
        } catch (err) {
            toast.error('Failed to save details.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">IHC Details for Order: {order.aquaOrderNumber}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {isLoading ? (
                            <div className="text-center p-5"><div className="spinner-border"></div></div>
                        ) : (
                            <div>
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label htmlFor="ihcSerial" className="form-label">IHC Serial Number</label>
                                        <input type="text" id="ihcSerial" className="form-control" value={ihcSerialNumber} onChange={e => setIhcSerialNumber(e.target.value)} />
                                    </div>
                                    <div className="col-md-6">
                                        <label htmlFor="ihcRoyalty" className="form-label">Royalty Number</label>
                                        <input type="text" id="ihcRoyalty" className="form-control" value={ihcRoyaltyNumber} onChange={e => setIhcRoyaltyNumber(e.target.value)} />
                                    </div>
                                </div>

                                <hr/>

                                <h6 className="mt-4">IHC Sticker Images</h6>
                                <div className="mb-3 p-3 border rounded bg-body-tertiary">
                                    <label htmlFor="stickerUpload" className="form-label">Upload New Sticker Image</label>
                                    <input type="file" id="stickerUpload" className="form-control" multiple onChange={handleFileSelect} ref={fileInputRef} accept="image/*"/>
                                </div>

                                {Object.keys(uploads).length > 0 && (
                                    <div className="mb-3">
                                        {Object.entries(uploads).map(([name, progress]) => (
                                            <div key={name} className="mb-2">
                                                <small>{name}</small>
                                                <div className="progress" role="progressbar"><div className="progress-bar" style={{ width: `${progress}%` }}>{Math.round(progress)}%</div></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {photos.length === 0 ? (
                                    <p className="text-center text-muted">No sticker images uploaded yet.</p>
                                ) : (
                                    <div className="row g-3">
                                        {photos.map((photo, index) => (
                                            <div className="col-lg-4 col-md-6" key={index}>
                                                <div className="card h-100 shadow-sm">
                                                    <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                                       <img src={photo.url} className="card-img-top" alt={photo.fileName} style={{ height: '180px', objectFit: 'cover' }} />
                                                    </a>
                                                    <div className="card-footer p-2 d-flex justify-content-between bg-white border-0">
                                                        <a href={photo.url} download={photo.fileName} className="btn btn-sm btn-outline-secondary">Download</a>
                                                        <button onClick={() => confirmDelete(photo)} className="btn btn-sm btn-outline-danger">Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Close</button>
                        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Details'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IhcDetailsModal;


