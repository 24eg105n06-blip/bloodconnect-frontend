import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  Check,
  Heart,
  Hospital,
  MapPin,
  Menu,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'

const features = [
  { icon: MapPin, title: 'Find blood nearby', text: 'Search available donors and community requests by blood group and location.' },
  { icon: Activity, title: 'Move quickly', text: 'See urgent requests clearly, with the details people need to respond.' },
  { icon: Heart, title: 'Give with confidence', text: 'Choose when you are available and make your donor status easy to update.' },
  { icon: Hospital, title: 'One connected community', text: 'Bring donors, families, hospitals, and blood banks closer together.' },
]

export default function LandingPage({ onLogin, onRegister, onFindBlood, donorCount, requestCount, loading, apiOnline }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="landing-shell" id="home">
      <header className="landing-header">
        <a className="landing-brand" href="#home" aria-label="Blood Connect home" onClick={closeMenu}>
          <span className="landing-brand-mark"><Heart size={18} fill="currentColor" /></span>
          <span>Blood <strong>Connect</strong></span>
        </a>
        <button className="landing-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`landing-nav ${menuOpen ? 'landing-nav-open' : ''}`} aria-label="Main navigation">
          <a href="#home" onClick={closeMenu}>Home</a>
          <button onClick={() => { onFindBlood(); closeMenu() }}>Find blood</button>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#community" onClick={closeMenu}>Our community</a>
        </nav>
        <div className="landing-header-actions">
          <button className="landing-login" onClick={onLogin}>Log in</button>
          <button className="button button-primary landing-start" onClick={onRegister}>Get started <ArrowRight size={16} /></button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker"><span /> CARE THAT CONNECTS</p>
            <h1>Every drop<br />can <em>save a life.</em></h1>
            <p className="landing-lede">Find blood, become a donor, and connect with people who need help when every second matters.</p>
            <div className="landing-hero-actions">
              <button className="button button-primary" onClick={onFindBlood}>Find blood <ArrowRight size={17} /></button>
              <button className="button landing-donor-cta" onClick={onRegister}><span><Heart size={16} /></span> Become a donor</button>
            </div>
            <div className="landing-trust"><span className="trust-mark"><ShieldCheck size={17} /></span><span><strong>People helping people.</strong><br />Care starts in your community.</span></div>
          </div>
          <div className="landing-hero-art" aria-label="A blood donor giving at a community clinic" role="img">
            <img src="https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1200&q=85" alt="Blood donation equipment in a clinic" />
            <div className="landing-art-wash" />
            <div className="landing-art-label"><span className="art-label-icon"><Heart size={17} fill="currentColor" /></span><span><strong>One community.</strong><small>Many lives changed.</small></span></div>
            <div className="landing-art-stamp"><ShieldCheck size={17} /><span>Carefully<br />connected</span></div>
            <span className="landing-art-orbit orbit-one" /><span className="landing-art-orbit orbit-two" />
          </div>
          <div className="landing-hero-foot"><span>01 / 03</span><span className="hero-foot-rule" /><span>Every connection matters</span></div>
        </section>

        <section className="landing-stats" id="community" aria-label="Live community records">
          <div className="landing-stat-intro"><span>COMMUNITY DATA</span><strong>Live platform<br />activity.</strong></div>
          <div className="landing-stat"><strong>{loading ? '…' : apiOnline ? donorCount : '—'}</strong><span>Available donor records</span></div>
          <div className="landing-stat"><strong>{loading ? '…' : apiOnline ? requestCount : '—'}</strong><span>Community requests</span></div>
        </section>

        <section className="landing-features" id="why-blood-connect">
          <div className="landing-section-heading"><div><p className="landing-kicker"><span /> HERE WHEN IT MATTERS</p><h2>Help should be<br /><em>easy to find.</em></h2></div><p>Whether you need a donor or are ready to help, Blood Connect makes the next step clearer.</p></div>
          <div className="landing-feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="landing-feature" key={title}><span className="landing-feature-number">0{index + 1}</span><span className="landing-feature-icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><span className="feature-arrow"><ArrowUpRight size={17} /></span></article>)}</div>
        </section>

        <section className="landing-process" id="how-it-works">
          <div className="process-intro"><p className="landing-kicker"><span /> A CLEARER WAY TO HELP</p><h2>Four steps.<br /><em>One powerful act.</em></h2><p>Simple connections can make a difficult moment feel less alone.</p><button className="text-link" onClick={onRegister}>Join the community <ArrowRight size={15} /></button></div>
          <ol className="process-steps"><li><span>01</span><div><strong>Create an account</strong><p>Tell us a little about yourself and how you would like to help.</p></div><Check size={17} /></li><li><span>02</span><div><strong>Find or request blood</strong><p>Search by blood group and location, or share a request.</p></div><Check size={17} /></li><li><span>03</span><div><strong>Connect with a match</strong><p>See nearby available donors and relevant requests.</p></div><Check size={17} /></li><li><span>04</span><div><strong>Help someone move forward</strong><p>Coordinate directly with the people and care teams involved.</p></div><Heart size={17} /></li></ol>
        </section>

        <section className="landing-emergency">
          <div className="emergency-mark"><Activity size={24} /></div>
          <div><span>WHEN EVERY SECOND MATTERS</span><h2>Someone needs blood right now.</h2><p>See urgent requests shared by people in your community.</p></div>
          <button className="button emergency-button" onClick={onFindBlood}>View emergency requests <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="landing-footer"><a className="landing-brand" href="#home"><span className="landing-brand-mark"><Heart size={17} fill="currentColor" /></span><span>Blood <strong>Connect</strong></span></a><span className="landing-footer-note">A little help can mean everything.</span><nav aria-label="Footer navigation"><a href="#why-blood-connect">About</a><a href="mailto:hello@bloodconnect.org">Contact</a><a href="#privacy">Privacy</a><a href="#terms">Terms</a></nav><span className="landing-copyright">© 2026 Blood Connect</span></footer>
    </div>
  )
}
