import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import MainPage from './pages/MainPage.jsx'
import ContactPage from "./pages/ContactPage.jsx";

function App() {
    return (
        <BrowserRouter>
            <main style={{ padding: 10 }}>
                <Routes>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/kontakty" element={<ContactPage />} />
                </Routes>
            </main>
        </BrowserRouter>
    )
}

export default App
