// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { auth } from '../firebase'; // <-- Note the updated path
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile,
    sendPasswordResetEmail
} from "firebase/auth";

const HomePage = ({ onLoginSuccess, settings }) => {
    const [viewMode, setViewMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

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
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username });
            }
            onLoginSuccess();
        } catch (err) {
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
            setViewMode('login');
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

    const homeContent = settings?.homeContent || {};

    return (
        <div className="container mt-5">
            <div className="row align-items-center g-5">
                <div className="col-lg-7 text-center text-lg-start">
                    <h1 className="display-4 fw-bold lh-1 mb-3">{homeContent.title || "Welcome to the Client Portal"}</h1>
                    <p className="col-lg-10 fs-5">
                        {homeContent.subtitle || "Manage your orders, track production, and view stock levels all in one place. Access your account to get started."}
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

export default HomePage;