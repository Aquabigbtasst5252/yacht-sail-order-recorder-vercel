import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';

// --- Firebase SDK Imports ---
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile,
    sendPasswordResetEmail
} from "firebase/auth";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    runTransaction,
    serverTimestamp,
    orderBy,
    writeBatch,
    getDocs
} from "firebase/firestore";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

// --- Excel & PDF Parsing Libraries ---
let XLSX;

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Helper Functions ---
const getCurrentWeekString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [settings, setSettings] = useState({ welcomeMessage: '', logoUrl: '', companyName: "AQUA DYNAMICS" });
    const [lastGeneratedOrderNumber, setLastGeneratedOrderNumber] = useState('');

    const handleNavigation = (page) => {
        if (currentPage === 'new-order' && page !== 'new-order') {
            setLastGeneratedOrderNumber('');
        }
        setCurrentPage(page);
    };

    useEffect(() => {
        const xlsxScript = document.createElement('script');
        xlsxScript.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
        xlsxScript.onload = () => { XLSX = window.XLSX; };
        document.head.appendChild(xlsxScript);
        
        const applyTheme = () => {
            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-bs-theme', 'light');
            }
        };
        applyTheme();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && !currentUser.isAnonymous) {
                setUser(currentUser);
                const userDocRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                if (!docSnap.exists()) {
                    await setDoc(userDocRef, {
                        email: currentUser.email,
                        name: currentUser.displayName || 'New User',
                        role: 'customer',
                        status: 'pending',
                        createdAt: serverTimestamp()
                    });
                }
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let unsubUserData, unsubSettings;
        if (user) {
            unsubUserData = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
                const data = userDoc.data();
                setUserData(data);
                if (data?.role === 'super_admin') {
                     unsubSettings = onSnapshot(doc(db, "settings", "main"), (settingsDoc) => {
                        if (settingsDoc.exists()) setSettings(settingsDoc.data());
                    });
                }
                 setLoading(false);
            }, () => setLoading(false));
        } else {
            setLoading(false);
        }
       
        return () => {
            if (unsubUserData) unsubUserData();
            if (unsubSettings) unsubSettings();
        };
    }, [user]);

    const appStatus = useMemo(() => {
        if (loading) return 'loading';
        if (!user || !userData) return 'public';
        if (userData.status === 'pending') return 'pending';
        return 'active';
    }, [loading, user, userData]);
    
    const handleSignOut = () => {
        signOut(auth);
        handleNavigation('home');
    };

    const PageContent = () => {
        if (appStatus === 'loading') {
            return <div className="vh-100 d-flex align-items-center justify-content-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
        }

        if (appStatus === 'public') {
            const publicPageMap = {
                'home': <HomePage onLoginSuccess={() => handleNavigation('dashboard')} settings={settings} />,
                'about': <AboutPage />,
                'services': <ServicesPage />,
                'contact': <ContactPage />,
            };
            return (
                <div className="d-flex flex-column" style={{minHeight: '100vh'}}>
                    <PublicHeader onNavigate={handleNavigation} settings={settings} />
                     <main className="container my-4 flex-grow-1">
                        {publicPageMap[currentPage] || <HomePage onLoginSuccess={() => handleNavigation('dashboard')} settings={settings} />}
                    </main>
                    <PublicFooter />
                </div>
            );
        }
        
        if (appStatus === 'pending') {
             return <PendingAccessScreen message={settings.welcomeMessage} companyName={settings.companyName} logoUrl={settings.logoUrl} />;
        }

        if (appStatus === 'active') {
             const isAdmin = userData.role === 'super_admin';
             const isProduction = userData.role === 'production';
             const renderPage = () => {
                switch(currentPage) {
                    case 'new-order': return (isAdmin || isProduction) ? <NewOrderForm user={userData} onOrderCreated={setLastGeneratedOrderNumber} lastGeneratedOrderNumber={lastGeneratedOrderNumber} /> : <Dashboard user={userData} />;
                    case 'order-list': return <OrderList user={userData} />;
                    case 'planning': return <ProductionPage user={userData} />;
                    case 'stock': return <CustomerStock user={userData} />;
                    case 'settings': return isAdmin ? <SettingsPage /> : <Dashboard user={userData} />;
                    case 'admin': return isAdmin ? <AdminPanel /> : <Dashboard user={userData} />;
                    case 'dashboard': default: return <Dashboard user={userData} />;
                }
             };
            return (
                <div className="d-flex flex-column vh-100">
                    <DashboardHeader user={userData} onSignOut={handleSignOut} onNavigate={handleNavigation} settings={settings} />
                    <main className="container-fluid my-4 flex-grow-1">{renderPage()}</main>
                </div>
            );
        }

        return <div className="vh-100 d-flex align-items-center justify-content-center"><p className="text-danger">An unexpected error occurred.</p></div>;
    };
    return <PageContent />;
}

// --- Screens & Major Components ---

const PendingAccessScreen = ({ message, companyName, logoUrl }) => (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-body-tertiary">
        <div className="card text-center shadow-sm" style={{maxWidth: '500px'}}>
            <div className="card-body p-5">
                <img src={logoUrl || 'https://placehold.co/200x60/0d6efd/ffffff?text=Aqua+Dynamics'} alt="Company Logo" style={{height: '50px'}} className="mb-4" />
                <h1 className="h4 card-title">Welcome to {companyName || "AQUA DYNAMICS"}!</h1>
                <p className="card-text text-muted">{message || "Your account is pending approval from a super admin. Please check back later."}</p>
            </div>
        </div>
    </div>
);

const PublicHeader = ({ onNavigate, settings }) => (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom shadow-sm sticky-top">
        <div className="container">
            <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>
                <img src={settings.logoUrl || 'https://i.imgur.com/cAyxfn7.png'} alt="Logo" style={{height: '40px'}} />
            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNavbar">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="publicNavbar">
                <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Home</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('about'); }}>About</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('services'); }}>Services</a></li>
                    <li className="nav-item"><a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>
);

const PublicFooter = () => (
    <footer className="py-3 mt-auto bg-body-tertiary border-top">
        <div className="container text-center">
            <span className="text-muted">Design by Chamal Madushanke - 2025</span>
        </div>
    </footer>
);

