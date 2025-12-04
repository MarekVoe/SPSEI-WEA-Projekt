// javascript
import React, { useEffect, useState, useMemo, useRef } from "react";
import Select from "react-select";
import { Switch } from "@headlessui/react";
import FileUploader from "./FileUploader.jsx";

function EmailForm() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [subject, setSubject] = useState("");
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [body, setBody] = useState("");
    const [isHtml, setIsHtml] = useState(false);
    const [sending, setSending] = useState(false);

    const [attachments, setAttachments] = useState([]); // File[]
    const [uploaderKey, setUploaderKey] = useState(0); // pro přemountování FileUploader
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }
    const toastTimeoutRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetch("http://localhost:8080/api/contacts", { credentials: "same-origin" })
            .then((res) => {
                if (!res.ok) throw new Error("Chyba při načítání kontaktů");
                return res.json();
            })
            .then((data) => {
                if (!mounted) return;
                setContacts(Array.isArray(data) ? data : []);
            })
            .catch((err) => {
                if (!mounted) return;
                setError(err.message || "Neznámá chyba");
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const options = useMemo(
        () =>
            contacts.map((c) => {
                const value = c.email ?? c.id ?? "";
                const name =
                    (c.firstName || c.lastName
                            ? `${(c.firstName || "").trim()} ${(c.lastName || "").trim()}`
                            : c.name || c.fullName || ""
                    ).trim();
                const label = name ? `${name} <${c.email ?? c.id}>` : `${c.email ?? c.id}`;
                return { value, label, meta: c };
            }),
        [contacts]
    );

    const customStyles = {
        control: (provided, state) => ({
            ...provided,
            background: "#18181B",
            borderColor: state.isFocused ? "#71717a" : "#3f3f46",
            boxShadow: "none",
            color: "#fff",
            minHeight: "44px",
        }),
        menu: (provided) => ({
            ...provided,
            background: "#18181B",
            color: "#fff",
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(2,6,23,0.6)",
            overflow: "hidden",
        }),
        menuList: (provided) => ({
            ...provided,
            background: "#18181B",
            color: "#fff",
            paddingTop: 0,
            paddingBottom: 0,
            maxHeight: 200,
        }),
        option: (provided, state) => ({
            ...provided,
            background: state.isSelected ? "#18181B" : state.isFocused ? "#121212" : "#18181B",
            color: "#fff",
            padding: "10px 12px",
            cursor: "pointer",
        }),
        singleValue: (provided) => ({ ...provided, color: "#fff" }),
        input: (provided) => ({ ...provided, color: "#fff" }),
        placeholder: (provided) => ({ ...provided, color: "#9ca3af" }),
        multiValue: (provided) => ({
            ...provided,
            background: "#26272b",
            borderRadius: 6,
            color: "#fff",
        }),
        multiValueLabel: (provided) => ({ ...provided, color: "#fff", padding: "2px 6px" }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: "#e5e7eb",
            background: "transparent",
            borderRadius: 6,
            ":hover": { background: "#ef4444", color: "#fff" },
        }),
        indicatorsContainer: (provided) => ({ ...provided, color: "#fff" }),
        dropdownIndicator: (provided) => ({ ...provided, color: "#9ca3af" }),
        clearIndicator: (provided) => ({ ...provided, color: "#9ca3af" }),
        noOptionsMessage: (provided) => ({ ...provided, color: "#9ca3af", padding: 12 }),
    };

    function showToast(type, message) {
        setToast({ type, message });
        if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimeoutRef.current = null;
        }, 4000);
    }

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                window.clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    // přijímá pole souborů od FileUploader (nebo přímo)
    function handleFilesChange(files) {
        // očekáváme Array nebo FileList
        if (!files) {
            setAttachments([]);
            return;
        }
        if (Array.isArray(files)) {
            setAttachments(files);
        } else if (files instanceof FileList) {
            setAttachments(Array.from(files));
        } else {
            setAttachments([files]);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (sending) return;
        setSending(true);

        // pokud máme přílohy, pošleme multipart/form-data
        const hasAttachments = attachments && attachments.length > 0;

        try {
            let res;
            if (hasAttachments) {
                const formData = new FormData();
                formData.append('subject', subject);
                selectedRecipients.forEach(r => formData.append('recipients[]', r.value));
                formData.append('body', body);
                formData.append('isHtml', isHtml ? '1' : '0');

                attachments.forEach((file) => {
                    formData.append('attachments[]', file, file.name);
                });

                res = await fetch("http://localhost:8080/api/send-email", {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData,
                });
            } else {
                // bez příloh — lze poslat jako JSON
                const payload = {
                    subject,
                    recipients: selectedRecipients.map((o) => o.value),
                    body,
                    isHtml,
                };

                res = await fetch("http://localhost:8080/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                const data = await res.json().catch(() => null);
                showToast("success", data?.message ?? "Email byl odeslán úspěšně.");
                setSubject("");
                setSelectedRecipients([]);
                setBody("");
                setIsHtml(false);
                // vymazat přílohy a přemountovat FileUploader, aby se vyčistil interní input
                setAttachments([]);
                setUploaderKey(k => k + 1);
            } else {
                let errMsg = `Chyba: HTTP ${res.status}`;
                const data = await res.json().catch(() => null);
                if (data?.error) errMsg = data.error;
                if (data?.message) errMsg = data.message;
                showToast("error", `Odeslání selhalo. ${errMsg}`);
            }
        } catch (err) {
            showToast("error", `Síťová chyba: ${err?.message ?? err}`);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="min-h-screen bg-transparent text-white p-6 sm:p-10 flex items-center justify-center">
            <form
                className="w-full max-w-2xl bg-zinc-800 p-6 rounded-lg shadow-lg border border-zinc-700"
                onSubmit={handleSubmit}
            >
                <h2 className="text-2xl font-semibold mb-4 text-white">Odeslat Email</h2>

                <div className="mb-4">
                    <label className="block mb-1 text-white">Předmět emailu</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Předmět"
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-1 text-white">Příjemci</label>
                    {loading ? (
                        <div className="p-2 text-white">Načítám kontakty…</div>
                    ) : error ? (
                        <div className="p-2 text-red-400">{error}</div>
                    ) : (
                        <Select
                            isMulti
                            options={options}
                            value={selectedRecipients}
                            onChange={(val) => setSelectedRecipients(val || [])}
                            styles={customStyles}
                            placeholder="Vyberte příjemce..."
                            classNamePrefix="react-select"
                            noOptionsMessage={() => "Žádné výsledky"}
                            theme={(theme) => ({
                                ...theme,
                                colors: {
                                    ...theme.colors,
                                    primary25: "#334155",
                                    primary: "#71717a",
                                },
                            })}
                        />
                    )}
                </div>

                <div className="mb-4">
                    <label className="block mb-1 text-white">Obsah zprávy</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Zadejte text zprávy"
                        className="w-full p-2.5 rounded-md border border-zinc-700 bg-zinc-900 text-white h-40 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                </div>

                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={isHtml}
                            onChange={setIsHtml}
                            className={`${
                                isHtml ? "bg-green-600" : "bg-zinc-700"
                            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 cursor-pointer focus:ring-zinc-500`}
                        >
              <span
                  className={`${
                      isHtml ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
                        </Switch>
                        <div className="text-white">Použít HTML</div>
                    </div>
                    <div className="text-sm text-gray-300">{isHtml ? "Formát: HTML" : "Formát: Plain text"}</div>
                </div>

                <div className="mb-4">
                    <FileUploader key={uploaderKey} files={attachments} onChange={handleFilesChange} />
                </div>

                <div className="flex justify-center">
                    <button
                        type="submit"
                        disabled={sending}
                        className={`bg-blue-700 hover:brightness-70 cursor-pointer text-white px-4 py-2 rounded-md border border-zinc-700 ${sending ? "opacity-60 cursor-wait" : ""}`}
                    >
                        {sending ? "Odesílám..." : "Odeslat"}
                    </button>
                </div>
            </form>

            {toast && (
                <div className="fixed top-6 left-0 right-0 flex items-start justify-center z-50 pointer-events-none">
                    <div className="max-w-sm w-full mx-4 rounded-md border border-zinc-700 bg-zinc-800 text-white p-4 shadow-lg pointer-events-auto">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <div className="font-medium text-sm">
                                    {toast.type === "success" ? "Hotovo" : "Chyba"}
                                </div>
                                <div className="text-sm text-gray-300 mt-1">
                                    {toast.message}
                                </div>
                            </div>
                            <button
                                onClick={() => setToast(null)}
                                className="text-gray-400 hover:text-gray-200 ml-2 focus:outline-none"
                                aria-label="Zavřít upozornění"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmailForm;
