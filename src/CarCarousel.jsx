import React,{useEffect,useRef,useState} from 'react';
const names=['Perodua Bezza','Proton e.MAS 5','Proton S70','Honda City','Toyota Vios','Mitsubishi Xforce','BYD Atto 3','Jaecoo J7','Jetour T2','XPeng G6','Omoda C9','Zeekr 7X','Volkswagen Tayron','BMW 3 Series','Volvo XC60'];
function randomStart(){
 let index=Math.floor(Math.random()*names.length);
 try{const previous=Number(sessionStorage.getItem('motormate-last-car')??-1);if(index===previous)index=(index+1)%names.length;sessionStorage.setItem('motormate-last-car',String(index))}catch{}
 return index;
}
export default function CarCarousel(){
 const [active,setActive]=useState(randomStart);
 const [ready,setReady]=useState(false);
 const loaded=useRef(new Set());
 function markLoaded(index){loaded.current.add(index);if(loaded.current.size===names.length)setReady(true)}
 useEffect(()=>{if(!ready)return;const timer=setInterval(()=>{if(!document.hidden)setActive(index=>(index+1)%names.length)},2500);return()=>clearInterval(timer)},[ready]);
 return <div className="photo-panel car-carousel" role="region" aria-label="Car gallery">
 {names.map((name,index)=><img key={name} src={`/assets/cars/car_images_${index+1}.webp`} width="1920" height="1280" alt={active===index?name:''} aria-hidden={active!==index} className={active===index?'is-active':''} loading="eager" onLoad={()=>markLoaded(index)}/>)}

 <div className="photo-caption"><span>A CAR THAT FITS YOUR LIFE</span><p>Go your <em>own way.</em></p></div>
 </div>
}
