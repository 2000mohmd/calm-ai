export function WalkTogether({ className }: { className?: string }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" fill="none" aria-hidden="true" className={className}>
<style>{`
@media (prefers-reduced-motion:no-preference){
.wt-sun{transform-origin:120px 196px;animation:wt-sun 8s ease-in-out infinite}
.wt-chest{animation:wt-chest 6s ease-in-out infinite}
.wt-bird{animation:wt-bird 5s ease-in-out infinite}
.wt-leaf{animation:wt-leaf 10s ease-in-out infinite}
@keyframes wt-sun{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.1);opacity:1}}
@keyframes wt-chest{0%,100%{transform:scale(1)}50%{transform:scale(1.02,1.03)}}
@keyframes wt-bird{0%,100%{transform:translate(0,0)}50%{transform:translate(4px,-6px)}}
@keyframes wt-leaf{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-16px,8px) rotate(-16deg)}}
}
`}</style>
<defs>
<linearGradient id="wt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B9B3F0" stopOpacity=".75"/><stop offset=".4" stopColor="#E3A5A0" stopOpacity=".6"/><stop offset=".7" stopColor="#F4C7A8" stopOpacity=".8"/><stop offset="1" stopColor="#F6D88B" stopOpacity=".7"/></linearGradient>
<radialGradient id="wt-glow"><stop offset="0" stopColor="#F6D88B" stopOpacity=".9"/><stop offset=".5" stopColor="#F6D88B" stopOpacity=".3"/><stop offset="1" stopColor="#F6D88B" stopOpacity="0"/></radialGradient>
<clipPath id="wt-clip"><rect x="8" y="8" width="464" height="344" rx="36"/></clipPath>
</defs>
<rect x="8" y="8" width="464" height="344" rx="36" fill="url(#wt-sky)"/>
<g clipPath="url(#wt-clip)">
<g className="wt-sun"><circle cx="120" cy="196" r="110" fill="url(#wt-glow)"/><circle cx="120" cy="198" r="30" fill="#F6D88B"/></g>
<path d="M300 70c10-8 26-8 34 0 10-6 26-2 28 8h-70c0-4 3-6 8-8z" fill="#FBF6EF" opacity=".5"/>
<path d="M8 252c80-14 150-10 230 0 90 10 160-12 234 0v120H8z" fill="#B3A8D8" opacity=".55"/>
<g fill="#6F8F73" opacity=".85"><ellipse cx="40" cy="250" rx="16" ry="26"/><circle cx="76" cy="256" r="20"/><ellipse cx="108" cy="246" rx="12" ry="30"/><circle cx="146" cy="258" r="22"/><circle cx="186" cy="256" r="16"/><ellipse cx="216" cy="250" rx="12" ry="26"/><circle cx="256" cy="260" r="24"/><circle cx="298" cy="256" r="18"/><ellipse cx="328" cy="248" rx="13" ry="30"/><circle cx="366" cy="258" r="22"/><circle cx="410" cy="254" r="18"/><ellipse cx="444" cy="248" rx="13" ry="28"/></g>
<path d="M8 270c90-14 170-12 250-4 80 8 150-8 214 2v100H8z" fill="#9DB59A"/>
<path d="M8 296c100-12 200-14 300-6 70 6 120 0 164-6v80H8z" fill="#8AA88C"/>
<path d="M8 304c100-14 220-18 320-8 60 6 110 4 144-2v52c0 6-4 10-10 10H8z" fill="#F1E4D3"/>
<path d="M8 330c110-16 230-14 464-10" stroke="#E3CDB4" strokeWidth="3" strokeLinecap="round" opacity=".7"/>
</g>
<g stroke="#6F8F73" strokeWidth="2.5" strokeLinecap="round" opacity=".7"><path d="M60 318l-3-9M64 318l1-10M68 318l4-8M400 322l-3-9M404 322l1-10M408 322l4-8"/></g>
<g fill="#4A3428" opacity=".13"><ellipse cx="205" cy="312" rx="56" ry="6"/><ellipse cx="292" cy="312" rx="46" ry="5"/></g>
<g>
<path d="M190 256L176 304M204 256L220 302" stroke="#4A3428" strokeWidth="12" strokeLinecap="round"/>
<ellipse cx="173" cy="306" rx="9" ry="4.5" fill="#4A3428"/><ellipse cx="224" cy="304" rx="9" ry="4.5" fill="#4A3428"/>
<path d="M194 200c-6 14-10 30-9 52M212 202c8 14 14 28 16 40" stroke="#D98B6A" strokeWidth="11" strokeLinecap="round"/>
<g className="wt-chest" style={{ transformOrigin: '200px 262px' }}><path d="M174 270c-2-34 0-62 14-76q12-8 24 0c14 14 16 42 14 76z" fill="#D98B6A"/><path d="M200 196v66" stroke="#C4724F" strokeWidth="2.5" opacity=".5"/></g>
<circle cx="228" cy="244" r="6" fill="#8A5A3C"/><circle cx="183" cy="254" r="6" fill="#8A5A3C"/>
<rect x="194" y="176" width="13" height="20" rx="6" fill="#8A5A3C"/>
<circle cx="203" cy="168" r="19" fill="#8A5A3C"/>
<path d="M184 170c-4-22 8-36 24-35 14 1 20 12 17 24-8-8-20-10-28-6-6 3-9 10-13 17z" fill="#E3A5A0"/>
<path d="M184 168c-6 14-6 28 6 34 8-4 12-12 12-20-10 0-14-6-18-14z" fill="#D58D88"/>
<path d="M190 198c8 6 22 6 30-2" stroke="#E3A5A0" strokeWidth="7" strokeLinecap="round"/>
<circle cx="213" cy="170" r="2.2" fill="#4A3428"/><path d="M212 178q4 2 8-1" stroke="#4A3428" strokeWidth="2" strokeLinecap="round"/>
<path d="M282 268L272 306M292 268L304 304" stroke="#7A5C4A" strokeWidth="11" strokeLinecap="round"/>
<ellipse cx="269" cy="308" rx="8" ry="4" fill="#4A3428"/><ellipse cx="308" cy="306" rx="8" ry="4" fill="#4A3428"/>
<path d="M280 214c-6 14-8 26-6 40M296 216c6 12 10 24 10 34" stroke="#6F8F73" strokeWidth="10" strokeLinecap="round"/>
<g className="wt-chest" style={{ transformOrigin: '287px 268px' }}><path d="M268 270c-4-26-2-46 8-54q12-8 24 0c10 8 12 28 8 54z" fill="#6F8F73"/><path d="M287 218v50" stroke="#557558" strokeWidth="2.5" opacity=".6"/></g>
<circle cx="306" cy="250" r="5.5" fill="#E0B08E"/><circle cx="274" cy="256" r="5.5" fill="#E0B08E"/>
<rect x="283" y="196" width="12" height="20" rx="6" fill="#E0B08E"/>
<circle cx="292" cy="188" r="17" fill="#E0B08E"/>
<path d="M275 188c-6-20 6-32 20-30 12 2 16 10 14 20-8-6-16-8-24-4-4 2-6 8-10 14z" fill="#D6D2CC"/>
<path d="M275 186c-4 10-2 20 4 24 4-4 6-10 6-16-4 0-8-4-10-8z" fill="#C4BFB8"/>
<circle cx="301" cy="190" r="2" fill="#4A3428"/><path d="M300 197q4 2 7-1" stroke="#A8553A" strokeWidth="2" strokeLinecap="round"/>
<circle cx="297" cy="195" r="3.5" fill="#E3A5A0" opacity=".6"/>
</g>
<g stroke="#4A3428" strokeWidth="2.5" strokeLinecap="round" opacity=".7"><path className="wt-bird" d="M340 90q6-8 12 0q6-8 12 0"/><path className="wt-bird" style={{ animationDelay: '-1.6s' }} d="M382 66q5-7 10 0q5-7 10 0"/><path className="wt-bird" style={{ animationDelay: '-3s' }} d="M410 108q4-6 8 0q4-6 8 0"/></g>
<g><path className="wt-leaf" d="M376 214q12-12 20 0-9 12-20 0z" fill="#D98B6A"/><path className="wt-leaf" style={{ animationDelay: '-5s' }} d="M70 150q12-12 20 0-9 12-20 0z" fill="#F4C7A8"/></g>
</svg>
  );
}
