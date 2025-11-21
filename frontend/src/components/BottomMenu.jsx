// File: `frontend/src/components/BottomMenu.jsx`
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
            items={items}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
        />
    );
}

export default BottomMenu;
