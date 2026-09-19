import React from 'react';
import './AboutUs.css';

const StatIcon=({type})=>{
  if(type==='parts') return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 15 24 8l14 7v17l-14 8-14-8V15Z"/><path d="m10 15 14 8 14-8M24 23v17M17 12l14 8"/></svg>;
  if(type==='brands') return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 7h20v34H14z"/><path d="m20 14 4 4 4-4M20 27l4 4 4-4M19 36h10"/></svg>;
  if(type==='customers') return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="16" r="6"/><path d="M12 38c0-7 5-11 12-11s12 4 12 11M8 26c0-4 3-7 7-7M40 26c0-4-3-7-7-7"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 7 5.3 10.7 11.8 1.7-8.5 8.3 2 11.8L24 34l-10.6 5.5 2-11.8-8.5-8.3 11.8-1.7L24 7Z"/></svg>;
};

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
        <div className="aboutActions">
          <button type="button" onClick={()=>document.querySelector('.aboutStory')?.scrollIntoView({behavior:'smooth'})}>Our Story <span>→</span></button>
          <button type="button" className="secondary" onClick={()=>document.querySelector('.aboutWhy')?.scrollIntoView({behavior:'smooth'})}>Why Choose Us</button>
        </div>
      </div>
      <div className="aboutHeroMeta" aria-hidden="true">
        <div className="aboutMetaWords"><span>QUALITY</span><span>TRUST</span><span>COMMUNITY</span><span>PERFORMANCE</span></div>
        <i></i>
      </div>
      <div className="aboutHeroStatement" aria-hidden="true">PEOPLE <b>|</b> PARTS <b>|</b> A BETTER TOMORROW</div>
    </div>

    <div className="aboutStats">
      {stats.map(s=><div className="aboutStat" key={s.label}>
        <div className="aboutStatIcon"><StatIcon type={s.type}/></div>
        <strong>{s.value}</strong><small>{s.label}</small>
      </div>)}
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