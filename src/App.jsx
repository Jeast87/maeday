function App() {
  return (
    <div>
      <header className="navbar">
        <div className="logo">
          <img src="/logo.png" alt="Nonprofit Logo" />
          <h1>The MAEday Foundation: Hope for Rare Diseases</h1>
        </div>
        <nav>
          <a href="#mission">Mission</a>
          <a href="#programs">Programs</a>
          <a href="#get-involved">Get Involved</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero">
        <h2>Together We Create Possibilities</h2>
        <p>
          Supporting individuals with rare diseases and disabilities through advocacy,
          access, and community.
        </p>
        <a href="#get-involved" className="btn">Join Us</a>
      </section>

      <section id="mission" className="content">
        <h2>Our Mission</h2>
        <p>
          We empower families affected by rare diseases and disabilities by connecting
          them with adaptive equipment, therapies, and supportive services.
        </p>
      </section>

      <section id="programs" className="content">
        <h2>Programs</h2>
        <ul>
          <li>📌 Equipment Donations</li>
          <li>📌 Therapy Assistance</li>
          <li>📌 Community Enrichment Activities</li>
        </ul>
      </section>

      <section id="get-involved" className="content">
        <h2>Get Involved</h2>
        <p>
          You can help make a difference by donating, volunteering, or partnering with us
          to reach more families in need.
        </p>
        <a href="mailto:info@yourorg.org" className="btn">Donate or Volunteer</a>
      </section>

      <section id="contact" className="content">
        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:info@yourorg.org">info@yourorg.org</a></p>
        <p>Phone: (555) 123-4567</p>
      </section>

      <footer>
        <p>&copy; 2025 Hope for Rare Diseases | All Rights Reserved</p>
      </footer>
    </div>
  );
}

export default App;
