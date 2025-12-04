import React, { useState, useEffect } from 'react';
import BottomMenu from "../components/BottomMenu.jsx";

const ContactCard = ({ contact, onDelete }) => (
    <div className="bg-zinc-800 p-4 rounded-lg shadow-lg flex justify-between items-center transition duration-300 hover:bg-zinc-700 border border-zinc-700">
        <div className="contact-info">
            <h3 className="text-xl font-semibold text-white-400">
                {contact.firstName} {contact.lastName}
            </h3>
            <p className="text-gray-400 text-sm">{contact.email}</p>
        </div>

        <button
            className="bg-red-700 hover:bg-red-600 cursor-pointer text-white font-bold py-2 px-3 rounded-full transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            onClick={() => onDelete(contact.id)}
            aria-label={`Odstranit kontakt ${contact.firstName} ${contact.lastName}`}
        >
            🗑️
        </button>
    </div>
);

const AddContactForm = ({ onAdd, onCancel }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstName || !lastName || !email) return;
        setSubmitting(true);
        try {
            await onAdd({ firstName, lastName, email });
            setFirstName(''); setLastName(''); setEmail('');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="bg-zinc-800 p-6 rounded-lg shadow-2xl border border-zinc-700" onSubmit={handleSubmit}>
            <h3 className="text-2xl font-bold mb-6 text-white-400">Přidat nový kontakt</h3>

            <div className="space-y-4">
                <div className="form-group">
                    <label htmlFor="firstName" className="block text-white text-sm font-medium mb-1">Jméno:</label>
                    <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:ring-zinc-500 focus:border-zinc-500"
                        placeholder="Jan"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="lastName" className="block text-white text-sm font-medium mb-1">Příjmení:</label>
                    <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:ring-zinc-500 focus:border-zinc-500"
                        placeholder="Novák"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email" className="block text-white text-sm font-medium mb-1">Email:</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:ring-zinc-500 focus:border-zinc-50"
                        placeholder="jan.novak@example.com"
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
                <button
                    type="button"
                    className="bg-red-600 hover:bg-red-500 cursor-pointer text-white font-semibold py-2 px-4 rounded-lg transition duration-150"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Zrušit
                </button>
                <button type="submit" className="bg-green-700 cursor-pointer hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition duration-150" disabled={submitting}>
                    {submitting ? 'Ukládám...' : 'Uložit'}
                </button>
            </div>
        </form>
    );
};

const ContactPage = () => {
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('http://localhost:8080/api/contacts', { credentials: 'same-origin' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (mounted) setContacts(data);
            } catch (e) {
                console.error('Failed to load contacts', e);
                if (mounted) setError('Nepodařilo se načíst kontakty.');
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const handleAddContact = async (newContactData) => {
        setError(null);
        try {
            const res = await fetch('http://localhost:8080/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: newContactData.firstName,
                    lastName: newContactData.lastName,
                    email: newContactData.email
                }),
                credentials: 'same-origin'
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || `HTTP ${res.status}`);
            }
            const body = await res.json();
            const id = body.id ?? null;
            const created = { ...newContactData, id };
            setContacts(prev => [...prev, created]);
            setShowForm(false);
            console.log('Kontakt uložen', created);
        } catch (e) {
            console.error('Add contact failed', e);
            setError('Nepodařilo se uložit kontakt.');
        }
    };

    const handleDeleteContact = async (id) => {
        setError(null);
        try {
            const res = await fetch(`http://localhost:8080/api/contacts/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || `HTTP ${res.status}`);
            }
            setContacts(prev => prev.filter(c => c.id !== id));
            console.log(`Kontakt ${id} smazán`);
        } catch (e) {
            console.error('Delete failed', e);
            setError('Nepodařilo se odstranit kontakt.');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white p-6 sm:p-10">
            <div className="max-w-4xl mx-auto">

                <h1 className="text-4xl font-extrabold mb-8 text-white">
                    Správa Kontaktů
                </h1>

                {!showForm && (
                    <button
                        className="bg-zinc-800 hover:bg-zinc-600 cursor-pointer text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-150 focus:outline-none focus:ring-4 focus:ring-zinc-500 focus:ring-opacity-50 mb-8"
                        onClick={() => setShowForm(true)}
                    >
                        Přidat Kontakt
                    </button>
                )}

                {showForm && (
                    <div className="mb-8">
                        <AddContactForm
                            onAdd={handleAddContact}
                            onCancel={() => setShowForm(false)}
                        />
                    </div>
                )}

                <hr className="border-gray-700 mb-8" />

                <h2 className="text-3xl font-bold mb-6 text-gray-300">
                    Seznam kontaktů
                </h2>

                {error && <p className="text-red-400 mb-4">{error}</p>}

                {isLoading ? (
                    <p className="text-gray-500">Načítám kontakty...</p>
                ) : contacts.length === 0 ? (
                    <p className="text-gray-500">Zatím zde nejsou žádné kontakty.</p>
                ) : (
                    <div className="space-y-4">
                        {contacts.map(contact => (
                            <ContactCard
                                key={contact.id}
                                contact={contact}
                                onDelete={handleDeleteContact}
                            />
                        ))}
                    </div>
                )}
            </div>
            <BottomMenu/>
        </div>
    );
};

export default ContactPage;