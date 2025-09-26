// src/pages/MachineBreakdownPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';
import { formatDistanceStrict } from 'date-fns';

const MachineBreakdownPage = ({ user }) => {
    const [machines, setMachines] = useState([]);
    const [reasons, setReasons] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [breakdowns, setBreakdowns] = useState([]);
    const [filteredBreakdowns, setFilteredBreakdowns] = useState([]);

    const [selectedMachine, setSelectedMachine] = useState(null);
    const [selectedReason, setSelectedReason] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);

    useEffect(() => {
        const fetchData = async () => {
            const machinesData = await getDocs(collection(db, 'machines'));
            setMachines(machinesData.docs.map(doc => ({ value: doc.id, label: doc.data().name })));

            const reasonsData = await getDocs(collection(db, 'breakdownReasons'));
            setReasons(reasonsData.docs.map(doc => ({ value: doc.id, label: `${doc.data().code} - ${doc.data().reason}` })));

            const employeesData = await getDocs(collection(db, 'employees'));
            setEmployees(employeesData.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
        };
        fetchData();

        const unsubscribe = onSnapshot(collection(db, 'machineBreakdowns'), (snapshot) => {
            const breakdownsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setBreakdowns(breakdownsData);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = breakdowns;

        if (searchQuery) {
            filtered = filtered.filter(b =>
                b.machineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.reasonText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        const [startDate, endDate] = dateRange;
        if (startDate && endDate) {
            filtered = filtered.filter(b => {
                const eventStartTime = b.startTime.toDate();
                return eventStartTime >= startDate && eventStartTime <= endDate;
            });
        }

        setFilteredBreakdowns(filtered);
    }, [searchQuery, dateRange, breakdowns]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMachine || !selectedReason || !selectedEmployee || !startDate || !endDate) {
            return toast.error('Please fill out all fields.');
        }

        if (endDate < startDate) {
            return toast.error('End date cannot be before start date.');
        }

        try {
            await addDoc(collection(db, 'machineBreakdowns'), {
                machineId: selectedMachine.value,
                machineName: selectedMachine.label,
                reasonId: selectedReason.value,
                reasonText: selectedReason.label,
                employeeId: selectedEmployee.value,
                employeeName: selectedEmployee.label,
                startTime: startDate,
                endTime: endDate,
                createdAt: serverTimestamp(),
            });

            toast.success('Breakdown recorded successfully!');
            setSelectedMachine(null);
            setSelectedReason(null);
            setSelectedEmployee(null);
            setStartDate(new Date());
            setEndDate(new Date());
        } catch (error) {
            toast.error('Failed to record breakdown.');
            console.error("Error adding document: ", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this record?")) {
            await deleteDoc(doc(db, "machineBreakdowns", id));
            toast.success("Record deleted successfully!");
        }
    };

    const isSuperAdmin = useMemo(() => user && user.role === 'super_admin', [user]);

    return (
        <div>
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="card-title">Log New Machine Breakdown</h5>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Machine Name</label>
                                <Select options={machines} value={selectedMachine} onChange={setSelectedMachine} isClearable />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Breakdown Reason</label>
                                <Select options={reasons} value={selectedReason} onChange={setSelectedReason} isClearable />
                            </div>
                        </div>
                        <div className="row">
                        <div className="col-md-4 mb-3">
                                <label className="form-label">Operator Name</label>
                                <Select options={employees} value={selectedEmployee} onChange={setSelectedEmployee} isClearable />
                            </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label">Start Date & Time</label>
                            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMMM d, yyyy h:mm aa" className="form-control" />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label">End Date & Time</label>
                            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMMM d, yyyy h:mm aa" className="form-control" />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">Save Breakdown</button>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h5 className="card-title">Breakdown Report</h5>
                </div>
                <div className="card-body">
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by machine, reason, or operator..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6">
                            <DatePicker
                                selectsRange
                                startDate={dateRange[0]}
                                endDate={dateRange[1]}
                                onChange={(update) => setDateRange(update)}
                                isClearable={true}
                                placeholderText="Filter by date range"
                                className="form-control"
                            />
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Machine</th>
                                    <th>Reason</th>
                                    <th>Operator</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Duration</th>
                                    {isSuperAdmin && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBreakdowns.map((b) => (
                                    <tr key={b.id}>
                                        <td>{b.machineName}</td>
                                        <td>{b.reasonText}</td>
                                        <td>{b.employeeName}</td>
                                        <td>{new Date(b.startTime.seconds * 1000).toLocaleString()}</td>
                                        <td>{new Date(b.endTime.seconds * 1000).toLocaleString()}</td>
                                        <td>{formatDistanceStrict(new Date(b.endTime.seconds * 1000), new Date(b.startTime.seconds * 1000))}</td>
                                        {isSuperAdmin && (
                                            <td>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>Delete</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineBreakdownPage;