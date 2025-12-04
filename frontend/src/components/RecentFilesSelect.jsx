import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function RecentFilesSelect({ onChange, max = 20 }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetch(`http://localhost:8080/api/files/recent?limit=${max}`, { credentials: 'same-origin' })
            .then(res => {
                if (!res.ok) throw new Error('Chyba při načítání souborů');
                return res.json();
            })
            .then(data => {
                if (!mounted) return;
                setFiles(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error(err);
                if (mounted) setFiles([]);
            })
            .finally(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [max]);

    const options = files.map(f => ({
        value: f.id,
        label: `${f.original_name} (${Math.round((f.size||0)/1024)} KB)`,
        meta: f
    }));

    return (
        <div className="mb-4">
            <label className="block mb-1 text-white">Poslední nahrané soubory</label>
            {loading ? (
                <div className="p-2 text-white">Načítám soubory…</div>
            ) : (
                <Select
                    isMulti
                    options={options}
                    onChange={(val) => onChange(val ? val.map(v => v.value) : [])}
                    placeholder="Vyberte soubory pro připojení..."
                    classNamePrefix="react-select"
                />
            )}
        </div>
    );
}
