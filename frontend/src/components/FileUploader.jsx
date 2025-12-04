// javascript
import React, { useEffect, useRef, useState } from "react";

export default function FileUploader({
                                         multiple = true,
                                         accept = "*/*",
                                         maxFiles = null,
                                         showPreview = true,
                                         onChange = () => {},
                                     }) {
    const inputRef = useRef(null);
    const [items, setItems] = useState([]);
    const itemsRef = useRef(items);

    // udržujeme ref na aktuální položky pro cleanup při unmountu
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Volat onChange pouze při změně items (nezávisle na identitě onChange)
    useEffect(() => {
        onChange(items.map((i) => i.file));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    // při unmountu zrušíme všechna vytvořená preview URL
    useEffect(() => {
        return () => {
            itemsRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
        };
    }, []);

    const addFiles = (fileList) => {
        const arr = Array.from(fileList || []);
        if (!multiple && arr.length > 1) arr.splice(1);
        if (maxFiles !== null) {
            const allowed = Math.max(0, maxFiles - items.length);
            if (allowed <= 0) return;
            if (arr.length > allowed) arr.splice(allowed);
        }
        const next = arr.map((f, idx) => ({
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}_${idx}`,
            file: f,
            name: f.name,
            size: f.size,
            preview: showPreview && f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        }));
        setItems((prev) => (multiple ? [...prev, ...next] : [...next]));
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.files?.length) {
            addFiles(e.dataTransfer.files);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onSelect = (e) => {
        if (e.target.files?.length) {
            addFiles(e.target.files);
            // vyčistit input, aby šlo vybrat stejné soubory znovu
            e.target.value = "";
        }
    };

    const removeItem = (id) => {
        setItems((prev) => {
            const found = prev.find((p) => p.id === id);
            if (found?.preview) URL.revokeObjectURL(found.preview);
            return prev.filter((p) => p.id !== id);
        });
    };

    const openDialog = () => {
        inputRef.current?.click();
    };

    return (
        <div className="w-full max-w-3xl">
            <label className="block text-sm font-medium mb-2 text-white">Přiložit soubory</label>

            <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                className="relative border-2 border-dashed border-zinc-700 rounded-lg p-5 bg-zinc-800 text-white transition-colors hover:border-zinc-600"
                aria-label="Drop zone pro soubory"
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple={multiple}
                    accept={accept}
                    onChange={onSelect}
                    className="hidden"
                />
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={openDialog}
                        className="bg-zinc-900 cursor-pointer hover:bg-zinc-700 text-white px-3 py-2 rounded-md border border-zinc-700"
                    >
                        Přidat přílohy
                    </button>
                    <div className="text-sm text-gray-300">{items.length} vybraných</div>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="text-sm text-gray-400">Žádné soubory</div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((it) => (
                            <li key={it.id} className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700">
                                <div className="flex items-center gap-3">
                                    {it.preview ? (
                                        <img src={it.preview} alt={it.name} className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center bg-zinc-900 rounded text-gray-300 text-sm">OK</div>
                                    )}
                                    <div className="truncate max-w-xs text-sm text-gray-200">
                                        {it.name} • {Math.round(it.size / 1024)} KB
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(it.id)}
                                    className="text-red-400 hover:text-red-300 ml-3 cursor-pointer"
                                >
                                    Zrušit
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
