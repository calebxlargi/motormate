import {useLayoutEffect} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ignoreMobileResize:true,autoRefreshEvents:'visibilitychange,DOMContentLoaded,load'});
export default function useSiteMotion(root){useLayoutEffect(()=>{let resizeTimer;let viewportWidth=window.innerWidth;const resize=()=>{clearTimeout(resizeTimer);const editing=document.activeElement?.matches('input,select,textarea');if(editing)return;const widthChanged=Math.abs(window.innerWidth-viewportWidth)>1;if(ScrollTrigger.isTouch&&!widthChanged)return;resizeTimer=setTimeout(()=>{viewportWidth=window.innerWidth;ScrollTrigger.refresh(true)},250)};const blur=()=>{if(Math.abs(window.innerWidth-viewportWidth)>1)resize()};window.addEventListener('resize',resize,{passive:true});document.addEventListener('focusout',blur);const mm=gsap.matchMedia();mm.add('(prefers-reduced-motion: no-preference)',()=>{const observers=[];const ctx=gsap.context(()=>{
const once=el=>({trigger:el,start:'top 88%',once:true});
const observeReveal=(el,vars)=>{const tween=gsap.from(el,{...vars,paused:true});const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){tween.play();observer.disconnect()}},{rootMargin:'0px 0px -8% 0px'});observers.push(observer);observer.observe(el)};
if(root.current.querySelector('.hero')){
const intro=gsap.timeline({defaults:{ease:'power3.out'}});
intro.from('header',{y:-25,opacity:0,duration:.8}).from('.hero-overline',{y:20,opacity:0,duration:.7},.15).from('.hero h1 > span',{yPercent:55,clipPath:'inset(0 0 100% 0)',opacity:0,duration:1.25,stagger:.16},.2).from('.hero-bottom > *',{y:30,opacity:0,duration:.9,stagger:.12},.7).from('.hero-foot',{opacity:0,duration:.8},1);
gsap.fromTo('.hero-symbol',{y:0,rotation:-12,scale:.94},{y:120,rotation:9,scale:1.07,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
gsap.to('.hero-glow',{xPercent:4,yPercent:5,duration:7,ease:'sine.inOut',repeat:-1,yoyo:true});
}
gsap.utils.toArray('h2').forEach(el=>{const vars={y:38,clipPath:'inset(0 0 100% 0)',duration:1.1,ease:'power3.out'};if(el.closest('.faq'))observeReveal(el,vars);else gsap.from(el,{...vars,scrollTrigger:once(el)})});
gsap.utils.toArray('.section-top, .intro-bottom, .partner-heading > p, .partnership-detail > div, .network > .eyebrow, .network > p, .contact-bottom > p, footer > img, footer nav, .footer-bottom').forEach(el=>{const vars={y:24,opacity:0,duration:.85,ease:'power2.out'};if(el.closest('footer'))observeReveal(el,vars);else gsap.from(el,{...vars,scrollTrigger:once(el)})});
if(root.current.querySelector('.service-line')){gsap.from('.service-line > span',{y:22,opacity:0,duration:.7,stagger:.12,scrollTrigger:once('.service-line')});}
if(root.current.querySelector('.benefits')){gsap.from('.benefits article',{y:55,opacity:0,duration:.9,stagger:.16,ease:'power3.out',scrollTrigger:once('.benefits')});}
if(root.current.querySelector('.photo-panel')){gsap.from('.photo-panel',{clipPath:'inset(7% 5% 7% 5% round 22px)',ease:'none',scrollTrigger:{trigger:'.photo-panel',start:'top 95%',end:'top 25%',scrub:1}});
gsap.fromTo('.photo-panel > img',{scale:1.13,yPercent:-4},{scale:1.02,yPercent:4,ease:'none',scrollTrigger:{trigger:'.photo-panel',start:'top bottom',end:'bottom top',scrub:1}});
gsap.from('.photo-caption > *',{y:40,opacity:0,duration:1,stagger:.16,ease:'power3.out',scrollTrigger:once('.photo-caption')});}
if(root.current.querySelector('.partner-map')){const network=gsap.timeline({scrollTrigger:once('.partner-map')});network.from('.network-hub > *',{y:12,opacity:0,duration:.8,ease:'power3.out'}).from('.network-node',{opacity:0,duration:.7,stagger:.13},.3);}
if(root.current.querySelector('.faq')){gsap.utils.toArray('.faq details').forEach(el=>observeReveal(el,{y:25,opacity:0,duration:.65}));}
if(root.current.querySelector('.contact')){gsap.from('.contact h2 > span:last-child',{x:-25,y:25,opacity:0,duration:1,ease:'power3.out',scrollTrigger:once('.contact')});}
if(root.current.querySelector('.buyer-form')){gsap.from('.buyer-form',{y:30,opacity:0,duration:.85,scrollTrigger:once('.buyer-form')});}
// Refresh after webfonts settle so pin distances and reveal positions match the final layout.
document.fonts?.ready.then(()=>{if(root.current)ScrollTrigger.refresh()});
},root);return()=>{observers.forEach(observer=>observer.disconnect());ctx.revert()}});return()=>{clearTimeout(resizeTimer);window.removeEventListener('resize',resize);document.removeEventListener('focusout',blur);mm.revert()}},[root])}
