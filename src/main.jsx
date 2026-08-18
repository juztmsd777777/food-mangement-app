import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  Bell,
  Boxes,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  HandHeart,
  HeartHandshake,
  IdCard,
  Loader2,
  LogIn,
  LogOut,
  PackageCheck,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  Warehouse,
  Zap,
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const roleMeta = {
  donor: {
    label: 'Food Donor',
    caption: 'List surplus food',
    icon: HandHeart
  },
  volunteer: {
    label: 'Field Volunteer',
    caption: 'Pickup & delivery',
    icon: Truck
  },
  ngo: {
    label: 'NGO Admin',
    caption: 'Operations & stock',
    icon: ShieldCheck
  }
};

function getPagesForUser(user) {
  if (!user) return [];
  if (user.role === 'donor') {
    return [{ id: 'upload', label: 'Upload Surplus Food', icon: PackageCheck }];
  }
  if (user.role === 'volunteer') {
    if (user.verified) {
      return [
        { id: 'request', label: 'Claim & Request Runs', icon: Send },
        { id: 'runs', label: 'My Assigned Runs', icon: Truck }
      ];
    }
    return [{ id: 'verify', label: 'Verification Status', icon: IdCard }];
  }
  if (user.role === 'ngo') {
    return [
      { id: 'stock', label: 'Stock Overview', icon: Warehouse },
      { id: 'audit', label: 'Audit Trail', icon: FileText },
      { id: 'approvals', label: 'Run Approvals & Dispatch', icon: ClipboardCheck },
      { id: 'verification', label: 'Verify Volunteers', icon: UserCheck }
    ];
  }
  return [];
}

