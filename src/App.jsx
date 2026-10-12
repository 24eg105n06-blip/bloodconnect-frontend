
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Droplet,
  Heart,
  Hospital,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import LandingPage from './pages/LandingPage'
import AuthScreen from './pages/AuthScreen'
import './experience.css'

const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const groups = [
  'All groups',
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]

const compatibleGroups = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': groups.slice(1),
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
}

async function api(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(
      body?.message || `Request failed (${response.status})`
    )
  }

  return response.status === 204 ? null : response.json()
}

function timeAgo(date) {
  const minutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  )

  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} hr${hours > 1 ? 's' : ''} ago`
  }

  return `${Math.floor(hours / 24)} days ago`
}

function App() {
  const [entry, setEntry] = useState(() =>
    sessionStorage.getItem('blood-connect-user')
      ? 'workspace'
      : 'landing'
  )

  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('blood-connect-user') || 'null'
      )
    } catch {
      return null
    }
  })

  const [page, setPage] = useState('Overview')
  const [donors, setDonors] = useState([])
  const [requests, setRequests] = useState([])
  const [apiOnline, setApiOnline] = useState(false)
  const [loading, setLoading] = useState(true)

  const [group, setGroup] = useState('All groups')
  const [location, setLocation] = useState('')
  const [modal, setModal] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Profile editing states
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Load donors and blood requests
  useEffect(() => {
    let active = true

    Promise.all([
      api('/donors'),
      api('/blood-requests'),
    ])
      .then(([donorData, requestData]) => {
        if (!active) return

        setDonors(donorData)

        setRequests(
          requestData.sort(
            (a, b) =>
              new Date(b.createdAt) - new Date(a.createdAt)
          )
        )

        setApiOnline(true)
      })
      .catch(() => {
        if (!active) return

        setDonors([])
        setRequests([])
        setApiOnline(false)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Automatically dismiss notifications
  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(
      () => setNotice(''),
      4200
    )

    return () => window.clearTimeout(timer)
  }, [notice])

  // Filter donors
  const filteredDonors = useMemo(
    () =>
      donors.filter((donor) => {
        const groupMatches =
          group === 'All groups' ||
          donor.bloodGroup === group

        const locationMatches =
          !location ||
          donor.location
            ?.toLowerCase()
            .includes(location.toLowerCase())

        return groupMatches && locationMatches
      }),
    [donors, group, location]
  )

  const currentDonor = donors.find(
    (donor) => donor.id === user?.donorId
  )

  const donorBloodGroup =
    currentDonor?.bloodGroup || user?.bloodGroup

  const matchingRequests = requests.filter((request) =>
    (compatibleGroups[request.bloodGroup] || []).includes(
      donorBloodGroup
    )
  )

  // Login and registration
  async function submitAuth(payload) {
    if (
      authMode !== 'login' &&
      authMode !== 'register'
    ) {
      setAuthNotice(
        `${
          authMode === 'google'
            ? 'Google sign-in'
            : authMode === 'otp'
              ? 'OTP sign-in'
              : 'Password recovery'
        } is not configured on this server yet.`
      )
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthNotice('')

    try {
      const result = await api(
        authMode === 'login'
          ? '/auth/login'
          : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      setUser(result)

      sessionStorage.setItem(
        'blood-connect-user',
        JSON.stringify(result)
      )

      setEntry('workspace')
      setPage('Overview')
      setApiOnline(true)
    } catch (error) {
      setAuthError(
        error.message ||
          'Could not connect to Blood Connect. Please try again.'
      )
    } finally {
      setAuthSubmitting(false)
    }
  }

  // Log out
  function signOut() {
    sessionStorage.removeItem('blood-connect-user')
    setUser(null)
    setEntry('landing')
    setPage('Overview')
    setEditingProfile(false)
    setProfileError('')
  }

  // Save edited profile to the backend
  async function saveProfile(event) {
    event.preventDefault()

    if (!user?.id) {
      setProfileError(
        'Your user ID is missing. Please log in again.'
      )
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = Object.fromEntries(formData.entries())

    setProfileSaving(true)
    setProfileError('')

    try {
      const updatedUser = await api(
        `/auth/profile/${user.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      )

      // Update the current user immediately
      setUser(updatedUser)

      // Keep the updated user after a page refresh
      sessionStorage.setItem(
        'blood-connect-user',
        JSON.stringify(updatedUser)
      )

      // Update the donor displayed in the frontend, if applicable
      if (updatedUser.donorId) {
        setDonors((currentDonors) =>
          currentDonors.map((donor) =>
            donor.id === updatedUser.donorId
              ? {
                  ...donor,
                  name: updatedUser.name,
                  bloodGroup: updatedUser.bloodGroup,
                  phone: updatedUser.phone,
                  location: updatedUser.location,
                }
              : donor
          )
        )
      }

      setEditingProfile(false)
      setProfileError('')
      setNotice('Your profile was updated successfully.')
    } catch (error) {
      setProfileError(
        error.message ||
          'Could not update your profile. Please try again.'
      )
    } finally {
      setProfileSaving(false)
    }
  }

  // Return to the landing or authentication screen
  if (entry === 'landing') {
    return (
      <LandingPage
        donorCount={donors.length}
        requestCount={requests.length}
        loading={loading}
        apiOnline={apiOnline}
        onLogin={() => {
          setAuthMode('login')
          setAuthError('')
          setAuthNotice('')
          setEntry('auth')
        }}
        onRegister={() => {
          setAuthMode('register')
          setAuthError('')
          setAuthNotice('')
          setEntry('auth')
        }}
        onFindBlood={() => {
          setEntry('workspace')
          setPage('Find donors')
        }}
      />
    )
  }

  if (entry === 'auth') {
    return (
      <AuthScreen
        mode={authMode}
        onBack={() => setEntry('landing')}
        onSubmit={submitAuth}
        onSwitch={(mode) => {
          setAuthMode(mode)
          setAuthError('')
          setAuthNotice('')
        }}
        error={authError}
        notice={authNotice}
        submitting={authSubmitting}
      />
    )
  }

  // Submit a blood request
  async function submitRequest(form) {
    const payload = Object.fromEntries(
      new FormData(form).entries()
    )

    payload.unitsRequired = Number(
      payload.unitsRequired
    )

    setSubmitting(true)

    try {
      const created = await api('/blood-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setRequests((current) => [created, ...current])
      setApiOnline(true)
      setNotice(
        'Your blood request has been saved successfully.'
      )
      setModal('')
    } catch (error) {
      setNotice(
        error.message ||
          'Could not save the request. Please make sure the backend is running.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Register a donor
  async function submitDonor(form) {
    const payload = Object.fromEntries(
      new FormData(form).entries()
    )

    if (!payload.lastDonationDate) {
      delete payload.lastDonationDate
    }

    payload.age = Number(payload.age)
    payload.available = true

    setSubmitting(true)

    try {
      const created = await api('/donors', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setDonors((current) => [...current, created])
      setApiOnline(true)
      setNotice(
        'You are now registered as a Blood Connect donor.'
      )
      setModal('')
    } catch (error) {
      setNotice(
        error.message ||
          'Could not save donor details. Please make sure the backend is running.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Change donor availability
  async function updateDonorAvailability() {
    if (!user?.donorId) {
      setNotice(
        'A donor profile is required to update availability.'
      )
      return
    }

    const donor = donors.find(
      (item) => item.id === user.donorId
    )

    const available = !(donor?.available ?? true)

    try {
      const updated = await api(
        `/donors/${user.donorId}/availability`,
        {
          method: 'PUT',
          body: JSON.stringify({ available }),
        }
      )

      setDonors((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      )

      setNotice(
        `You are now ${
          available ? 'available' : 'not available'
        } for donor requests.`
      )
    } catch (error) {
      setNotice(
        error.message ||
          'Availability could not be updated.'
      )
    }
  }

  const navItems = [
    { label: 'Overview', icon: Heart },
    { label: 'Find donors', icon: Search },
    { label: 'Emergency requests', icon: Activity },
    { label: 'Hospitals', icon: Hospital },
    { label: 'Smart matching', icon: UsersRound },
    { label: 'Donor dashboard', icon: Droplet },
    { label: 'Notifications', icon: Bell },
    { label: 'Profile', icon: ShieldCheck },
  ]

  function navigate(label) {
    setPage(label)
    setMobileNav(false)

    if (label === 'Find donors') {
      document
        .getElementById('donor-search')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    }

    if (label === 'Emergency requests') {
      document
        .getElementById('requests-list')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    }
  }

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          mobileNav ? 'sidebar-open' : ''
        }`}
      >
        <a
          className="brand"
          href="#top"
          onClick={() => navigate('Overview')}
          aria-label="Blood Connect home"
        >
          <span className="brand-mark">
            <Droplet
              size={22}
              fill="currentColor"
              strokeWidth={1.8}
            />
          </span>
          <span className="brand-name">
            blood<span>connect</span>
          </span>
        </a>

        <div className="side-label">YOUR SPACE</div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-link ${
                page === label ? 'active' : ''
              }`}
              onClick={() => navigate(label)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>

              {label === 'Emergency requests' &&
                requests.length > 0 && (
                  <span className="nav-count">
                    {requests.length}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="impact-note">
          <div className="impact-icon">
            <Heart size={17} fill="currentColor" />
          </div>
          <p>
            One donation can save{' '}
            <strong>up to three lives.</strong>
          </p>
          <span>Be someone's reason to hope.</span>
        </div>

        <div className="sidebar-foot">
          <span
            className={`connection-dot ${
              apiOnline ? 'is-live' : ''
            }`}
          />
          <span>
            {loading
              ? 'Connecting to service'
              : apiOnline
                ? 'Live community data'
                : 'Preview mode'}
          </span>
          <button
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
      </aside>

      <main id="top" className="main-content">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            <span>Community</span>
            <ArrowRight size={14} />
            <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <button
              className="location-chip"
              onClick={() => {
                setPage('Find donors')
                document
                  .getElementById('donor-location')
                  ?.focus()
              }}
            >
              <MapPin size={15} />
              <span>{user?.location || 'Choose an area'}</span>
              <ChevronDown size={14} />
            </button>

            <span className="topbar-divider" />

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() =>
                setNotice("You're all caught up.")
              }
            >
              <Bell size={18} />
            </button>

            <button
              className="profile-button"
              onClick={() => setPage('Profile')}
              aria-label="Open profile"
            >
              <span className="profile-avatar">
                {user?.name?.[0]?.toUpperCase() || 'M'}
              </span>
              <span className="profile-name">
                {user?.name || 'My profile'}
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="page-wrap">
          {page === 'Overview' && (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-line" />
                    MONDAY, OCTOBER 5, 2026
                  </p>

                  <h1>
                    Good things happen
                    <br />
                    <em>when we show up.</em>
                  </h1>

                  <p className="welcome-copy">
                    A little help can mean everything. Find a
                    donor nearby or raise a request for someone
                    who needs one.
                  </p>

                  <div className="welcome-actions">
                    <button
                      className="button button-primary"
                      onClick={() =>
                        navigate('Find donors')
                      }
                    >
                      <Search size={17} />
                      Find a donor
                      <ArrowRight size={16} />
                    </button>

                    <button
                      className="button button-quiet"
                      onClick={() => setModal('request')}
                    >
                      <Plus size={17} />
                      Post a request
                    </button>
                  </div>
                </div>

                <div className="welcome-visual">
                  <img
                    src="https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1100&q=85"
                    alt="Blood donation bag prepared at a clinic"
                  />
                  <div className="visual-overlay" />
                  <div className="visual-caption">
                    <span className="visual-caption-icon">
                      <Heart size={15} fill="currentColor" />
                    </span>
                    <span>
                      <strong>Every drop matters</strong>
                      <small>Show up for someone today</small>
                    </span>
                  </div>
                  <div className="visual-index">
                    01 <span>/</span> 03
                  </div>
                </div>
              </section>

              <section
                className="stat-strip"
                aria-label="Community impact"
              >
                <div className="stat-item">
                  <span className="stat-icon stat-red">
                    <UsersRound size={18} />
                  </span>
                  <div>
                    <strong>{donors.length}</strong>
                    <span>donors in the community</span>
                  </div>
                </div>

                <span className="stat-separator" />

                <div className="stat-item">
                  <span className="stat-icon stat-green">
                    <Heart size={18} />
                  </span>
                  <div>
                    <strong>
                      {requests.reduce(
                        (total, request) =>
                          total +
                          Number(request.unitsRequired || 0),
                        0
                      )}
                    </strong>
                    <span>blood units requested</span>
                  </div>
                </div>

                <span className="stat-separator" />

                <div className="stat-item">
                  <span className="stat-icon stat-yellow">
                    <Clock3 size={18} />
                  </span>
                  <div>
                    <strong>
                      {
                        donors.filter(
                          (donor) => donor.available
                        ).length
                      }
                    </strong>
                    <span>active donors</span>
                  </div>
                </div>

                <div className="stat-note">
                  <span className="live-pulse" />
                  Updated just now
                </div>
              </section>

              <section
                className="quick-actions"
                aria-label="Blood Connect actions"
              >
                <article className="quick-action">
                  <span className="quick-action-icon">
                    <Search size={19} />
                  </span>
                  <div>
                    <h3>Find blood</h3>
                    <p>Find compatible donors near you.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() =>
                      navigate('Find donors')
                    }
                  >
                    Search donors <ArrowRight size={15} />
                  </button>
                </article>

                <article className="quick-action">
                  <span className="quick-action-icon">
                    <Droplet size={19} />
                  </span>
                  <div>
                    <h3>Donate blood</h3>
                    <p>Your donation could help save a life.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setModal('donor')}
                  >
                    Become a donor <ArrowRight size={15} />
                  </button>
                </article>

                <article className="quick-action">
                  <span className="quick-action-icon">
                    <Activity size={19} />
                  </span>
                  <div>
                    <h3>Emergency request</h3>
                    <p>Create or view an urgent request.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setModal('request')}
                  >
                    Request blood <ArrowRight size={15} />
                  </button>
                </article>

                <article className="quick-action">
                  <span className="quick-action-icon">
                    <Hospital size={19} />
                  </span>
                  <div>
                    <h3>Hospitals &amp; blood banks</h3>
                    <p>Explore care providers nearby.</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate('Hospitals')}
                  >
                    Explore hospitals <ArrowRight size={15} />
                  </button>
                </article>
              </section>

              <section className="content-grid">
                <div
                  className="section-block donor-block"
                  id="donor-search"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">
                        <span className="eyebrow-line" />
                        START HERE
                      </p>
                      <h2>
                        Find your <em>match.</em>
                      </h2>
                    </div>
                    <button
                      className="text-link"
                      onClick={() =>
                        setPage('Find donors')
                      }
                    >
                      All donors <ArrowRight size={15} />
                    </button>
                  </div>

                  <div className="search-panel">
                    <label className="search-field">
                      <Search size={17} />
                      <input
                        id="donor-location"
                        value={location}
                        onChange={(event) =>
                          setLocation(event.target.value)
                        }
                        placeholder="Search a neighborhood or city"
                        aria-label="Search a neighborhood or city"
                      />
                    </label>

                    <label className="select-field">
                      <span className="sr-only">
                        Blood group
                      </span>
                      <select
                        value={group}
                        onChange={(event) =>
                          setGroup(event.target.value)
                        }
                      >
                        {groups.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} />
                    </label>

                    <button
                      className="search-submit"
                      aria-label="Search donors"
                      onClick={() =>
                        setPage('Find donors')
                      }
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>

                  <div className="donor-list">
                    {filteredDonors
                      .slice(
                        0,
                        page === 'Find donors' ? 20 : 3
                      )
                      .map((donor, index) => (
                        <DonorRow
                          key={donor.id}
                          donor={donor}
                          index={index}
                          onContact={() =>
                            setNotice(
                              'Contact coordination is available through a verified request workflow.'
                            )
                          }
                        />
                      ))}

                    {!loading &&
                      filteredDonors.length === 0 && (
                        <div className="empty-state">
                          <span className="empty-icon">
                            <Search size={20} />
                          </span>
                          <strong>No matches yet</strong>
                          <span>
                            Try another blood group or nearby
                            area.
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div
                  className="section-block requests-block"
                  id="requests-list"
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">
                        <span className="eyebrow-line" />
                        NEEDS NEAR YOU
                      </p>
                      <h2>
                        Open <em>requests.</em>
                      </h2>
                    </div>
                    <button
                      className="round-add"
                      aria-label="Post a blood request"
                      onClick={() => setModal('request')}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="request-list">
                    {requests
                      .slice(0, 3)
                      .map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          onRespond={() =>
                            setNotice(
                              `Call ${request.contactNumber} to respond to this request.`
                            )
                          }
                        />
                      ))}

                    {!loading && requests.length === 0 && (
                      <div className="empty-state">
                        <span className="empty-icon">
                          <Heart size={20} />
                        </span>
                        <strong>No open requests</strong>
                        <span>
                          New requests from your community
                          will appear here.
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    className="all-requests-link"
                    onClick={() =>
                      setPage('Emergency requests')
                    }
                  >
                    See all requests <ArrowRight size={15} />
                  </button>
                </div>
              </section>

              <section className="become-donor-banner">
                <div className="banner-mark">
                  <Droplet size={23} fill="currentColor" />
                </div>
                <div className="banner-copy">
                  <span>GIVE WHAT YOU CAN</span>
                  <h3>
                    Someone's next chapter could start with you.
                  </h3>
                </div>
                <button
                  className="button button-light"
                  onClick={() => setModal('donor')}
                >
                  Become a donor <ArrowRight size={16} />
                </button>
                <ArrowDownRight
                  className="banner-arrow"
                  size={88}
                  strokeWidth={0.8}
                />
              </section>
            </>
          )}

          {page === 'Find donors' && (
            <section className="standalone-view">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                THE DONOR NETWORK
              </p>
              <h1>
                People who <em>show up.</em>
              </h1>
              <p className="welcome-copy">
                Search available donors by blood group and
                neighborhood.
              </p>

              <div className="search-panel search-panel-wide">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    placeholder="Search a neighborhood or city"
                    aria-label="Search a neighborhood or city"
                  />
                </label>

                <label className="select-field">
                  <span className="sr-only">Blood group</span>
                  <select
                    value={group}
                    onChange={(event) =>
                      setGroup(event.target.value)
                    }
                  >
                    {groups.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>

              <div className="results-caption">
                {filteredDonors.length}{' '}
                {filteredDonors.length === 1
                  ? 'donor'
                  : 'donors'}{' '}
                available <span>·</span> Based on your filters
              </div>

              <div className="standalone-donor-list">
                {filteredDonors.map((donor, index) => (
                  <DonorRow
                    key={donor.id}
                    donor={donor}
                    index={index}
                    onContact={() =>
                      setNotice(
                        'Contact details are not displayed publicly. Use the request workflow to coordinate safely.'
                      )
                    }
                  />
                ))}

                {!loading &&
                  !filteredDonors.length && (
                    <div className="empty-state">
                      <strong>No donors found</strong>
                      <span>
                        Donors who match your filters will
                        appear here.
                      </span>
                      <button
                        className="button button-primary"
                        onClick={() => setModal('donor')}
                      >
                        Register as a donor
                      </button>
                    </div>
                  )}
              </div>
            </section>
          )}

          {page === 'Emergency requests' && (
            <section className="standalone-view">
              <div className="standalone-title-row">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-line" />
                    COMMUNITY BOARD
                  </p>
                  <h1>
                    When it <em>can't wait.</em>
                  </h1>
                  <p className="welcome-copy">
                    Open requests from people in your community.
                  </p>
                </div>

                <button
                  className="button button-primary"
                  onClick={() => setModal('request')}
                >
                  <Plus size={17} /> Post a request
                </button>
              </div>

              <div className="standalone-request-list">
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onRespond={() =>
                      setNotice(
                        'Response options are shared with the request coordinator. Please contact the listed hospital directly.'
                      )
                    }
                  />
                ))}

                {!loading && !requests.length && (
                  <div className="empty-state">
                    <strong>
                      No open requests right now
                    </strong>
                    <span>
                      Check back soon or help grow the donor
                      community.
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'Hospitals' && (
            <section className="standalone-view directory-view">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                CARE NEAR YOU
              </p>
              <h1>
                Hospitals &amp; <em>blood banks.</em>
              </h1>
              <p className="welcome-copy">
                Hospital and blood bank profiles will appear
                here when they are added.
              </p>
              <div className="directory-empty">
                <span className="directory-icon">
                  <Hospital size={20} />
                </span>
                <strong>No facilities listed yet</strong>
                <span>
                  This directory has no hospital or blood bank
                  records.
                </span>
              </div>
            </section>
          )}

          {page === 'Smart matching' && (
            <section className="standalone-view matching-view">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                SMART DONOR MATCHING
              </p>
              <h1>
                Good people,
                <br />
                <em>closer together.</em>
              </h1>
              <p className="welcome-copy">
                Donors are compared with requests using the
                blood-group rules configured in this app. This
                is a coordination aid, not medical advice.
              </p>

              <div className="matching-list">
                {requests.slice(0, 6).map((request) => {
                  const allowed =
                    compatibleGroups[request.bloodGroup] || []

                  const matches = donors
                    .filter(
                      (donor) =>
                        allowed.includes(donor.bloodGroup) &&
                        donor.available
                    )
                    .slice(0, 3)

                  return (
                    <article
                      className="matching-request"
                      key={request.id}
                    >
                      <div className="matching-request-heading">
                        <span
                          className={`urgency-tag ${
                            String(request.urgency).toLowerCase() ===
                            'critical'
                              ? 'critical'
                              : ''
                          }`}
                        >
                          <span />
                          {request.urgency}
                        </span>
                        <span>
                          {request.bloodGroup} · {request.location}
                        </span>
                      </div>

                      <h2>{request.hospitalName}</h2>
                      <p>
                        {request.unitsRequired}{' '}
                        {request.unitsRequired === 1
                          ? 'unit'
                          : 'units'}{' '}
                        requested
                      </p>

                      {matches.length ? (
                        matches.map((donor) => (
                          <div
                            className="match-row"
                            key={donor.id}
                          >
                            <span className="donor-avatar">
                              {donor.name?.[0] || 'D'}
                            </span>
                            <div>
                              <strong>{donor.name}</strong>
                              <span>
                                {donor.bloodGroup} ·{' '}
                                {donor.location} · Available
                              </span>
                            </div>
                            <span className="match-score">
                              {donor.bloodGroup ===
                              request.bloodGroup
                                ? 'Same group'
                                : 'Compatible'}
                              <small>blood-group match</small>
                            </span>
                            <button
                              className="contact-button"
                              onClick={() =>
                                setNotice(
                                  'For privacy, contact details are shared only through a verified request workflow.'
                                )
                              }
                            >
                              View match <ArrowRight size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="no-match">
                          No matching available profiles currently.
                        </p>
                      )}
                    </article>
                  )
                })}

                {!requests.length && (
                  <div className="empty-state">
                    <strong>No requests to match yet</strong>
                    <span>
                      Requests will appear here after they are
                      submitted.
                    </span>
                  </div>
                )}
              </div>

              <p className="matching-disclaimer">
                Blood-group matching is limited to the rules
                configured here. A qualified healthcare
                professional must confirm clinical compatibility
                before any transfusion.
              </p>
            </section>
          )}

          {page === 'Donor dashboard' && (
            <section className="standalone-view donor-dashboard">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                YOUR DONOR SPACE
              </p>
              <h1>
                Welcome,{' '}
                <em>{user?.name?.split(' ')[0] || 'neighbor'}.</em>
              </h1>
              <p className="welcome-copy">
                Your availability helps people know when to
                reach out.
              </p>

              <div className="donor-metrics">
                <article>
                  <span>Blood group</span>
                  <strong>{donorBloodGroup || 'Not set'}</strong>
                </article>
                <article>
                  <span>Donations</span>
                  <strong>Not recorded</strong>
                </article>
                <article>
                  <span>Last donation</span>
                  <strong>
                    {currentDonor?.lastDonationDate ||
                      'Not recorded'}
                  </strong>
                </article>
                <article>
                  <span>Availability</span>
                  <strong
                    className={
                      currentDonor?.available
                        ? 'status-available'
                        : 'status-unavailable'
                    }
                  >
                    {currentDonor
                      ? currentDonor.available
                        ? 'Available'
                        : 'Not available'
                      : 'Profile needed'}
                  </strong>
                </article>
              </div>

              <div className="dashboard-section-title">
                <div>
                  <p className="eyebrow">
                    <span className="eyebrow-line" />
                    NEARBY COMMUNITY
                  </p>
                  <h2>Recent matching requests</h2>
                </div>

                <button
                  className="button button-quiet"
                  onClick={() =>
                    user?.donorId
                      ? updateDonorAvailability()
                      : setModal('donor')
                  }
                >
                  {user?.donorId
                    ? 'Update availability'
                    : 'Register as donor'}
                </button>
              </div>

              <div className="standalone-request-list">
                {matchingRequests.slice(0, 4).map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onRespond={() =>
                      setNotice(
                        'Thanks for offering to help. Contact coordination is handled through the request organizer.'
                      )
                    }
                  />
                ))}

                {!matchingRequests.length && (
                  <div className="empty-state">
                    <strong>No matching requests</strong>
                    <span>
                      Requests compatible with your listed
                      blood group will appear here.
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'Notifications' && (
            <section className="standalone-view notifications-view">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                YOUR UPDATES
              </p>
              <h1>
                Stay <em>in the loop.</em>
              </h1>
              <p className="welcome-copy">
                Updates related to your account and requests
                will appear here.
              </p>
              <div className="notification-empty">
                <Bell size={20} />
                <strong>No notifications yet</strong>
                <span>You are all caught up.</span>
              </div>
            </section>
          )}

          {/* UPDATED PROFILE PAGE */}
          {page === 'Profile' && (
            <section className="standalone-view profile-view">
              <p className="eyebrow">
                <span className="eyebrow-line" />
                YOUR ACCOUNT
              </p>

              <h1>
                Your <em>profile.</em>
              </h1>

              <article className="profile-card">
                <div className="profile-large-avatar">
                  {user?.name?.[0]?.toUpperCase() || 'M'}
                </div>

                <div className="profile-card-heading">
                  <h2>{user?.name || 'Community member'}</h2>
                  <span className="verified-label">
                    <ShieldCheck size={14} />
                    {user?.role || 'USER'}
                  </span>
                </div>

                {editingProfile ? (
                  <form
                    className="modal-form profile-edit-form"
                    onSubmit={saveProfile}
                  >
                    {profileError && (
                      <div
                        className="profile-error"
                        role="alert"
                      >
                        {profileError}
                      </div>
                    )}

                    <div className="form-grid">
                      <Field
                        label="Full name"
                        name="name"
                        placeholder="Enter your full name"
                        required
                        defaultValue={user?.name || ''}
                      />

                      <Field
                        label="Email address"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        defaultValue={user?.email || ''}
                      />

                      <Field
                        label="Phone number"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        required
                        defaultValue={user?.phone || ''}
                      />

                      <Field
                        label="Blood group"
                        name="bloodGroup"
                        as="select"
                        options={groups.slice(1)}
                        required
                        defaultValue={user?.bloodGroup || ''}
                      />

                      <Field
                        label="Location"
                        name="location"
                        placeholder="Enter your area or city"
                        required
                        defaultValue={user?.location || ''}
                      />
                    </div>

                    <p className="privacy-note">
                      <ShieldCheck size={15} />
                      Your changes will be saved to your account.
                    </p>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="button button-quiet"
                        disabled={profileSaving}
                        onClick={() => {
                          setEditingProfile(false)
                          setProfileError('')
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="button button-primary"
                        disabled={profileSaving}
                      >
                        {profileSaving
                          ? 'Saving...'
                          : 'Save changes'}
                        {!profileSaving && (
                          <Check size={16} />
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <dl>
                      <div>
                        <dt>Email</dt>
                        <dd>
                          {user?.email || 'Not provided'}
                        </dd>
                      </div>

                      <div>
                        <dt>Phone</dt>
                        <dd>
                          {user?.phone || 'Not provided'}
                        </dd>
                      </div>

                      <div>
                        <dt>Blood group</dt>
                        <dd>
                          {user?.bloodGroup || 'Not provided'}
                        </dd>
                      </div>

                      <div>
                        <dt>Location</dt>
                        <dd>
                          {user?.location || 'Not provided'}
                        </dd>
                      </div>

                      <div>
                        <dt>Account type</dt>
                        <dd>
                          {user?.role || 'Community member'}
                        </dd>
                      </div>
                    </dl>

                    <div className="profile-actions">
                      <button
                        className="button button-quiet"
                        onClick={() => {
                          setProfileError('')
                          setEditingProfile(true)
                        }}
                      >
                        Edit profile
                      </button>

                      <button
                        className="button button-primary"
                        onClick={signOut}
                      >
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </article>
            </section>
          )}

          <footer className="page-footer">
            <span>© 2026 Blood Connect</span>
            <span>
              <ShieldCheck size={14} />
              Your care stays in your community
            </span>
            <button className="text-link" onClick={signOut}>
              Log out
            </button>
            <a href="mailto:hello@bloodconnect.org">
              Need help?
            </a>
          </footer>
        </div>
      </main>

      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}

      {modal && (
        <Modal
          title={
            modal === 'request'
              ? 'Raise a blood request'
              : 'Join the donor community'
          }
          subtitle={
            modal === 'request'
              ? 'Share the details so nearby donors know how to help.'
              : 'Add your details so people nearby can reach you.'
          }
          onClose={() => setModal('')}
        >
          {modal === 'request' ? (
            <form
              className="modal-form"
              onSubmit={(event) => {
                event.preventDefault()
                submitRequest(event.currentTarget)
              }}
            >
              <div className="form-grid">
                <Field
                  label="Patient name"
                  name="patientName"
                  placeholder="Enter patient name"
                  required
                />
                <Field
                  label="Blood group"
                  name="bloodGroup"
                  as="select"
                  options={groups.slice(1)}
                  required
                />
                <Field
                  label="Units needed"
                  name="unitsRequired"
                  type="number"
                  min="1"
                  placeholder="Enter units"
                  required
                />
                <Field
                  label="Required date"
                  name="requiredDate"
                  type="date"
                  required
                />
                <Field
                  label="Emergency level"
                  name="urgency"
                  as="select"
                  options={['Normal', 'Urgent', 'Critical']}
                  required
                />
                <Field
                  label="Hospital"
                  name="hospitalName"
                  placeholder="Enter hospital name"
                  required
                />
                <Field
                  label="Area / city"
                  name="location"
                  placeholder="Enter location"
                  required
                />
                <Field
                  label="Contact number"
                  name="contactNumber"
                  type="tel"
                  placeholder="Enter contact number"
                  required
                />
              </div>

              <label className="form-label">
                Additional message
                <textarea
                  name="message"
                  rows="3"
                  placeholder="Anything donors should know?"
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setModal('')}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Posting…' : 'Post request'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form
              className="modal-form"
              onSubmit={(event) => {
                event.preventDefault()
                submitDonor(event.currentTarget)
              }}
            >
              <div className="form-grid">
                <Field
                  label="Your name"
                  name="name"
                  placeholder="Enter your name"
                  required
                />
                <Field
                  label="Blood group"
                  name="bloodGroup"
                  as="select"
                  options={groups.slice(1)}
                  required
                />
                <Field
                  label="Age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Enter your age"
                  required
                />
                <Field
                  label="Phone number"
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  required
                />
                <Field
                  label="Area / city"
                  name="location"
                  placeholder="Enter location"
                  required
                />
                <Field
                  label="Last donation"
                  name="lastDonationDate"
                  type="date"
                />
              </div>

              <p className="privacy-note">
                <ShieldCheck size={15} />
                Your contact details and age are not shown in
                donor search. Donation eligibility should be
                confirmed by qualified healthcare staff.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setModal('')}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : 'Join the donor list'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {notice && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function DonorRow({ donor, index, onContact }) {
  const initials =
    donor.name
      ?.split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'D'

  return (
    <article
      className="donor-row"
      style={{ '--row-index': index }}
    >
      <div className={`donor-avatar avatar-${index % 4}`}>
        {initials}
      </div>

      <div className="donor-info">
        <strong>{donor.name}</strong>
        <span>
          <MapPin size={12} />
          {donor.location} ·{' '}
          {donor.available ? 'Available' : 'Unavailable'}
        </span>
      </div>

      <span className="blood-pill">{donor.bloodGroup}</span>

      <button className="contact-button" onClick={onContact}>
        Contact <ArrowRight size={14} />
      </button>
    </article>
  )
}

function RequestCard({ request, onRespond }) {
  const critical =
    String(request.urgency).toLowerCase() === 'critical'

  return (
    <article className="request-card">
      <div className="request-top">
        <span
          className={`urgency-tag ${
            critical ? 'critical' : ''
          }`}
        >
          <span />
          {request.urgency}
        </span>

        <span className="request-time">
          {request.createdAt
            ? timeAgo(request.createdAt)
            : 'Just now'}
        </span>
      </div>

      <div className="request-patient">
        <span className="request-blood">
          {request.bloodGroup}
        </span>
        <div>
          <strong>{request.patientName}</strong>
          <span>
            {request.unitsRequired}{' '}
            {request.unitsRequired === 1 ? 'unit' : 'units'}{' '}
            needed
          </span>
        </div>
      </div>

      <div className="request-place">
        <strong>{request.hospitalName}</strong>
        <span>
          <MapPin size={12} />
          {request.location}
        </span>
      </div>

      <button className="respond-link" onClick={onRespond}>
        I can help <ArrowRight size={15} />
      </button>
    </article>
  )
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () =>
      window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <span className="modal-mark">
          <Droplet size={19} fill="currentColor" />
        </span>

        <h2 id="modal-title">{title}</h2>
        <p className="modal-subtitle">{subtitle}</p>

        {children}
      </section>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  as,
  options = [],
  min,
  max,
  defaultValue,
}) {
  return (
    <label className="form-label">
      {label}

      {as === 'select' ? (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue || ''}
        >
          <option value="" disabled>
            Select one
          </option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          defaultValue={defaultValue}
        />
      )}
    </label>
  )
}

export default App
