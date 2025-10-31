import React from 'react';
import { MdEmail } from 'react-icons/md';
import { IoMdContact } from 'react-icons/io';
import Dock from './Dock.jsx';

function BottomMenu() {
    const items = [
        { icon: <MdEmail size={22} className="text-white" />, label: 'Email', onClick: () => alert('Email') },
        { icon: <IoMdContact size={22} className="text-white" />, label: 'Kontakty', onClick: () => alert('Kontakty') },
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