function App() {
  const [state, setState] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('foodbridge_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeRole, setActiveRole] = useState(user?.role || 'donor');
  const [pageByRole, setPageByRole] = useState({ donor: 'upload', volunteer: 'verify', ngo: 'stock' });
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const api = async (path, options = {}, success = 'Done') => {
    setBusyAction(path);
    setError('');
    try {
      const response = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Request failed');
      setState(payload);
      setNotice(success);

      // Refresh currentUser state if updated in backend
      if (user && payload.volunteers) {
        const updatedSelf = payload.volunteers.find((v) => v.id === user.id);
        if (updatedSelf) {
          if (updatedSelf.verified !== user.verified || updatedSelf.isAvailable !== user.isAvailable || updatedSelf.runsCompleted !== user.runsCompleted) {
            const newUser = { ...user, verified: updatedSelf.verified, isAvailable: updatedSelf.isAvailable, runsCompleted: updatedSelf.runsCompleted };
            setUser(newUser);
            localStorage.setItem('foodbridge_user', JSON.stringify(newUser));
          }
        }
      }

      return payload;
    } catch (apiError) {
      setError(apiError.message);
      return null;
    } finally {
      setBusyAction('');
    }
  };

  const refresh = () => api('/bootstrap', undefined, 'Data refreshed');

  useEffect(() => {
    refresh();
  }, []);

  const loginUser = (sessionUser) => {
    setUser(sessionUser);
    setActiveRole(sessionUser.role);

    if (sessionUser.role === 'volunteer') {
      const initialTab = sessionUser.verified ? 'request' : 'verify';
      setPageByRole((prev) => ({ ...prev, volunteer: initialTab }));
    }

    localStorage.setItem('foodbridge_user', JSON.stringify(sessionUser));
    setNotice(`Welcome ${sessionUser.name}! Logged in as ${roleMeta[sessionUser.role]?.label}.`);
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('foodbridge_user');
    setNotice('Logged out safely.');
  };

  const helpers = useMemo(() => createHelpers(state), [state]);

  const availablePages = getPagesForUser(user);
  const currentPageId = pageByRole[user?.role] || availablePages[0]?.id || 'upload';

  useEffect(() => {
    if (user?.role === 'volunteer') {
      if (user.verified && currentPageId === 'verify') {
        setPageByRole((prev) => ({ ...prev, volunteer: 'request' }));
      } else if (!user.verified && currentPageId !== 'verify') {
        setPageByRole((prev) => ({ ...prev, volunteer: 'verify' }));
      }
    }
  }, [user, currentPageId]);

  if (!state) {
    return (
      <main className="boot-screen">
        <Loader2 className="spin" size={32} />
        <span>Loading FoodBridge...</span>
      </main>
    );
  }

  // Logged-out state: Render Portal Login & Sign-Up Screen
  if (!user) {
    return <AuthPortalPage api={api} busyAction={busyAction} loginUser={loginUser} state={state} />;
  }

  return (
    <div className="app-shell">
      {/* Header Bar */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-badge">
            <div className="brand-icon">
              <HeartHandshake size={22} />
            </div>
            <div className="brand-text">
              <strong>FoodBridge</strong>
              <span>Food Rescue Network</span>
            </div>
          </div>

          {/* User Identity Pill & Controls */}
          <div className="header-right">
            <div className="user-profile-pill">
              <div className="user-avatar">{user.name.charAt(0)}</div>
              <div>
                <span className="user-name">{user.name}</span>
              </div>
              <span className="user-role-badge">
                {roleMeta[user.role]?.label || user.role}
                {user.role === 'volunteer' && (user.verified ? ' (Verified)' : ' (Pending)')}
              </span>
            </div>

            <div className="metric-pill">
              <span className="metric-dot" />
              <span>{state.metrics.mealsDistributed || 0} Meals Served</span>
            </div>
            <button className="btn-icon" onClick={refresh} title="Refresh data" type="button">
              <RefreshCw size={16} />
            </button>
            <button className="btn-secondary" onClick={logoutUser} title="Log out" type="button">
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub Navigation Bar for Pages */}
      {availablePages.length > 1 && (
        <nav className="sub-nav-bar" aria-label={`${roleMeta[user.role]?.label} pages`}>
          <div className="sub-nav-container">
            {availablePages.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={currentPageId === item.id ? 'page-tab active' : 'page-tab'}
                  key={item.id}
                  onClick={() => setPageByRole({ ...pageByRole, [user.role]: item.id })}
                  type="button"
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className="main-container">
        <div className="page-header">
          <div>
            <h1 className="page-header-title">{pageTitle(user.role, currentPageId)}</h1>
            <p className="page-header-subtitle">{pageSubtitle(user.role, currentPageId)}</p>
          </div>
        </div>

        {/* System Notice or Error */}
        {(notice || error) && (
          <div className={error ? 'notice-banner error' : 'notice-banner'}>
            <Bell size={18} />
            <span>{error || notice}</span>
          </div>
        )}

        {/* Page Renderers */}
        {user.role === 'donor' && <DonorUploadPage api={api} busyAction={busyAction} helpers={helpers} state={state} user={user} />}
        {user.role === 'volunteer' && !user.verified && (
          <VolunteerStatusPage state={state} user={user} />
        )}
        {user.role === 'volunteer' && user.verified && currentPageId === 'request' && (
          <VolunteerRequestPage
            api={api}
            busyAction={busyAction}
            helpers={helpers}
            state={state}
            user={user}
          />
        )}
        {user.role === 'volunteer' && user.verified && currentPageId === 'runs' && (
          <VolunteerRunsPage api={api} helpers={helpers} state={state} user={user} />
        )}
        {user.role === 'ngo' && currentPageId === 'stock' && <NgoStockPage helpers={helpers} state={state} user={user} />}
        {user.role === 'ngo' && currentPageId === 'audit' && <NgoAuditPage state={state} user={user} />}
        {user.role === 'ngo' && currentPageId === 'approvals' && (
          <NgoApprovalPage api={api} busyAction={busyAction} helpers={helpers} state={state} user={user} />
        )}
        {user.role === 'ngo' && currentPageId === 'verification' && (
          <NgoVerificationPage api={api} busyAction={busyAction} state={state} user={user} />
        )}
      </main>
    </div>
  );
}

/* Authentication Portal Component */
function AuthPortalPage({ api, busyAction, loginUser, state }) {
  const [authMode, setAuthMode] = useState('signin');
  const [selectedRole, setSelectedRole] = useState('donor');

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [ngoForm, setNgoForm] = useState({ name: '', email: '', password: '', zone: 'North Zone', address: '', contact: '', storageCapacity: 500 });
  const [volForm, setVolForm] = useState({ name: '', email: '', password: '', phone: '', zone: 'North Zone', vehicle: 'Bike', idProof: '' });
  const [donorForm, setDonorForm] = useState({ name: '', email: '', password: '', contact: '', address: '' });

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          email: signInEmail.trim(),
          password: signInPassword
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      loginUser(data.user);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    let payload = { role: selectedRole };
    if (selectedRole === 'ngo') payload = { ...payload, ...ngoForm };
    if (selectedRole === 'volunteer') payload = { ...payload, ...volForm };
    if (selectedRole === 'donor') payload = { ...payload, ...donorForm };

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      loginUser(data.user);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-hero">
        <div className="brand-icon" style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto' }}>
          <HeartHandshake size={32} />
        </div>
        <h1>FoodBridge Portal</h1>
        <p>Sign in to your account or register a new user with Email & Password.</p>

        <div style={{ display: 'inline-flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '12px', marginTop: '16px' }}>
          <button
            className={authMode === 'signin' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setAuthMode('signin')}
            style={{ padding: '8px 20px' }}
            type="button"
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            className={authMode === 'signup' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setAuthMode('signup')}
            style={{ padding: '8px 20px' }}
            type="button"
          >
            <UserPlus size={16} />
            <span>Sign Up (Register)</span>
          </button>
        </div>
      </div>

      <div className="login-role-selector">
        <div
          className={selectedRole === 'donor' ? 'login-role-card active' : 'login-role-card'}
          onClick={() => setSelectedRole('donor')}
        >
          <div className="login-role-icon">
            <HandHeart size={26} />
          </div>
          <span className="login-role-title">Food Donor</span>
          <span className="login-role-desc">Restaurants, banquets, catering & kitchens uploading surplus meals.</span>
        </div>

        <div
          className={selectedRole === 'volunteer' ? 'login-role-card active' : 'login-role-card'}
          onClick={() => setSelectedRole('volunteer')}
        >
          <div className="login-role-icon">
            <Truck size={26} />
          </div>
          <span className="login-role-title">Field Volunteer</span>
          <span className="login-role-desc">Drivers & rescue teams picking up and delivering food.</span>
        </div>

        <div
          className={selectedRole === 'ngo' ? 'login-role-card active' : 'login-role-card'}
          onClick={() => setSelectedRole('ngo')}
        >
          <div className="login-role-icon">
            <ShieldCheck size={26} />
          </div>
          <span className="login-role-title">NGO Admin</span>
          <span className="login-role-desc">Warehouse coordinators managing stock, runs, and verification.</span>
        </div>
      </div>

      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            {authMode === 'signin' ? <LogIn size={22} /> : <UserPlus size={22} />}
          </div>
          <div className="card-title-group">
            <h2>
              {authMode === 'signin' ? `Sign In as ${roleMeta[selectedRole]?.label}` : `Register New ${roleMeta[selectedRole]?.label}`}
            </h2>
            <p>
              {authMode === 'signin'
                ? 'Enter your registered Email Address and Password to continue.'
                : 'Create a new account. Details will be saved in your MongoDB database.'}
            </p>
          </div>
        </div>

        {authMode === 'signin' && (
          <form className="modern-form" onSubmit={handleSignIn}>
            <div className="field-group full-width">
              <label className="field-label">Registered Email Address *</label>
              <input
                className="field-input"
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="e.g. donor@example.com"
                required
              />
            </div>

            <div className="field-group full-width">
              <label className="field-label">Password *</label>
              <input
                className="field-input"
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="field-group full-width">
              <button className="btn-primary" type="submit">
                <LogIn size={18} />
                <span>Sign In</span>
              </button>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <form className="modern-form" onSubmit={handleSignUp}>
            <div className="field-group">
              <label className="field-label">Account Email Address *</label>
              <input
                className="field-input"
                type="email"
                value={
                  selectedRole === 'ngo'
                    ? ngoForm.email
                    : selectedRole === 'volunteer'
                    ? volForm.email
                    : donorForm.email
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedRole === 'ngo') setNgoForm({ ...ngoForm, email: val });
                  if (selectedRole === 'volunteer') setVolForm({ ...volForm, email: val });
                  if (selectedRole === 'donor') setDonorForm({ ...donorForm, email: val });
                }}
                placeholder="e.g. user@example.com"
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Create Password *</label>
              <input
                className="field-input"
                type="password"
                value={
                  selectedRole === 'ngo'
                    ? ngoForm.password
                    : selectedRole === 'volunteer'
                    ? volForm.password
                    : donorForm.password
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedRole === 'ngo') setNgoForm({ ...ngoForm, password: val });
                  if (selectedRole === 'volunteer') setVolForm({ ...volForm, password: val });
                  if (selectedRole === 'donor') setDonorForm({ ...donorForm, password: val });
                }}
                placeholder="Enter password"
                required
              />
            </div>

            {selectedRole === 'ngo' && (
              <>
                <div className="field-group">
                  <label className="field-label">NGO Organization Name *</label>
                  <input
                    className="field-input"
                    value={ngoForm.name}
                    onChange={(e) => setNgoForm({ ...ngoForm, name: e.target.value })}
                    placeholder="e.g. Hope Meals Foundation"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Operating Zone *</label>
                  <input
                    className="field-input"
                    value={ngoForm.zone}
                    onChange={(e) => setNgoForm({ ...ngoForm, zone: e.target.value })}
                    placeholder="e.g. North Zone"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Facility Address *</label>
                  <input
                    className="field-input"
                    value={ngoForm.address}
                    onChange={(e) => setNgoForm({ ...ngoForm, address: e.target.value })}
                    placeholder="e.g. 12 Relief Street"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Contact Phone *</label>
                  <input
                    className="field-input"
                    value={ngoForm.contact}
                    onChange={(e) => setNgoForm({ ...ngoForm, contact: e.target.value })}
                    placeholder="e.g. +91 90000 11001"
                    required
                  />
                </div>

                <div className="field-group full-width">
                  <label className="field-label">Storage Capacity (Meal Servings)</label>
                  <input
                    className="field-input"
                    type="number"
                    value={ngoForm.storageCapacity}
                    onChange={(e) => setNgoForm({ ...ngoForm, storageCapacity: e.target.value })}
                    placeholder="500"
                  />
                </div>
              </>
            )}

            {selectedRole === 'volunteer' && (
              <>
                <div className="field-group">
                  <label className="field-label">Full Name *</label>
                  <input
                    className="field-input"
                    value={volForm.name}
                    onChange={(e) => setVolForm({ ...volForm, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Phone Number *</label>
                  <input
                    className="field-input"
                    value={volForm.phone}
                    onChange={(e) => setVolForm({ ...volForm, phone: e.target.value })}
                    placeholder="e.g. +91 98888 12345"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Operating Zone *</label>
                  <input
                    className="field-input"
                    value={volForm.zone}
                    onChange={(e) => setVolForm({ ...volForm, zone: e.target.value })}
                    placeholder="e.g. Central Zone"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Vehicle Type *</label>
                  <input
                    className="field-input"
                    value={volForm.vehicle}
                    onChange={(e) => setVolForm({ ...volForm, vehicle: e.target.value })}
                    placeholder="e.g. Bike, Scooter, Car"
                    required
                  />
                </div>

                <div className="field-group full-width">
                  <label className="field-label">Government ID Reference *</label>
                  <input
                    className="field-input"
                    value={volForm.idProof}
                    onChange={(e) => setVolForm({ ...volForm, idProof: e.target.value })}
                    placeholder="e.g. AADHAAR-1045"
                    required
                  />
                </div>
              </>
            )}

            {selectedRole === 'donor' && (
              <>
                <div className="field-group full-width">
                  <label className="field-label">Establishment / Donor Name *</label>
                  <input
                    className="field-input"
                    value={donorForm.name}
                    onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })}
                    placeholder="e.g. Grand Palace Hotel"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Contact Phone *</label>
                  <input
                    className="field-input"
                    value={donorForm.contact}
                    onChange={(e) => setDonorForm({ ...donorForm, contact: e.target.value })}
                    placeholder="e.g. +91 97777 00000"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Address / Location *</label>
                  <input
                    className="field-input"
                    value={donorForm.address}
                    onChange={(e) => setDonorForm({ ...donorForm, address: e.target.value })}
                    placeholder="e.g. Station Road, Sector 4"
                    required
                  />
                </div>
              </>
            )}

            <div className="field-group full-width">
              <button className="btn-primary" type="submit">
                <UserPlus size={18} />
                <span>Create Account & Register</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* Donor Upload Page */
function DonorUploadPage({ api, busyAction, helpers, state, user }) {
  const [form, setForm] = useState({
    ngoId: state.ngos[0]?.id || '',
    donorName: user.name,
    donorContact: user.contact || '+91 90000 00000',
    donorAddress: user.address || 'City Area',
    foodName: '',
    foodType: 'Cooked meals',
    mealCount: '',
    pickupWindow: '',
    expiryWindow: '',
    notes: ''
  });

  const myLatest = state.donations.filter((d) => d.donorName.toLowerCase() === user.name.toLowerCase()).slice(0, 5);

  const submitDonation = (event) => {
    event.preventDefault();
    if (!form.ngoId && state.ngos.length > 0) {
      form.ngoId = state.ngos[0].id;
    }
    api(
      '/donations',
      { method: 'POST', body: JSON.stringify({ ...form, donorName: user.name, mealCount: Number(form.mealCount) }) },
      'Surplus food uploaded successfully! Verified volunteers will be notified.'
    );
  };

  return (
    <>
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <PackageCheck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Publish Food Surplus Listing</h2>
            <p>Enter details of excess food available for pickup and distribution.</p>
          </div>
        </div>

        <form className="modern-form" onSubmit={submitDonation}>
          <div className="field-group full-width">
            <label className="field-label">Target NGO Facility for Drop-off</label>
            {state.ngos.length === 0 ? (
              <div className="empty-box" style={{ padding: '12px' }}>
                No NGO facilities registered in database yet. An NGO Admin must register first.
              </div>
            ) : (
              <select
                className="field-select"
                value={form.ngoId || state.ngos[0]?.id}
                onChange={(e) => setForm({ ...form, ngoId: e.target.value })}
              >
                {state.ngos.map((ngo) => (
                  <option key={ngo.id} value={ngo.id}>
                    {ngo.name} ({ngo.zone} · Cap: {ngo.storageCapacity} meals)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">Food Item Description *</label>
            <input
              className="field-input"
              value={form.foodName}
              onChange={(e) => setForm({ ...form, foodName: e.target.value })}
              placeholder="e.g. Vegetable Biryani & Gravy"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Food Type *</label>
            <input
              className="field-input"
              value={form.foodType}
              onChange={(e) => setForm({ ...form, foodType: e.target.value })}
              placeholder="e.g. Cooked meals, Fresh produce, Packed food"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Estimated Meal Servings *</label>
            <input
              className="field-input"
              type="number"
              min="1"
              value={form.mealCount}
              onChange={(e) => setForm({ ...form, mealCount: e.target.value })}
              placeholder="e.g. 50"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Pickup Window *</label>
            <input
              className="field-input"
              value={form.pickupWindow}
              onChange={(e) => setForm({ ...form, pickupWindow: e.target.value })}
              placeholder="e.g. Today 7:30 PM - 8:30 PM"
              required
            />
          </div>

          <div className="field-group full-width">
            <label className="field-label">Best Before / Expiry Window *</label>
            <input
              className="field-input"
              value={form.expiryWindow}
              onChange={(e) => setForm({ ...form, expiryWindow: e.target.value })}
              placeholder="e.g. Best before 11:00 PM tonight"
              required
            />
          </div>

          <div className="field-group full-width">
            <label className="field-label">Handling & Packaging Notes</label>
            <textarea
              className="field-textarea"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Packaging details, temperature requirement, or entry notes."
            />
          </div>

          <div className="field-group full-width">
            <button className="btn-primary" disabled={busyAction === '/donations' || state.ngos.length === 0} type="submit">
              {busyAction === '/donations' ? <Loader2 className="spin" size={18} /> : <PackageCheck size={18} />}
              <span>Publish Surplus Food</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Clock size={22} />
          </div>
          <div className="card-title-group">
            <h2>Your Uploaded Food Listings</h2>
            <p>History of food batches published by {user.name}.</p>
          </div>
        </div>

        <div className="item-list">
          {myLatest.length === 0 && <div className="empty-box">No food listings published yet.</div>}
          {myLatest.map((donation) => (
            <div className="list-item-card" key={donation.id}>
              <div className="item-info">
                <div className="item-title-row">
                  <span className="item-title">{donation.foodName}</span>
                  <StatusBadge value={donation.status} />
                </div>
                <div className="item-meta">
                  <span className="meta-chip">🍱 {donation.mealCount} meals</span>
                  <span>·</span>
                  <span className="meta-chip">🏢 {helpers.ngoName(donation.ngoId)}</span>
                  <span>·</span>
                  <span className="meta-chip">📍 {donation.donorAddress}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Volunteer Unverified Application Status Page */
function VolunteerStatusPage({ state, user }) {
  return (
    <div className="card-panel">
      <div className="card-header">
        <div className="card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
          <Clock size={24} />
        </div>
        <div className="card-title-group">
          <h2>Application Pending NGO Verification</h2>
          <p>Your volunteer account details are under review by NGO coordinators.</p>
        </div>
      </div>

      <div className="notice-banner" style={{ background: '#fffbe6', borderColor: '#ffe58f', color: '#8c6b00', margin: '16px 0' }}>
        <Bell size={20} />
        <span>
          Thank you for registering! Your volunteer profile is currently queued for NGO verification. Once an NGO Admin approves your application, you will automatically be granted access to claim food pickup runs.
        </span>
      </div>

      <div className="table-container" style={{ marginTop: '16px' }}>
        <table className="modern-table">
          <tbody>
            <tr>
              <td><strong>Volunteer Name</strong></td>
              <td>{user.name}</td>
            </tr>
            <tr>
              <td><strong>Email Address</strong></td>
              <td>{user.email}</td>
            </tr>
            <tr>
              <td><strong>Phone Number</strong></td>
              <td>{user.phone}</td>
            </tr>
            <tr>
              <td><strong>Operating Zone</strong></td>
              <td>{user.zone}</td>
            </tr>
            <tr>
              <td><strong>Vehicle Type</strong></td>
              <td>{user.vehicle}</td>
            </tr>
            <tr>
              <td><strong>ID Reference Proof</strong></td>
              <td>{user.idProof}</td>
            </tr>
            <tr>
              <td><strong>Verification Status</strong></td>
              <td>
                <span className="badge-status pending_ngo">PENDING NGO VERIFICATION</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Volunteer Request Page (For Verified Volunteers) with Availability Toggle & Direct Invites */
function VolunteerRequestPage({ api, busyAction, helpers, state, user }) {
  const [destination, setDestination] = useState('Local Community Shelter');
  const activeVolId = user.id;

  const currentVolObj = state.volunteers.find((v) => v.id === activeVolId) || user;
  const isAvailable = Boolean(currentVolObj.isAvailable);

  const openDonations = state.donations.filter((d) => d.status === 'OPEN');
  const availableInventory = state.inventory.filter((item) => item.status === 'AVAILABLE');
  const myRequests = state.pickupRequests.filter((r) => r.volunteerId === activeVolId);

  // Incoming Direct Dispatch Offers from NGOs
  const directInvites = state.pickupRequests.filter(
    (r) => r.volunteerId === activeVolId && r.status === 'DIRECT_INVITE'
  );

  const hasRequested = (donationId) =>
    myRequests.some((r) => r.donationId === donationId && (r.status === 'PENDING_NGO' || r.status === 'APPROVED'));

  const toggleAvailability = () => {
    api(
      `/volunteers/${activeVolId}/availability`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !isAvailable })
      },
      !isAvailable
        ? 'You are now ACTIVE and available for emergency NGO dispatch orders!'
        : 'Availability toggled to OFFLINE.'
    );
  };

  return (
    <>
      {/* Volunteer Active Status & Dispatch Toggle */}
      <div className="card-panel" style={{ borderLeft: isAvailable ? '4px solid #10b981' : '4px solid #94a3b8' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="card-icon" style={{ background: isAvailable ? '#d1fae5' : '#f1f5f9', color: isAvailable ? '#059669' : '#64748b' }}>
              <Radio size={24} className={isAvailable ? 'spin-slow' : ''} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Dispatch Status: {isAvailable ? <span style={{ color: '#059669', fontWeight: 600 }}>ACTIVE for Pickup Orders</span> : <span style={{ color: '#64748b' }}>OFFLINE</span>}
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                {isAvailable
                  ? 'NGO Coordinators can see you are active and send you direct pickup requests for urgent food orders.'
                  : 'Turn ON availability if you are active and willing to receive urgent dispatch requests from NGOs.'}
              </p>
            </div>
          </div>

          <button
            className={isAvailable ? 'btn-primary' : 'btn-secondary'}
            disabled={busyAction === `/volunteers/${activeVolId}/availability`}
            onClick={toggleAvailability}
            style={{ padding: '10px 24px', background: isAvailable ? '#10b981' : '#f1f5f9', color: isAvailable ? '#ffffff' : '#334155' }}
            type="button"
          >
            {isAvailable ? <CheckCircle2 size={18} /> : <Zap size={18} />}
            <span>{isAvailable ? 'Active for Orders (ON)' : 'Set Active for Orders (OFF)'}</span>
          </button>
        </div>
      </div>

      {/* Direct Dispatch Invitations from NGO Section */}
      {directInvites.length > 0 && (
        <div className="card-panel" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="card-header">
            <div className="card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Zap size={22} />
            </div>
            <div className="card-title-group">
              <h2>Urgent NGO Dispatch Requests</h2>
              <p>An NGO coordinator has directly invited you to pick up an urgent food order!</p>
            </div>
          </div>

          <div className="item-list">
            {directInvites.map((invite) => {
              const donation = helpers.donation(invite.donationId);
              const ngoName = helpers.ngoName(invite.ngoId);
              return (
                <div className="list-item-card" key={invite.id} style={{ background: '#ffffff', border: '1px solid #fcd34d' }}>
                  <div className="item-info">
                    <div className="item-title-row">
                      <span className="item-title" style={{ color: '#b45309' }}>⚡ {donation?.foodName || 'Direct Pickup Order'}</span>
                      <span className="badge-status pending_ngo">DIRECT NGO INVITE</span>
                    </div>
                    <div className="item-meta">
                      <span>🍱 {donation?.mealCount} meals</span>
                      <span>·</span>
                      <span>🏢 Requested by: <strong>{ngoName}</strong></span>
                      <span>·</span>
                      <span>📍 Pickup: {donation?.donorAddress}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-primary"
                      onClick={() =>
                        api(`/pickup-requests/${invite.id}/accept-invite`, { method: 'PATCH' }, 'Direct pickup offer accepted! Order added to your active runs.')
                      }
                      type="button"
                    >
                      <CheckCircle2 size={16} />
                      <span>Accept Order</span>
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        api(`/pickup-requests/${invite.id}/decline-invite`, { method: 'PATCH' }, 'Dispatch offer declined.')
                      }
                      type="button"
                    >
                      <XCircle size={16} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Target Destination Settings */}
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Truck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Active Verified Volunteer Profile</h2>
            <p>Logged in as {user.name} ({user.zone} · {user.runsCompleted || 0} Completed Runs).</p>
          </div>
        </div>

        <div className="modern-form">
          <div className="field-group full-width">
            <label className="field-label">Target Distribution Destination for Stock Runs</label>
            <input
              className="field-input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Central Community Shelter, Railway Colony Ward"
            />
          </div>
        </div>
      </div>

      {/* Open Food Donor Listings */}
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Store size={22} />
          </div>
          <div className="card-title-group">
            <h2>Open Food Donor Pickups</h2>
            <p>Claim available food batches published by donors.</p>
          </div>
        </div>

        <div className="item-list">
          {openDonations.length === 0 && <div className="empty-box">No open food donor listings currently available.</div>}
          {openDonations.map((donation) => {
            const requested = hasRequested(donation.id);
            return (
              <div className="list-item-card" key={donation.id}>
                <div className="item-info">
                  <div className="item-title-row">
                    <span className="item-title">{donation.foodName}</span>
                    <StatusBadge value={donation.status} />
                  </div>
                  <div className="item-meta">
                    <span>🍱 {donation.mealCount} meals</span>
                    <span>·</span>
                    <span>📍 {donation.donorAddress}</span>
                    <span>·</span>
                    <span>🏢 Partner: {helpers.ngoName(donation.ngoId)}</span>
                    <span>·</span>
                    <span>⏳ Expiry: {donation.expiryWindow}</span>
                  </div>
                </div>

                <button
                  className={requested ? 'btn-secondary' : 'btn-primary'}
                  disabled={requested}
                  onClick={() =>
                    api(
                      '/pickup-requests',
                      {
                        method: 'POST',
                        body: JSON.stringify({ donationId: donation.id, volunteerId: activeVolId })
                      },
                      'Pickup request submitted to NGO admin for authorization.'
                    )
                  }
                  type="button"
                >
                  <Send size={16} />
                  <span>{requested ? 'Request Sent' : 'Claim Pickup Run'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Food Stored in NGO Warehouses */}
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Warehouse size={22} />
          </div>
          <div className="card-title-group">
            <h2>Food Stored in NGO Warehouses</h2>
            <p>Request batches of stored rations or meals for distribution drives.</p>
          </div>
        </div>

        <div className="item-list">
          {availableInventory.length === 0 && <div className="empty-box">No NGO stored stock currently available.</div>}
          {availableInventory.map((item) => (
            <div className="list-item-card" key={item.id}>
              <div className="item-info">
                <div className="item-title-row">
                  <span className="item-title">{item.foodName}</span>
                  <StatusBadge value={item.status} />
                </div>
                <div className="item-meta">
                  <span>📦 {item.mealCount} meals</span>
                  <span>·</span>
                  <span>⏳ {item.expiryWindow}</span>
                  <span>·</span>
                  <span>🏢 {helpers.ngoName(item.ngoId)}</span>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() =>
                  api(
                    '/inventory-requests',
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        inventoryId: item.id,
                        volunteerId: activeVolId,
                        destination,
                        peopleTarget: item.mealCount
                      })
                    },
                    'Stock distribution request submitted.'
                  )
                }
                type="button"
              >
                <Send size={16} />
                <span>Request Stock Run</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Volunteer Runs Page */
function VolunteerRunsPage({ api, helpers, state, user }) {
  const activeVolId = user.id;
  const donorRuns = state.assignments.filter((a) => a.volunteerId === activeVolId);
  const stockRuns = state.inventoryAssignments.filter((a) => a.volunteerId === activeVolId);

  return (
    <>
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Truck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Assigned Donor Pickup Runs</h2>
            <p>Update pickup and delivery progress in real time.</p>
          </div>
        </div>

        <div className="item-list">
          {donorRuns.length === 0 && <div className="empty-box">No assigned donor pickup runs yet.</div>}
          {donorRuns.map((assignment) => {
            const donation = helpers.donation(assignment.donationId);
            return (
              <div className="list-item-card" key={assignment.id}>
                <div className="item-info">
                  <div className="item-title-row">
                    <span className="item-title">{donation?.foodName || 'Food Pickup'}</span>
                    <StatusBadge value={assignment.status} />
                  </div>
                  <div className="item-meta">
                    <span>📍 Pickup: {donation?.donorAddress}</span>
                    <span>·</span>
                    <span>🏢 Partner: {helpers.ngoName(assignment.ngoId)}</span>
                  </div>
                </div>
                <RunControlActions
                  api={api}
                  assignment={assignment}
                  completePath={`/assignments/${assignment.id}/complete`}
                  pickupPath={`/assignments/${assignment.id}/pick-up`}
                  storedAllowed
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Boxes size={22} />
          </div>
          <div className="card-title-group">
            <h2>Assigned NGO Stock Distribution Runs</h2>
            <p>Deliver warehouse stock to target community centers and shelters.</p>
          </div>
        </div>

        <div className="item-list">
          {stockRuns.length === 0 && <div className="empty-box">No assigned stock distribution runs yet.</div>}
          {stockRuns.map((assignment) => {
            const item = helpers.inventory(assignment.inventoryId);
            return (
              <div className="list-item-card" key={assignment.id}>
                <div className="item-info">
                  <div className="item-title-row">
                    <span className="item-title">{item?.foodName || 'Stock Run'}</span>
                    <StatusBadge value={assignment.status} />
                  </div>
                  <div className="item-meta">
                    <span>🎯 Destination: {assignment.destination}</span>
                    <span>·</span>
                    <span>🏢 NGO: {helpers.ngoName(assignment.ngoId)}</span>
                  </div>
                </div>
                <RunControlActions
                  api={api}
                  assignment={assignment}
                  completePath={`/inventory-assignments/${assignment.id}/complete`}
                  pickupPath={`/inventory-assignments/${assignment.id}/pick-up`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* NGO Stock Page */
function NgoStockPage({ helpers, state }) {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-box">
          <span className="stat-number">{state.metrics.ngoStoredMeals}</span>
          <span className="stat-label">Stored Meals in Warehouses</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{state.metrics.activeDonations}</span>
          <span className="stat-label">Open Donor Listings</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">{state.metrics.inTransit}</span>
          <span className="stat-label">Active Runs in Transit</span>
        </div>
      </div>

      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Warehouse size={22} />
          </div>
          <div className="card-title-group">
            <h2>Current Warehouse Inventory</h2>
            <p>Overview of food stored across all partner NGO facilities.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Food Item</th>
                <th>NGO Warehouse</th>
                <th>Meals</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.inventory.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No inventory records.
                  </td>
                </tr>
              )}
              {state.inventory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.foodName}</strong>
                  </td>
                  <td>{helpers.ngoName(item.ngoId)}</td>
                  <td>{item.mealCount}</td>
                  <td>{item.expiryWindow}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* NGO Audit Page */
function NgoAuditPage({ state }) {
  return (
    <div className="card-panel">
      <div className="card-header">
        <div className="card-icon">
          <FileText size={22} />
        </div>
        <div className="card-title-group">
          <h2>Activity & Audit Trail</h2>
          <p>Complete transparent event log of all food rescues, requests, and verifications.</p>
        </div>
      </div>

      <div className="timeline">
        {state.events.length === 0 && <div className="empty-box">No recorded activity logs yet.</div>}
        {state.events.map((event) => (
          <div className="timeline-item" key={event.id}>
            <div className="timeline-dot" />
            <div className="timeline-content">
              <span className="timeline-text">{event.text}</span>
              <span className="timeline-time">{new Date(event.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* NGO Approval Page with Direct Dispatch to Active Volunteers Feature */
function NgoApprovalPage({ api, busyAction, helpers, state, user }) {
  const pickupRequests = state.pickupRequests.filter((r) => r.status === 'PENDING_NGO');
  const stockRequests = state.inventoryRequests.filter((r) => r.status === 'PENDING_NGO');
  const openDonations = state.donations.filter((d) => d.status === 'OPEN');
  const activeVolunteers = state.volunteers.filter((v) => v.verified && v.isAvailable);

  const [dispatchDonationId, setDispatchDonationId] = useState('');
  const [dispatchVolId, setDispatchVolId] = useState('');

  const sendDirectDispatch = (e) => {
    e.preventDefault();
    const dId = dispatchDonationId || openDonations[0]?.id;
    const vId = dispatchVolId || activeVolunteers[0]?.id;
    if (!dId || !vId) {
      alert('Please select an open donation and an active volunteer.');
      return;
    }

    api(
      '/ngo/direct-dispatch',
      {
        method: 'POST',
        body: JSON.stringify({ donationId: dId, volunteerId: vId, ngoId: user.id })
      },
      'Direct pickup invitation sent to volunteer!'
    );
  };

  return (
    <>
      {/* DIRECT DISPATCH FEATURE: Send Direct Pickup Request to Active Volunteer */}
      <div className="card-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Zap size={22} />
          </div>
          <div className="card-title-group">
            <h2>Direct Order Dispatch to Active Volunteers</h2>
            <p>Send an immediate pickup request to an active volunteer for unassigned or urgent food orders.</p>
          </div>
        </div>

        {activeVolunteers.length === 0 ? (
          <div className="empty-box" style={{ background: '#fffbeb' }}>
            No volunteers are currently toggled <strong>Available for Dispatch (ON)</strong>. Active volunteers will appear here automatically when they toggle their availability ON.
          </div>
        ) : openDonations.length === 0 ? (
          <div className="empty-box">No open food donor listings available for dispatch.</div>
        ) : (
          <form className="modern-form" onSubmit={sendDirectDispatch}>
            <div className="field-group">
              <label className="field-label">Select Open Food Donation</label>
              <select
                className="field-select"
                value={dispatchDonationId || openDonations[0]?.id}
                onChange={(e) => setDispatchDonationId(e.target.value)}
              >
                {openDonations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.foodName} ({d.mealCount} meals · {d.donorName})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">Select Active & Available Volunteer</label>
              <select
                className="field-select"
                value={dispatchVolId || activeVolunteers[0]?.id}
                onChange={(e) => setDispatchVolId(e.target.value)}
              >
                {activeVolunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    🟢 {v.name} ({v.zone} · {v.vehicle} · {v.runsCompleted} runs)
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group full-width">
              <button className="btn-primary" disabled={busyAction === '/ngo/direct-dispatch'} type="submit">
                <Send size={16} />
                <span>Send Direct Request to Volunteer</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Pending Donor Pickup Requests */}
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <ClipboardCheck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Donor Pickup Requests Pending Approval</h2>
            <p>Review volunteer requests to pick up surplus food directly from donors.</p>
          </div>
        </div>

        <div className="item-list">
          {pickupRequests.length === 0 && <div className="empty-box">No pending donor pickup requests.</div>}
          {pickupRequests.map((request) => {
            const donation = helpers.donation(request.donationId);
            const volunteer = helpers.volunteer(request.volunteerId);
            return (
              <div className="list-item-card" key={request.id}>
                <div className="item-info">
                  <div className="item-title-row">
                    <span className="item-title">{volunteer?.name || 'Volunteer'} → {donation?.foodName || 'Donation'}</span>
                    <StatusBadge value={request.status} />
                  </div>
                  <div className="item-meta">
                    <span>🏢 Donor: {donation?.donorName}</span>
                    <span>·</span>
                    <span>🛵 Vehicle: {volunteer?.vehicle}</span>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() =>
                    api(`/pickup-requests/${request.id}/approve`, { method: 'PATCH' }, 'Pickup request approved.')
                  }
                  type="button"
                >
                  <Check size={16} />
                  <span>Approve Pickup</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Stock Distribution Requests */}
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <Boxes size={22} />
          </div>
          <div className="card-title-group">
            <h2>Stock Distribution Requests Pending Approval</h2>
            <p>Authorize volunteers to withdraw food stock from warehouses.</p>
          </div>
        </div>

        <div className="item-list">
          {stockRequests.length === 0 && <div className="empty-box">No pending stock distribution requests.</div>}
          {stockRequests.map((request) => {
            const item = helpers.inventory(request.inventoryId);
            const volunteer = helpers.volunteer(request.volunteerId);
            return (
              <div className="list-item-card" key={request.id}>
                <div className="item-info">
                  <div className="item-title-row">
                    <span className="item-title">{volunteer?.name || 'Volunteer'} → {item?.foodName || 'Stock Item'}</span>
                    <StatusBadge value={request.status} />
                  </div>
                  <div className="item-meta">
                    <span>🎯 Destination: {request.destination}</span>
                    <span>·</span>
                    <span>📦 Meals: {item?.mealCount}</span>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() =>
                    api(`/inventory-requests/${request.id}/approve`, { method: 'PATCH' }, 'Stock distribution approved.')
                  }
                  type="button"
                >
                  <Check size={16} />
                  <span>Approve Distribution</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* NGO Verification Page with Verified Volunteer Roster */
function NgoVerificationPage({ api, busyAction, state }) {
  const pending = state.volunteers.filter((v) => !v.verified);
  const verified = state.volunteers.filter((v) => v.verified);

  return (
    <>
      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <UserCheck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Pending Volunteer Verification Queue</h2>
            <p>Review submitted ID proofs and verify volunteer accounts.</p>
          </div>
        </div>

        <div className="item-list">
          {pending.length === 0 && <div className="empty-box">No volunteer applications currently pending approval.</div>}
          {pending.map((volunteer) => (
            <div className="list-item-card" key={volunteer.id}>
              <div className="item-info">
                <div className="item-title-row">
                  <span className="item-title">{volunteer.name}</span>
                  <StatusBadge value="PENDING_NGO" />
                </div>
                <div className="item-meta">
                  <span>📍 {volunteer.zone}</span>
                  <span>·</span>
                  <span>📞 {volunteer.phone}</span>
                  <span>·</span>
                  <span>🛵 {volunteer.vehicle}</span>
                  <span>·</span>
                  <span>🆔 {volunteer.idProof}</span>
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={busyAction === `/volunteers/${volunteer.id}/verify`}
                onClick={() =>
                  api(`/volunteers/${volunteer.id}/verify`, { method: 'PATCH' }, `Volunteer ${volunteer.name} verified!`)
                }
                type="button"
              >
                <UserCheck size={16} />
                <span>Verify & Accept Volunteer</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card-panel">
        <div className="card-header">
          <div className="card-icon">
            <BadgeCheck size={22} />
          </div>
          <div className="card-title-group">
            <h2>Verified Volunteer Roster</h2>
            <p>Active volunteers authorized for food transport and rescue runs.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Volunteer Name</th>
                <th>Zone</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Dispatch Status</th>
                <th>Runs Completed</th>
              </tr>
            </thead>
            <tbody>
              {verified.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No verified volunteers yet.
                  </td>
                </tr>
              )}
              {verified.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.name}</strong>
                  </td>
                  <td>{v.zone}</td>
                  <td>{v.phone}</td>
                  <td>{v.vehicle}</td>
                  <td>
                    <span className={v.isAvailable ? 'badge-status open' : 'badge-status'}>
                      {v.isAvailable ? '🟢 ACTIVE FOR DISPATCH' : '⚪ OFFLINE'}
                    </span>
                  </td>
                  <td>
                    <strong>{v.runsCompleted || 0} runs</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* Helper Action Controls */
function RunControlActions({ api, assignment, completePath, pickupPath, storedAllowed = false }) {
  if (assignment.status === 'APPROVED_FOR_PICKUP') {
    return (
      <button className="btn-primary" onClick={() => api(pickupPath, { method: 'PATCH' }, 'Marked in transit')} type="button">
        <Truck size={16} />
        <span>Mark Picked Up</span>
      </button>
    );
  }

  if (assignment.status === 'IN_TRANSIT') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="btn-primary"
          onClick={() =>
            api(
              completePath,
              {
                method: 'PATCH',
                body: JSON.stringify({ outcome: 'DISTRIBUTED', peopleServed: assignment.peopleTarget || 80 })
              },
              'Run completed! Food served.'
            )
          }
          type="button"
        >
          <Users size={16} />
          <span>Mark Served</span>
        </button>
        {storedAllowed && (
          <button
            className="btn-secondary"
            onClick={() =>
              api(
                completePath,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ outcome: 'STORED_AT_NGO', notes: 'Food stored at NGO warehouse.' })
                },
                'Food stored at NGO warehouse.'
              )
            }
            type="button"
          >
            <Warehouse size={16} />
            <span>Drop at NGO</span>
          </button>
        )}
      </div>
    );
  }

  return <span className="badge-status completed">Closed</span>;
}

function StatusBadge({ value }) {
  return <span className={`badge-status ${String(value).toLowerCase()}`}>{formatStatus(value)}</span>;
}

function createHelpers(state) {
  const empty = [];
  const ngos = state?.ngos || empty;
  const volunteers = state?.volunteers || empty;
  const donations = state?.donations || empty;
  const inventory = state?.inventory || empty;

  return {
    ngoName: (id) => ngos.find((ngo) => ngo.id === id)?.name || 'Partner NGO',
    volunteer: (id) => volunteers.find((v) => v.id === id),
    donation: (id) => donations.find((d) => d.id === id),
    inventory: (id) => inventory.find((item) => item.id === id)
  };
}

function pageTitle(role, page) {
  const titles = {
    donor: { upload: 'Surplus Food Upload' },
    volunteer: {
      verify: 'Volunteer Application Status',
      request: 'Claim Pickups & Stock Runs',
      runs: 'My Active Transport Runs'
    },
    ngo: {
      stock: 'NGO Stock & Warehouse Overview',
      audit: 'Live System Audit Trail',
      approvals: 'Volunteer Run Approvals & Direct Dispatch',
      verification: 'Volunteer Verification Review'
    }
  };
  return titles[role]?.[page] || 'Dashboard';
}

function pageSubtitle(role, page) {
  const subtitles = {
    donor: { upload: 'Publish excess meals for local volunteers and NGOs to rescue.' },
    volunteer: {
      verify: 'View your volunteer application and verification review status.',
      request: 'Choose open donor pickups or request stored stock to distribute.',
      runs: 'Update progress as you pick up and deliver food in your community.'
    },
    ngo: {
      stock: 'Monitor active donations, warehouse stock levels, and food in transit.',
      audit: 'View transparent, real-time records of every food rescue operation.',
      approvals: 'Review pickup claims and dispatch urgent orders to active volunteers.',
      verification: 'Validate volunteer ID proofs and manage active response teams.'
    }
  };
  return subtitles[role]?.[page] || '';
}

function formatStatus(status) {
  return String(status).toLowerCase().replaceAll('_', ' ');
}

createRoot(document.getElementById('root')).render(<App />);
