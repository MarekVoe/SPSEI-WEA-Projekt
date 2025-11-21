import React, { useState, useEffect, useRef } from 'react';
import BottomMenu from "../components/BottomMenu.jsx";

function MultiSelect({ items, value, onChange, placeholder = 'Vyhledat...' }) {
    const [query, setQuery] = useState('');
    const toggle = (val) => {
        if (value.includes(val)) onChange(value.filter(v => v !== val));
        else onChange([...value, val]);
    };
    const filtered = items.filter(i => {
        const txt = `${i.firstName} ${i.lastName} ${i.email}`.toLowerCase();
        return txt.includes(query.toLowerCase());
    });
    return (
        <div className="multi-select">
            <input
                type="search"
                className="w-full p-2 mb-2 bg-gray-900 border border-gray-700 rounded-md"
                placeholder={placeholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            <div className="max-h-48 overflow-auto bg-gray-800 p-2 rounded-md border border-gray-700">
                {filtered.length === 0 && <div className="text-gray-500 text-sm p-2">Žádné výsledky</div>}
                {filtered.map(item => {
                    const val = `${item.email}|${item.id}`;
                    const checked = value.includes(val);
                    return (
                        <label key={val} className="flex items-center space-x-2 p-1 hover:bg-gray-700 rounded">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(val)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">
                                <strong>{item.firstName} {item.lastName}</strong> — <span className="text-gray-400">{item.email}</span>
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

export default function MainPage() {
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const filesRef = useRef(null);
    const fromEmailRef = useRef(null);
    const fromNameRef = useRef(null);
    const subjectRef = useRef(null);
    const editorRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoadingContacts(true);
            try {
                const res = await fetch('http://localhost:8080/api/contacts', { credentials: 'include' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (mounted) setContacts(data);
            } catch (e) {
                console.error('Failed to load contacts', e);
            } finally {
                if (mounted) setLoadingContacts(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    /* malé toolbar tlačítka pro contentEditable */
    const exec = (cmd, value = null) => {
        document.execCommand(cmd, false, value);
        editorRef.current && editorRef.current.focus();
    };

    const getEditorHtml = () => editorRef.current ? editorRef.current.innerHTML : '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatusMessage(null);
        setSubmitting(true);
        try {
            const fromEmail = fromEmailRef.current?.value?.trim() || '';
            const fromName = fromNameRef.current?.value?.trim() || '';
            const subject = subjectRef.current?.value?.trim() || '';
            const bodyHtml = getEditorHtml();
            const bodyText = bodyHtml ? bodyHtml.replace(/<[^>]+>/g, '') : '';

            if (!fromEmail) {
                setStatusMessage('Vyplňte pole Odesílatel (email).');
                setSubmitting(false);
                return;
            }
            if (selectedRecipients.length === 0) {
                setStatusMessage('Vyberte alespoň jednoho příjemce.');
                setSubmitting(false);
                return;
            }

            const form = new FormData();
            form.append('from_email', fromEmail);
            form.append('from_name', fromName);
            form.append('subject', subject);
            form.append('body_html', bodyHtml);
            form.append('body_text', bodyText);

            for (const r of selectedRecipients) form.append('recipients[]', r);

            const files = filesRef.current?.files;
            if (files && files.length) {
                for (let i = 0; i < files.length; i++) {
                    form.append('attachments[]', files[i], files[i].name);
                }
            }

            const res = await fetch('http://localhost:8080/api/send-email', {
                method: 'POST',
                body: form,
                credentials: 'include',
            });

            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || `HTTP ${res.status}`);
            }
            const body = await res.json();
            setStatusMessage('Email odeslán (id: ' + (body.emailId ?? 'neznámé') + ').');

            // clear
            subjectRef.current.value = '';
            if (filesRef.current) filesRef.current.value = '';
            setSelectedRecipients([]);
            if (editorRef.current) editorRef.current.innerHTML = '';
        } catch (err) {
            console.error('Send failed', err);
            setStatusMessage('Odeslání selhalo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-white p-6 sm:p-10">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-extrabold mb-6">Odeslat Email</h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Odesílatel - jméno</label>
                            <input ref={fromNameRef} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-md" placeholder="Firma / Jméno" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Odesílatel - email *</label>
                            <input ref={fromEmailRef} type="email" required className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-md" placeholder="no-reply@example.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Příjemci * (více)</label>
                        <MultiSelect
                            items={contacts}
                            value={selectedRecipients}
                            onChange={setSelectedRecipients}
                            placeholder={loadingContacts ? 'Načítám...' : 'Vyhledat příjemce...'}
                        />
                        {loadingContacts && <p className="text-gray-400 text-sm mt-2">Načítám kontakty...</p>}
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Předmět</label>
                        <input ref={subjectRef} className="w-full p-2.5 bg-gray-900 border border-gray-700 rounded-md" placeholder="Předmět emailu" />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Text zprávy (HTML)</label>

                        <div className="mb-2 space-x-2">
                            <button type="button" onClick={() => exec('bold')} className="px-2 py-1 bg-gray-700 rounded">B</button>
                            <button type="button" onClick={() => exec('italic')} className="px-2 py-1 bg-gray-700 rounded">I</button>
                            <button type="button" onClick={() => exec('underline')} className="px-2 py-1 bg-gray-700 rounded">U</button>
                            <button type="button" onClick={() => {
                                const url = prompt('Vložte URL:');
                                if (url) exec('createLink', url);
                            }} className="px-2 py-1 bg-gray-700 rounded">Link</button>
                        </div>

                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="min-h-40 p-3 bg-gray-900 border border-gray-700 rounded-md"
                            style={{ minHeight: 200 }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Přílohy (z počítače) — více</label>
                        <input ref={filesRef} type="file" name="attachments[]" multiple className="w-full text-sm text-gray-300" />
                        <p className="text-gray-500 text-xs mt-1">Pole musí mít jméno `attachments[]` aby backend rozpoznal více souborů.</p>
                    </div>

                    <div className="flex items-center justify-between">
                        <button type="submit" disabled={submitting} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-md">
                            {submitting ? 'Odesílám...' : 'Odeslat Email'}
                        </button>
                        <div className="text-sm text-gray-300">{statusMessage}</div>
                    </div>
                </form>
            </div>

            <BottomMenu/>
        </div>
    );
}
