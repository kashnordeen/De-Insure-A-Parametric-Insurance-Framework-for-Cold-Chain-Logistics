import { useState, useEffect, useMemo, useRef } from 'react'
import { ethers } from 'ethers'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Map View Recenter Controller
function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    try {
      if (map && center && center[0] && center[1]) {
        map.flyTo(center, map.getZoom(), { duration: 1.2 })
      }
    } catch (e) {
      // Map flyTo safe guard
    }
  }, [center, map])
  return null
}

// Sparkline SVG Generator
const generateSparkline = (data, width = 100, height = 30) => {
  if (!data || data.length < 2) return 'M 0 15 L 100 15'
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  return data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 8) - 4
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function App() {
  const [theme, setTheme] = useState('light')
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [telemetry, setTelemetry] = useState({ temp: 4.6, hum: 57.7, battery: 98 })
  const [shelfLife, setShelfLife] = useState(0.916)
  const [contractState, setContractState] = useState('Transit')
  const [location, setLocation] = useState({ lat: 30.3528, lng: 76.3598 }) // Real Hardware Location
  const [locationHistory, setLocationHistory] = useState([
    [30.3528, 76.3598]
  ])
  const [blockchainInfo, setBlockchainInfo] = useState({ connected: true, address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' })
  const [telemetryLogs, setTelemetryLogs] = useState([
    { id: 101, time: '12:58:05 PM', date: new Date().toLocaleDateString(), temp: 22.5, hum: 83.6, battery: 97, lat: 30.3528, lng: 76.3598, sig: '304402208765d1fd80dc8a3fe9e46f0693e9d4df...', status: 'Thermal Spike' },
    { id: 102, time: '12:57:55 PM', date: new Date().toLocaleDateString(), temp: 22.4, hum: 83.5, battery: 97, lat: 30.3528, lng: 76.3598, sig: '304402208765d1fd80dc8a3fe9e46f0693e9d4df...', status: 'Thermal Spike' },
    { id: 103, time: '12:57:45 PM', date: new Date().toLocaleDateString(), temp: 4.8, hum: 58.2, battery: 98, lat: 30.3528, lng: 76.3598, sig: '304402208765d1fd80dc8a3fe9e46f0693e9d4df...', status: 'Optimal' },
    { id: 104, time: '12:57:35 PM', date: new Date().toLocaleDateString(), temp: 4.6, hum: 57.7, battery: 98, lat: 30.3528, lng: 76.3598, sig: '304402208765d1fd80dc8a3fe9e46f0693e9d4df...', status: 'Optimal' }
  ])
  const [searchTerm, setSearchTerm] = useState('')

  const [alerts, setAlerts] = useState([
    { id: 1, title: 'Thermal Threshold Exceeded', detail: 'Temperature exceeded 15.0°C safety baseline (Current: 22.4°C)', time: '23:36:12', level: 'Critical', read: false },
    { id: 2, title: 'GPS Hardware Lock Acquired', detail: '3D Satellite Fix active at 30.3528° N, 76.3598° E', time: '23:32:05', level: 'Info', read: false },
    { id: 3, title: 'Oracle Spoilage Vote Cast', detail: 'On-chain consensus submitted transaction 0x934c...', time: '23:27:19', level: 'Warning', read: true }
  ])
  const [activeToast, setActiveToast] = useState(null)
  const [lastToastTime, setLastToastTime] = useState(0)
  const lastIngestedRef = useRef(0)
  const [isPacketPulsing, setIsPacketPulsing] = useState(false)
  const [showAlertDropdown, setShowAlertDropdown] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [deviceOnline, setDeviceOnline] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Lead System Architect', role: 'Smart Contract & Full-Stack Lead', email: 'lead@deinsure.io' },
    { id: 2, name: 'Embedded IoT Engineer', role: 'ESP32 Firmware & AWS Integration', email: 'hardware@deinsure.io' },
    { id: 3, name: 'AI / ML Specialist', role: 'PyTorch Spoilage & Risk Modeling', email: 'ml@deinsure.io' }
  ])
  const [editingTeam, setEditingTeam] = useState(false)
  const [alertFilter, setAlertFilter] = useState('All')

  // Initial App Splash Screen Loading State
  const [appLoading, setAppLoading] = useState(true)
  const [loadingPercent, setLoadingPercent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingPercent(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(() => setAppLoading(false), 250)
          return 100
        }
        return prev + 12
      })
    }, 80)
    return () => clearInterval(timer)
  }, [])

  // Safe Memoized Leaflet Custom Marker Icon
  const cargoIcon = useMemo(() => {
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="
          background-color: #2563eb;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.25);
          border: 3px solid #ffffff;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    })
  }, [])

  // Rolling History Buffers for Live Dynamic Sparklines
  const [tempHistory, setTempHistory] = useState([4.2, 4.5, 4.3, 4.6, 4.8, 4.6])
  const [humHistory, setHumHistory] = useState([55, 56, 54, 57, 58, 57.7])
  const [batteryHistory, setBatteryHistory] = useState([99, 98, 98, 98, 98, 98])

  // Toggle Light / Dark Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  // Connect to local Hardhat EVM Node
  useEffect(() => {
    async function initWeb3() {
      try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
        const network = await provider.getNetwork()
        if (network) {
          setBlockchainInfo(prev => ({ ...prev, connected: true }))
        }
      } catch (err) {
        // Local node fallback
      }
    }
    initWeb3()
  }, [])

  // Auto-vanish Toast popup after 4 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [activeToast])

  // Real-time telemetry & Geolocation fetch from Python Oracle API (AWS IoT + ESP32)
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        let res
        try {
          res = await fetch('http://127.0.0.1:5001/telemetry')
        } catch {
          res = await fetch('http://localhost:5001/telemetry')
        }

        if (res && res.ok) {
          const data = await res.json()
          
          const isOnline = data.online === true
          setDeviceOnline(isOnline)

          if (isOnline) {
            const newTemp = Number(data.temp)
            const newHum = Number(data.hum)
            const newBattery = Number(data.battery !== undefined ? data.battery : 98)
            const newLat = Number(data.lat || 30.3528)
            const newLng = Number(data.lng || 76.3598)
            const newSig = data.sig || '0x30440220...'

            setTelemetry({ 
              temp: newTemp, 
              hum: newHum, 
              battery: newBattery
            })

            setTempHistory(prev => [...prev.slice(-15), newTemp])
            setHumHistory(prev => [...prev.slice(-15), newHum])
            setBatteryHistory(prev => [...prev.slice(-15), newBattery])

            setLocation({ lat: newLat, lng: newLng })
            setLocationHistory(prev => {
              const last = prev[prev.length - 1]
              if (!last || Math.abs(last[0] - newLat) > 0.000001 || Math.abs(last[1] - newLng) > 0.000001) {
                return [...prev, [newLat, newLng]]
              }
              return prev
            })

            // Trigger Live Toast Notification on Anomaly Detection (Cooldown 10s)
            const nowMs = Date.now()
            if (newTemp > 15.0 && nowMs - lastToastTime > 10000) {
              setLastToastTime(nowMs)
              if (!isMuted) {
                const toastObj = {
                  id: nowMs,
                  title: 'Thermal Spike Alert',
                  body: `ESP32 Physical Sensor recorded ${newTemp.toFixed(1)}°C (exceeds 15.0°C threshold)`,
                  level: 'critical'
                }
                setActiveToast(toastObj)
              }

              setAlerts(prev => [{
                id: nowMs,
                title: 'Thermal Spike Detected',
                detail: `Sensor reported ${newTemp.toFixed(1)}°C (>15.0°C threshold). Spoilage model active.`,
                time: new Date().toLocaleTimeString(),
                level: 'Critical',
                read: false
              }, ...prev])
            }

            // Append to Live Telemetry Log Table ONLY when a NEW hardware MQTT packet arrives from AWS!
            const packetUpdated = Number(data.updated || 0)
            if (packetUpdated > 0 && Math.abs(packetUpdated - lastIngestedRef.current) > 0.001) {
              lastIngestedRef.current = packetUpdated
              setIsPacketPulsing(true)
              setTimeout(() => setIsPacketPulsing(false), 1200)

              const packetDate = new Date(packetUpdated * 1000)
              const timeStr = packetDate.toLocaleTimeString()
              const dateStr = packetDate.toLocaleDateString()
              const status = newTemp > 15.0 ? 'Thermal Spike' : 'Optimal'

              setTelemetryLogs(prev => {
                if (prev.length > 0 && Math.abs(prev[0].id - packetUpdated) < 0.001) {
                  return prev
                }
                const newEntry = {
                  id: packetUpdated,
                  time: timeStr,
                  date: dateStr,
                  temp: newTemp,
                  hum: newHum,
                  battery: newBattery,
                  lat: newLat,
                  lng: newLng,
                  sig: newSig,
                  status: status
                }
                return [newEntry, ...prev.slice(0, 99)]
              })
            }
          }
        } else {
          setDeviceOnline(false)
        }
      } catch (err) {
        setDeviceOnline(false)
      }
    }

    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, 1000)
    return () => clearInterval(interval)
  }, [lastToastTime])

  // Export CSV Functionality
  const downloadCSV = () => {
    const headers = ['Timestamp,Date,Temperature (°C),Humidity (%),Battery (%),Latitude,Longitude,ECDSA Signature,Status\n']
    const rows = telemetryLogs.map(log => 
      `"${log.time}","${log.date}",${log.temp},${log.hum},${log.battery},${log.lat},${log.lng},"${log.sig}","${log.status}"`
    )
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', `DeInsure_Telemetry_Log_${Date.now()}.csv`)
    a.click()
  }

  // Spoilage calculation
  useEffect(() => {
    if (shelfLife < 0.10) {
      setContractState('Settled')
    } else if (telemetry.temp > 15.0) {
      setShelfLife(prev => Math.max(0, prev - 0.05))
    }
  }, [shelfLife, telemetry])

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  const circumference = 440
  const strokeDashoffset = circumference - (shelfLife * circumference)
  const currentPos = [location.lat, location.lng]

  const filteredLogs = telemetryLogs.filter(log => 
    log.time.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.sig.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unreadAlertsCount = alerts.filter(a => !a.read).length

  return (
    <div className="app-container">
      {/* Initial App Loading & Splash Screen */}
      {appLoading && (
        <div className="app-splash-screen">
          <div className="splash-content">
            <div className="splash-logo-container">
              <div className="splash-logo-glow"></div>
              <div className="brand-icon splash-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
            </div>

            <h1 className="splash-title">De-Insure</h1>
            <p className="splash-subtitle">Smart Parametric Cargo Protection</p>

            <div className="splash-progress-track">
              <div className="splash-progress-fill" style={{ width: `${loadingPercent}%` }}></div>
            </div>

            <div className="splash-status-text">
              {loadingPercent < 40 ? 'Connecting to ESP32 Telemetry...' : loadingPercent < 80 ? 'Synchronizing EVM Node...' : 'Ready!'}
            </div>
          </div>
        </div>
      )}

      {/* Floating Live Toast Notification Overlay */}
      {activeToast && (
        <div className="toast-container">
          <div className={`toast-card ${activeToast.level}`}>
            <div className="toast-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div className="toast-title">{activeToast.title}</div>
              <div className="toast-body">{activeToast.body}</div>
            </div>
            <button className="toast-close" onClick={() => setActiveToast(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="brand-header">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div>
              <div className="brand-title">De-Insure</div>
              <div className="brand-subtitle">Smart Cargo Protection</div>
            </div>
          </div>

          <nav>
            <ul className="nav-list">
              {[
                { name: 'Dashboard', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
                { name: 'Telemetry', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { name: 'AI Insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                { name: 'Contracts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { name: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: unreadAlertsCount },
                { name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
              ].map(tab => (
                <li key={tab.name}>
                  <a 
                    className={`nav-item ${activeTab === tab.name ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.name)
                      if (tab.name === 'Alerts') {
                        setAlerts(prev => prev.map(a => ({ ...a, read: true })))
                      }
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={tab.icon}/>
                    </svg>
                    <span>{tab.name}</span>
                    {tab.name === 'Telemetry' ? (
                      <span className="telemetry-live-dot" title="Live Hardware Data Stream"></span>
                    ) : (
                      tab.badge !== undefined && tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Protection Footer Card */}
        <div className="sidebar-footer-card">
          <div className="sidebar-footer-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h4>Protection Active</h4>
          <p>Your cargo is secured 24/7 by AWS & Oracle Multi-Sig</p>
          <button className="btn-sidebar-footer" onClick={() => setShowDetailsModal(true)}>View Details</button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-wrapper">
        {/* Header Navbar */}
        <header className="top-nav">
          {/* Mobile Logo Brand */}
          <div className="mobile-brand-header" onClick={() => setActiveTab('Dashboard')}>
            <div className="brand-icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="mobile-brand-text">
              <div className="mobile-brand-title">De-Insure</div>
              <div className="mobile-brand-subtitle">Smart Protection</div>
            </div>
          </div>

          {/* Dynamic Liveness Status Indicator */}
          {deviceOnline ? (
            <div className="status-indicator">
              <span className="status-dot"></span>
              <div>
                <div className="status-title">ESP32 Node Online</div>
                <div className="status-subtitle">Streaming Live AWS IoT Telemetry</div>
              </div>
            </div>
          ) : (
            <div className="status-indicator offline" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.06)' }}>
              <span className="status-dot offline" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.2)' }}></span>
              <div>
                <div className="status-title" style={{ color: '#ef4444', fontWeight: 700 }}>Device Offline</div>
                <div className="status-subtitle">Hardware Disconnected • Standby Mode</div>
              </div>
            </div>
          )}

          <div className="top-actions">
            {/* Mobile View Details Button */}
            <button 
              className="btn-view-details-mobile" 
              onClick={() => setShowDetailsModal(true)}
              title="View System Architecture & Specifications"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>View Details</span>
            </button>

            {/* Theme Switcher */}
            <div className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
              <div className="theme-toggle-thumb">
                {theme === 'light' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Notifications Bell & Mini Alert Window Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="icon-btn" 
                title="Notifications"
                onClick={() => setShowAlertDropdown(prev => !prev)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {unreadAlertsCount > 0 && <span className="badge-dot">{unreadAlertsCount}</span>}
              </button>

              {/* MINI ALERT WINDOW DROPDOWN */}
              {showAlertDropdown && (
                <div className="mini-alert-dropdown">
                  <div className="mini-alert-header">
                    <span>System Alerts ({unreadAlertsCount} new)</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button 
                        className="mini-alert-link" 
                        onClick={() => setIsMuted(prev => !prev)}
                        style={{ color: isMuted ? '#ef4444' : 'var(--primary-blue)' }}
                      >
                        {isMuted ? 'Muted' : 'Mute'}
                      </button>
                      <button className="mini-alert-link" onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}>Mark Read</button>
                    </div>
                  </div>
                  <div className="mini-alert-list">
                    {alerts.length === 0 ? (
                      <div style={{ padding: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        No active notifications
                      </div>
                    ) : (
                      alerts.slice(0, 5).map(alert => (
                        <div key={alert.id} className={`mini-alert-item ${!alert.read ? 'unread' : ''}`}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{alert.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{alert.detail}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{alert.time}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div 
                    className="mini-alert-footer"
                    onClick={() => {
                      setActiveTab('Alerts')
                      setShowAlertDropdown(false)
                    }}
                  >
                    View All Alerts Center →
                  </div>
                </div>
              )}
            </div>

            {/* Live Network Pill (Clean static indicator) */}
            <div className="network-pill">
              <span className="status-dot" style={{ width: 8, height: 8 }}></span>
              <span>Live Network Connected</span>
            </div>
          </div>
        </header>

        {/* CONDITIONALLY RENDER TAB VIEWS VS MAIN DASHBOARD */}
        {activeTab === 'AI Insights' ? (
          <section className="alerts-view-container">
            <div className="alerts-header">
              <div>
                <h2>AI Spoilage Degradation Insights</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Predictive Machine Learning degradation analysis derived from continuous IoT sensor streams</p>
              </div>
            </div>

            <div className="grid-2col">
              <div className="dashboard-panel">
                <h3 className="panel-title">Model Confidence & Spoilage Prediction</h3>
                <div style={{ padding: '1rem 0' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: shelfLife < 0.10 ? '#ef4444' : '#10b981' }}>
                    {(shelfLife * 100).toFixed(1)}%
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Predicted Cargo Quality Score</p>
                  <div style={{ height: 10, background: 'var(--bg-surface)', borderRadius: 5, marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${shelfLife * 100}%`, background: shelfLife < 0.10 ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              </div>

              <div className="dashboard-panel">
                <h3 className="panel-title">Risk Degradation Factors</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Thermal Shock Index:</span>
                    <strong style={{ color: telemetry.temp > 15 ? '#ef4444' : '#10b981' }}>{telemetry.temp.toFixed(1)}°C ({telemetry.temp > 15 ? 'HIGH RISK' : 'LOW RISK'})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>ML Algorithm Model:</span>
                    <strong>Random Forest Regressor (v2.4)</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : activeTab === 'Contracts' ? (
          <section className="alerts-view-container">
            <div className="alerts-header">
              <div>
                <h2>EVM Smart Contract & Multi-Sig Oracle Engine</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Automated parametric cold-chain insurance escrow & hardware signature verification</p>
              </div>
              <div className="live-pulse-badge" style={{ backgroundColor: deviceOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: deviceOnline ? '#10b981' : '#ef4444', borderColor: deviceOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
                <span className="pulse-dot" style={{ backgroundColor: deviceOnline ? '#10b981' : '#ef4444' }}></span>
                <span>{deviceOnline ? 'EVM Node Connected • Active Transit' : 'EVM Node Online • Standby Escrow'}</span>
              </div>
            </div>

            {/* Smart Contract Flow & Escrow Vault Card */}
            <div className="dashboard-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Smart Contract Parametric Flow</h3>
                <span className="badge-tag optimal">DeInsure v2.0 (Solidity 0.8.20)</span>
              </div>

              <div className="contract-flow" style={{ margin: '2rem 0' }}>
                <div className="flow-step completed">
                  <div className="flow-icon">✓</div>
                  <div className="flow-label">Created</div>
                </div>
                <div className="flow-connector active"></div>

                <div className={`flow-step ${!deviceOnline ? 'active' : 'completed'}`}>
                  <div className="flow-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </div>
                  <div className="flow-label">Escrow Funded</div>
                </div>
                <div className={`flow-connector ${deviceOnline ? 'active' : ''}`}></div>

                <div className={`flow-step ${deviceOnline && contractState !== 'Settled' ? 'active' : contractState === 'Settled' ? 'completed' : ''}`}>
                  <div className="flow-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  </div>
                  <div className="flow-label">Active Transit</div>
                </div>
                <div className={`flow-connector ${contractState === 'Settled' ? 'active' : ''}`}></div>

                <div className={`flow-step ${contractState === 'Settled' ? 'danger' : ''}`}>
                  <div className="flow-icon">{contractState === 'Settled' ? '✓' : '✓'}</div>
                  <div className="flow-label">Claim Settled</div>
                </div>
              </div>

              <div className="contract-info-box" style={{ padding: '1.1rem 1.35rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>DeInsure Contract Address (EVM Local / Arbitrum Testnet)</div>
                  <div className="contract-id-text" style={{ fontSize: '0.92rem', color: 'var(--primary-blue)' }}>{blockchainInfo.address}</div>
                </div>
                <button className="copy-btn" onClick={() => handleCopy(blockchainInfo.address)}>Copy Address</button>
              </div>
            </div>

            {/* Escrow Vault Details & Multi-Sig Oracle Nodes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {/* Escrow Parameters */}
              <div className="dashboard-panel">
                <h3 className="panel-title">Escrow Vault Parameters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Coverage Escrow Amount:</span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--accent-green)' }}>1.0 ETH (100% Escrowed)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Policy Premium:</span>
                    <strong style={{ fontSize: '0.88rem' }}>0.1 ETH (Paid by Client)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>On-Chain Verification:</span>
                    <strong style={{ fontSize: '0.88rem', fontFamily: 'monospace' }}>OpenZeppelin ECDSA.recover</strong>
                  </div>
                </div>
              </div>

              {/* Multi-Sig Oracle Nodes */}
              <div className="dashboard-panel">
                <h3 className="panel-title">Multi-Sig Oracle Voting Consortium</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Oracle Node #1 (Python AWS Oracle)</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>0x70997970...79C8</div>
                    </div>
                    <span className="badge-tag optimal" style={{ fontSize: '0.68rem' }}>Active</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Oracle Node #2 (Chainlink Backup)</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>0x3C44CdD4...28B6</div>
                    </div>
                    <span className="badge-tag optimal" style={{ fontSize: '0.68rem' }}>Active</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Oracle Node #3 (Consensus Sentinel)</div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>0x90F79bf6...906</div>
                    </div>
                    <span className="badge-tag optimal" style={{ fontSize: '0.68rem' }}>Active</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : activeTab === 'Settings' ? (
          <section className="alerts-view-container">
            <div className="alerts-header">
              <div>
                <h2>Hardware & Oracle Settings</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Configure ESP32 sampling rates, AWS IoT endpoints, and threshold baselines</p>
              </div>
            </div>

            <div className="dashboard-panel">
              <h3 className="panel-title">Sensor Baseline Thresholds</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Max Temperature Safety Threshold (°C)</label>
                  <input type="number" defaultValue="15.0" style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', marginTop: '0.25rem' }} />
                </div>
              </div>
            </div>
          </section>
        ) : activeTab === 'Alerts' ? (
          <section className="alerts-view-container">
            <div className="alerts-header">
              <div>
                <h2>Live Hardware Alerts & Notifications Center</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Real-time security and anomaly alerts detected on physical ESP32 cargo unit</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-sidebar-footer" style={{ width: 'auto', padding: '0.45rem 1.1rem', fontSize: '0.8rem' }} onClick={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}>
                  Mark All Read
                </button>
                <button className="btn-trigger-reset" style={{ padding: '0.45rem 1.1rem', fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => setAlerts([])}>
                  Clear History
                </button>
              </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div className="alerts-kpi-grid">
              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">{alerts.length} Recorded</div>
                  <div className="telemetry-kpi-lbl">Total Logged Security Alerts</div>
                </div>
              </div>

              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">{alerts.filter(a => a.level === 'Critical').length} Critical</div>
                  <div className="telemetry-kpi-lbl">Thermal Threshold Violations</div>
                </div>
              </div>

              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">{unreadAlertsCount} Unread</div>
                  <div className="telemetry-kpi-lbl">Pending Operator Action</div>
                </div>
              </div>
            </div>

            {/* Alert Category Filter Pills */}
            <div className="alert-filter-bar">
              <div className="alert-filter-pills">
                {['All', 'Critical', 'Warning', 'Info'].map(cat => (
                  <button 
                    key={cat} 
                    className={`alert-filter-btn ${alertFilter === cat ? 'active' : ''}`}
                    onClick={() => setAlertFilter(cat)}
                  >
                    {cat} {cat === 'All' ? `(${alerts.length})` : `(${alerts.filter(a => a.level === cat).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Cards Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {alerts.length === 0 ? (
                <div className="dashboard-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>No Active Security Alerts</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>All hardware sensor streams are operating within optimal baseline parameters.</p>
                </div>
              ) : (
                alerts
                  .filter(a => alertFilter === 'All' || a.level === alertFilter)
                  .map(alert => {
                    const levelClass = alert.level === 'Critical' ? 'critical' : alert.level === 'Warning' ? 'warning' : 'info'
                    return (
                      <div key={alert.id} className={`alert-item-card ${levelClass} ${!alert.read ? 'unread' : ''}`}>
                        <div className={`alert-item-icon ${levelClass}`}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {alert.level === 'Critical' ? (
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/>
                            ) : alert.level === 'Warning' ? (
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            ) : (
                              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            )}
                          </svg>
                        </div>
                        
                        <div className="alert-item-content">
                          <div className="alert-item-header">
                            <span className="alert-item-title">{alert.title}</span>
                            <span className="alert-item-time">{alert.time}</span>
                          </div>
                          <span className="alert-item-detail">{alert.detail}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className={`badge-tag ${alert.level === 'Critical' ? 'danger' : alert.level === 'Warning' ? 'warning' : 'optimal'}`}>
                            {alert.level}
                          </span>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem' }}
                            title="Dismiss Alert"
                            onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </section>
        ) : activeTab === 'Telemetry' ? (
          <section className="telemetry-view-container">
            {/* KPI Summary Cards */}
            <div className="telemetry-kpi-row">
              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">{telemetryLogs.length} Packets</div>
                  <div className="telemetry-kpi-lbl">Total Recorded Telemetry Logs</div>
                </div>
              </div>

              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">100% Cryptographic</div>
                  <div className="telemetry-kpi-lbl">ECDSA secp256k1 Signed</div>
                </div>
              </div>

              <div className="telemetry-kpi-card">
                <div className="telemetry-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
                  </svg>
                </div>
                <div>
                  <div className="telemetry-kpi-val">{deviceOnline ? `${telemetry.temp.toFixed(1)}°C` : 'Offline'} / {deviceOnline ? `${telemetry.battery}%` : 'Offline'}</div>
                  <div className="telemetry-kpi-lbl">Current ESP32 Sensor State</div>
                </div>
              </div>
            </div>

            {/* Table Card Container */}
            <div className="telemetry-table-card">
              <div className="telemetry-table-topbar">
                <div className="telemetry-table-title">
                  <h3>Recorded Telemetry Log</h3>
                  <div className="live-pulse-badge">
                    <span className="pulse-dot"></span>
                    <span>Live AWS Stream</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="table-search-input"
                    placeholder="Search log by status/time..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="btn-export-csv-gradient" onClick={downloadCSV}>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="telemetry-responsive-table">
                <table className="styled-telemetry-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Date</th>
                      <th>Temp (°C)</th>
                      <th>Humidity</th>
                      <th>Battery</th>
                      <th>GPS Coordinates</th>
                      <th>ECDSA Signature</th>
                      <th>Security Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          Connecting to ESP32 physical sensor stream...
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-blue)' }}>
                            {log.time}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{log.date}</td>
                          <td style={{ fontWeight: 800, color: log.temp > 15 ? '#ef4444' : 'var(--text-main)' }}>
                            {log.temp.toFixed(1)}°C
                          </td>
                          <td>{log.hum.toFixed(1)}%</td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{log.battery}%</span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                            {log.lat.toFixed(4)}° N, {log.lng.toFixed(4)}° E
                          </td>
                          <td>
                            <div 
                              className="sig-chip"
                              title="Click to copy full ECDSA signature"
                              onClick={() => handleCopy(log.sig)}
                            >
                              <span>Key:</span>
                              <span>{log.sig.slice(0, 12)}...</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge-tag ${log.status === 'Optimal' ? 'optimal' : 'danger'}`}>
                              <span className="pulse-dot" style={{ width: 5, height: 5, backgroundColor: log.status === 'Optimal' ? '#10b981' : '#ef4444' }}></span>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Dribbble Hero Telemetry Card for Mobile View */}
            <section className="dribbble-mobile-hero">
              <div className="hero-glass-card">
                <div className="hero-card-header">
                  <div className="hero-device-chip">
                    <span className={`status-dot ${!deviceOnline ? 'offline' : ''}`}></span>
                    <span>{deviceOnline ? 'ESP32 Node Online' : 'Device Offline'}</span>
                  </div>
                  <span className={`hero-status-pill ${telemetry.temp > 15 ? 'danger' : 'optimal'}`}>
                    {telemetry.temp > 15 ? '🔥 Thermal Spike' : '❄️ Optimal Cool'}
                  </span>
                </div>

                <div className="hero-main-temp">
                  <div className="hero-temp-value">
                    {deviceOnline ? telemetry.temp.toFixed(1) : '--'}
                    <span className="hero-unit">°C</span>
                  </div>
                  <div className="hero-temp-label">Live Cold-Chain Telemetry</div>
                </div>

                {/* Integrated 3-Stat Bottom Bar */}
                <div className="hero-bottom-stats">
                  <div className="hero-stat-item">
                    <span className="hero-stat-lbl">Humidity</span>
                    <span className="hero-stat-val">{deviceOnline ? `${telemetry.hum.toFixed(1)}%` : '--'}</span>
                  </div>
                  <div className="hero-stat-divider"></div>
                  <div className="hero-stat-item">
                    <span className="hero-stat-lbl">Battery</span>
                    <span className="hero-stat-val">{deviceOnline ? `${telemetry.battery}%` : '--'}</span>
                  </div>
                  <div className="hero-stat-divider"></div>
                  <div className="hero-stat-item">
                    <span className="hero-stat-lbl">Escrow Policy</span>
                    <span className="hero-stat-val" style={{ color: '#10b981' }}>1.0 ETH</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Stat Cards Grid */}
            <section className="stats-grid">
              {/* Card 1: Temperature */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
                    </svg>
                  </div>
                  <div className="stat-title">Temperature</div>
                </div>
                <div className="stat-value" style={{ color: deviceOnline ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {deviceOnline ? `${telemetry.temp.toFixed(1)}°C` : '--°C'}
                </div>
                <div className="stat-footer">
                  <div className="stat-subtitle">Status<br/><strong>{deviceOnline ? 'Live Sensor Data' : 'Device Offline'}</strong></div>
                  <svg className="sparkline-svg" viewBox="0 0 100 30">
                    <path className="sparkline-path" d={generateSparkline(tempHistory)} />
                  </svg>
                </div>
              </div>

              {/* Card 2: Humidity */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
                    </svg>
                  </div>
                  <div className="stat-title">Humidity</div>
                </div>
                <div className="stat-value" style={{ color: deviceOnline ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {deviceOnline ? `${telemetry.hum.toFixed(1)}%` : '--%'}
                </div>
                <div className="stat-footer">
                  <div className="stat-subtitle">Status<br/><strong>{deviceOnline ? 'Live Sensor Data' : 'Device Offline'}</strong></div>
                  <svg className="sparkline-svg" viewBox="0 0 100 30">
                    <path className="sparkline-path" d={generateSparkline(humHistory)} />
                  </svg>
                </div>
              </div>

              {/* Card 3: Battery Level */}
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="6" width="18" height="12" rx="2"/>
                      <path d="M23 11v2"/>
                    </svg>
                  </div>
                  <div className="stat-title">Battery Level</div>
                </div>
                <div className="stat-value" style={{ color: deviceOnline ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {deviceOnline ? `${telemetry.battery}%` : 'Offline'}
                </div>
                <div className="stat-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                  <div className="stat-subtitle">Status: <strong>{deviceOnline ? `${Math.round(telemetry.battery * 0.25)}h remaining` : 'Disconnected'}</strong></div>
                  <div className="battery-progress-bar">
                    <div className="battery-progress-fill" style={{ width: deviceOnline ? `${telemetry.battery}%` : '0%', backgroundColor: deviceOnline ? '#10b981' : '#64748b' }}></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Middle Row Layout */}
            <section className="middle-grid">
              {/* Panel 1: AI Degradation Model */}
              <div className="dashboard-panel">
                <div className="panel-title">AI Degradation Model</div>
                <div className="radial-container">
                  <svg className="radial-svg" viewBox="0 0 160 160">
                    <defs>
                      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#60a5fa" />
                      </linearGradient>
                    </defs>
                    <circle className="radial-bg" cx="80" cy="80" r="70" />
                    <circle 
                      className="radial-progress" 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      style={{ strokeDashoffset: deviceOnline ? strokeDashoffset : circumference }}
                    />
                  </svg>
                  <div className="radial-content">
                    <div className="radial-value">{deviceOnline ? `${(shelfLife * 100).toFixed(1)}%` : '--%'}</div>
                    <div className="radial-label">Shelf Life S(t)</div>
                    <div className={`radial-badge ${!deviceOnline ? '' : shelfLife < 0.10 ? 'danger' : ''}`} style={{ backgroundColor: !deviceOnline ? 'rgba(100, 116, 139, 0.12)' : undefined, color: !deviceOnline ? '#64748b' : undefined }}>
                      <span className="status-dot" style={{ width: 6, height: 6, backgroundColor: !deviceOnline ? '#64748b' : shelfLife < 0.10 ? '#ef4444' : '#10b981' }}></span>
                      <span>{!deviceOnline ? 'Offline' : shelfLife < 0.10 ? 'Spoiled' : 'Healthy'}</span>
                    </div>
                  </div>
                </div>
                <div className="panel-footer-note">
                  {deviceOnline ? 'PyTorch LSTM Engine Active • Spoilage Threshold: 10%' : 'Waiting for live hardware sensor stream...'}
                </div>
              </div>

              {/* Panel 2: Smart Contract State */}
              <div className="dashboard-panel">
                <div className="panel-title">Smart Contract State</div>
                
                <div className="contract-flow">
                  <div className={`flow-step ${contractState !== 'Created' ? 'completed' : 'active'}`}>
                    <div className="flow-icon">✓</div>
                    <div className="flow-label">Created</div>
                  </div>
                  <div className={`flow-connector ${contractState !== 'Created' ? 'active' : ''}`}></div>

                  <div className={`flow-step ${!deviceOnline ? 'active' : 'completed'}`}>
                    <div className="flow-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    </div>
                    <div className="flow-label">Escrow Funded</div>
                  </div>
                  <div className={`flow-connector ${deviceOnline ? 'active' : ''}`}></div>

                  <div className={`flow-step ${deviceOnline && contractState !== 'Settled' ? 'active' : contractState === 'Settled' ? 'completed' : ''}`}>
                    <div className="flow-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    </div>
                    <div className="flow-label">Active Transit</div>
                  </div>
                  <div className={`flow-connector ${contractState === 'Settled' ? 'active' : ''}`}></div>

                  <div className={`flow-step ${contractState === 'Settled' ? 'danger' : ''}`}>
                    <div className="flow-icon">✓</div>
                    <div className="flow-label">Claim Settled</div>
                  </div>
                </div>

                <div className="contract-info-box">
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DeInsure Smart Contract Address</div>
                    <div className="contract-id-text">{blockchainInfo.address}</div>
                  </div>
                  <button className="copy-btn" onClick={() => handleCopy(blockchainInfo.address)} title="Copy Address">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  <span>Last Updated: {deviceOnline ? 'Just now' : 'Standby'}</span>
                  <span>↻ Syncing EVM Node</span>
                </div>

                <div style={{ marginTop: '0.75rem', background: 'var(--bg-surface)', padding: '0.65rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>Multi-Sig Oracle Vault</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>2-out-of-3 Consensus Active</div>
                    </div>
                  </div>
                  <span className="badge-tag optimal" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>Vault Active</span>
                </div>
              </div>

              {/* Panel 3: Quick Actions */}
              <div className="dashboard-panel">
                <div className="panel-title">Quick Actions</div>
                <div className="actions-list">
                  <a className="action-item" onClick={() => setActiveTab('Telemetry')}>
                    <div className="action-content">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      <span>View Live Telemetry</span>
                    </div>
                    <span>›</span>
                  </a>

                  <a className="action-item" onClick={downloadCSV}>
                    <div className="action-content">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>Generate Report</span>
                    </div>
                    <span>›</span>
                  </a>

                  <a className="action-item" onClick={() => setActiveTab('Contracts')}>
                    <div className="action-content">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span>View Contract</span>
                    </div>
                    <span>›</span>
                  </a>

                  <a className="action-item" onClick={downloadCSV}>
                    <div className="action-content">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      <span>Export Data</span>
                    </div>
                    <span>›</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Bottom Section: REAL-WORLD MAP CENTERED ON INDIA */}
            <section className="map-panel">
              <div className="map-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div className="map-title">Live Physical ESP32 Geolocation Node (India)</div>
              </div>

              <div className="map-container" style={{ height: 380, position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
                {/* Floating Location Overlay Card (Moved down to uncover + and - zoom controls) */}
                <div className="map-overlay-card" style={{ position: 'absolute', top: '5.25rem', left: '0.85rem', zIndex: 1000, background: 'var(--bg-card)', padding: '0.85rem 1.15rem', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                  <h5 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>ESP32 Physical Device Location</h5>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 'bold', margin: '0.1rem 0' }}>Lat: {location.lat.toFixed(4)}° N</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 'bold', margin: '0.1rem 0' }}>Lng: {location.lng.toFixed(4)}° E</p>
                  <div style={{ fontSize: '0.7rem', color: deviceOnline ? 'var(--accent-green)' : '#ef4444', fontWeight: 600, marginTop: '0.35rem' }}>
                    {deviceOnline ? 'Live India GPS Node • Updates Every 1s' : 'Hardware Offline (Waiting for AWS Stream)'}
                  </div>
                </div>

                {/* REAL-WORLD MAP CONTAINER CENTERED IN INDIA */}
                <MapContainer 
                  key="main-dashboard-map"
                  center={currentPos} 
                  zoom={10} 
                  scrollWheelZoom={true}
                  style={{ width: '100%', height: '380px', borderRadius: '16px', zIndex: 1 }}
                >
                  <MapRecenter center={currentPos} />
                  
                  {/* High-End CartoDB Professional Tile Layer */}
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url={theme === 'dark' 
                      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
                      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                    }
                  />

                  {/* ONLY ONE SINGLE PHYSICAL ESP32 MARKER */}
                  <Marker position={currentPos} icon={cargoIcon}>
                    <Popup>
                      <strong>Physical ESP32 Cargo Unit #1 (India)</strong><br/>
                      Temp: {telemetry.temp.toFixed(1)}°C<br/>
                      Humidity: {telemetry.hum.toFixed(1)}%<br/>
                      Battery: {telemetry.battery}%<br/>
                      Lat: {location.lat.toFixed(4)}° N, Lng: {location.lng.toFixed(4)}° E
                    </Popup>
                  </Marker>

                  {/* Live Device Movement Track Line */}
                  <Polyline 
                    positions={locationHistory} 
                    color="#2563eb" 
                    weight={4} 
                    opacity={0.85}
                    dashArray="6, 6"
                  />
                </MapContainer>
              </div>
            </section>
          </>
        )}
      </main>

      {/* FULLSCREEN ANIMATED SYSTEM SPECIFICATION & SHOWCASE MODAL */}
      {showDetailsModal && (
        <div className="details-modal-overlay" onClick={(e) => { if (e.target.className === 'details-modal-overlay') setShowDetailsModal(false) }}>
          <div className="details-modal-card">
            <button className="details-modal-close-btn" onClick={() => setShowDetailsModal(false)} title="Close Presentation">✕</button>

            {/* Modal Header */}
            <div style={{ marginBottom: '2rem' }}>
              <span className="badge-tag optimal" style={{ marginBottom: '0.75rem' }}>De-Insure v2.4 Enterprise Architecture</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Autonomous Parametric Cold-Chain Insurance Platform
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem', maxWidth: 850 }}>
                Eliminating manual claim friction through hardware-level ECDSA signatures, AWS IoT Core, PyTorch ML degradation scoring, and EVM smart contract escrow.
              </p>
            </div>

            {/* Section 1: End-to-End System Architecture Diagram */}
            <div className="dashboard-panel" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 className="panel-title" style={{ margin: 0 }}>System Data Flow & Cloud Architecture</h3>
                <span className="badge-tag" style={{ background: 'var(--primary-blue-light)', color: 'var(--primary-blue)' }}>Live Verified Flow</span>
              </div>
              <img 
                src="/coldchain_arch_diagram.jpg" 
                alt="Cold Chain Architecture Diagram" 
                className="showcase-hero-image"
                style={{ maxHeight: 420, width: '100%', objectFit: 'cover' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-blue)' }}>1. Hardware Sensor</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ESP32 + DHT22 + GPS secp256k1 Signed</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-blue)' }}>2. Wireless Network</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AWS IoT Core MQTT TLS 1.2</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-blue)' }}>3. AI Risk Server</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PyTorch ML Spoilage Model (94.03%)</div>
                </div>
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 12 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-blue)' }}>4. Smart Contract</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EVM Escrow Vault (&lt;2s Settlement)</div>
                </div>
              </div>
            </div>

            {/* Section 2: Hardware Circuit & Sensors Spec */}
            <div className="dashboard-panel" style={{ marginBottom: '2rem' }}>
              <h3 className="panel-title">Hardware Components & Circuit Assembly</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.75rem', alignItems: 'center' }}>
                <img 
                  src="/esp32_hardware_sensors.jpg" 
                  alt="ESP32 Microcontroller & Sensors" 
                  className="showcase-hero-image"
                  style={{ maxHeight: 280, objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ padding: '0.85rem 1.1rem', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>ESP32-WROOM-32 Microcontroller</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Dual-core 240MHz Tensilica LX6 with hardware cryptography acceleration for ECDSA signatures.</div>
                  </div>
                  <div style={{ padding: '0.85rem 1.1rem', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>DHT22 Digital Temperature & Humidity Sensor</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Calibrated capacitive sensor measuring temperature (-40°C to +80°C ±0.5°C) and humidity (0-100% RH ±2%).</div>
                  </div>
                  <div style={{ padding: '0.85rem 1.1rem', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>NEO-6M GPS Satellite Engine</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>56-channel engine communicating via UART2 (GPIO 16/17) providing real-time location lock across India.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Cold-Chain Industry Impact */}
            <div className="dashboard-panel" style={{ marginBottom: '2rem' }}>
              <h3 className="panel-title">How De-Insure Transforms Cold-Chain Cargo Insurance</h3>
              <div className="grid-2col" style={{ marginTop: '0.5rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-blue)', marginBottom: '0.35rem' }}>Instant Payout (&lt;2 Seconds)</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Traditional cargo claims take 30 to 90 days. De-Insure releases EVM smart contract escrow funds automatically in under 2 seconds upon verified oracle consensus.
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-blue)', marginBottom: '0.35rem' }}>Zero Fraudulent Data Spoofing</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Every 5-second sensor packet is signed directly inside ESP32 secure hardware using ECDSA secp256k1 private keys, preventing telemetry alteration or fraud.
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-blue)', marginBottom: '0.35rem' }}>PyTorch AI Spoilage Prevention</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Evaluates cumulative thermal degradation S(t). Triggers warnings to freight operators before cargo spoils completely, protecting vaccines and perishables.
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-blue)', marginBottom: '0.35rem' }}>2-out-of-3 Oracle Consensus</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Multi-sig Oracle Consortium prevents single points of failure by requiring majority vote before submitting EVM smart contract claims.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Team Members & Engineering Contributors */}
            <div className="dashboard-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 className="panel-title" style={{ margin: 0 }}>Project Team Members & Contributors</h3>
                <button 
                  className="btn-sidebar-footer" 
                  style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.78rem' }}
                  onClick={() => setEditingTeam(prev => !prev)}
                >
                  {editingTeam ? 'Save Names' : 'Edit Names'}
                </button>
              </div>

              <div className="grid-3col">
                {teamMembers.map((member, idx) => (
                  <div key={member.id} style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-blue-light)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>
                      0{idx + 1}
                    </div>

                    {editingTeam ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={member.name}
                          onChange={(e) => {
                            const val = e.target.value
                            setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, name: val } : m))
                          }}
                          style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 700 }}
                          placeholder="Member Name"
                        />
                        <input 
                          type="text" 
                          value={member.role}
                          onChange={(e) => {
                            const val = e.target.value
                            setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: val } : m))
                          }}
                          style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}
                          placeholder="Role & Responsibilities"
                        />
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{member.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary-blue)', fontWeight: 600, marginTop: '0.15rem' }}>{member.role}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App-Like Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {[
          { name: 'Dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { name: 'Telemetry', label: 'Telemetry', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
          { name: 'Contracts', label: 'Contract', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { name: 'Alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: unreadAlertsCount },
          { name: 'AI Insights', label: 'Specs', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }
        ].map(item => (
          <button
            key={item.name}
            className={`mobile-nav-btn ${activeTab === item.name ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(item.name)
              if (item.name === 'Alerts') {
                setAlerts(prev => prev.map(a => ({ ...a, read: true })))
              }
            }}
          >
            <div className="mobile-nav-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="mobile-nav-badge">{item.badge}</span>
              )}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
