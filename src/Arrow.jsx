import React from 'react';
import arrowSvg from './assets/arrow.svg?raw';
export default function Arrow({direction='up-right',className=''}){return <span className={`arrow-icon arrow-${direction} ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{__html:arrowSvg}}/>}
