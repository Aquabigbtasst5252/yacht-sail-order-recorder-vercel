// src/components/admin/breakdown/EmployeeManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [employeeName, setEmployeeName] = useState('');
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [section, setSection] = useState('Sticking'); // Add state for section
    const [editingEmployee, setEditingEmployee] = useState(null);

    const employeesCollectionRef = collection(db, 'employees');

    const fetchEmployees = useCallback(async () => {
        const data = await getDocs(employeesCollectionRef);
        setEmployees(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    }, [employeesCollectionRef]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employeeName || !employeeNumber) {
            return toast.error('All fields are required.');
        }

        const employeeData = { name: employeeName, number: employeeNumber, section };

        if (editingEmployee) {
            const employeeDoc = doc(db, 'employees', editingEmployee.id);
            await updateDoc(employeeDoc, employeeData);
            toast.success('Employee updated successfully!');
            setEditingEmployee(null);
        } else {
            await addDoc(employeesCollectionRef, employeeData);
            toast.success('Employee added successfully!');
        }

        setEmployeeName('');
        setEmployeeNumber('');
        setSection('Sticking');
        fetchEmployees();
    };

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setEmployeeName(employee.name);
        setEmployeeNumber(employee.number);
        setSection(employee.section || 'Sticking'); // Set section for editing
    };

    const handleDelete = async (id) => {
        const employeeDoc = doc(db, 'employees', id);
        await deleteDoc(employeeDoc);
        toast.success('Employee deleted successfully!');
        fetchEmployees();
    };

    const cancelEdit = () => {
        setEditingEmployee(null);
        setEmployeeName('');
        setEmployeeNumber('');
        setSection('Sticking');
    };

    // Group employees by section
    const groupedEmployees = employees.reduce((acc, employee) => {
        const section = employee.section || 'Uncategorized';
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(employee);
        return acc;
    }, {});

    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="mb-3">
                    <label htmlFor="employeeName" className="form-label">Employee Name</label>
                    <input
                        type="text"
                        className="form-control"
                        id="employeeName"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="employeeNumber" className="form-label">Employee Number</label>
                    <input
                        type="text"
                        className="form-control"
                        id="employeeNumber"
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="section" className="form-label">Section</label>
                    <select
                        className="form-control"
                        id="section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                    >
                        <option value="Sticking">Sticking</option>
                        <option value="Sewing">Sewing</option>
                        <option value="End Control">End Control</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary me-2">
                    {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
                {editingEmployee && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </form>

            {Object.entries(groupedEmployees).map(([section, sectionEmployees]) => (
                <div key={section} className="mb-4">
                    <h4 className="border-bottom pb-2 mb-3">{section}</h4>
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Number</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sectionEmployees.map((employee) => (
                                <tr key={employee.id}>
                                    <td>{employee.name}</td>
                                    <td>{employee.number}</td>
                                    <td>
                                        <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(employee)}>
                                            Edit
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(employee.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default EmployeeManagement;