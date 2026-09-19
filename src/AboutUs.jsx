import React from 'react';
import './AboutUs.css';

export default function AboutUs(){
  React.useEffect(()=>{window.scrollTo(0,0)},[]);
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

    <section className="aboutInfoGrid">
      <article className="aboutInfoCard">
        <span className="aboutInfoKicker">OUR MISSION</span>
        <h2>Making every part choice simpler.</h2>
        <p>MotoDC brings automobile and motorcycle parts, useful product information and a straightforward shopping experience together so customers can make informed choices.</p>
      </article>
      <article className="aboutInfoCard">
        <span className="aboutInfoKicker">WHAT WE OFFER</span>
        <h2>Parts for everyday journeys.</h2>
        <ul>
          <li>Automobile and motorcycle spare parts</li>
          <li>Clear product and pricing information</li>
          <li>Wishlist, cart and order tracking</li>
          <li>Returns support for eligible orders</li>
        </ul>
      </article>
      <article className="aboutInfoCard">
        <span className="aboutInfoKicker">HOW IT WORKS</span>
        <h2>From search to road.</h2>
        <div className="aboutSteps">
          <div><b>01</b><span>Search</span><small>Find a part by category or product.</small></div>
          <div><b>02</b><span>Check</span><small>Review price, stock and product details.</small></div>
          <div><b>03</b><span>Order</span><small>Add to cart and complete checkout.</small></div>
        </div>
      </article>
      <article className="aboutInfoCard aboutContactCard">
        <span className="aboutInfoKicker">CONTACT & SUPPORT</span>
        <h2>Need help with your MotoDC journey?</h2>
        <div className="aboutContactList">
          <div><strong>Order support</strong><span>Open <b>My Orders</b> to check order status and available return options.</span></div>
          <div><strong>Product assistance</strong><span>Use the product details page to review compatibility, stock and product information before ordering.</span></div>
          <div><strong>Account support</strong><span>Sign in to your MotoDC account for order and customer-support related actions.</span></div>
        </div>
        <p className="aboutContactNote">For direct email or phone support, add your official MotoDC contact details here once they are finalized.</p>
      </article>
    </section>

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