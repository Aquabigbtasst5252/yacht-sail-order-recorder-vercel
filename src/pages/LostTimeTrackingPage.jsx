// src/pages/LostTimeTrackingPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import LostTimeEntries from '../components/production/LostTimeEntries';

const LostTimeTrackingPage = ({ user }) => {
    // Form state
    const [startDate, setStartDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [orderNumber, setOrderNumber] = useState('');
    const [orderQuantity, setOrderQuantity] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedLostTimeCode, setSelectedLostTimeCode] = useState(null);
    const [responsiblePerson, setResponsiblePerson] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [key, setKey] = useState(0);

    // Data state
    const [employees, setEmployees] = useState([]);
    const [lostTimeCodes, setLostTimeCodes] = useState([]);

    useEffect(() => {
        const fetchDropdownData = async () => {
            // Fetch employees
            const employeesCollectionRef = collection(db, 'employees');
            const empData = await getDocs(employeesCollectionRef);
            const employeeOptions = empData.docs.map(doc => ({
                value: doc.data().number,
                label: `${doc.data().name} (${doc.data().number})`,
                section: doc.data().section
            }));
            setEmployees(employeeOptions);

            // Fetch lost time codes
            const lostTimeCodesCollectionRef = collection(db, 'lostTimeCodes');
            const codeData = await getDocs(lostTimeCodesCollectionRef);
            const codeOptions = codeData.docs.map(doc => ({
                value: doc.data().code,
                label: `${doc.data().code} - ${doc.data().reason}`
            }));
            setLostTimeCodes(codeOptions);
        };

        fetchDropdownData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedLostTimeCode) {
            return toast.error('Please fill out all required fields.');
        }
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'lostTimeEntries'), {
                startDate,
                startTime,
                endDate,
                endTime,
                orderNumber,
                orderQuantity,
                epfNumber: selectedEmployee.value,
                employeeName: selectedEmployee.label.split(' (')[0],
                section: selectedEmployee.section,
                lostTimeCode: selectedLostTimeCode.value,
                lostTimeReason: selectedLostTimeCode.label,
                responsiblePerson,
                createdAt: serverTimestamp()
            });
            toast.success('Lost time entry saved successfully!');
            setKey(prevKey => prevKey + 1); // Re-mount the LostTimeEntries component
            // Reset form
            setStartDate(new Date());
            setStartTime(new Date());
            setEndDate(new Date());
            setEndTime(new Date());
            setOrderNumber('');
            setOrderQuantity('');
            setSelectedEmployee(null);
            setSelectedLostTimeCode(null);
            setResponsiblePerson('');
        } catch (error) {
            toast.error('Failed to save lost time entry. Please try again.');
            console.error("Error adding document: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="mb-0">Daily Lost Time Recording Form</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {/* Form fields remain the same */}
                        <div className="row">
                            <div className="col-md-6 border-end">
                                <p className="mb-1 fw-bold">Start</p>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Date</label>
                                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} className="form-control" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Time</label>
                                        <DatePicker selected={startTime} onChange={date => setStartTime(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="h:mm aa" className="form-control" />
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <p className="mb-1 fw-bold">End</p>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Date</label>
                                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} className="form-control" />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Time</label>
                                        <DatePicker selected={endTime} onChange={date => setEndTime(date)} showTimeSelect showTimeSelectOnly timeIntervals={15} timeCaption="Time" dateFormat="h:mm aa" className="form-control" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Order Number</label>
                            <input type="text" className="form-control" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Order Quantity</label>
                            <input type="number" className="form-control" value={orderQuantity} onChange={e => setOrderQuantity(e.target.value)} />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">EPF Number (Employee)</label>
                            <Select options={employees} value={selectedEmployee} onChange={setSelectedEmployee} isClearable isSearchable placeholder="Search by name or EPF number..." />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Lost Time Code</label>
                             <Select options={lostTimeCodes} value={selectedLostTimeCode} onChange={setSelectedLostTimeCode} isClearable placeholder="Select a lost time code..." />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Signature of Responsible Person</label>
                        <input type="text" className="form-control" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)} />
                    </div>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Entry'}
                        </button>
                    </form>
                </div>
            </div>

            <LostTimeEntries key={key} user={user} />
        </>
    );
};

export default LostTimeTrackingPage;