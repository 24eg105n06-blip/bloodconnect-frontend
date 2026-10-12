import { ArrowLeft, ArrowRight, Droplet, Heart, ShieldCheck } from 'lucide-react'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function AuthScreen({ mode, onBack, onSubmit, onSwitch, error, submitting, notice }) {
  const registering = mode === 'register'

  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    if (registering && data.password !== data.confirmPassword) {
      form.elements.confirmPassword.setCustomValidity('Passwords do not match.')
      form.reportValidity()
      form.elements.confirmPassword.setCustomValidity('')
      return
    }
    delete data.confirmPassword
    onSubmit(data)
  }

  return <main className="auth-screen">
    <section className="auth-story">
      <a className="landing-brand auth-brand" href="#home" onClick={(event) => { event.preventDefault(); onBack() }}><span className="landing-brand-mark"><Heart size={18} fill="currentColor" /></span><span>Blood <strong>Connect</strong></span></a>
      <div className="auth-story-copy"><span className="landing-kicker"><span /> PEOPLE HELPING PEOPLE</span><h1>When it matters,<br /><em>we show up.</em></h1><p>Join a community making it easier to find blood, offer support, and stay connected.</p></div>
      <div className="auth-story-image"><img src="https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1000&q=85" alt="Blood donation equipment in a clinic" /><span><ShieldCheck size={16} /> A community built around care</span></div>
      <p className="auth-story-foot">Every drop can save a life.</p>
    </section>
    <section className="auth-panel-wrap">
      <button className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
      <div className="auth-panel"><span className="auth-icon"><Droplet size={21} fill="currentColor" /></span><p className="landing-kicker"><span /> BLOOD CONNECT COMMUNITY</p><h2>{registering ? 'Join Blood Connect' : 'Welcome back to Blood Connect'}</h2><p className="auth-intro">{registering ? 'Create your account and be there when it matters.' : 'Sign in to find support or help someone nearby.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {registering && <label className="form-label">Full name<input name="name" autoComplete="name" placeholder="Your full name" required /></label>}
          <label className="form-label">Email address<input name="email" type="email" autoComplete="email" placeholder="Enter your email address" required /></label>
          {registering && <div className="auth-field-row"><label className="form-label">Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="Enter your phone number" pattern="[+0-9() -]{7,20}" required /></label><label className="form-label">Blood group<select name="bloodGroup" defaultValue="" required><option value="" disabled>Select group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label></div>}
          <label className="form-label">Password<input name="password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength="8" placeholder="At least 8 characters" required /></label>
          {registering && <><label className="form-label">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" placeholder="Enter password again" required /></label><label className="form-label">Location<input name="location" autoComplete="address-level2" placeholder="City or neighborhood" required /></label><label className="form-label">Account type<select name="role" defaultValue="DONOR"><option value="DONOR">Donor</option><option value="REQUESTER">Patient / Requester</option><option value="HOSPITAL">Hospital</option></select></label></>}
          {!registering && <div className="auth-options"><label><input type="checkbox" name="remember" /> Remember me</label><button type="button" onClick={() => onSwitch('forgot')}>Forgot password?</button></div>}
          {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}{notice && <p className="auth-feedback auth-success" role="status">{notice}</p>}
          <button className="button button-primary auth-submit" disabled={submitting}>{submitting ? 'Please wait…' : registering ? 'Create account' : 'Log in'} <ArrowRight size={17} /></button>
        </form>
        <div className="auth-divider"><span /> or continue with <span /></div>
        <div className="auth-alternatives"><button onClick={() => onSwitch('google')}><span className="google-g">G</span> Google</button><button onClick={() => onSwitch('otp')}><ShieldCheck size={16} /> Sign in with OTP</button></div>
        <p className="auth-switch">{registering ? 'Already have an account?' : "Don't have an account?"} <button onClick={() => onSwitch(registering ? 'login' : 'register')}>{registering ? 'Log in' : 'Create account'}</button></p>
        <p className="auth-disclaimer"><ShieldCheck size={14} /> Your information is handled with care.</p>
      </div>
    </section>
  </main>
}
