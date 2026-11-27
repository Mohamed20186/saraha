import { Navigate, Route, Routes } from 'react-router-dom'
import Signup from './pages/Signup'
import Confirm from './pages/Confirm'
import Login from './pages/Login'
import Forgot from './pages/Forgot'
import Reset from './pages/Reset'
import Profile from './pages/Profile'
export default function App() {
  return (<Routes>
    <Route path="/" element={<Navigate to="/login" />} />
    <Route path="/signup" element={<Signup />} /><Route path="/confirm" element={<Confirm />} />
    <Route path="/login" element={<Login />} /><Route path="/forgot" element={<Forgot />} />
    <Route path="/reset" element={<Reset />} /><Route path="/profile" element={<Profile />} />
  </Routes>)
}
