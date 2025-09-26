// src/components/admin/breakdown/MachineManagement.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const MachineManagement = () => {
    const [machines, setMachines] = useState([]);
    const [machineName, setMachineName] = useState('');
    const [description, setDescription] = useState('');
    const [editingMachine, setEditingMachine] = useState(null);

    const machinesCollectionRef = collection(db, 'machines');

    const fetchMachines = async () => {
        const data = await getDocs(machinesCollectionRef);
        setMachines(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!machineName) {
            return toast.error('Machine name is required.');
        }

        if (editingMachine) {
            const machineDoc = doc(db, 'machines', editingMachine.id);
            await updateDoc(machineDoc, { name: machineName, description });
            toast.success('Machine updated successfully!');
            setEditingMachine(null);
        } else {
            await addDoc(machinesCollectionRef, { name: machineName, description });
            toast.success('Machine added successfully!');
        }

        setMachineName('');
        setDescription('');
        fetchMachines();
    };

    const handleEdit = (machine) => {
        setEditingMachine(machine);
        setMachineName(machine.name);
        setDescription(machine.description);
    };

    const handleDelete = async (id) => {
        const machineDoc = doc(db, 'machines', id);
        await deleteDoc(machineDoc);
        toast.success('Machine deleted successfully!');
        fetchMachines();
    };

    const cancelEdit = () => {
        setEditingMachine(null);
        setMachineName('');
        setDescription('');
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="mb-3">
                    <label htmlFor="machineName" className="form-label">Machine Name</label>
                    <input
                        type="text"
                        className="form-control"
                        id="machineName"
                        value={machineName}
                        onChange={(e) => setMachineName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <input
                        type="text"
                        className="form-control"
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn btn-primary me-2">
                    {editingMachine ? 'Update' : 'Add'} Machine
                </button>
                {editingMachine && (
                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </form>

            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {machines.map((machine) => (
                        <tr key={machine.id}>
                            <td>{machine.name}</td>
                            <td>{machine.description}</td>
                            <td>
                                <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(machine)}>
                                    Edit
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(machine.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MachineManagement;