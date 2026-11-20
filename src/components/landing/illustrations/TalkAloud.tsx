export function TalkAloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={className} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <style>{`.ta-wave,.ta-glow,.ta-steam{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:no-preference){
.ta-wave{animation:ta-w 1.4s ease-in-out infinite}
.ta-wave.b{animation-delay:.15s}.ta-wave.c{animation-delay:.3s}.ta-wave.d{animation-delay:.45s}.ta-wave.e{animation-delay:.6s}
.ta-glow{animation:ta-g 4s ease-in-out infinite}
.ta-steam{animation:ta-s 3.4s ease-in-out infinite}
.ta-steam.b{animation-delay:1.1s}
}
@keyframes ta-w{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1.15)}}
@keyframes ta-g{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ta-s{0%{opacity:0;transform:translateY(6px)}30%{opacity:.8}100%{opacity:0;transform:translateY(-14px)}}`}</style>
<defs>
<clipPath id="ta-room"><rect x="24" y="24" width="432" height="312" rx="34"/></clipPath>
<clipPath id="ta-win"><rect x="50" y="56" width="150" height="150" rx="14"/></clipPath>
<linearGradient id="ta-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBF6EF"/><stop offset="1" stopColor="#F4C7A8"/></linearGradient>
<radialGradient id="ta-og"><stop offset="0" stopColor="#B9B3F0" stopOpacity=".9"/><stop offset="1" stopColor="#B9B3F0" stopOpacity="0"/></radialGradient>
<linearGradient id="ta-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6D88B" stopOpacity=".45"/><stop offset="1" stopColor="#F6D88B" stopOpacity="0"/></linearGradient>
</defs>
<g clipPath="url(#ta-room)">
<rect x="24" y="24" width="432" height="312" fill="#F1E4D3"/>
<rect x="24" y="290" width="432" height="60" fill="#E7D2BB"/>
<path d="M50 206L200 206 330 330 110 330z" fill="url(#ta-beam)" className="ta-glow"/>
<rect x="50" y="56" width="150" height="150" rx="14" fill="url(#ta-sky)"/>
<g clipPath="url(#ta-win)"><circle cx="160" cy="92" r="20" fill="#F6D88B"/><circle cx="160" cy="92" r="32" fill="#F6D88B" opacity=".3"/>
<path d="M50 200q40-34 80-14t70-10v40H50z" fill="#9DB59A" opacity=".55"/></g>
<rect x="50" y="56" width="150" height="150" rx="14" fill="none" stroke="#4A3428" strokeWidth="6"/>
<path d="M125 56v150M50 131h150" stroke="#4A3428" strokeWidth="4"/>
<rect x="40" y="204" width="170" height="11" rx="5.5" fill="#4A3428"/>
{/* sill plant */}
<path transform="translate(0 -26)" d="M84 204c-14-16-12-34-2-44 6 14 8 28 2 44zM92 204c-2-22 6-36 18-42 4 16-2 32-18 42zM90 204c14-8 28-8 36-2-6 10-20 10-36 2z" fill="#9DB59A"/>
<path d="M76 180h28l-4 24H80z" fill="#D98B6A"/><rect x="72" y="174" width="36" height="9" rx="4.5" fill="#C27455"/>
{/* wall decor */}
<g opacity=".9"><rect x="372" y="62" width="64" height="80" rx="10" fill="#FBF6EF"/><rect x="380" y="70" width="48" height="64" rx="6" fill="#F4C7A8"/><circle cx="404" cy="96" r="12" fill="#F6D88B"/><path d="M380 134v-14q12-12 24 0t24-6v20z" fill="#9DB59A"/></g>
</g>
{/* person */}
<rect x="236" y="196" width="128" height="76" rx="40" fill="#9DB59A"/>
<path d="M258 150c-4-36 18-58 42-58s46 22 42 58c-2 24 4 44 14 56-30 14-86 14-112 0 10-12 18-32 14-56z" fill="#E3A5A0"/>
<path d="M262 196q38 14 76 0" stroke="#D18F8A" strokeWidth="3" fill="none" strokeLinecap="round"/>
<ellipse cx="300" cy="153" rx="28" ry="31" fill="#E0AC85"/>
<path d="M270 140c4-26 56-26 60 0-14-12-46-12-60 0z" fill="#D98B6A"/>
<path d="M272 142c10-8 46-8 56 0" stroke="#C27455" strokeWidth="2" fill="none"/>
<circle cx="289" cy="152" r="2.8" fill="#4A3428"/><circle cx="311" cy="152" r="2.8" fill="#4A3428"/>
<path d="M283 145q6-4 12 0M305 145q6-4 12 0" stroke="#4A3428" strokeWidth="2" fill="none" strokeLinecap="round"/>
<ellipse cx="300" cy="168" rx="5" ry="4" fill="#8A3F36"/>
<circle cx="279" cy="163" r="4.5" fill="#E3A5A0" opacity=".75"/><circle cx="321" cy="163" r="4.5" fill="#E3A5A0" opacity=".75"/>
{/* speaking arcs */}
<g stroke="#D98B6A" strokeWidth="3.5" transform="translate(-6 8)" fill="none" strokeLinecap="round" opacity=".8"><path d="M240 140q-8 10 0 20"/><path d="M230 132q-14 18 0 36" opacity=".6"/><path d="M360 140q8 10 0 20"/></g>
{/* table */}
<rect x="130" y="262" width="330" height="14" rx="7" fill="#C27455"/>
<rect x="150" y="276" width="10" height="60" fill="#4A3428"/><rect x="420" y="276" width="10" height="60" fill="#4A3428"/>
<rect x="136" y="262" width="320" height="5" rx="2.5" fill="#D98B6A"/>
{/* sleeves/hands */}
<rect x="246" y="226" width="30" height="40" rx="15" fill="#9DB59A"/><rect x="324" y="226" width="30" height="40" rx="15" fill="#9DB59A"/>
<circle cx="266" cy="260" r="10" fill="#E0AC85"/><circle cx="334" cy="260" r="10" fill="#E0AC85"/>
{/* mug */}
<rect x="170" y="232" width="34" height="30" rx="8" fill="#FBF6EF"/><path d="M204 238c14 0 14 18 0 18" stroke="#FBF6EF" strokeWidth="5" fill="none"/><rect x="170" y="240" width="34" height="6" fill="#D98B6A"/>
<path className="ta-steam" d="M180 226q-7-9 0-17t0-14" stroke="#FBF6EF" strokeWidth="3" fill="none" strokeLinecap="round"/>
<path className="ta-steam b" d="M193 226q-7-9 0-17t0-14" stroke="#FBF6EF" strokeWidth="3" fill="none" strokeLinecap="round"/>
{/* phone */}
<g transform="rotate(-5 404 220)">
<path d="M384 262l20-14 20 14z" fill="#4A3428"/>
<rect x="376" y="168" width="56" height="96" rx="12" fill="#4A3428"/>
<rect x="381" y="174" width="46" height="84" rx="8" fill="#3B3F73"/>
<circle className="ta-glow" cx="404" cy="216" r="30" fill="url(#ta-og)"/>
<circle cx="404" cy="216" r="17" fill="#B9B3F0"/>
<g fill="#FBF6EF"><rect className="ta-wave" x="394" y="210" width="3.4" height="12" rx="1.7"/><rect className="ta-wave b" x="399" y="207" width="3.4" height="18" rx="1.7"/><rect className="ta-wave c" x="404" y="205" width="3.4" height="22" rx="1.7"/><rect className="ta-wave d" x="409" y="208" width="3.4" height="16" rx="1.7"/><rect className="ta-wave e" x="414" y="211" width="3.4" height="10" rx="1.7"/></g>
</g>
</svg>
  );
}
