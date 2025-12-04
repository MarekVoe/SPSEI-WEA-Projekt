import React from 'react';
import { MdEmail } from 'react-icons/md';
import { IoMdContact } from 'react-icons/io';
import Dock from './Dock.jsx';
import { useNavigate } from 'react-router-dom';

function BottomMenu() {
    const navigate = useNavigate();

    const items = [
        { icon: <MdEmail size={22} className="text-white" />, label: 'Email', onClick: () => navigate('/') },
        { icon: <IoMdContact size={22} className="text-white" />, label: 'Kontakty', onClick: () => navigate('/kontakty') },
    ];

    return (
        <Dock
            className="mt-20 fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full px-4 py-2 shadow-lg backdrop-blur-md border border-gray-700"
            items={items}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
        />
    );
}

export default BottomMenu;
