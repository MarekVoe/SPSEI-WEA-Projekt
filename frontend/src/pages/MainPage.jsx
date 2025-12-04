// javascript
import React, { useEffect, useState, useRef } from 'react';
import BottomMenu from "../components/BottomMenu.jsx";

function MainPage() {
    const [contacts, setContacts] = useState([]); // {id, email, first_name, last_name}
    const [existingFiles, setExistingFiles] = useState([]); // {id, name}
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [subject, setSubject] = useState('');
    const [messageHtml, setMessageHtml] = useState('');
    const [altText, setAltText] = useState('');
    const [selectedExistingFiles, setSelectedExistingFiles] = useState(new Set());
    const fileInputRef = useRef(null);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8080/api/contacts')
            .then(r => r.json())
            .then(data => setContacts(data || []))
            .catch(() => setContacts([]));

        fetch('/api/files')
            .then(r => r.json())
            .then(data => setExistingFiles(data || []))
            .catch(() => setExistingFiles([]));
    }, []);

    function handleRecipientsChange(e) {
        const values = Array.from(e.target.selectedOptions).map(o => o.value);
        setSelectedRecipients(values);
    }

    function toggleExistingFile(id) {
        setSelectedExistingFiles(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id); else s.add(id);
            return s;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('sending');

        const formData = new FormData();
        selectedRecipients.forEach(email => formData.append('recipients[]', email));
        formData.append('subject', subject);
        formData.append('message_html', messageHtml);
        if (altText) formData.append('alt_text', altText);

        const files = fileInputRef.current?.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                formData.append('attachments[]', files[i]);
            }
        }

        Array.from(selectedExistingFiles).forEach(id => formData.append('existing_attachments[]', id));

        try {
            const resp = await fetch('http://localhost:8080/api/send-email', {
                method: 'POST',
                body: formData,
            });
            if (!resp.ok) throw new Error('Chyba serveru');
            setStatus('sent');
            setSelectedRecipients([]);
            setSubject('');
            setMessageHtml('');
            setAltText('');
            setSelectedExistingFiles(new Set());
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    }

    const bottomMenuHeight = 88;

    const styles = {
        pageWrapper: {
            paddingBottom: bottomMenuHeight + 16,
            minHeight: '100vh',
            background: '#071018',
        },
        container: {
            maxWidth: 800,
            margin: '20px auto',
            fontFamily: 'sans-serif',
            background: '#0f1720',
            color: '#e6eef6',
            padding: 20,
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
            minHeight: `calc(100vh - ${bottomMenuHeight + 48}px)`,
        },
        label: { display: 'block', marginTop: 12, color: '#cfe6ff' },
        input: {
            width: '100%',
            padding: 8,
            marginTop: 6,
            background: '#0b1220',
            color: '#e6eef6',
            border: '1px solid #26323f',
            borderRadius: 4,
        },
        textarea: {
            width: '100%',
            padding: 8,
            marginTop: 6,
            background: '#0b1220',
            color: '#e6eef6',
            border: '1px solid #26323f',
            borderRadius: 4,
            resize: 'vertical',
        },
        select: {
            width: '100%',
            minHeight: 120,
            marginTop: 6,
            padding: 6,
            background: '#0b1220',
            color: '#e6eef6',
            border: '1px solid #26323f',
            borderRadius: 4,
        },
        fileBox: {
            border: '1px solid #26323f',
            padding: 8,
            marginTop: 6,
            maxHeight: 140,
            overflow: 'auto',
            background: '#071018',
            borderRadius: 4,
        },
        checkboxLabel: { display: 'block', marginBottom: 6, color: '#d6e9ff' },
        button: {
            padding: '8px 16px',
            marginTop: 8,
            background: '#2b6cb0',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
        },
        statusText: { marginTop: 12 },
        smallMuted: { color: '#97a6b5' },
    };

    return (
        <>
            <div style={styles.pageWrapper}>
                <div style={styles.container}>
                    <h2 className="mt-0 font-bold text-2xl">Odeslat email</h2>

                    <form onSubmit={handleSubmit}>
                        <label style={styles.label}>
                            Příjemci (vyberte jednoho nebo více):
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <select
                                    name="recipients[]"
                                    multiple
                                    value={selectedRecipients}
                                    onChange={handleRecipientsChange}
                                    style={{ ...styles.select, minHeight: 140, padding: 10, borderRadius: 6, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)' }}
                                >
                                    {contacts.map(c => (
                                        <option
                                            key={c.id}
                                            value={c.email}
                                            style={{ background: '#0b1220', color: '#e6eef6', padding: 6 }}
                                        >
                                            {c.first_name} {c.last_name} &lt;{c.email}&gt;
                                        </option>
                                    ))}
                                </select>

                                <div style={{ minWidth: 96, textAlign: 'center', color: '#97a6b5', padding: 8, border: '1px solid #26323f', borderRadius: 6, background: '#071018' }}>
                                    <div style={{ fontSize: 12 }}>Vybráno</div>
                                    <div style={{ fontWeight: 600, marginTop: 6 }}>{selectedRecipients.length}</div>
                                </div>
                            </div>
                        </label>

                        <label style={styles.label}>
                            Předmět:
                            <input
                                name="subject"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </label>

                        <label style={styles.label}>
                            Text zprávy (HTML povoleno):
                            <textarea
                                name="message_html"
                                value={messageHtml}
                                onChange={e => setMessageHtml(e.target.value)}
                                rows={8}
                                style={styles.textarea}
                                placeholder="<p>...</p>"
                                required
                            />
                        </label>

                        <label style={styles.label}>
                            Alternativní ne-HTML text (volitelné):
                            <textarea
                                name="alt_text"
                                value={altText}
                                onChange={e => setAltText(e.target.value)}
                                rows={3}
                                style={styles.textarea}
                                placeholder="Čistý text..."
                            />
                        </label>

                        <div style={{ marginTop: 12 }}>
                            <label style={styles.label}>
                                Nahrát přílohy (volitelné):
                                <input
                                    type="file"
                                    name="attachments[]"
                                    ref={fileInputRef}
                                    multiple
                                    style={{ display: 'block', marginTop: 6 }}
                                />
                            </label>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ color: '#cfe6ff' }}>Vybrat již nahrané soubory (volitelné):</div>
                            <div style={styles.fileBox}>
                                {existingFiles.length === 0 && <div style={styles.smallMuted}>Žádné soubory</div>}
                                {existingFiles.map(f => (
                                    <label key={f.id} style={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={selectedExistingFiles.has(f.id)}
                                            onChange={() => toggleExistingFile(f.id)}
                                            style={{ marginRight: 8 }}
                                        />
                                        {f.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <button type="submit" style={styles.button}>Odeslat</button>
                        </div>

                        <div style={styles.statusText}>
                            {status === 'sending' && <span>Odesílám...</span>}
                            {status === 'sent' && <span style={{ color: '#6ee7b7' }}>Email odeslán.</span>}
                            {status === 'error' && <span style={{ color: '#ff7b7b' }}>Chyba při odesílání.</span>}
                        </div>
                    </form>
                </div>
            </div>

            <BottomMenu />
        </>
    );
}

export default MainPage;
