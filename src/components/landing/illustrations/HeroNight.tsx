export function HeroNight({ className }: { className?: string }) {
  return (
<svg className={className} viewBox="0 0 640 520" fill="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
<style>{`
.hn-star,.hn-steam,.hn-lamp,.hn-orb,.hn-chest{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:no-preference){
.hn-star{animation:hn-tw 3.2s ease-in-out infinite}
.hn-star:nth-of-type(2n){animation-delay:-1.1s}
.hn-star:nth-of-type(3n){animation-delay:-2.1s}
.hn-steam{animation:hn-st 3.4s ease-in infinite}
.hn-steam:nth-of-type(2n){animation-delay:-1.7s}
.hn-lamp{animation:hn-lp 5s ease-in-out infinite}
.hn-orb{animation:hn-fl 6s ease-in-out infinite}
.hn-chest{animation:hn-br 6s ease-in-out infinite}
}
@keyframes hn-tw{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
@keyframes hn-st{0%{opacity:0;transform:translateY(6px)}30%{opacity:.7}100%{opacity:0;transform:translateY(-14px)}}
@keyframes hn-lp{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1.05)}}
@keyframes hn-fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes hn-br{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
`}</style>
<defs>
<radialGradient id="hn-g-lamp"><stop offset="0" stopColor="#F6D88B" stopOpacity=".75"/><stop offset="1" stopColor="#F6D88B" stopOpacity="0"/></radialGradient>
<radialGradient id="hn-g-orb"><stop offset="0" stopColor="#B9B3F0" stopOpacity=".6"/><stop offset="1" stopColor="#B9B3F0" stopOpacity="0"/></radialGradient>
<linearGradient id="hn-g-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B3F73"/><stop offset="1" stopColor="#565A98"/></linearGradient>
<clipPath id="hn-c-win"><path d="M70 300V150a90 90 0 0 1 180 0v150z"/></clipPath>
</defs>

<path d="M60 300C40 180 130 60 300 60s300 90 280 230c-10 90-90 150-260 150S75 400 60 300z" fill="#F1E4D3" opacity=".55"/>
<ellipse cx="350" cy="455" rx="285" ry="20" fill="#4A3428" opacity=".1"/>
<ellipse cx="350" cy="450" rx="250" ry="14" fill="#F1E4D3"/>
<circle cx="560" cy="250" r="80" fill="url(#hn-g-lamp)" opacity=".8"/>
<circle className="hn-lamp il-lamp" cx="590" cy="230" r="50" fill="url(#hn-g-lamp)"/>

<path d="M62 308V150a98 98 0 0 1 196 0v158z" fill="#FBF6EF" stroke="#E8D4BC" strokeWidth="3"/>
<path d="M70 300V150a90 90 0 0 1 180 0v150z" fill="url(#hn-g-win)"/>
<g clipPath="url(#hn-c-win)">
<circle cx="150" cy="170" r="70" fill="#B9B3F0" opacity=".12"/>
<path d="M70 300c30-40 60-45 90-30s60 5 90-25v55z" fill="#2E3160" opacity=".7"/>
</g>
<path d="M165 118a34 34 0 1 0 22 55a28 28 0 1 1-22-55z" fill="#F6D88B"/>
<g fill="#F6D88B">
<path className="hn-star il-star" d="M110 100l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>
<path className="hn-star il-star" d="M205 98l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>
<path className="hn-star il-star" d="M215 175l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>
<path className="hn-star il-star" d="M100 210l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
<path className="hn-star il-star" d="M150 80l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
<path className="hn-star il-star" d="M185 235l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
</g>
<path d="M160 60v248M70 190h180" stroke="#FBF6EF" strokeWidth="5"/>
<rect x="56" y="302" width="208" height="12" rx="6" fill="#E3D0B8"/>

<path d="M44 52c34 10 38 90 30 262H38c-10-130-6-230 6-262z" fill="#E3A5A0"/>
<path d="M44 52c14 60 14 160 10 262h-16c-10-130-6-230 6-262z" fill="#D98B6A" opacity=".35"/>

<g>
<path d="M112 380c-30-30-40-70-24-98 22 22 30 58 24 98z" fill="#9DB59A"/>
<path d="M114 380c-4-44 8-84 34-104 14 32 2 74-34 104z" fill="#86A083"/>
<path d="M112 380c6-30 22-52 46-58 2 30-14 50-46 58z" fill="#9DB59A"/>
<path d="M112 380c-14-24-30-34-52-34 4 24 24 36 52 34z" fill="#86A083"/>
<path d="M82 376h60l-8 66a8 8 0 0 1-8 7H98a8 8 0 0 1-8-7z" fill="#D98B6A"/>
<path d="M82 376h60l-1 12H83z" fill="#C5755A"/>
</g>

<rect x="215" y="262" width="330" height="150" rx="46" fill="#C5755A"/>
<rect x="205" y="330" width="62" height="112" rx="28" fill="#D98B6A"/>
<rect x="190" y="372" width="360" height="68" rx="26" fill="#D98B6A"/>
<rect x="500" y="330" width="62" height="112" rx="28" fill="#D98B6A"/>
<path d="M212 395h326" stroke="#C5755A" strokeWidth="3" strokeLinecap="round" opacity=".6"/>
<rect x="225" y="440" width="12" height="14" rx="4" fill="#4A3428"/><rect x="520" y="440" width="12" height="14" rx="4" fill="#4A3428"/>

<g transform="rotate(-10 505 340)"><rect x="470" y="300" width="70" height="70" rx="24" fill="#E3A5A0"/><path d="M485 315c15 10 25 30 40 38" stroke="#FBF6EF" strokeWidth="4" strokeLinecap="round" opacity=".6"/></g>
<g transform="translate(400 440) scale(1.12) translate(-400 -440)">
<g className="hn-chest il-chest">
<path d="M388 292c-34 6-52 40-42 78l70 24 70-8c4-52-12-98-98-94z" fill="#9DB59A"/>
<path d="M410 300c8 30 6 62-2 92l-18-6c8-26 10-52 4-80z" fill="#86A083"/>
</g>
<rect x="388" y="270" width="26" height="28" rx="12" fill="#8E5B3F"/><path d="M382 296q18 16 36 0l-6 34q-12 6-24 0z" fill="#FBF6EF"/><path d="M400 306v70" stroke="#86A083" strokeWidth="3" strokeLinecap="round"/>

<path d="M418 396c52 8 74-6 78-30 4-26-22-44-56-52l-92-14c-32-4-40 22-24 44 14 20 60 44 94 52z" fill="#7A5646"/>


<path d="M352 338c40 6 90 4 130 28 14 10 18 30 8 44-30 8-90 4-130-14-26-12-30-48-8-58z" fill="#F4C7A8"/>
<path d="M356 372c34 16 84 26 124 24" stroke="#FBF6EF" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
<path d="M366 346c30 10 70 16 108 16" stroke="#FBF6EF" strokeWidth="3" strokeLinecap="round" opacity=".7"/>

<circle cx="392" cy="244" r="34" fill="#A9714F"/>
<path d="M358 248C350 202 378 188 394 188c26 0 38 24 32 46-10-16-30-22-46-20-10 2-18 14-22 34z" fill="#2E2018"/>
<circle cx="392" cy="196" r="15" fill="#2E2018"/>
<path d="M358 246c-6 14-4 30 4 42-10-6-18-24-16-42z" fill="#2E2018"/>
<path d="M370 248q6 5 12 0M398 248q6 5 12 0" stroke="#2E2018" strokeWidth="3" strokeLinecap="round"/>
<path d="M386 262q8 6 16 0" stroke="#4A3428" strokeWidth="3" strokeLinecap="round"/>
<ellipse cx="368" cy="258" rx="6" ry="4" fill="#E3A5A0" opacity=".7"/><ellipse cx="416" cy="258" rx="6" ry="4" fill="#E3A5A0" opacity=".7"/>

<path d="M360 308c-26 8-30 28-12 46l22-4c-8-14-6-28 6-36z" fill="#86A083"/>
<g transform="rotate(-14 372 312)"><rect x="354" y="288" width="34" height="52" rx="8" fill="#4A3428"/><rect x="358" y="293" width="26" height="42" rx="5" fill="#B9B3F0"/><rect x="363" y="302" width="14" height="5" rx="2.5" fill="#FBF6EF" opacity=".8"/><rect x="363" y="312" width="9" height="5" rx="2.5" fill="#FBF6EF" opacity=".5"/></g>
<circle cx="386" cy="332" r="8" fill="#A9714F"/>
<path d="M430 334c-16 6-34 10-48 14l8 18c18-4 36-10 52-20z" fill="#9DB59A"/>
<g><path d="M404 334h38v14a19 19 0 0 1-38 0z" fill="#FBF6EF"/><path d="M442 340h6a8 8 0 0 1 0 16h-6" stroke="#FBF6EF" strokeWidth="4"/><path d="M404 346h38" stroke="#E3A5A0" strokeWidth="5"/></g>
<circle cx="404" cy="354" r="8" fill="#A9714F"/>
<g stroke="#FBF6EF" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8">
<path className="hn-steam il-steam" d="M416 322c-6-6 6-10 0-18"/><path className="hn-steam il-steam" d="M428 322c-6-6 6-10 0-18"/>
</g>
</g>
<rect x="594" y="250" width="6" height="190" rx="3" fill="#4A3428"/>
<ellipse cx="597" cy="444" rx="24" ry="7" fill="#4A3428"/>
<path d="M570 252l14-48h26l14 48z" fill="#F4C7A8"/>
<path d="M578 252l8-48h8l-4 48z" fill="#FBF6EF" opacity=".5"/>

<g className="hn-orb il-orb">
<circle cx="300" cy="150" r="52" fill="url(#hn-g-orb)"/>
<circle cx="300" cy="150" r="22" fill="#B9B3F0"/>
<circle cx="293" cy="143" r="8" fill="#FBF6EF" opacity=".6"/><circle cx="262" cy="118" r="3" fill="#B9B3F0"/><circle cx="330" cy="188" r="2.5" fill="#B9B3F0"/><circle cx="268" cy="188" r="2" fill="#B9B3F0" opacity=".7"/>
<g transform="translate(335 84)"><rect width="148" height="42" rx="21" fill="#FBF6EF" stroke="#E3D0B8" strokeWidth="2"/><path d="M12 38l-14 16 28-10z" fill="#FBF6EF"/>
<text x="74" y="26" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="16" fontWeight="600" fill="#4A3428">Here with you.</text></g>
</g>
</svg>
  )
}
