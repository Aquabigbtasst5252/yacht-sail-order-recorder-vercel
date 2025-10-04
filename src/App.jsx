import React, { useState, useEffect, useMemo } from 'react';
import "react-datepicker/dist/react-datepicker.css";
import { Toaster } from 'react-hot-toast';

// --- Firebase & Helper Imports ---
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { loadScript } from './helpers';

// --- Component Imports ---
import PublicHeader from './components/PublicHeader';
import PublicFooter from './components/PublicFooter';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import ContactPage from './pages/ContactPage';
import PendingAccessScreen from './pages/PendingAccessScreen';
import DashboardHeader from './components/DashboardHeader';
import Dashboard from './pages/Dashboard';
import NewOrderForm from './pages/NewOrderForm';
import OrderList from './pages/OrderList';
import ProductionPage from './pages/ProductionPage';
import CustomerStock from './pages/CustomerStock';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPanel from './pages/AdminPanel';
import LostTimeTrackingPage from './pages/LostTimeTrackingPage';
import ComprehensiveReport from './pages/ComprehensiveReport'; // New Report Page

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
        loadScript("https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js")
            .catch(err => console.error("Failed to load XLSX script:", err));
        
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
        const unsubSettings = onSnapshot(doc(db, "settings", "main"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
            }
        });
        return () => unsubSettings();
    }, []);

    useEffect(() => {
        let unsubUserData;
        if (user) {
            unsubUserData = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
                const data = userDoc.data();
                setUserData(data);
                setLoading(false);
            }, () => setLoading(false));
        } else {
            setLoading(false);
        }
       
        return () => {
            if (unsubUserData) unsubUserData();
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
                'about': <AboutPage settings={settings} />,
                'services': <ServicesPage settings={settings} />,
                'contact': <ContactPage settings={settings} />,
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
                    case 'order-list': return <OrderList user={userData} settings={settings} />;
                    case 'planning': return <ProductionPage user={userData} />;
                    case 'stock': return <CustomerStock user={userData} />;
                    case 'reports': return (isAdmin || isProduction) ? <ReportsPage onNavigate={handleNavigation} /> : <Dashboard user={userData} />;
                    case 'comprehensive-report': return (isAdmin || isProduction) ? <ComprehensiveReport /> : <Dashboard user={userData} />;
                    case 'lost-time-tracking': return (isAdmin || isProduction) ? <LostTimeTrackingPage user={userData} /> : <Dashboard user={userData} />;
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
    
    return (
        <>
            <Toaster 
                position="top-center"
                reverseOrder={false}
            />
            <PageContent />
        </>
    );
}

