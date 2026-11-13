import React, { useEffect, useRef } from 'react';

let script;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!script) {
    script = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=motormateTurnstileReady';
      tag.async = true;
      window.motormateTurnstileReady = () => {
        delete window.motormateTurnstileReady;
        resolve(window.turnstile);
      };
      tag.onerror = () => {
        delete window.motormateTurnstileReady;
        tag.remove();
        script = undefined;
        reject(new Error('Could not load the security check.'));
      };
      document.head.append(tag);
    });
  }
  return script;
}

export default function LeadTurnstile({ siteKey, onToken, version }) {
  const container = useRef(null);
  const [failed, setFailed] = React.useState(false);

  useEffect(() => {
    if (!siteKey) return;
    let active = true;
    let widget;
    let turnstile;
    loadTurnstile().then(api => {
      if (!active) return;
      turnstile = api;
      widget = api.render(container.current, {
        sitekey: siteKey,
        action: 'buyer_enquiry',
        size: container.current.clientWidth < 300 ? 'compact' : 'flexible',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => {
          onToken('');
          setFailed(true);
        },
      });
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (widget !== undefined) turnstile.remove(widget);
      onToken('');
    };
  }, [siteKey, onToken, version]);

  return (
    <>
      <div ref={container} className="lead-security-check" />
      {(!siteKey || failed) && <p className="field-note" role="status">
        The security check is unavailable. Please reload the page and try again.
      </p>}
    </>
  );
}
