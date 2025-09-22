import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { db, storage } from '../../firebase';
import { 
    collection, 
    query, 
    onSnapshot, 
    orderBy,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc
} from "firebase/firestore";
import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

const QcModal = ({ order, user, onClose }) => {
    const [photos, setPhotos] = useState([]);
    const [uploads, setUploads] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const isAdminOrProduction = user.role === 'super_admin' || user.role === 'production';

    useEffect(() => {
        const q = query(collection(db, "orders", order.id, "qcPhotos"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching QC photos:", err);
            setError("Failed to load photos.");
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [order.id]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const fileNameWithTimestamp = `${Date.now()}-${file.name}`;
            const storageRef = ref(storage, `qc-photos/${order.id}/${fileNameWithTimestamp}`);
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
                        await addDoc(collection(db, "orders", order.id, "qcPhotos"), {
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

    const confirmDelete = (photo) => {
        toast((t) => (
            <div className="d-flex flex-column p-2">
                <p className="fw-bold text-center">Delete this photo?</p>
                <p className="text-center small">{photo.fileName}</p>
                <div className="d-flex justify-content-center gap-2 mt-2">
                    <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => {
                            handleDelete(photo);
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

    const handleDelete = async (photo) => {
        try {
            await deleteObject(ref(storage, photo.fullPath));
            await deleteDoc(doc(db, "orders", order.id, "qcPhotos", photo.id));
            toast.success("Photo deleted.");
        } catch (err) {
            console.error("Error deleting photo:", err);
            toast.error("Failed to delete photo.");
        }
    };

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">QC Photos for Order: {order.aquaOrderNumber}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}

                        {isAdminOrProduction && (
                            <div className="mb-4 p-3 border rounded bg-body-tertiary">
                                <h6 className="mb-2">Upload New Photos</h6>
                                <input type="file" className="form-control" multiple onChange={handleFileSelect} ref={fileInputRef} accept="image/*"/>
                                <div className="form-text">You can select multiple images to upload.</div>
                            </div>
                        )}

                        {Object.keys(uploads).length > 0 && (
                             <div className="mb-3">
                                <h6>Uploads in Progress...</h6>
                                {Object.entries(uploads).map(([name, progress]) => (
                                    <div key={name} className="mb-2">
                                        <small>{name}</small>
                                        <div className="progress" role="progressbar" style={{height: '20px'}}>
                                            <div className="progress-bar" style={{ width: `${progress}%` }}>{Math.round(progress)}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className="text-center p-5"><div className="spinner-border"></div></div>
                        ) : photos.length === 0 ? (
                            <p className="text-center text-muted p-5">No QC photos have been uploaded for this order yet.</p>
                        ) : (
                            <div className="row g-3">
                                {photos.map(photo => (
                                    <div className="col-xxl-3 col-lg-4 col-md-6" key={photo.id}>
                                        <div className="card h-100 shadow-sm">
                                            <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                               <img src={photo.url} className="card-img-top" alt={photo.fileName} style={{ height: '200px', objectFit: 'cover' }} />
                                            </a>
                                            <div className="card-body p-2">
                                                <p className="card-text small text-truncate" title={photo.fileName}>{photo.fileName}</p>
                                                 <p className="card-text text-muted small mb-0">By: {photo.uploadedBy} on {photo.createdAt?.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className="card-footer p-2 d-flex justify-content-between bg-white border-0">
                                                <a href={photo.url} download={photo.fileName} className="btn btn-sm btn-outline-secondary">Download</a>
                                                {isAdminOrProduction && (
                                                    <button onClick={() => confirmDelete(photo)} className="btn btn-sm btn-outline-danger">Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QcModal;
