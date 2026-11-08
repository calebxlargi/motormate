import React,{useEffect,useRef,useState} from 'react';
const names=['Perodua Bezza','Proton e.MAS 5','Proton S70','Honda City','Toyota Vios','Mitsubishi Xforce','BYD Atto 3','Jaecoo J7','Jetour T2','XPeng G6','Omoda C9','Zeekr 7X','Volkswagen Tayron','BMW 3 Series','Volvo XC60','Red Nissan Navara','Denza D9','Red Mazda crossover'];
const nextCar=index=>(index+1)%names.length;

function randomStart(){
 const index=Math.floor(Math.random()*names.length);
 try{const previous=Number(sessionStorage.getItem('motormate-last-car')??-1);return index===previous?nextCar(index):index}catch{return index}
}
export default function CarCarousel(){
 const [start]=useState(randomStart);
 const [active,setActive]=useState(start);
 const [previous,setPrevious]=useState(null);
 const [nearby,setNearby]=useState(false);
 const [visible,setVisible]=useState(false);
 const [loaded,setLoaded]=useState(()=>new Set());
 const panel=useRef(null);
 const upcoming=nextCar(active);
 useEffect(()=>{try{sessionStorage.setItem('motormate-last-car',String(start))}catch{}},[start]);
 useEffect(()=>{
  const target=panel.current;
  const preload=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setNearby(true);preload.disconnect()}},{rootMargin:'300px 0px'});
  const visibility=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));
  preload.observe(target);visibility.observe(target);
  return()=>{preload.disconnect();visibility.disconnect()};
 },[]);
 useEffect(()=>{
  if(!visible||!loaded.has(active))return;
  const timer=setInterval(()=>{
   if(document.hidden||!loaded.has(upcoming))return;
   setPrevious(active);setActive(upcoming);
  },2500);
  return()=>clearInterval(timer);
 },[active,upcoming,visible,loaded]);
 function markLoaded(index){
  setLoaded(current=>current.has(index)?current:new Set([...current,index]));
 }
 return <div ref={panel} className="photo-panel car-carousel" role="region" aria-label="Car gallery">
 {nearby&&[previous,active,upcoming].filter(index=>index!==null).map(index=>{
  const path='/assets/cars/car_images_'+(index+1);
  const version=index===15?'?v=2':'';
  return <img key={index} src={path+'.webp'+version} srcSet={path+'-768.webp'+version+' 768w, '+path+'-1280.webp'+version+' 1280w, '+path+'.webp'+version+' 1920w'} sizes="(max-width: 800px) 130vw, 100vw" width="1920" height="1280" alt={active===index?names[index]:''} aria-hidden={active!==index} className={active===index?'is-active':''} fetchPriority={active===index?'auto':'low'} onLoad={()=>markLoaded(index)}/>;
 })}
 <div className="photo-caption"><span>A CAR THAT FITS YOUR LIFESTYLE</span><p>Go your <em>own way.</em></p></div>
 </div>
}
