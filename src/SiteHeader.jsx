import React, { useEffect, useRef, useState } from 'react';
import Arrow from './Arrow';

const links = [
  ['About us', 'about'],
  ['Buying journey', 'journey'],
  ['Questions', 'faq'],
  ['Dealer partners', 'partners'],
  ['Car tools', 'tools'],
];

export default function SiteHeader({ isDealer, tools, activeTool }) {
  const [menu, setMenu] = useState(false);
  const menuButton = useRef(null);
  const overlay = useRef(null);
  const navigation = tools ?? links;
  const currentPage = id => (tools ? id === activeTool : isDealer && id === 'partners') ? 'page' : undefined;
  const destination = id => tools && id !== 'contact' ? '/cars/?tool=' + id : id === 'partners' ? '/partners/' : id === 'tools' ? '/cars/?tool=loan' : (isDealer || tools ? '/#' : '#') + id;

  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const menuLinks = [...overlay.current.querySelectorAll('a')];
    menuLinks[0].focus({ preventScroll: true });
    const first = menuButton.current;
    const last = menuLinks.at(-1);
    const handleKey = event => {
      if (event.key === 'Escape') {
        setMenu(false);
        first.focus();
      }
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenu(false); };
    desktop.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [menu]);

  const logo = menu || isDealer ? 'motormate-horizontal-reversed-transparent.svg' : 'motormate-horizontal-transparent.svg';
  return <>
    <header className={'site-header' + (isDealer ? ' site-header-dark' : '') + (tools ? ' site-header-tools' : '')}>
      <a className="brand" href="/" aria-label="MotorMate home" onClick={() => setMenu(false)}>
        <img src={'/assets/' + logo} alt="MotorMate" />
      </a>
      <nav className="site-desktop-nav" aria-label={tools ? 'Car tools' : 'Main navigation'}>
        {navigation.map(([label, id]) => <a key={id} href={destination(id)}
          aria-current={currentPage(id)}>{label}</a>)}
      </nav>
      <div className="nav-actions">
        <a className="button small" href={destination('contact')} onClick={() => setMenu(false)}>
          Let’s chat <span className="button-dot"><Arrow /></span>
        </a>
        <button ref={menuButton} className="menu-button" type="button" onClick={() => setMenu(open => !open)}
          aria-expanded={menu} aria-controls="navigation">{menu ? 'Close' : 'Menu'}<span aria-hidden="true">{menu ? '×' : '••'}</span></button>
      </div>
    </header>
    <nav ref={overlay} id="navigation" className={`menu-overlay ${menu ? 'is-open' : ''}`}
      inert={!menu} aria-hidden={!menu} aria-label="Mobile navigation">
      {[...navigation, ['Let’s chat', 'contact']].map(([label, id], index) =>
        <a key={id} href={destination(id)} onClick={() => setMenu(false)}
          aria-current={currentPage(id)}>
          <small aria-hidden="true">0{index + 1}</small>{label}<Arrow />
        </a>)}
    </nav>
  </>;
}
