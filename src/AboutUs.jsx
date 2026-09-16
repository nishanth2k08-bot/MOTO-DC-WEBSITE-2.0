import React from 'react';
import './AboutUs.css';

export default function AboutUs(){
  React.useEffect(()=>{window.scrollTo(0,0)},[]);
  return <section className="aboutPage">
    <div className="aboutHero">
      <p className="aboutEyebrow">ABOUT MOTO<span>DC</span></p>
      <h1 className="aboutTitle">Built for riders. <span>Made for every machine.</span></h1>
      <p className="aboutLead">MotoDC is a modern spare-parts destination built to make finding dependable automobile and motorcycle parts simple. We bring carefully selected parts, clear product information and a straightforward shopping experience together in one place.</p>
    </div>
    <div className="aboutGrid">
      <article className="aboutCard">
        <h2>What we do</h2>
        <p>We help vehicle owners find quality replacement and performance parts without the usual hassle. Our catalog covers everyday maintenance, repairs and upgrades for cars and motorcycles.</p>
        <p>Our goal is simple: make the right part easier to discover, understand and order.</p>
        <div className="aboutStats">
          <div className="aboutStat"><strong>2,500+</strong><small>Parts listed</small></div>
          <div className="aboutStat"><strong>18+</strong><small>Brands supported</small></div>
          <div className="aboutStat"><strong>98%</strong><small>Happy customers</small></div>
        </div>
      </article>
      <article className="aboutCard">
        <h2>Why MotoDC</h2>
        <div className="aboutValues">
          <div className="aboutValue"><strong>Quality focused</strong><span>Carefully selected parts with useful product and compatibility information.</span></div>
          <div className="aboutValue"><strong>Rider first</strong><span>A straightforward shopping experience designed around real vehicle needs.</span></div>
          <div className="aboutValue"><strong>Dependable support</strong><span>Help is available when you need assistance before or after your order.</span></div>
        </div>
        <h2 style={{marginTop:26}}>Get in touch</h2>
        <div className="aboutContactList">
          <div className="aboutContactItem"><span className="aboutContactIcon">☎</span><div><b>Phone</b><a href="tel:+919876543210">+91 98765 43210</a></div></div>
          <div className="aboutContactItem"><span className="aboutContactIcon">✉</span><div><b>Email</b><a href="mailto:hello@motodc.example">hello@motodc.example</a></div></div>
          <div className="aboutContactItem"><span className="aboutContactIcon">⌖</span><div><b>Workshop & Support</b><span>45 Motor Avenue, Chennai, Tamil Nadu 600001</span></div></div>
        </div>
        <div className="aboutHours"><b>Support hours:</b> Monday–Saturday · 9:00 AM–6:00 PM IST</div>
      </article>
    </div>
  </section>
}
