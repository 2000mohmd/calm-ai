export function BreatheOutdoors({ className }: { className?: string }) {
  return (
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" fill="none" aria-hidden="true" className={className}>
<style>{`
@media (prefers-reduced-motion:no-preference){
.bo-ring{transform-origin:240px 200px;animation:bo-ring 7s ease-out infinite}
.bo-ring.r2{animation-delay:2.3s}.bo-ring.r3{animation-delay:4.6s}
.bo-sun{transform-origin:372px 98px;animation:bo-sun 8s ease-in-out infinite}
.bo-chest{transform-origin:240px 270px;animation:bo-chest 7s ease-in-out infinite}
.bo-leaf{animation:bo-leaf 9s ease-in-out infinite}
@keyframes bo-ring{0%{transform:scale(.45);opacity:.0}15%{opacity:.7}100%{transform:scale(1.25);opacity:0}}
@keyframes bo-sun{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}
@keyframes bo-chest{0%,100%{transform:scale(1)}50%{transform:scale(1.025,1.035)}}
@keyframes bo-leaf{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(14px,-10px) rotate(14deg)}}
}
`}</style>
<defs>
<linearGradient id="bo-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6D88B" stopOpacity=".0"/><stop offset=".75" stopColor="#F4C7A8" stopOpacity=".55"/><stop offset="1" stopColor="#F4C7A8" stopOpacity=".25"/></linearGradient>
<radialGradient id="bo-glow"><stop offset="0" stopColor="#F6D88B" stopOpacity=".85"/><stop offset=".5" stopColor="#F6D88B" stopOpacity=".3"/><stop offset="1" stopColor="#F6D88B" stopOpacity="0"/></radialGradient>
<radialGradient id="bo-halo"><stop offset="0" stopColor="#F4C7A8" stopOpacity=".55"/><stop offset="1" stopColor="#F4C7A8" stopOpacity="0"/></radialGradient>
</defs>
<clipPath id="bo-clip"><rect x="8" y="8" width="464" height="344" rx="36"/></clipPath>
<rect x="8" y="8" width="464" height="344" rx="36" fill="url(#bo-sky)"/>
<g clipPath="url(#bo-clip)">
<g className="bo-sun"><circle cx="372" cy="98" r="86" fill="url(#bo-glow)"/><circle cx="372" cy="98" r="30" fill="#F6D88B"/></g>
<path d="M60 92c10-8 26-8 34 0 10-6 26-2 28 8H48c0-4 5-7 12-8z" fill="#FBF6EF" opacity=".8"/>
<path d="M150 60c8-6 20-6 26 0 8-4 20-1 22 6h-56c0-3 3-5 8-6z" fill="#FBF6EF" opacity=".6"/>
<path d="M8 236C80 200 140 196 200 212c60 16 110-14 170-22 44-6 80 0 102 12v158H8z" fill="#D3DCCB"/>
<path d="M8 262C70 236 130 236 190 250c60 14 110-10 170-14 50-3 84 10 112 28v96H8z" fill="#B3C7AE"/>
<path d="M8 292c90-26 160-28 232-26 80 2 150-18 232 4v90H8z" fill="#9DB59A"/>
<path d="M8 322c90-18 170 4 250 4 80 0 140-24 214-14v48H8z" fill="#6F8F73"/>
<path d="M60 340c30-12 60-10 90-4M330 342c40-14 80-14 110-6" stroke="#9DB59A" strokeWidth="3" strokeLinecap="round" opacity=".6"/>
</g>
<ellipse cx="240" cy="274" rx="96" ry="10" fill="#4A3428" opacity=".14"/>
<ellipse cx="240" cy="205" rx="84" ry="84" fill="url(#bo-halo)"/>
<g strokeWidth="2.5"><circle className="bo-ring" cx="240" cy="200" r="100" stroke="#B9B3F0"/><circle className="bo-ring r2" cx="240" cy="200" r="100" stroke="#E3A5A0"/><circle className="bo-ring r3" cx="240" cy="200" r="100" stroke="#F6D88B"/></g>
<g>
<g className="bo-chest"><path d="M206 270c-3-36 0-72 18-82q16-8 32 0c18 10 21 46 18 82z" fill="#D98B6A"/>
<path d="M222 190q18 14 36 0" stroke="#C4724F" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6"/></g>
<path d="M217 204c-10 18-22 32-28 48M263 204c10 18 22 32 28 48" stroke="#D98B6A" strokeWidth="15" strokeLinecap="round"/>
<g stroke="#B9B3F0" strokeWidth="28" strokeLinecap="round"><path d="M192 262L246 272"/><path d="M288 262L234 272"/></g>
<path d="M186 250q20 22 56 22M294 250q-20 22-56 22" stroke="#9A93DE" strokeWidth="2.5" strokeLinecap="round" opacity=".7"/>
<circle cx="188" cy="254" r="8" fill="#B87A56"/><circle cx="292" cy="254" r="8" fill="#B87A56"/>
<rect x="232" y="160" width="16" height="22" rx="7" fill="#B87A56"/>
<circle cx="240" cy="150" r="27" fill="#C68B66"/>
<path d="M212 148c-2-24 14-34 30-33 18 1 28 14 26 32-8-12-20-18-34-16-10 2-18 8-22 17z" fill="#4A3428"/>
<circle cx="240" cy="114" r="11" fill="#4A3428"/>
<path d="M228 152q5 4 10 0M246 152q5 4 10 0" stroke="#4A3428" strokeWidth="2.5" strokeLinecap="round"/>
<path d="M233 164q7 5 14 0" stroke="#A8553A" strokeWidth="2.5" strokeLinecap="round"/>
<circle cx="224" cy="160" r="5" fill="#E3A5A0" opacity=".6"/><circle cx="256" cy="160" r="5" fill="#E3A5A0" opacity=".6"/>
</g>
<g><path className="bo-leaf" d="M96 150q14-14 24 0-10 14-24 0z" fill="#9DB59A"/>
<path className="bo-leaf" style={{ animationDelay: '-3s' }} d="M390 190q14-14 24 0-10 14-24 0z" fill="#D98B6A"/>
<path className="bo-leaf" style={{ animationDelay: '-5s' }} d="M150 230q12-12 20 0-9 12-20 0z" fill="#E3A5A0"/>
<path className="bo-leaf" style={{ animationDelay: '-7s' }} d="M330 150q12-12 20 0-9 12-20 0z" fill="#6F8F73"/></g>
</svg>
  );
}