const HomePage = ({ onLoginSuccess, settings }) => {
    const [viewMode, setViewMode] = useState('login'); // 'login', 'signup', or 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(''); // For success messages

    const clearMessages = () => {
        setError('');
        setMessage('');
    };

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            if (viewMode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else { // signup
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username });
            }
            onLoginSuccess();
        } catch (err) => {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setLoading(true);
        clearMessages();
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
            onLoginSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address to reset your password.");
            return;
        }
        setLoading(true);
        clearMessages();
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset link sent! Please check your inbox.");
            setViewMode('login'); // Switch back to the login view
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const renderFormContent = () => {
        if (viewMode === 'reset') {
            return (
                <form onSubmit={handlePasswordReset}>
                    <p className="text-muted mt-3">Enter your email to receive a password reset link.</p>
                    <div className="form-floating mb-3">
                        <input type="email" className="form-control" id="email-reset" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        <label htmlFor="email-reset">Email address</label>
                    </div>
                    <button className="btn btn-primary w-100 py-2 btn-lg" type="submit" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : 'Send Reset Link'}
                    </button>
                </form>
            );
        }

        return (
            <form onSubmit={handleAuthAction}>
                {viewMode === 'signup' && (
                    <div className="form-floating mb-3">
                        <input type="text" className="form-control" id="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                        <label htmlFor="username">Username</label>
                    </div>
                )}
                <div className="form-floating mb-3">
                    <input type="email" className="form-control" id="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    <label htmlFor="email">Email address</label>
                </div>
                <div className="form-floating mb-3">
                    <input type="password" className="form-control" id="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <label htmlFor="password">Password</label>
                </div>
                {viewMode === 'login' && (
                    <div className="d-flex justify-content-between align-items-center my-3">
                        <div className="form-check text-start">
                            <input className="form-check-input" type="checkbox" id="remember-me" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                            <label className="form-check-label" htmlFor="remember-me">Remember me</label>
                        </div>
                        <button type="button" className="btn btn-link p-0" onClick={() => { setViewMode('reset'); clearMessages(); }}>
                            Forgot password?
                        </button>
                    </div>
                )}
                <button className="btn btn-primary w-100 py-2 btn-lg" type="submit" disabled={loading}>
                    {loading ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : (viewMode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
            </form>
        );
    };

    return (
        <div className="container mt-5">
            <div className="row align-items-center g-5">
                <div className="col-lg-7 text-center text-lg-start">
                    <h1 className="display-4 fw-bold lh-1 mb-3">Welcome to the Aqua Dynamics Client Portal</h1>
                    <p className="col-lg-10 fs-5">
                        Manage your yacht sail orders, track production status, and view your stock levels all in one place.
                        Access your account to get started.
                    </p>
                </div>
                <div className="col-lg-5">
                    <div className="card shadow-lg">
                        <div className="card-body p-4 p-md-5">
                            <div className="text-center mb-4">
                                <img src={settings.logoUrl || 'https://i.imgur.com/cAyxfn7.png'} alt="Company Logo" style={{height: '50px'}} />
                                {viewMode !== 'reset' && <p className="text-muted mt-3">{viewMode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>}
                            </div>
                            
                            {message && <div className="alert alert-success small mb-3">{message}</div>}
                            {error && <p className="text-danger small mb-3">{error}</p>}
                            
                            {renderFormContent()}

                            {viewMode !== 'reset' && (
                                <>
                                    <div className="text-center my-3"><small className="text-muted">OR</small></div>
                                    <button onClick={handleGoogleSignIn} className="btn btn-outline-secondary w-100 py-2" type="button" disabled={loading}>
                                        Sign in with Google
                                    </button>
                                </>
                            )}
                            
                            <div className="text-center mt-4">
                                {viewMode === 'login' && <button onClick={() => { setViewMode('signup'); clearMessages(); }} className="btn btn-link">Need an account? Sign up</button>}
                                {viewMode === 'signup' && <button onClick={() => { setViewMode('login'); clearMessages(); }} className="btn btn-link">Already have an account? Sign in</button>}
                                {viewMode === 'reset' && <button onClick={() => { setViewMode('login'); clearMessages(); }} className="btn btn-link">Back to Sign in</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutPage = () => (
    <div className="py-5 bg-body-tertiary rounded-3">
        {/* ... About Page content ... */}
    </div>
);

const ServicesPage = () => (
    <div className="py-5 bg-body-tertiary rounded-3">
        {/* ... Services Page content ... */}
    </div>
);

const ContactPage = () => (
    <div className="py-5 bg-body-tertiary rounded-3">
        {/* ... Contact Page content ... */}
    </div>
);

// --- DASHBOARD / INTERNAL APP COMPONENTS ---
const DashboardHeader = ({ user, onSignOut, onNavigate, settings }) => {
    const isAdmin = user.role === 'super_admin';
    const isProduction = user.role === 'production';
    const isCustomer = user.role === 'customer';

    return (
        <nav className="navbar navbar-expand bg-body-tertiary border-bottom shadow-sm">
            <div className="container-fluid">
                <div className="d-flex align-items-center">
                    <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>
                        <img src={settings.logoUrl || 'https://i.imgur.com/cAyxfn7.png'} alt="Logo" style={{height: '32px'}}/>
                    </a>
                    <ul className="navbar-nav d-flex flex-row">
                        {!isCustomer && (
                             <>
                                <li className="nav-item">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('new-order'); }}>New Order</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>Order List</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Schedule</a>
                                </li>
                             </>
                        )}
                        {isCustomer && (
                            <>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>My Orders</a>
                                </li>
                                <li className="nav-item ms-3">
                                    <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Status</a>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
                
                <div className="d-flex align-items-center ms-auto">
                    <div className="dropdown">
                        <button className="btn btn-light d-flex align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                           <div className="text-end me-2">
                                <div className="fw-semibold" style={{lineHeight: 1}}>{user.name}</div>
                                <small className="text-muted text-capitalize" style={{fontSize: '0.8em'}}>{user.role.replace('_', ' ')}</small>
                            </div>
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-person-circle" viewBox="0 0 16 16">
                              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                              <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                            </svg>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }}>Dashboard</a></li>
                            {isCustomer && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>My Orders</a></li>}
                            {isCustomer && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Status</a></li>}
                            <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('stock'); }}>My Stock</a></li>
                            
                            {(isAdmin || isProduction) && <li><hr className="dropdown-divider" /></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order-list'); }}>Order List</a></li>}
                            {(isAdmin || isProduction) && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('planning'); }}>Production Schedule</a></li>}
                            
                            {isAdmin && <li><hr className="dropdown-divider" /></li>}
                            {isAdmin && <li><a className="dropdown-item fw-bold" href="#" onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}>Admin Panel</a></li>}
                            {isAdmin && <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onNavigate('settings'); }}>Settings</a></li>}
                            
                            <li><hr className="dropdown-divider" /></li>
                            <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onSignOut(); }}>Sign Out</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const Dashboard = ({ user }) => {
    const [weeklyOrders, setWeeklyOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const currentWeek = useMemo(() => getCurrentWeekString(), []);

    const getStatusBadgeClass = (status) => {
        const lowerCaseStatus = status?.toLowerCase() || '';
        if (lowerCaseStatus === 'temporary stop') return 'bg-danger';
        if (lowerCaseStatus === 'shipped') return 'bg-success';
        return 'bg-primary';
    };

    useEffect(() => {
        const isCustomer = user.role === 'customer';
        let constraints = [where("deliveryWeek", "==", currentWeek)];
        
        if (isCustomer) {
            if (!user.customerCompanyId) {
                setIsLoading(false);
                setWeeklyOrders([]);
                return;
            }
            constraints.push(where("customerId", "==", user.customerCompanyId));
        }

        const q = query(collection(db, "orders"), ...constraints);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWeeklyOrders(ordersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching weekly orders:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, currentWeek]);

    return (
        <div className="container-fluid">
            <div className="card">
                <div className="card-header">
                    <h2 className="h5 mb-0">This Week's Production Schedule ({currentWeek})</h2>
                </div>
                <div className="card-body">
                    {isLoading ? (
                        <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
                    ) : weeklyOrders.length === 0 ? (
                        <p className="text-muted">No orders scheduled for production this week.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th>Aqua Order #</th>
                                        {user.role !== 'customer' && <th>Customer</th>}
                                        <th>Customer PO</th>
                                        <th>Product</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyOrders.map(order => (
                                        <tr key={order.id}>
                                            <td>{order.aquaOrderNumber}</td>
                                            {user.role !== 'customer' && <td>{order.customerCompanyName}</td>}
                                            <td>{order.customerPO}</td>
                                            <td>{order.productName}</td>
                                            <td><span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NewOrderForm = ({ user, onOrderCreated, lastGeneratedOrderNumber }) => {
    // State for data fetched from Firestore
    const [orderTypes, setOrderTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    
    // State for form inputs
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedOrderType, setSelectedOrderType] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [material, setMaterial] = useState('');
    const [ifsOrderNo, setIfsOrderNo] = useState('');
    const [customerPO, setCustomerPO] = useState('');
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch initial data for dropdowns
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

    // Memoized options for react-select components
    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.companyName })), [customers]);
    
    const filteredProducts = useMemo(() => {
        if (!selectedOrderType) return [];
        return products.filter(p => p.orderTypeId === selectedOrderType);
    }, [selectedOrderType, products]);

    const productOptions = useMemo(() => filteredProducts.map(p => ({ value: p.id, label: p.name })), [filteredProducts]);

    const handleOrderTypeChange = (e) => {
        setSelectedOrderType(e.target.value);
        setSelectedProduct(null); // Reset product selection when order type changes
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer || !selectedProduct || !selectedOrderType) {
            alert("Please select a customer, order type, and product.");
            return;
        }
        setIsSubmitting(true);
        
        const data = {
            customerId: selectedCustomer.value,
            orderTypeId: selectedOrderType,
            productId: selectedProduct.value,
            material,
            ifsOrderNo,
            customerPO,
            size,
            quantity: Number(quantity)
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
            resetForm();
        } catch (error) {
            console.error("Transaction failed: ", error);
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
                                    <Select
                                        id="customerId"
                                        options={customerOptions}
                                        value={selectedCustomer}
                                        onChange={setSelectedCustomer}
                                        placeholder="Search and select a customer..."
                                        isClearable
                                        required
                                    />
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
                                    <Select
                                        id="productId"
                                        options={productOptions}
                                        value={selectedProduct}
                                        onChange={setSelectedProduct}
                                        placeholder="Search and select a product..."
                                        isClearable
                                        required
                                        isDisabled={!selectedOrderType}
                                    />
                                </div>
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


const QcModal = ({ order, user, onClose }) => {
    const [photos, setPhotos] = useState([]);
    const [uploads, setUploads] = useState({}); // { [fileName]: progress }
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
                    setError(`Upload failed for ${file.name}. See console for details.`);
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
                    } catch (firestoreError) {
                        console.error("Error saving photo metadata to Firestore:", firestoreError);
                        setError(`Failed to save photo ${file.name}. Please check permissions and try again.`);
                        // If saving fails, delete the orphaned photo from storage
                        await deleteObject(uploadTask.snapshot.ref);
                    } finally {
                        // This runs whether it succeeds or fails
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

    const handleDelete = async (photo) => {
        if (!window.confirm(`Are you sure you want to delete ${photo.fileName}?`)) return;
        try {
            await deleteObject(ref(storage, photo.fullPath));
            await deleteDoc(doc(db, "orders", order.id, "qcPhotos", photo.id));
        } catch (err) {
            console.error("Error deleting photo:", err);
            setError("Failed to delete photo.");
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
                                                    <button onClick={() => handleDelete(photo)} className="btn btn-sm btn-outline-danger">Delete</button>
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

const OrderList = ({ user }) => {
    const [orders, setOrders] = useState([]);
    const [editingOrder, setEditingOrder] = useState(null);
    const [qcOrder, setQcOrder] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'sails', or 'accessories'
    const entriesPerPage = 25;
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let q;
        if (isCustomer) { 
            if (!user.customerCompanyName) return;
            q = query(collection(db, "orders"), where("customerCompanyName", "==", user.customerCompanyName), orderBy("createdAt", "desc"));
        } else { 
            q = query(collection(db, "orders"), orderBy("createdAt", "desc")); 
        }
        const unsub = onSnapshot(q, snap => setOrders(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => unsub();
    }, [user]);

    // Reset to the first page when the filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);
    
    // 1. First, filter by the active tab
    const categorizedOrders = useMemo(() => {
        if (activeTab === 'sails') {
            return orders.filter(order => order.orderTypeName?.toLowerCase() === 'sail');
        }
        if (activeTab === 'accessories') {
            return orders.filter(order => order.orderTypeName?.toLowerCase() !== 'sail');
        }
        return orders; // 'all' tab
    }, [orders, activeTab]);

    // 2. Then, filter by the search term
    const filteredOrders = useMemo(() => {
        if (!searchTerm) return categorizedOrders;
        const lowercasedFilter = searchTerm.toLowerCase();
        return categorizedOrders.filter(order =>
            Object.values(order).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [categorizedOrders, searchTerm]);

    const handleDelete = async (id) => {
        if(window.confirm("Are you sure you want to delete this order?")) {
            await deleteDoc(doc(db, "orders", id));
        }
    };
    
    const handleCancelToggle = async (order) => {
        const newStatus = order.status === 'Cancelled' ? 'New' : 'Cancelled';
        const confirmationText = newStatus === 'Cancelled'
            ? "Are you sure you want to cancel this order?"
            : "Are you sure you want to reactivate this order?";
            
        if(window.confirm(confirmationText)) {
            await updateDoc(doc(db, "orders", order.id), { status: newStatus });
        }
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        await updateDoc(doc(db, "orders", editingOrder.id), data);
        setEditingOrder(null);
    };
    
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredOrders.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredOrders.length / entriesPerPage);

    return (
        <div className="card w-100">
            <div className="card-header d-flex justify-content-between align-items-center">
                <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Orders</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'sails' ? 'active' : ''}`} onClick={() => setActiveTab('sails')}>Sails</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'accessories' ? 'active' : ''}`} onClick={() => setActiveTab('accessories')}>Accessories</button>
                    </li>
                </ul>
                 <div className="col-md-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={`Search in ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="card-body">
                <div className="table-responsive">
                    <table className="table table-striped table-hover table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Aqua Order No.</th>
                                <th>Customer PO</th>
                                <th>IFS Order No</th>
                                {!isCustomer && <th>Customer</th>}
                                <th>Order Description</th>
                                <th>Qty</th>
                                <th>Actions</th>
                                <th>Created By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentEntries.map(order => (
                                <tr key={order.id} className={order.status === 'Cancelled' ? 'table-danger' : ''}>
                                    <td>{order.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                                    <td>{order.aquaOrderNumber}</td>
                                    <td>{order.customerPO}</td>
                                    <td>{order.ifsOrderNo}</td>
                                    {!isCustomer && <td>{order.customerCompanyName}</td>}
                                    <td>{`${order.productName} - ${order.material}`}</td>
                                    <td>{order.quantity}</td>
                                    <td>
                                        {!isCustomer ? (
                                            <>
                                                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditingOrder(order)}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger me-1" onClick={() => handleDelete(order.id)}>Delete</button>
                                                <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleCancelToggle(order)}>
                                                    {order.status === 'Cancelled' ? 'Reactivate' : 'Cancel'}
                                                </button>
                                                <button className="btn btn-sm btn-outline-info" onClick={() => setQcOrder(order)}>QC</button>
                                            </>
                                        ) : (
                                            <button className="btn btn-sm btn-outline-info" onClick={() => setQcOrder(order)}>View QC Photos</button>
                                        )}
                                    </td>
                                    <td>{order.createdBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                <nav>
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</button>
                        </li>
                         <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Edit Order Modal */}
            {editingOrder && (
                 <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Order: {editingOrder.aquaOrderNumber}</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingOrder(null)}></button>
                            </div>
                            <form onSubmit={handleUpdateOrder}>
                                <div className="modal-body">
                                     <div className="row g-3">
                                        <div className="col-md-6"><label className="form-label">Customer PO</label><input name="customerPO" defaultValue={editingOrder.customerPO} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">IFS Order No</label><input name="ifsOrderNo" defaultValue={editingOrder.ifsOrderNo} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">Material</label><input name="material" defaultValue={editingOrder.material} className="form-control" /></div>
                                        <div className="col-md-6"><label className="form-label">Size</label><input name="size" defaultValue={editingOrder.size} className="form-control" /></div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingOrder(null)}>Close</button>
                                    <button type="submit" className="btn btn-primary">Save changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* QC Photos Modal */}
            {qcOrder && (
                <QcModal
                    order={qcOrder}
                    user={user}
                    onClose={() => setQcOrder(null)}
                />
            )}
        </div>
    );
};


const ProductionPage = ({ user }) => {
    const [activeTab, setActiveTab] = useState('schedule'); // schedule, history, allActive

    return (
        <div className="card w-100">
            <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Weekly Schedule</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Order Milestone History</button>
                    </li>
                    {user.role !== 'customer' && (
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'allActive' ? 'active' : ''}`} onClick={() => setActiveTab('allActive')}>All Active Orders</button>
                        </li>
                    )}
                </ul>
            </div>
            <div className="card-body">
                {activeTab === 'schedule' && <WeeklyScheduleView user={user} />}
                {activeTab === 'history' && <OrderHistoryView user={user} />}
                {activeTab === 'allActive' && user.role !== 'customer' && <AllActiveOrdersView user={user} />}
            </div>
        </div>
    );
};

const WeeklyScheduleView = ({ user }) => {
    const [allOrders, setAllOrders] = useState([]);
    const [productionStatuses, setProductionStatuses] = useState([]);
    const [deliveryWeeks, setDeliveryWeeks] = useState([]);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [stoppingOrder, setStoppingOrder] = useState(null);
    const [stopReason, setStopReason] = useState('');
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let ordersQuery = query(collection(db, "orders"), where("status", "!=", "Cancelled"));
        if(isCustomer) {
             if (!user.customerCompanyName) return;
            ordersQuery = query(ordersQuery, where("customerCompanyName", "==", user.customerCompanyName));
        }
        const unsubOrders = onSnapshot(ordersQuery, (snap) => {
            const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllOrders(ordersData);
            const weeks = [...new Set(ordersData.map(o => o.deliveryWeek).filter(Boolean))];
            weeks.sort();
            setDeliveryWeeks(weeks);
        });

        const statusesQuery = query(collection(db, "productionStatuses"), orderBy("order"));
        const unsubStatuses = onSnapshot(statusesQuery, (snap) => {
            setProductionStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubOrders(); unsubStatuses(); };
    }, [user]);
    
    const ordersByCustomer = useMemo(() => {
        if (!selectedWeek) return {};
        const weekOrders = allOrders.filter(o => o.deliveryWeek === selectedWeek && o.status?.toLowerCase() !== 'shipped');
        return weekOrders.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
    }, [selectedWeek, allOrders]);

    const shippedOrders = useMemo(() => {
        if (!selectedWeek) return [];
        return allOrders.filter(o => o.deliveryWeek === selectedWeek && o.status?.toLowerCase() === 'shipped');
    }, [selectedWeek, allOrders]);

    const updateOrderStatus = async (order, newStatusId, reason = null) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        const historyRef = collection(db, "orders", order.id, "statusHistory");
        const historyEntry = { status: newStatus.description, changedBy: user.name, timestamp: serverTimestamp(), ...(reason && { reason }) };
        const orderRef = doc(db, "orders", order.id);
        const orderUpdate = { status: newStatus.description, statusId: newStatusId };
        
        const batch = writeBatch(db);
        batch.update(orderRef, orderUpdate);
        batch.set(doc(historyRef), historyEntry);
        await batch.commit();
    };

    const handleStatusChange = (order, newStatusId) => {
        const newStatus = productionStatuses.find(s => s.id === newStatusId);
        if (!newStatus) return;

        if (newStatus.description.toLowerCase() === 'temporary stop') {
            setStoppingOrder({ order, newStatusId });
        } else {
            updateOrderStatus(order, newStatusId);
        }
    };
    
    const handleStopReasonSubmit = async (e) => {
        e.preventDefault();
        if (!stopReason) {
            alert("Please provide a reason.");
            return;
        }
        await updateOrderStatus(stoppingOrder.order, stoppingOrder.newStatusId, stopReason);
        setStoppingOrder(null);
        setStopReason('');
    };
    
    const getValidStatuses = (order) => {
        return productionStatuses.filter(status => 
            status.orderTypeIds?.includes(order.orderTypeId) && 
            status.productTypeIds?.includes(order.productId)
        );
    };
    
    const handleExportPDF = () => {
        if (!selectedWeek) {
            alert("Please select a week to export.");
            return;
        }
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF.prototype.autoTable !== 'function') {
            alert("PDF generation library is still loading. Please try again in a moment.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text(`${selectedWeek} - Yacht Sail Production Schedule`, 14, 15);
        
        const tableData = [];
        Object.keys(ordersByCustomer).sort().forEach(customerName => {
            tableData.push([{ content: customerName, colSpan: 6, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }]);
            ordersByCustomer[customerName].forEach(order => {
                tableData.push([
                    order.aquaOrderNumber || '',
                    order.customerPO || '',
                    order.ifsOrderNo || '',
                    `${order.productName || ''} - ${order.material || ''} - ${order.size || ''}`,
                    order.quantity || '',
                    order.deliveryDate || ''
                ]);
            });
        });

        doc.autoTable({
            head: [['Aqua Order #', 'Customer PO', 'IFS Order #', 'Order Description', 'Qty', 'Delivery Date']],
            body: tableData,
            startY: 20,
        });

        doc.save(`production_schedule_${selectedWeek}.pdf`);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                 <button className="btn btn-secondary" onClick={handleExportPDF} disabled={!selectedWeek || isCustomer}>Export to PDF</button>
                <div className="col-md-4">
                    <select className="form-select" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                        <option value="">Select Delivery Week...</option>
                        {deliveryWeeks.map(week => <option key={week} value={week}>{week}</option>)}
                    </select>
                </div>
            </div>
            {selectedWeek ? (
                <>
                    <div className="table-responsive">
                        <table className="table table-sm table-hover table-bordered">
                            <thead>
                                <tr>
                                    <th>Aqua Order #</th>
                                    <th>Customer PO</th>
                                    <th>IFS Order #</th>
                                    <th>Order Description</th>
                                    <th>Qty</th>
                                    <th>Delivery Date</th>
                                    <th style={{width: '200px'}}>Production Status</th>
                                </tr>
                            </thead>
                            {Object.keys(ordersByCustomer).sort().map(customerName => (
                                <tbody key={customerName}>
                                    <tr className="table-light">
                                        <th colSpan="7" className="ps-2">{customerName}</th>
                                    </tr>
                                    {ordersByCustomer[customerName].map(order => (
                                        <tr key={order.id}>
                                            <td>{order.aquaOrderNumber}</td>
                                            <td>{order.customerPO}</td>
                                            <td>{order.ifsOrderNo}</td>
                                            <td>{`${order.productName} - ${order.material} - ${order.size}`}</td>
                                            <td>{order.quantity}</td>
                                            <td>{order.deliveryDate}</td>
                                            <td>
                                                <select 
                                                    className="form-select form-select-sm"
                                                    value={order.statusId || ''}
                                                    onChange={(e) => handleStatusChange(order, e.target.value)} 
                                                    disabled={isCustomer}>
                                                    <option value="" disabled>{order.status || 'Change...'}</option>
                                                    {getValidStatuses(order).map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             ))}
                        </table>
                    </div>
                    
                    <hr className="my-4" />

                    <div id="shipped-orders-accordion">
                        <div className="accordion-item">
                            <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#shipped-orders-collapse">Shipped Orders ({shippedOrders.length})</button></h2>
                            <div id="shipped-orders-collapse" className="accordion-collapse collapse">
                                <div className="accordion-body p-0">
                                     <div className="table-responsive"><table className="table table-sm table-hover mb-0">
                                        <thead><tr><th>Aqua Order #</th><th>Customer PO</th><th>Customer</th><th>Order Description</th><th>Qty</th><th>Delivery Date</th></tr></thead>
                                        <tbody>{shippedOrders.map(order => <tr key={order.id} className="table-success"><td>{order.aquaOrderNumber}</td><td>{order.customerPO}</td><td>{order.customerCompanyName}</td><td>{`${order.productName} - ${order.material} - ${order.size}`}</td><td>{order.quantity}</td><td>{order.deliveryDate}</td></tr>)}</tbody>
                                    </table></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : <p className="text-center text-muted">Please select a delivery week.</p>}

            {stoppingOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content"><div className="modal-header"><h5 className="modal-title">Temporary Stop Reason</h5><button type="button" className="btn-close" onClick={() => setStoppingOrder(null)}></button></div>
                            <form onSubmit={handleStopReasonSubmit}><div className="modal-body">
                                <p>Please provide a reason for stopping order: <strong>{stoppingOrder.order.aquaOrderNumber}</strong></p>
                                <textarea className="form-control" rows="3" value={stopReason} onChange={(e) => setStopReason(e.target.value)} required />
                            </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setStoppingOrder(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Reason</button></div></form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const OrderHistoryView = ({ user }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedOrder, setSearchedOrder] = useState(null);
    const [orderHistory, setOrderHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsLoading(true);
        setError('');
        setSearchedOrder(null);
        setOrderHistory([]);

        try {
            const constraints = [where("aquaOrderNumber", "==", searchQuery)];
            if (user.role === 'customer') {
                constraints.push(where("customerCompanyName", "==", user.customerCompanyName));
            }
            const orderQuery = query(collection(db, "orders"), ...constraints);
            
            const querySnapshot = await getDocs(orderQuery);
            if (querySnapshot.empty) {
                setError("Order not found or you do not have permission to view it.");
            } else {
                const orderDoc = querySnapshot.docs[0];
                setSearchedOrder({ id: orderDoc.id, ...orderDoc.data() });
                
                const historyQuery = query(collection(db, "orders", orderDoc.id, "statusHistory"), orderBy("timestamp", "desc"));
                onSnapshot(historyQuery, (historySnap) => {
                    setOrderHistory(historySnap.docs.map(d => d.data()));
                });
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while searching.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="row g-3 justify-content-center mb-4">
                <div className="col-md-5">
                    <input type="text" className="form-control" placeholder="Enter Aqua Order Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="col-auto">
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Searching...' : 'Search'}</button>
                </div>
            </form>
            {error && <div className="alert alert-danger">{error}</div>}
            {searchedOrder && (
                <div className="card">
                    <div className="card-header"><h5 className="mb-0">History for Order: {searchedOrder.aquaOrderNumber}</h5></div>
                    <div className="card-body">
                        <p><strong>Customer:</strong> {searchedOrder.customerCompanyName}</p>
                        <p><strong>Product:</strong> {`${searchedOrder.productName} - ${searchedOrder.material} - ${searchedOrder.size}`}</p>
                        <table className="table table-striped">
                            <thead><tr><th>Status</th><th>Updated By</th><th>Date & Time</th><th>Reason for Stop</th></tr></thead>
                            <tbody>{orderHistory.map((h, i) => (
                                <tr key={i}>
                                    <td>{h.status}</td>
                                    <td>{h.changedBy}</td>
                                    <td>{h.timestamp?.toDate().toLocaleString() || '...'}</td>
                                    <td>{h.reason || 'N/A'}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const AllActiveOrdersView = ({ user }) => {
    const [activeOrders, setActiveOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const isCustomer = user.role === 'customer';

    useEffect(() => {
        if (!user) return;
        let q = query(collection(db, "orders"), where("status", "not-in", ["Shipped", "Cancelled"]));
        if (isCustomer) {
             if (!user.customerCompanyName) return;
            q = query(q, where("customerCompanyName", "==", user.customerCompanyName));
        }
        const unsub = onSnapshot(q, (snap) => {
            setActiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleDateUpdate = async (orderId, field, value) => {
        if(isCustomer) return;
        await updateDoc(doc(db, "orders", orderId), { [field]: value });
    };

    const groupedAndFilteredOrders = useMemo(() => {
        const filtered = activeOrders.filter(order => {
            if (!searchTerm) return true;
            const lowercasedFilter = searchTerm.toLowerCase();
            return Object.values(order).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            );
        });

        const grouped = filtered.reduce((acc, order) => {
            const customer = order.customerCompanyName || 'Unknown Customer';
            if (!acc[customer]) acc[customer] = [];
            acc[customer].push(order);
            return acc;
        }, {});
        
        for (const customer in grouped) {
            grouped[customer].sort((a,b) => (a.deliveryWeek || "").localeCompare(b.deliveryWeek || ""));
        }
        
        return grouped;
    }, [activeOrders, searchTerm]);

    if (isLoading) {
        return <div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
    }

    return (
        <div>
            <div className="d-flex justify-content-end mb-3">
                <div className="col-md-4">
                     <input
                        type="text"
                        className="form-control"
                        placeholder="Search active orders..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="table-responsive">
                <table className="table table-sm table-hover table-bordered">
                    <thead>
                        <tr>
                            <th>Aqua Order #</th>
                            <th>Customer PO</th>
                            <th>IFS Order #</th>
                            <th>Order Description</th>
                            <th>Qty</th>
                            <th style={{width: '150px'}}>Delivery Week</th>
                            <th style={{width: '170px'}}>Delivery Date</th>
                        </tr>
                    </thead>
                    {Object.keys(groupedAndFilteredOrders).sort().map(customerName => (
                        <tbody key={customerName}>
                            <tr className="table-light"><th colSpan="7" className="ps-2">{customerName}</th></tr>
                            {groupedAndFilteredOrders[customerName].map(order => (
                                <tr key={order.id}>
                                    <td>{order.aquaOrderNumber}</td>
                                    <td>{order.customerPO}</td>
                                    <td>{order.ifsOrderNo}</td>
                                    <td>{`${order.productName} - ${order.material} - ${order.size}`}</td>
                                    <td>{order.quantity}</td>
                                    <td><input type="week" defaultValue={order.deliveryWeek || ''} onBlur={(e) => handleDateUpdate(order.id, 'deliveryWeek', e.target.value)} className="form-control form-control-sm" disabled={isCustomer} /></td>
                                    <td><input type="date" defaultValue={order.deliveryDate || ''} onBlur={(e) => handleDateUpdate(order.id, 'deliveryDate', e.target.value)} className="form-control form-control-sm" disabled={isCustomer} /></td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
        </div>
    );
};

// Helper component for category selection dropdown
const CategorySelector = ({ item, selectedCustomer, subCategories, isAdmin }) => {
    if (!isAdmin) {
        return <span className="badge bg-secondary">{item.category}</span>;
    }

    const handleAssignCategory = async (itemId, newCategory) => {
        if (!selectedCustomer || !newCategory) return;
        const itemRef = doc(db, "stock", selectedCustomer, "items", itemId);
        await updateDoc(itemRef, { category: newCategory });
    };

    const groupedSubCategories = useMemo(() => {
        return subCategories.reduce((acc, cat) => {
            const main = cat.mainCategory || 'Other';
            if (!acc[main]) acc[main] = [];
            acc[main].push(cat);
            return acc;
        }, {});
    }, [subCategories]);

    return (
        <select
            className="form-select form-select-sm"
            value={item.category || ''}
            onChange={(e) => handleAssignCategory(item.id, e.target.value)}
            style={{ minWidth: '150px' }}
        >
            <option value="Unassigned">Unassigned</option>
            {Object.entries(groupedSubCategories).map(([mainCategory, subs]) => (
                <optgroup label={mainCategory} key={mainCategory}>
                    {subs.map(sc => (
                        <option key={sc.id} value={sc.name}>{sc.name}</option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
};


const CustomerStock = ({ user }) => {
    const [allStockItems, setAllStockItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [stockSubCategories, setStockSubCategories] = useState([]);
    const [lastUploadDate, setLastUploadDate] = useState(null);
    const fileInputRef = useRef(null);
    const isAdmin = user.role === 'super_admin' || user.role === 'production';

    useEffect(() => {
        if (isAdmin) {
            onSnapshot(collection(db, "customers"), snap => {
                const customerList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCustomers(customerList);
                if (!selectedCustomer && customerList.length > 0) {
                    setSelectedCustomer(customerList[0].id);
                }
            });
            onSnapshot(collection(db, "stockSubCategories"), snap => {
                setStockSubCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        }
    }, [isAdmin]);
    
    useEffect(() => {
        const customerData = customers.find(c => c.id === selectedCustomer);
        if (customerData && customerData.lastStockUpdate) {
            setLastUploadDate(customerData.lastStockUpdate.toDate().toLocaleDateString());
        } else {
            setLastUploadDate(null);
        }
    }, [selectedCustomer, customers]);

    useEffect(() => {
        if (!user) return;
        const customerId = isAdmin ? selectedCustomer : user.customerCompanyId;
        if (!customerId) {
            setAllStockItems([]);
            return;
        }

        const unsub = onSnapshot(collection(db, "stock", customerId, "items"), (snapshot) => {
            setAllStockItems(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        }, (err) => console.error("Error fetching stock data:", err));
        return () => unsub();
    }, [user, selectedCustomer, isAdmin]);
    
    const handleUpload = async () => {
        if (!selectedCustomer) {
            setError("Please select a customer first.");
            return;
        }
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }
        if (!XLSX) {
            setError("The Excel parsing library is not ready. Please try again in a moment.");
            return;
        }

        setLoading(true);
        setError("");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    setError("The selected Excel file is empty.");
                    return;
                }

                const requiredHeaders = ['PART_NO', 'DESCRIPTION', 'TOTAL_QTY'];
                const firstRow = json[0];
                for (const header of requiredHeaders) {
                    if (!(header in firstRow)) {
                        throw new Error(`Missing required column header: ${header}`);
                    }
                }

                const batch = writeBatch(db);
                const collectionRef = collection(db, "stock", selectedCustomer, "items");

                json.forEach((row) => {
                    const partNo = String(row.PART_NO).trim();
                    if (partNo) {
                        const docRef = doc(collectionRef, partNo);
                        batch.set(docRef, {
                            PART_NO: partNo,
                            DESCRIPTION: row.DESCRIPTION || '',
                            TOTAL_QTY: row.TOTAL_QTY || 0,
                            category: 'Unassigned'
                        });
                    }
                });
                
                // Also update the customer's lastStockUpdate timestamp
                const customerDocRef = doc(db, "customers", selectedCustomer);
                batch.update(customerDocRef, { lastStockUpdate: serverTimestamp() });

                await batch.commit();
                alert(`Successfully uploaded ${json.length} stock items for the selected customer.`);
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
    }, [allStockItems, stockSubCategories, searchTerm]);

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
                             <div className="col-md-5">
                                <label htmlFor="stock-file-upload" className="form-label">Upload Excel File</label>
                                <input 
                                    type="file" 
                                    id="stock-file-upload"
                                    className="form-control"
                                    ref={fileInputRef}
                                    onChange={e => setSelectedFile(e.target.files[0])}
                                    accept=".xlsx, .xls"
                                />
                                <div className="form-text">File must contain columns: PART_NO, DESCRIPTION, TOTAL_QTY.</div>
                            </div>
                            <div className="col-md-3">
                                <button onClick={handleUpload} className="btn btn-primary w-100" disabled={loading || !selectedCustomer || !selectedFile}>
                                    {loading ? 'Uploading...' : 'Upload Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="table-responsive">
                    <table className="table table-sm table-hover table-bordered">
                        <thead>
                            <tr>
                                <th>PART_NO</th>
                                <th>DESCRIPTION</th>
                                <th>TOTAL_QTY</th>
                                {isAdmin && <th>Category</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {groupedAndFilteredItems.unassigned.length > 0 && (
                                <>
                                    <tr className="table-light"><th colSpan={isAdmin ? 4 : 3}>Unassigned</th></tr>
                                    {groupedAndFilteredItems.unassigned.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.PART_NO}</td>
                                            <td>{item.DESCRIPTION}</td>
                                            <td>{item.TOTAL_QTY}</td>
                                            {isAdmin && <td><CategorySelector item={item} selectedCustomer={selectedCustomer} subCategories={stockSubCategories} isAdmin={isAdmin} /></td>}
                                        </tr>
                                    ))}
                                </>
                            )}

                            {Object.entries({ "Sail Materials": groupedAndFilteredItems["Sail Materials"], "Sail Hardware": groupedAndFilteredItems["Sail Hardware"] }).map(([mainCategory, subCategories]) => (
                                Object.keys(subCategories).length > 0 && (
                                    <React.Fragment key={mainCategory}>
                                        <tr className="table-light"><th colSpan={isAdmin ? 4 : 3}>{mainCategory}</th></tr>
                                        {Object.entries(subCategories).sort(([a],[b])=>a.localeCompare(b)).map(([subCategory, items]) => (
                                            items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.PART_NO}</td>
                                                    <td>{item.DESCRIPTION}</td>
                                                    <td>{item.TOTAL_QTY}</td>
                                                    {isAdmin && <td><CategorySelector item={item} selectedCustomer={selectedCustomer} subCategories={stockSubCategories} isAdmin={isAdmin} /></td>}
                                                </tr>
                                            ))
                                        ))}
                                    </React.Fragment>
                                )
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('users');
    return (
        <div className="card w-100">
            <div className="card-header">
                 <ul className="nav nav-tabs card-header-tabs">
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>User Management</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>Customer Profiles</button></li>
                    <li className="nav-item"><button className={`nav-link ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>System Data</button></li>
                 </ul>
            </div>
            <div className="card-body">
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'customers' && <CustomerManagementTab />}
                {activeTab === 'data' && <DataManagementTab />}
            </div>
        </div>
    );
};

const UserManagementTab = () => {
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    
    useEffect(() => { 
        onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        onSnapshot(collection(db, "customers"), (snapshot) => setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }, []);

    const handleUpdate = async (id, field, value) => {
        const updateData = { [field]: value };
        if (field === 'customerCompanyId') {
            const selectedCustomer = customers.find(c => c.id === value);
            updateData.customerCompanyName = selectedCustomer ? selectedCustomer.companyName : '';
        }
        await updateDoc(doc(db, "users", id), updateData);
    };

    return (
        <div>
            <h3 className="h5 mb-3">Manage User Roles and Status</h3>
            <div className="table-responsive"><table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Assign Customer</th></tr></thead>
                <tbody>{users.map(u => (
                    <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><select className="form-select form-select-sm" value={u.role} onChange={e => handleUpdate(u.id, 'role', e.target.value)}><option value="customer">Customer</option><option value="production">Production</option><option value="super_admin">Super Admin</option></select></td>
                        <td><select className="form-select form-select-sm" value={u.status} onChange={e => handleUpdate(u.id, 'status', e.target.value)}><option value="pending">Pending</option><option value="active">Active</option></select></td>
                        <td>
                            {u.role === 'customer' && (
                                <select className="form-select form-select-sm" value={u.customerCompanyId || ''} onChange={e => handleUpdate(u.id, 'customerCompanyId', e.target.value)}>
                                    <option value="">Not Assigned</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            )}
                        </td>
                    </tr>
                ))}</tbody>
            </table></div>
        </div>
    );
};

const CustomerManagementTab = () => {
    const [customers, setCustomers] = useState([]);
    const [editingCustomer, setEditingCustomer] = useState(null);

    useEffect(() => onSnapshot(collection(db, "customers"), snap => setCustomers(snap.docs.map(d => ({id: d.id, ...d.data()})))), []);

    const handleAdd = async (e) => { 
        e.preventDefault(); 
        const { companyName, contactName, email } = e.target.elements; 
        await addDoc(collection(db, "customers"), { 
            companyName: companyName.value, 
            contactName: contactName.value, 
            email: email.value 
        }); 
        e.target.reset(); 
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
            await deleteDoc(doc(db, "customers", id));
        }
    };
    
    const handleUpdate = async (e) => {
        e.preventDefault();
        const { companyName, contactName, email } = e.target.elements;
        await updateDoc(doc(db, "customers", editingCustomer.id), {
            companyName: companyName.value,
            contactName: contactName.value,
            email: email.value
        });
        setEditingCustomer(null);
    };

    return (
        <div>
            <h3 className="h5 mb-3">Add New Customer</h3>
            <form onSubmit={handleAdd} className="row g-3 align-items-end mb-4">
                <div className="col-sm"><input name="companyName" placeholder="Company Name" className="form-control" required /></div>
                <div className="col-sm"><input name="contactName" placeholder="Contact Name" className="form-control" /></div>
                <div className="col-sm"><input type="email" name="email" placeholder="Email" className="form-control" required /></div>
                <div className="col-sm-auto"><button type="submit" className="btn btn-primary">Add</button></div>
            </form>
            <h3 className="h5 mb-3">Existing Customers</h3>
            <div className="table-responsive">
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th>Contact Name</th>
                            <th>Email</th>
                            <th>Last Stock Update</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id}>
                                <td>{c.companyName}</td>
                                <td>{c.contactName}</td>
                                <td>{c.email}</td>
                                <td>{c.lastStockUpdate ? c.lastStockUpdate.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingCustomer(c)}>Edit</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Customer Modal */}
            {editingCustomer && (
                 <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Customer</h5>
                                <button type="button" className="btn-close" onClick={() => setEditingCustomer(null)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Company Name</label>
                                        <input name="companyName" defaultValue={editingCustomer.companyName} className="form-control" required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Contact Name</label>
                                        <input name="contactName" defaultValue={editingCustomer.contactName} className="form-control" />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Email</label>
                                        <input type="email" name="email" defaultValue={editingCustomer.email} className="form-control" required />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingCustomer(null)}>Close</button>
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

const DataManagementTab = () => {
    const [orderTypes, setOrderTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [stockSubCategories, setStockSubCategories] = useState([]);
    
    // State for forms
    const [newOrderTypeName, setNewOrderTypeName] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductOrderType, setNewProductOrderType] = useState('');
    const [newSubCategory, setNewSubCategory] = useState({ name: '', mainCategory: 'Sail Materials' });
    const [productFile, setProductFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const productFileInputRef = useRef(null);

    const [editingItem, setEditingItem] = useState(null); // { type: 'orderType' | 'product', data: { id, name, ... } }

    useEffect(() => {
        onSnapshot(collection(db, "orderTypes"), snap => setOrderTypes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.order||0)-(b.order||0))));
        onSnapshot(collection(db, "products"), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.order||0)-(b.order||0))));
        onSnapshot(collection(db, "stockSubCategories"), snap => setStockSubCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
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
    };

    const handleDelete = async (collectionName, id) => {
        if (window.confirm(`Are you sure you want to delete this item?`)) {
            await deleteDoc(doc(db, collectionName, id));
        }
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
        setNewSubCategory({ name: '', mainCategory: 'Sail Materials' });
    };

    const handleProductUpload = () => {
        if (!productFile) {
            alert("Please select a file first.");
            return;
        }
        if (!XLSX) {
            alert("Excel library is not loaded yet. Please try again in a moment.");
            return;
        }
        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

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
                        console.warn(`Skipping product "${productName}": Already exists for this order type.`);
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
                    alert(`${productsAdded} new products have been successfully uploaded.`);
                } else {
                    alert("No new products to upload. They may already exist or the file is empty.");
                }

            } catch (err) {
                console.error("Error processing Excel file:", err);
                alert("An error occurred while processing the file. Check the console for details.");
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
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete('orderTypes', item.id)}>Delete</button>
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
                                {/* Sail Products */}
                                <h6 className="mt-3">Sail Products ({categorizedProducts.sail.length})</h6>
                                <ul className="list-group">
                                    {categorizedProducts.sail.map((item) => (
                                        <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{item.name}</span>
                                            <div>
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingItem({ type: 'product', data: item })}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete('products', item.id)}>Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                 {/* Accessory Products */}
                                <h6 className="mt-4">Accessory Products ({categorizedProducts.accessory.length})</h6>
                                <ul className="list-group">
                                    {categorizedProducts.accessory.map((item) => (
                                        <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{item.name}</span>
                                            <div>
                                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setEditingItem({ type: 'product', data: item })}>Edit</button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete('products', item.id)}>Delete</button>
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
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete('stockSubCategories', cat.id)}>Delete</button>
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

             {/* Edit Modal */}
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
            alert("Description cannot be empty.");
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
            } else {
                const newOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.order || 0)) + 1 : 0;
                await addDoc(collection(db, "productionStatuses"), { ...data, order: newOrder });
            }
            resetForm();
        } catch (error) {
            console.error("Error saving production status:", error);
            alert("Failed to save status.");
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
    
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this status?")) {
            await deleteDoc(doc(db, "productionStatuses", id));
        }
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
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(status.id)}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const SettingsPage = () => {
    // ... logic same
    const [settings, setSettings] = useState({ companyName: "", welcomeMessage: "", logoUrl: "", lastSailOrder: 0, lastAccessoryOrder: 0, qcEmailSubject: "", qcEmailBody: "" });
    const docRef = doc(db, "settings", "main");
    useEffect(() => { onSnapshot(docRef, (doc) => { if (doc.exists()) setSettings(prev => ({ ...prev, ...doc.data() })); }); }, []);
    const handleChange = e => setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSave = async () => { await setDoc(docRef, { ...settings, lastSailOrder: Number(settings.lastSailOrder), lastAccessoryOrder: Number(settings.lastAccessoryOrder) }, { merge: true }); alert("Settings Saved!"); };

    return (
        <div className="card w-100">
            <div className="card-header"><h2 className="h4 mb-0">Application Settings</h2></div>
            <div className="card-body">
                <div className="row g-4">
                    <div className="col-12">
                        <h3 className="h5">General</h3>
                        <div className="row g-3">
                            <div className="col-md-6"><label className="form-label">Company Name</label><input type="text" name="companyName" value={settings.companyName} onChange={handleChange} className="form-control" /></div>
                            <div className="col-md-6"><label className="form-label">Company Logo URL</label><input type="text" name="logoUrl" value={settings.logoUrl} onChange={handleChange} className="form-control" /></div>
                            <div className="col-12"><label className="form-label">Welcome Message</label><textarea name="welcomeMessage" value={settings.welcomeMessage} onChange={handleChange} rows="3" className="form-control"></textarea></div>
                        </div>
                    </div>
                     <div className="col-12"><hr /></div>
                    <div className="col-12">
                        <h3 className="h5">Order Numbering</h3>
                        <div className="row g-3">
                            <div className="col-md-6"><label className="form-label">Last 'Sail' Order Number</label><input type="number" name="lastSailOrder" value={settings.lastSailOrder} onChange={handleChange} className="form-control" /></div>
                            <div className="col-md-6"><label className="form-label">Last 'Accessory' Order Number</label><input type="number" name="lastAccessoryOrder" value={settings.lastAccessoryOrder} onChange={handleChange} className="form-control" /></div>
                        </div>
                    </div>
                    <div className="col-12"><hr /></div>
                    <div className="col-12">
                         <h3 className="h5">Email Templates</h3>
                         <p className="form-text">Use placeholders: {`{customerName}`}, {`{customerPo}`}, {`{aquaOrderNo}`}</p>
                         <div className="row g-3 mt-1">
                             <div className="col-12"><label className="form-label">QC Photos Subject</label><input type="text" name="qcEmailSubject" value={settings.qcEmailSubject} onChange={handleChange} className="form-control" /></div>
                             <div className="col-12"><label className="form-label">QC Photos Body</label><textarea name="qcEmailBody" value={settings.qcEmailBody} onChange={handleChange} rows="6" className="form-control"></textarea></div>
                         </div>
                    </div>
                </div>
                 <div className="text-end mt-4"><button onClick={handleSave} className="btn btn-primary">Save Settings</button></div>
            </div>
        </div>
    );
};