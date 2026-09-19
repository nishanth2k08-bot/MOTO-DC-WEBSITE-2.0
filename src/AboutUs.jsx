import React from 'react';
import './AboutUs.css';

export default function AboutUs(){
  React.useEffect(()=>{window.scrollTo(0,0)},[]);
  const stats=[
    {value:'2,500+',label:'Parts listed',type:'parts'},
    {value:'18+',label:'Brands supported',type:'brands'},
    {value:'98%',label:'Happy customers',type:'customers'},
    {value:'4.8',label:'Average rating',type:'rating'}
  ];
  return <section className="aboutPage">
    <div className="aboutHero">
      <div className="aboutHeroCopy">
        <p className="aboutEyebrow">ABOUT MOTO<span>DC</span></p>
        <h1 className="aboutTitle"><span className="aboutTitleLight">DRIVEN BY</span><span>PASSION</span></h1>
        <h2 className="aboutTagline">More than parts. A better ride.</h2>
        <p className="aboutLead">MotoDC is a modern spare-parts destination built to make finding dependable automobile and motorcycle parts simple. We bring carefully selected parts, clear product information and a straightforward shopping experience together in one place.</p>
      </div>
      <div className="aboutHeroMeta" aria-hidden="true">
        <div className="aboutMetaWords"><span>QUALITY</span><span>TRUST</span><span>COMMUNITY</span><span>PERFORMANCE</span></div>
        <i></i>
      </div>
      <div className="aboutHeroStatement" aria-hidden="true">PEOPLE <b>|</b> PARTS <b>|</b> A BETTER TOMORROW</div>
    </div>

    <div className="aboutJourneyRail" aria-label="The MotoDC journey">
      <div className="journeyPulse" aria-hidden="true"></div>
      <div><span>01</span><strong>DISCOVER</strong><small>Find what your machine needs.</small></div>
      <i aria-hidden="true"></i>
      <div><span>02</span><strong>CHOOSE</strong><small>Understand the right part.</small></div>
      <i aria-hidden="true"></i>
      <div><span>03</span><strong>RIDE</strong><small>Get back on the road.</small></div>
    </div>

    <div className="aboutContent">
      <article className="aboutCard aboutStory">
        <h2>Our Story</h2>
        <p>MotoDC was created to make finding the right spare part simpler, clearer and more convenient for everyday riders and vehicle owners.</p>
        <p>From routine maintenance to upgrades, our goal is to bring useful product information and a straightforward buying experience together in one place.</p>
      </article>
      <article className="aboutCard aboutWhy">
        <h2>Why MotoDC</h2>
        <div className="aboutValues">
          <div className="aboutValue"><strong>Quality focused</strong><span>Carefully selected parts with useful product and compatibility information.</span></div>
          <div className="aboutValue"><strong>Rider first</strong><span>A straightforward shopping experience designed around real vehicle needs.</span></div>
          <div className="aboutValue"><strong>Dependable support</strong><span>Help is available when you need assistance before or after your order.</span></div>
        </div>
      </article>
    </div>
  </section>
}