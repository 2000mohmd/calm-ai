export function SleepPeace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" className={className} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <style>{`.sp-star,.sp-z,.sp-chest,.sp-glow{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:no-preference){
.sp-star{animation:sp-tw 3.6s ease-in-out infinite}
.sp-star.b{animation-delay:1.2s}.sp-star.c{animation-delay:2.2s}
.sp-z{animation:sp-z 5s ease-in-out infinite}
.sp-z.b{animation-delay:1.6s}.sp-z.c{animation-delay:3.2s}
.sp-chest{transform-origin:50% 100%;animation:sp-br 5s ease-in-out infinite}
.sp-glow{animation:sp-gl 6s ease-in-out infinite}
}
@keyframes sp-tw{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes sp-z{0%{opacity:0;transform:translate(0,8px)}25%{opacity:1}100%{opacity:0;transform:translate(10px,-22px)}}
@keyframes sp-br{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.035)}}
@keyframes sp-gl{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}`}</style>
<defs>
<clipPath id="sp-room"><rect x="24" y="24" width="432" height="312" rx="34"/></clipPath>
<radialGradient id="sp-lg"><stop offset="0" stopColor="#F4C7A8" stopOpacity=".95"/><stop offset="1" stopColor="#F4C7A8" stopOpacity="0"/></radialGradient>
<pattern id="sp-pat" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3.4" fill="#F4C7A8"/><circle cx="21" cy="21" r="3.4" fill="#F4C7A8"/><path d="M21 4l4 4-4 4-4-4z" fill="#FBF6EF" opacity=".85"/><path d="M7 18l4 4-4 4-4-4z" fill="#9DB59A"/></pattern>
<clipPath id="sp-win"><path d="M300 170V96a50 50 0 0 1 100 0v74z"/></clipPath>
<clipPath id="sp-bl"><path id="sp-blp" d="M128 232c0-18 14-24 32-22 44-8 100-6 160 10 14 4 20 14 20 28v38H128z"/></clipPath>
</defs>
<g clipPath="url(#sp-room)">
<rect x="24" y="24" width="432" height="312" fill="#F1E4D3"/>
<rect x="24" y="286" width="432" height="60" fill="#E7D2BB"/>
<rect x="96" y="66" width="76" height="62" rx="9" fill="#FBF6EF"/><rect x="103" y="73" width="62" height="48" rx="5" fill="#3B3F73"/><circle cx="142" cy="92" r="9" fill="#F6D88B"/><path d="M103 121v-12q14-12 28 0t34-6v18z" fill="#9DB59A"/><path d="M200 70v22m0 0l2.5 5 5 2-5 2-2.5 5-2.5-5-5-2 5-2z" stroke="#4A3428" strokeWidth="1.5" fill="#F6D88B"/>
<path d="M300 170V96a50 50 0 0 1 100 0v74z" fill="#3B3F73"/>
<g clipPath="url(#sp-win)">
<circle cx="372" cy="84" r="20" fill="#F6D88B"/><circle cx="381" cy="78" r="18" fill="#3B3F73"/>
<path className="sp-star" d="M322 76l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" fill="#F6D88B"/>
<path className="sp-star b" d="M346 124l1.8 4.4 4.4 1.8-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.8z" fill="#F6D88B"/>
<path className="sp-star c" d="M384 130l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#F6D88B"/>
<circle cx="338" cy="58" r="1.8" fill="#FBF6EF" opacity=".8"/><circle cx="394" cy="112" r="1.6" fill="#FBF6EF" opacity=".8"/>
<path d="M300 160q25-18 50-6t50-4v20h-100z" fill="#4A4F8A"/>
</g>
<path d="M300 170V96a50 50 0 0 1 100 0v74z" fill="none" stroke="#4A3428" strokeWidth="6"/>
<path d="M350 46v124M300 112h100" stroke="#4A3428" strokeWidth="4"/>
<rect x="292" y="168" width="116" height="9" rx="4.5" fill="#4A3428"/>
<rect x="284" y="38" width="130" height="5" rx="2.5" fill="#4A3428"/>
<path d="M290 43h26c4 40 2 80 12 112-14 6-28 4-40-2 6-30 6-70 2-110z" fill="#9DB59A"/>
<path d="M300 48c2 36 2 70 8 100" stroke="#7F9B7C" strokeWidth="3" fill="none"/>
<ellipse cx="190" cy="316" rx="170" ry="13" fill="#9DB59A" opacity=".45"/>
</g>
{/* bed */}
<rect x="54" y="168" width="22" height="128" rx="10" fill="#4A3428"/>
<rect x="64" y="236" width="276" height="58" rx="14" fill="#6B4A39"/>
<rect x="70" y="228" width="266" height="24" rx="12" fill="#FBF6EF"/>
<rect x="76" y="296" width="12" height="24" rx="5" fill="#4A3428"/><rect x="318" y="296" width="12" height="24" rx="5" fill="#4A3428"/>
<rect x="82" y="205" width="72" height="36" rx="18" fill="#FBF6EF"/>
<path d="M92 232q30 6 60 0" stroke="#F1E4D3" strokeWidth="3" fill="none" strokeLinecap="round"/>
{/* head */}
<circle cx="112" cy="204" r="25" fill="#8D5A3F"/>
<g fill="#2E1F1A"><circle cx="92" cy="190" r="11"/><circle cx="104" cy="180" r="12"/><circle cx="119" cy="178" r="12"/><circle cx="132" cy="186" r="11"/><circle cx="90" cy="203" r="9"/><circle cx="136" cy="200" r="8"/></g>
<path d="M99 206q4 4 8 0M117 206q4 4 8 0" stroke="#2E1F1A" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
<path d="M107 216q5 4 10 0" stroke="#4A2A1C" strokeWidth="2" fill="none" strokeLinecap="round"/>
<circle cx="97" cy="213" r="4.5" fill="#E3A5A0" opacity=".7"/><circle cx="127" cy="213" r="4.5" fill="#E3A5A0" opacity=".7"/>
{/* blanket */}
<g className="sp-chest">
<path d="M128 232c0-18 14-24 32-22 44-8 100-6 160 10 14 4 20 14 20 28v38H128z" fill="#D98B6A"/>
<g clipPath="url(#sp-bl)"><rect x="120" y="200" width="230" height="100" fill="url(#sp-pat)"/>
<path d="M128 262h212v10H128z" fill="#E3A5A0" opacity=".6"/></g>
<path d="M126 234c0-16 10-24 26-22l6 1c-2 12-2 24-2 36v8h-30z" fill="#FBF6EF" opacity=".95"/><path d="M158 214c-2 12-2 26-2 42" stroke="#E7D2BB" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
</g>
{/* nightstand */}
<rect x="350" y="246" width="82" height="50" rx="8" fill="#4A3428"/>
<rect x="358" y="256" width="66" height="14" rx="5" fill="#6B4A39"/><circle cx="391" cy="263" r="2.4" fill="#F4C7A8"/>
<rect x="358" y="296" width="8" height="22" rx="3" fill="#4A3428"/><rect x="416" y="296" width="8" height="22" rx="3" fill="#4A3428"/>
{/* lamp */}
<circle className="sp-glow" cx="372" cy="222" r="46" fill="url(#sp-lg)"/>
<rect x="369" y="232" width="6" height="14" rx="3" fill="#4A3428"/>
<path d="M356 232l5-24h22l5 24z" fill="#F4C7A8"/><path d="M356 232l5-24h8l-4 24z" fill="#FBF6EF" opacity=".5"/>
{/* plant */}
<path d="M404 246c-8-14-6-26 2-34 4 10 6 20-2 34zM410 246c10-12 22-14 28-12-4 10-14 16-28 12zM406 246c-12-4-20-12-20-22 10 2 20 10 20 22z" fill="#9DB59A"/>
<path d="M398 246h24l-3 20h-18z" fill="#D98B6A"/><rect x="396" y="244" width="28" height="6" rx="3" fill="#C27455"/>
{/* z trail */}
<g fontFamily="Georgia,serif" fontWeight="700" fill="#B9B3F0">
<text className="sp-z" x="150" y="176" fontSize="30">z</text>
<text className="sp-z b" x="182" y="146" fontSize="23">z</text>
<text className="sp-z c" x="212" y="120" fontSize="17">z</text></g>
</svg>
  );
}
