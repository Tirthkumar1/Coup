import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lobby from './pages/Lobby'
import WaitingRoom from './pages/WaitingRoom'
import Game from './pages/Game'
import Results from './pages/Results'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:code" element={<WaitingRoom />} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/results/:code" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}
