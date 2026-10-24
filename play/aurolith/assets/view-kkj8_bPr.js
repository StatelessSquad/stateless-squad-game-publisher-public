import{C as e,S as t,_ as n,a as r,b as i,c as a,d as o,f as s,g as c,h as l,i as u,l as d,m as f,o as p,p as m,r as h,s as g,t as _,u as v,v as y,x as b,y as x}from"./three-CwiIRxiL.js";import{a as S,i as C,n as w,o as T,r as E,t as D}from"./index-DEhdrgas.js";var O=360,k=4,A=2;function j(e){let t=new v,i=new g,o=new Float32Array(O*3),s=new Float32Array(O*3),p=new Float32Array(O),m=new Float32Array(O*3),h=new Float32Array(O),y=new Float32Array(O),S=new Float32Array(O),C=new r,w=new u(o,3).setUsage(d),T=new u(s,3).setUsage(d),E=new u(p,1).setUsage(d);C.setAttribute(`position`,w),C.setAttribute(`aColor`,T),C.setAttribute(`aSize`,E);let D={uPx:{value:1}},j=new n(C,new x({uniforms:D,vertexShader:`
        attribute vec3 aColor; attribute float aSize;
        uniform float uPx;
        varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPx * 60.0 / max(1.0, -mv.z);
          vColor = aColor;
        }`,fragmentShader:`
        varying vec3 vColor;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = exp(-r * r * 3.5) * (1.0 - smoothstep(0.8, 1.0, r));
          float core = exp(-r * r * 18.0);
          gl_FragColor = vec4((vColor + core) * a, 1.0);
          #include <colorspace_fragment>
        }`,transparent:!0,depthWrite:!1,blending:2}));j.frustumCulled=!1,j.renderOrder=5,t.add(j);let M=0,N=0;function P(e,t,n,r,a,c,l,u,d){let f=M;M=(M+1)%O,o.set([e,t,n],f*3),m.set([r,a,c],f*3),i.set(l),s.set([i.r,i.g,i.b],f*3),S[f]=u,h[f]=d,y[f]=d}let F=[];for(let e=0;e<k;e++){let e={uSize:{value:new b(3,3)},uGrow:{value:0},uAlpha:{value:0},uColor:{value:new g}},n=new f(new c(1,1),new x({uniforms:e,vertexShader:`
          varying vec2 vP;
          void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
          uniform vec2 uSize; uniform float uGrow; uniform float uAlpha; uniform vec3 uColor;
          varying vec2 vP;
          void main() {
            // vP spans the plane, scaled to world units by the mesh scale (12).
            vec2 p = vP * 12.0;
            vec2 q = abs(p) - (uSize * 0.5 + uGrow) + uGrow * 0.5;
            float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uGrow * 0.5;
            float band = exp(-abs(sd) * 9.0) + exp(-abs(sd) * 2.2) * 0.35;
            gl_FragColor = vec4((uColor + 0.25) * band * uAlpha, 1.0);
            #include <colorspace_fragment>
          }`,transparent:!0,depthWrite:!1,blending:2}));n.rotation.x=-Math.PI/2,n.scale.setScalar(12),n.visible=!1,n.renderOrder=4,t.add(n),F.push({mesh:n,u:e,t:0})}let I=[];for(let e=0;e<A;e++){let e=new x({uniforms:{uColor:{value:new g},uAlpha:{value:0}},vertexShader:`
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main() {
          vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
          vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,fragmentShader:`
        uniform vec3 uColor; uniform float uAlpha;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main() {
          float facing = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
          float a = pow(1.0 - vUv.y, 2.2) * (0.25 + facing * 0.75) * uAlpha;
          gl_FragColor = vec4((uColor + 0.08) * a, 1.0);
          #include <colorspace_fragment>
        }`,transparent:!0,depthWrite:!1,blending:2}),n=new f(new a(.5,.5,1,32,1,!0),e);n.visible=!1,n.renderOrder=4,t.add(n),I.push({mesh:n,mat:e,t:0})}let L=_(128,[[0,1],[.3,.42],[.65,.1],[1,0]]),R=new l({map:L,color:`#ffffff`,transparent:!0,depthWrite:!1,blending:2,toneMapped:!1}),z=new f(new c(1,1),R);z.renderOrder=3,t.add(z);let B=0;return{root:t,burst(t,n,r,i){let a=e?Math.ceil(i.count/4):i.count,o=i.speed??3,[s,c]=i.spread??[0,0];for(let e=0;e<a;e++){let a=Math.random()*Math.PI*2,l=o*(.35+Math.random()*.9);P(t+(Math.random()-.5)*s,n+(Math.random()-.5)*.3,r+(Math.random()-.5)*c,Math.cos(a)*l,(i.up??2)*(.4+Math.random()),Math.sin(a)*l,i.colors[e%i.colors.length],(i.size??1)*(.5+Math.random()),.6+Math.random()*.7)}},wave(t,n,r,i,a,o){if(e)return;let s=F.find(e=>e.t<=0)??F[0];s.t=1,s.mesh.position.set(t,n,r),s.u.uSize.value.set(i,a),s.u.uColor.value.set(o),s.mesh.visible=!0},pillar(t,n,r,i,a,o){if(e)return;let s=I.find(e=>e.t<=0)??I[0];s.t=1,s.mesh.position.set(t,n+9,r),s.mesh.scale.set(Math.max(i,a)*1.05,18,Math.max(i,a)*1.05),s.mat.uniforms.uColor.value.set(o),s.mesh.visible=!0},boost(e){B=Math.max(B,e)},update(e,t){D.uPx.value=t.pixelRatio,N=0;for(let t=0;t<O;t++){if(h[t]<=0){p[t]!==0&&(p[t]=0);continue}N++,h[t]-=e;let n=t*3;m[n+1]-=6.5*e,m[n]*=1-e*1.4,m[n+2]*=1-e*1.4,o[n]+=m[n]*e,o[n+1]+=m[n+1]*e,o[n+2]+=m[n+2]*e,p[t]=S[t]*Math.max(0,h[t]/y[t])}(N||j.visible)&&(w.needsUpdate=!0,T.needsUpdate=!0,E.needsUpdate=!0),j.visible=N>0;for(let t of F){if(t.t<=0)continue;t.t=Math.max(0,t.t-e/.75);let n=1-t.t;t.u.uGrow.value=n*2.6,t.u.uAlpha.value=t.t*t.t*1.4,t.t===0&&(t.mesh.visible=!1)}for(let t of I)t.t<=0||(t.t=Math.max(0,t.t-e/1.3),t.mat.uniforms.uAlpha.value=Math.sin(t.t*Math.PI)**.6*.5,t.t===0&&(t.mesh.visible=!1));B=Math.max(0,B-e*1.5);let n=t.top.size*(2.4+Math.min(t.streak,6)*.12+B*.8);z.position.set(t.top.x,t.top.y,t.top.z),z.quaternion.copy(t.facing),z.scale.set(n,n,1),R.color.set(t.color),R.opacity=.3+Math.min(t.streak,6)*.04+B*.28}}}var M=[{zenith:`#070520`,mid:`#22124a`,horizon:`#7a2f63`,sun:`#ff8a5c`,slabs:[`#ffb38a`,`#ff7a9c`,`#ffd27a`],accent:`#ffb36b`,accent2:`#ff5c8a`,stars:.35,aurora:0,nebula:0},{zenith:`#060d2a`,mid:`#182a63`,horizon:`#5f4f9e`,sun:`#c8b8ff`,slabs:[`#8fd3ff`,`#b9a6ff`,`#e6f0ff`],accent:`#8fd3ff`,accent2:`#8f7bff`,stars:.45,aurora:0,nebula:0}],N=[{zenith:`#5b8cff`,mid:`#ff9fbf`,horizon:`#ffc08f`,sun:`#fff1c9`,slabs:[`#ff9a6b`,`#ff6f91`,`#ffc145`],accent:`#ff7a4d`,accent2:`#ff4f86`,stars:0,aurora:0,nebula:0},{zenith:`#3b97ff`,mid:`#9fd2ff`,horizon:`#f2f8ff`,sun:`#ffffff`,slabs:[`#4fb6ff`,`#9a85ff`,`#7fe3ff`],accent:`#2f9dff`,accent2:`#7c5cff`,stars:0,aurora:0,nebula:0}],P=e=>e?M:N,F=.5,I={glass:0,neon:1,crystal:2,prism:3,gold:5},L=`
  attribute float aMat;
  attribute float aFlash;
  varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vS; varying vec3 vC; varying vec3 vP;
  varying float vMat; varying float vFlash;
  void main() {
    // In the tower's own (turning) frame: the light pool is placed there.
    vP = (instanceMatrix * vec4(position, 1.0)).xyz;
    mat4 m = modelMatrix * instanceMatrix;
    vec4 w = m * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(m) * normal);
    vL = position;
    vS = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
    #ifdef USE_INSTANCING_COLOR
      vC = instanceColor;
    #else
      vC = vec3(1.0);
    #endif
    vMat = aMat; vFlash = aFlash;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`,R=`
  uniform vec3 uFog; uniform float uFogY; uniform float uFogDepth; uniform float uTime;
  uniform vec3 uLight; uniform vec4 uSpot; uniform float uSpotY; uniform vec3 uSpotColor; uniform float uSpotOn;
  uniform float uSweep; uniform float uDark;
  varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vS; varying vec3 vC; varying vec3 vP;
  varying float vMat; varying float vFlash;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    // Distance to the nearest edge of this face, in world units.
    vec3 d = (0.5 - abs(vL)) * vS;
    float lo = min(d.x, min(d.y, d.z));
    float hi = max(d.x, max(d.y, d.z));
    float e2 = d.x + d.y + d.z - lo - hi;
    float edge = 1.0 - smoothstep(0.0, 0.05, e2);
    float edgeSoft = 1.0 - smoothstep(0.0, 0.32, e2);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    float top = step(0.5, n.y);
    float lambert = 0.5 + 0.5 * max(dot(n, uLight), 0.0);
    float yg = clamp((vL.y + 0.5), 0.0, 1.0);
    vec3 c = vC;
    vec3 col;
    if (vMat < 0.5) {
      col = c * (0.42 + 0.48 * yg) * lambert + c * rim * 0.75 + top * c * 0.25;
      col += mix(c, vec3(1.0), 0.35) * (edge * 0.8 + edgeSoft * 0.14);
    } else if (vMat < 1.5) {
      col = c * (0.12 + 0.1 * uDark) * lambert + c * rim * 0.5;
      col += c * (edge * 2.4 + edgeSoft * 0.6) + vec3(1.0) * edge * 0.35;
    } else if (vMat < 2.5) {
      vec3 iri = 0.5 + 0.5 * cos(6.2831 * (rim * 0.9 + vW.y * 0.04 + (vW.x + vW.z) * 0.05 + vec3(0.0, 0.33, 0.67)));
      col = mix(c, vec3(1.0), 0.5) * lambert * 0.78 + iri * rim * 0.9;
      col += vec3(1.0) * (edge * 0.85 + edgeSoft * 0.15);
      float facet = smoothstep(0.93, 1.0, sin((vW.x - vW.z) * 4.0 + vW.y * 1.5));
      col += facet * 0.18 * (1.0 - top);
    } else if (vMat > 4.5) {
      // Rush gold: molten, with bright bands running around it.
      float bands = pow(0.5 + 0.5 * sin((vW.x + vW.z) * 2.5 + vW.y * 4.0 - uTime * 6.0), 6.0);
      col = mix(vec3(1.0, 0.62, 0.12), vec3(1.0, 0.92, 0.55), yg) * lambert + vec3(1.0, 0.8, 0.4) * rim;
      col += vec3(1.0, 0.95, 0.75) * (edge * 1.4 + bands * 0.35);
    } else if (vMat > 3.5) {
      // The monolith under the tower: obsidian, with lines of light rising through it.
      float lines = pow(0.5 + 0.5 * sin(vW.y * 3.0 - uTime * 1.6), 14.0);
      col = mix(vec3(0.03, 0.025, 0.06), c * 0.12, 0.5 + 0.5 * uDark * 0.0) * lambert + c * rim * 0.45;
      col += c * (edge * 1.6 + edgeSoft * 0.25 + lines * 0.55 * (1.0 - top));
    } else {
      vec3 rb = 0.5 + 0.5 * cos(6.2831 * (vW.y * 0.18 - uTime * 0.45 + (vW.x - vW.z) * 0.07 + vec3(0.0, 0.33, 0.67)));
      col = mix(vec3(1.0, 0.95, 0.84), rb, 0.5) * lambert + rim * 0.8;
      col += vec3(1.0) * edge * 1.3;
    }
    // The sliding slab's light pool on the top face below it.
    if (uSpotOn > 0.0 && top > 0.5 && abs(vP.y - uSpotY) < 0.02) {
      vec2 q = abs(vP.xz - uSpot.xy) - uSpot.zw * 0.5;
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      float pool = exp(-max(sd, 0.0) * 5.0) * (sd < 0.0 ? 1.0 : 0.6);
      col += uSpotColor * pool * 0.55 * uSpotOn;
    }
    col += (vC * 0.6 + 0.5) * vFlash * (0.5 + edgeSoft);
    col += c * smoothstep(1.2, 0.0, abs(vW.y - uSweep)) * 0.9;
    float fog = clamp((uFogY - vW.y) / uFogDepth, 0.0, 1.0);
    col = mix(col, uFog, fog * fog * 0.92);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;function z(){return new x({uniforms:{uFog:{value:new g},uFogY:{value:0},uFogDepth:{value:16},uTime:{value:0},uLight:{value:new t(.45,.8,.4).normalize()},uSpot:{value:new e},uSpotY:{value:0},uSpotColor:{value:new g},uSpotOn:{value:0},uSweep:{value:-100},uDark:{value:1}},vertexShader:L,fragmentShader:R})}function B(e,n){let r=new h(1,1,1),i=new Float32Array(e),a=new Float32Array(e),c=new o(i,1),l=new o(a,1);l.setUsage(d),r.setAttribute(`aMat`,c),r.setAttribute(`aFlash`,l);let u=new s(r,n,e);u.instanceMatrix.setUsage(d),u.frustumCulled=!1,u.count=0,u.setColorAt(0,new g(`#ffffff`));let f=new m,p=new y,_=new t,v=new t,b=new g;return{mesh:u,capacity:e,set(e,t,n,r,i,a,o,s){_.set(t,n,r),v.set(i,a,o),f.compose(_,s??p.identity(),v),u.setMatrixAt(e,f),u.instanceMatrix.addUpdateRange(e*16,16),u.instanceMatrix.needsUpdate=!0},paint(e,t,n){u.setColorAt(e,b.set(t));let r=u.instanceColor;r&&(r.addUpdateRange(e*3,3),r.needsUpdate=!0),i[e]=n===`monolith`?4:I[n],c.addUpdateRange(e,1),c.needsUpdate=!0},flash(e,t){a[e]!==t&&(a[e]=t,l.addUpdateRange(e,1),l.needsUpdate=!0)}}}function V(e){return e===0?-3:e*F}function ee(e){return e===0?6.5:F}function H(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=Math.imul(t^t>>>15,t|1);return e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}var U=`
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`,W=`
  varying vec3 vDir;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vDir = w.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`,te=`
  uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
  uniform vec3 uVeil1; uniform vec3 uVeil2; uniform float uVeil; uniform float uTime; uniform float uDip;
  uniform vec3 uPulseColor; uniform float uPulse;
  varying vec3 vDir;
  ${U}
  float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { return vnoise(p) * 0.55 + vnoise(p * 2.1) * 0.3 + vnoise(p * 4.3) * 0.15; }
  void main() {
    vec3 d = normalize(vDir);
    // High up, the horizon sits below eye level: the sky fills the top of the view.
    float y = d.y + uDip;
    vec3 col = mix(uMid, uZenith, smoothstep(0.05, 0.9, y));
    col = mix(uHorizon, col, smoothstep(-0.12, 0.38, y));
    // Below the horizon: the haze deepens toward the ground.
    col = mix(col, mix(uHorizon, uMid, 0.65) * 0.75, smoothstep(-0.08, -0.75, y));
    // A perfect pulses the horizon in the accent colour.
    col += uPulseColor * uPulse * 0.45 * exp(-abs(y - 0.05) * 3.0);
    float s = max(dot(d, uSunDir), 0.0);
    col += uSun * (pow(s, 6.0) * 0.32 + pow(s, 90.0) * 0.9);
    if (uVeil > 0.01) {
      vec3 p = d * 2.4 + vec3(0.0, uTime * 0.006, 0.0);
      float n = fbm(p);
      float m = fbm(p * 1.8 + 7.0);
      col += uVeil1 * smoothstep(0.48, 0.85, n) * uVeil * 0.6;
      col += uVeil2 * smoothstep(0.55, 0.9, m) * uVeil * 0.45;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash12(gl_FragCoord.xy) - 0.5) / 160.0;
  }
`,G=`
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    float a = exp(-r * r * 4.0) * (1.0 - smoothstep(0.85, 1.0, r));
    gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
    #include <colorspace_fragment>
  }
`;function ne(){let e=new v,a=new g,l={uZenith:{value:new g},uMid:{value:new g},uHorizon:{value:new g},uSun:{value:new g},uSunDir:{value:new t(-.55,.12,-.83).normalize()},uVeil1:{value:new g},uVeil2:{value:new g},uVeil:{value:0},uTime:{value:0},uDip:{value:.42},uPulseColor:{value:new g},uPulse:{value:0}},d=new f(new i(160,32,20),new x({uniforms:l,vertexShader:W,fragmentShader:te,side:1,depthWrite:!1}));d.renderOrder=-10,d.frustumCulled=!1,e.add(d);let m=H(17),h=new Float32Array(2700),_=new Float32Array(900),y=new Float32Array(900);for(let e=0;e<900;e++){let t=m()*2-1,n=Math.abs(t)*.95+.02,r=m()*Math.PI*2,i=Math.sqrt(1-n*n);h.set([Math.cos(r)*i*140,(m()<.15?-n*.3:n)*140,Math.sin(r)*i*140],e*3),_[e]=m()<.06?4.5+m()*3:1.6+m()*2.2,y[e]=m()*6.283}let b=new r;b.setAttribute(`position`,new u(h,3)),b.setAttribute(`aSize`,new u(_,1)),b.setAttribute(`aPhase`,new u(y,1));let S={uAmt:{value:0},uTime:{value:0},uPx:{value:1},uTint:{value:new g(`#dfe8ff`)}},C=new n(b,new x({uniforms:S,vertexShader:`
        attribute float aSize; attribute float aPhase;
        uniform float uAmt; uniform float uTime; uniform float uPx; uniform vec3 uTint;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPx;
          float tw = 0.6 + 0.4 * sin(uTime * (1.2 + fract(aPhase) * 2.4) + aPhase);
          vAlpha = uAmt * tw;
          vColor = mix(uTint, vec3(1.0), fract(aPhase * 3.7));
        }`,fragmentShader:G,transparent:!0,depthWrite:!1,blending:2}));C.frustumCulled=!1,C.renderOrder=-9,e.add(C);let w=new Float32Array(420),T=new Float32Array(140);for(let e=0;e<140;e++){let t=m()*Math.PI*2,n=2.6+m()*11;w.set([Math.cos(t)*n,m()*26,Math.sin(t)*n],e*3),T[e]=.5+m()*1.3}let E=new r;E.setAttribute(`position`,new u(w,3)),E.setAttribute(`aSize`,new u(T,1));let D={uCamY:{value:0},uTime:{value:0},uPhase:{value:0},uPx:{value:1},uColor:{value:new g},uAmt:{value:.8}},O=new n(E,new x({uniforms:D,vertexShader:`
        attribute float aSize;
        uniform float uCamY; uniform float uTime; uniform float uPhase; uniform float uPx; uniform vec3 uColor; uniform float uAmt;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec3 p = position;
          float span = 26.0;
          p.y = uCamY - 14.0 + mod(p.y + uPhase * (0.6 + aSize * 0.5) - uCamY, span);
          p.x += sin(uTime * 0.4 + position.z) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPx * 70.0 / max(1.0, -mv.z);
          float edge = smoothstep(0.0, 3.0, p.y - (uCamY - 14.0)) * smoothstep(0.0, 3.0, uCamY + 12.0 - p.y);
          vAlpha = uAmt * edge * (0.45 + 0.55 * fract(position.x * 7.13));
          vColor = uColor;
        }`,fragmentShader:G,transparent:!0,depthWrite:!1,blending:2}));O.frustumCulled=!1,e.add(O);let k={uColor:{value:new g},uTime:{value:0},uAmt:{value:1}},A=new f(new p(30,64),new x({uniforms:k,vertexShader:`
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`
        uniform vec3 uColor; uniform float uTime; uniform float uAmt;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float rings = pow(0.5 + 0.5 * sin(r * 2.2 - uTime * 1.4), 10.0);
          float fall = exp(-r * 0.11);
          float pool = exp(-r * r * 0.03);
          float a = (rings * 0.22 * fall + pool * 0.28) * uAmt;
          gl_FragColor = vec4(uColor * a, 1.0);
          #include <colorspace_fragment>
        }`,transparent:!0,depthWrite:!1,blending:2}));A.rotation.x=-Math.PI/2,A.position.y=-6,e.add(A);let j=20*F-3,M=45*F+2,N=new c(1,1),P=new Float32Array(90),I=new Float32Array(30),L=new Float32Array(30);for(let e=0;e<30;e++){let t=Math.PI*1.25+(m()-.5)*Math.PI*1.6,n=9+m()*30,r=e<12,i=r?j+m()*2.5:j+2+m()*(M-j);P.set([Math.cos(t)*n,i,Math.sin(t)*n],e*3),I[e]=r?10+m()*9:5+m()*7,L[e]=m()}N.setAttribute(`aCentre`,new o(P,3)),N.setAttribute(`aSize`,new o(I,1)),N.setAttribute(`aSeed`,new o(L,1));let R={uLit:{value:new g},uShade:{value:new g},uAmt:{value:0},uTime:{value:0}},z=new s(N,new x({uniforms:R,vertexShader:`
        attribute vec3 aCentre; attribute float aSize; attribute float aSeed;
        uniform float uTime;
        varying vec2 vUv; varying float vSeed;
        void main() {
          vec3 c = aCentre + vec3(sin(uTime * 0.05 + aSeed * 6.0) * 1.5, 0.0, 0.0);
          vec4 mv = viewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * vec2(aSize * 1.6, aSize);
          vUv = uv; vSeed = aSeed;
          gl_Position = projectionMatrix * mv;
        }`,fragmentShader:`
        uniform vec3 uLit; uniform vec3 uShade; uniform float uAmt;
        varying vec2 vUv; varying float vSeed;
        float blob(vec2 p, vec2 c, float r) { vec2 d = (p - c) / r; return exp(-dot(d, d) * 2.2); }
        void main() {
          vec2 p = vUv * vec2(1.6, 1.0);
          float k = vSeed * 6.283;
          float a = blob(p, vec2(0.8, 0.42), 0.36);
          a = max(a, blob(p, vec2(0.5 + 0.08 * sin(k), 0.5), 0.27));
          a = max(a, blob(p, vec2(1.1 + 0.06 * cos(k), 0.48), 0.25));
          a = max(a, blob(p, vec2(0.78, 0.62), 0.24));
          a *= smoothstep(0.0, 0.25, vUv.y) * smoothstep(0.0, 0.2, 1.0 - vUv.y);
          vec3 col = mix(uShade, uLit, smoothstep(0.25, 0.75, vUv.y));
          gl_FragColor = vec4(col, a * uAmt * 0.85);
          #include <colorspace_fragment>
        }`,transparent:!0,depthWrite:!1}),30);return z.frustumCulled=!1,z.renderOrder=2,e.add(z),{root:e,update(e,t,n,r,i,o,s){d.position.copy(t),C.position.copy(t),l.uZenith.value.set(e.zenith),l.uMid.value.set(e.mid),l.uHorizon.value.set(e.horizon),l.uSun.value.set(e.sun),l.uVeil1.value.set(e.slabs[0]),l.uVeil2.value.set(e.slabs[2]),l.uVeil.value=e.nebula,l.uTime.value=r,S.uAmt.value=e.stars,S.uTime.value=r,S.uPx.value=i,C.visible=e.stars>.01,D.uCamY.value=n,D.uTime.value=r,D.uPhase.value+=s.dt*(.4-s.rush*16),D.uAmt.value=.8+s.rush*.9,l.uPulse.value=s.pulse,l.uPulseColor.value.set(e.accent),D.uPx.value=i,D.uColor.value.set(e.accent),k.uColor.value.set(e.accent),k.uTime.value=r,k.uAmt.value=Math.max(0,1-n/30)*(o?1:.45),A.visible=k.uAmt.value>.01,R.uAmt.value=re(n,j,M,8),R.uTime.value=r,R.uLit.value.set(e.horizon).lerp(a.set(e.sun),.55),R.uShade.value.set(e.mid).lerp(a.set(e.horizon),.45),z.visible=R.uAmt.value>.01}}}var re=(e,t,n,r)=>Math.min(1,Math.max(0,(e-t+r)/r),Math.max(0,(n+r-e)/r)),K=1200,ie=24,q=Math.PI/4,ae=.42,oe=`#fff3d1`,se=`#ffc53d`,ce={zenith:`#1a0526`,mid:`#7a1c4a`,horizon:`#ff8a2e`,sun:`#ffd36b`,slabs:[`#ffc53d`,`#ff8a2e`,`#ffe08a`],accent:`#ffc53d`,accent2:`#ff4f86`,stars:.6,aurora:.4,nebula:.3},J=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r));function Y(e,n){let{scene:r,camera:i,renderer:a}=e;a.toneMapping=0,i.fov=42,i.far=600,i.updateProjectionMatrix();let o=z(),s=o.uniforms,c=B(K,o),l=B(ie,o),u=ne(),d=j(n),f=new v;f.add(c.mesh,l.mesh,d.root),r.add(u.root,f);let p=0,m=new y,h=!0,_=null,b=0,x=`play`,O=0,k=0,A=0,M=0,N=[],I=0,L={y:-2,x:0,z:0,d:30,az:q-.9,el:.95,shake:0},R=16,H=30,U=0,W=new g,te=new g,G=(e,t,n)=>W.set(e).lerp(te.set(t),n).getHexString();function re(e,t,n){if(n<=0)return e;let r=(e,t)=>e+(t-e)*n;return{zenith:`#${G(e.zenith,t.zenith,n)}`,mid:`#${G(e.mid,t.mid,n)}`,horizon:`#${G(e.horizon,t.horizon,n)}`,sun:`#${G(e.sun,t.sun,n)}`,slabs:[`#${G(e.slabs[0],t.slabs[0],n)}`,`#${G(e.slabs[1],t.slabs[1],n)}`,`#${G(e.slabs[2],t.slabs[2],n)}`],accent:`#${G(e.accent,t.accent,n)}`,accent2:`#${G(e.accent2,t.accent2,n)}`,stars:r(e.stars,t.stars),aurora:r(e.aurora,t.aurora),nebula:r(e.nebula,t.nebula)}}function Y(e){let t=P(h),n=T(Math.floor(e)),r=t[n],i=E[n],a=E[n+1];if(!i||!a)return r;let o=i.from+(a.from-i.from)*.5,s=Math.min(1,Math.max(0,(e-o)/(a.from-o)));return re(r,t[n+1],s*s*(3-2*s))}function X(e,t){if(e.material===`prism`)return oe;if(e.material===`gold`)return se;let n=Y(t).slabs,r=t*.21,i=Math.floor(r);return`#${G(n[i%3],n[(i+1)%3],r-i)}`}function le(){let t=e.surface.width,n=e.surface.height;if(!t||!n)return;let r=e.surface.play(),a=Math.tan(i.fov*Math.PI/360),o=(w+D/2)*2*.74;R=Math.max(o/(r.width/n*2*a),8.5/(r.height/n*2*a)),i.aspect=t/n,i.setViewOffset(t,n,t/2-(r.x+r.width/2),n/2-(r.y+r.height*.47),t,n),i.updateProjectionMatrix(),_&&(H=Math.max(R,(V(C(_))+7)/(r.height/n*2*a)/.9))}e.surface.onResize(le);let ue=0,de=0,Z=0;function fe(){let t=performance.now(),n=ue?t-ue:0;if(ue=t,de||=t,!n||n>3e3||document.hidden||t-de<1500)return;n>25?Z+=n>60?8:1:n<19&&(Z=Math.max(0,Z-2));let r=a.getPixelRatio();Z<24||r<=1||(Z=0,a.setPixelRatio(n>80?1:Math.max(1,r-.5)),a.setSize(e.surface.width,e.surface.height,!1))}function pe(e){return!!_&&_.rush>0&&e>C(_)-_.rushChain}function me(e,t){e>=K||(c.set(e,t.x,V(e),t.z,t.w,ee(e),t.d),e===0?c.paint(0,Y(0).accent,`monolith`):t.material===`gold`&&!pe(e)?c.paint(e,X({...t,material:`glass`},e),`glass`):c.paint(e,X(t,e),t.material))}function he(){if(!_)return;let e=C(_);for(let t=Math.max(1,e-10);t<=e;t++){let e=_.tower[t];e.material===`gold`&&(me(t,e),Q.set(t,.8))}}function ge(){if(!_)return;let e=_.tower.length,t=_.moving;!t||e>=K?(c.mesh.count=Math.min(K,_.tower.length),s.uSpotOn.value=0):(c.mesh.count=e+1,c.set(e,t.x,V(e),t.z,t.w,F,t.d),s.uSpot.value.set(t.x,t.z,t.w,t.d),s.uSpotY.value=V(e-1)+ee(e-1)/2,s.uSpotColor.value.set(X(t,e)),s.uSpotOn.value=1)}let Q=new Map;function _e(e,t,n,r){let i={slab:e,y:V(t),v:n,spin:r,q:new y,t:0},a=I;I=(I+1)%ie,N[a]=i,l.paint(a,X(e,t),e.material),l.mesh.count=Math.max(l.mesh.count,a+1)}let $=new t,ve=new t,ye=new y;return{sync(e){_=e;for(let e=0;e<Math.min(K,_.tower.length);e++)me(e,_.tower[e]);_.moving&&c.paint(_.tower.length,X(_.moving,_.tower.length),_.moving.material),ge(),le()},reset(e){x=`play`,O=0,s.uSweep.value=-100;for(let[e]of Q)c.flash(e,0);Q.clear(),this.sync(e),L.az=q-.6,L.el=.8,p=0},settle(){if(!_)return;let e=_.tower[_.tower.length-1];L.y=V(C(_))+.4,L.x=e.x,L.z=e.z,L.d=R,L.az=q,L.el=ae,U=C(_)},dropped(e){if(!_)return;let r=Y(C(_));if(e.kind===`miss`){let i=_.tower.length;c.mesh.count=i,s.uSpotOn.value=0;let a=e.cut,o=Math.sign(e.offset)||1;_e(a,i,new t(e.axis===`x`?o*2.5:0,1.5,e.axis===`z`?o*2.5:0),new t(e.axis===`z`?o*2:0,0,e.axis===`x`?-o*2:0)),d.burst(a.x,V(i),a.z,{count:40,colors:[X(a,i),r.accent,`#ffffff`],speed:4,up:3,spread:[a.w,a.d]}),L.shake=n?0:e.saved?.25:.45,e.saved&&he(),e.saved&&_.moving&&c.paint(_.tower.length,X(_.moving,_.tower.length),_.moving.material);return}let i=_.tower.length-1,a=e.placed;me(i,a);let o=V(i),l=X(a,i);if(Q.set(i,e.kind===`perfect`?1:.55),e.kind===`slice`&&e.cut){let s=e.cut,c=Math.sign(e.offset)||1;_e(s,i,new t(e.axis===`x`?c*1.6:0,.8,e.axis===`z`?c*1.6:0),new t(e.axis===`z`?c*3:0,0,e.axis===`x`?-c*3:0));let u=e.axis===`x`?a.x+c*a.w/2:a.x,f=e.axis===`z`?a.z+c*a.d/2:a.z,p=s.material===`crystal`?46:24;d.burst(u,o,f,{count:p,colors:[l,`#ffffff`,r.accent],speed:2.2,up:1.6,spread:e.axis===`x`?[.05,a.d]:[a.w,.05],size:s.material===`crystal`?1.3:.9}),L.shake=n?0:.14}else d.wave(a.x,o+F/2+.01,a.z,a.w,a.d,l),d.burst(a.x,o+F/2,a.z,{count:18+Math.min(e.streak,6)*6,colors:[l,r.accent,`#ffffff`],speed:2.6,up:2.6,spread:[a.w,a.d]}),d.boost(.6+Math.min(e.streak,6)*.1),e.grew&&d.wave(a.x,o+F/2+.02,a.z,a.w*.6,a.d*.6,r.accent2);if(e.rushEnded&&he(),e.material===`prism`&&(d.pillar(a.x,o,a.z,a.w,a.d,oe),d.burst(a.x,o,a.z,{count:70,colors:[`#ff6b6b`,`#ffd166`,`#8ef6c0`,`#45e0ff`,`#a24bff`,`#ffffff`],speed:4.5,up:3.5,spread:[a.w,a.d],size:1.2})),e.world!==null){let t=P(h)[e.world];d.pillar(a.x,o,a.z,a.w*1.3,a.d*1.3,t.accent),d.burst(a.x,o,a.z,{count:60,colors:[...t.slabs,`#ffffff`],speed:5,up:4,spread:[a.w,a.d],size:1.2})}_.moving&&c.paint(_.tower.length,X(_.moving,_.tower.length),_.moving.material),ge()},glowUp(e=1){n||(A=.7,M=Math.min(1.2,M+.5*e),d.boost(.5*e))},pulse(e){M=Math.min(1.2,M+e)},screenOf(e,t,n){$.set(e,t,n),f.localToWorld($).project(i);let r=a.domElement.getBoundingClientRect();return{x:r.left+($.x+1)/2*r.width,y:r.top+(1-$.y)/2*r.height}},topOnScreen(){if(!_)return{x:0,y:0};let e=C(_),t=_.tower[e];return this.screenOf(t.x,V(e)+F/2,t.z)},gameOver(){x=`over`,O=0,le()},setDark(e){h=e,s.uDark.value=+!!e,_&&this.sync(_)},look:()=>Y(U),rushLook:()=>ce,update(e){if(b+=e,!_)return;let t=C(_),r=_.tower[_.tower.length-1];ge();for(let[t,n]of Q){let r=Math.max(0,n-e*2.2);c.flash(t,r),r===0?Q.delete(t):Q.set(t,r)}for(let[t,n]of N.entries()){if(!n)continue;n.t+=e,n.v.y-=15*e,n.slab={...n.slab,x:n.slab.x+n.v.x*e,z:n.slab.z+n.v.z*e},n.y+=n.v.y*e;let r=n.spin.length();r>0&&(ve.copy(n.spin).normalize(),ye.setFromAxisAngle(ve,r*e),n.q.premultiply(ye)),n.t>3||n.y<L.y-30?(l.set(t,0,-999,0,.001,.001,.001),N[t]=void 0):l.set(t,n.slab.x,n.y,n.slab.z,n.slab.w,F,n.slab.d,n.q)}U=J(U,t,2.5,e),p+=S(t)*e*(x===`play`?1:.35),f.rotation.y=p;let o=Math.cos(p),g=Math.sin(p),v=(r.x*o+r.z*g)*.7,y=(-r.x*g+r.z*o)*.7;if(x===`play`?(L.y=J(L.y,V(t)+.4,4,e),L.x=J(L.x,v,3,e),L.z=J(L.z,y,3,e),L.d=J(L.d,R,2.2,e),L.az=J(L.az,q,1.6,e),L.el=J(L.el,ae,1.8,e)):(O+=e,L.y=J(L.y,V(t)*.5,1.6,e),L.d=J(L.d,H,1.4,e),L.el=J(L.el,.32,1.4,e),L.az+=e*(n?0:.18),s.uSweep.value=O<2.4?-2+(V(t)+4)*(O/1.6):-100),x===`play`){if(A>0){A=Math.max(0,A-e);let t=1-A/.7;s.uSweep.value=L.y-12+t*15}else s.uSweep.value=-100}k=J(k,+(_.rush>0),3,e),M=Math.max(0,M-e*1.4);let w=42+k*7;Math.abs(i.fov-w)>.01&&(i.fov=w,i.updateProjectionMatrix()),L.shake=Math.max(0,L.shake-e*1.6);let T=L.shake*L.shake,E=Math.cos(L.el)*Math.sin(L.az),D=Math.cos(L.el)*Math.cos(L.az);i.position.set(L.x+E*L.d+(Math.random()-.5)*T,L.y+Math.sin(L.el)*L.d+(Math.random()-.5)*T,L.z+D*L.d+(Math.random()-.5)*T),i.lookAt($.set(L.x,L.y,L.z));let j=re(Y(U),ce,k*.85),P=a.getPixelRatio();u.update(j,i.position,L.y,b,P,h,{rush:k,pulse:M,dt:e}),s.uTime.value=b,s.uFog.value.set(j.horizon).lerp(W.set(j.mid),.35),s.uFogY.value=x===`over`?-50:L.y-5,s.uFogDepth.value=18;let I=V(t)+F/2;d.update(e,{pixelRatio:P,facing:m.copy(f.quaternion).invert().multiply(i.quaternion),top:{x:r.x,y:I,z:r.z,size:Math.max(r.w,r.d)},color:j.accent,streak:_.streak})},render(){fe(),e.render()},pixelRatio:()=>a.getPixelRatio()}}export{Y as createView};