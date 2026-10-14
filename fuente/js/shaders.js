// HELIO · shaders GLSL de la escena.
// Los colores de esta escena son FÍSICOS (temperatura de color, emisión del oxígeno,
// rampa del plasma), no de interfaz: viven aquí y no en los tokens de SYX.

// Ruido simplex 3D (Ashima Arts / Stefan Gustavson, licencia MIT).
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){float f=0.,a=.5;for(int i=0;i<5;i++){f+=a*snoise(p);p*=2.03;a*=.5;}return f;}
// Versión de 2 octavas para deformar coordenadas: la deformación no necesita más detalle.
float fbm2(vec3 p){return .5*snoise(p)+.25*snoise(p*2.03);}
// Celdas tipo Worley (gránulos): distancia al punto más cercano de una rejilla perturbada.
vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
vec2 worley(vec3 p, float t){
  vec3 i=floor(p);vec3 f=fract(p);float d1=8.,d2=8.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
    vec3 g=vec3(float(x),float(y),float(z));vec3 o=hash3(i+g);
    o=.5+.45*sin(t+6.2831*o);
    vec3 r=g+o-f;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}
  }
  return vec2(sqrt(d1),sqrt(d2));
}
// Rampa de plasma: de rojo oscuro a blanco, según la «temperatura» t en 0..1.
vec3 plasma(float t){
  t=clamp(t,0.,1.);
  vec3 a=vec3(.35,.04,.01),b=vec3(.95,.32,.05),c=vec3(1.,.72,.25),d=vec3(1.,.97,.85);
  return t<.4?mix(a,b,t/.4):t<.75?mix(b,c,(t-.4)/.35):mix(c,d,(t-.75)/.25);
}
`;

// ---------- Fotosfera ----------
export const SOL_VERT = /* glsl */ `
varying vec3 vPos; varying vec3 vNormalW; varying vec3 vViewDir;
void main(){
  vPos=position;
  vec4 w=modelMatrix*vec4(position,1.);
  vNormalW=normalize(mat3(modelMatrix)*normal);
  vViewDir=normalize(cameraPosition-w.xyz);
  gl_Position=projectionMatrix*viewMatrix*w;
}`;

export const SOL_FRAG = /* glsl */ `
uniform float uTime, uCorte, uBrillo, uExcita, uDetalle;
uniform vec3 uToque; uniform vec3 uManchas[4];
varying vec3 vPos; varying vec3 vNormalW; varying vec3 vViewDir;
${NOISE}
void main(){
  // Corte en cuña: se abre desde +x hacia +z alrededor del eje y.
  float ang=atan(vPos.z,vPos.x);
  if(uCorte>0.001 && ang>0. && ang<uCorte*1.5708) discard;
  vec3 p=normalize(vPos);
  float t=uTime*.06;
  // Granulación: celdas brillantes con carriles oscuros (plasma que baja).
  vec3 q=p*34.+vec3(fbm2(p*9.+t),fbm2(p*9.+4.1-t),fbm2(p*9.+8.3))*.9; // deformación: gránulos irregulares (6 ruidos en vez de 15)
  vec2 w=worley(q,t*4.);
  // Cada gránulo es más brillante en el centro (sube el gas caliente) y oscurece hacia el carril.
  float gran=(1.-smoothstep(.0,.85,w.x))*.65+smoothstep(.0,.1,w.y-w.x)*.35;
  // Antialias por derivadas: cuando un gránulo ocupa menos de unos 2 píxeles, su patrón se
  // sustituye por su media. Sin esto, al girar el Sol lejano, la textura centellea.
  float huella=length(fwidth(q));
  gran=mix(gran,.42,smoothstep(.35,.8,huella));
  // La textura fina (88 celdas) solo se ve de cerca: lejos ocupa menos de un píxel y no se calcula.
  float fino=.5;
  if(uDetalle>.02){ vec2 w2=worley(p*88.,t*6.+3.); fino=mix(.5,smoothstep(.0,.25,w2.y-w2.x),uDetalle*(1.-smoothstep(.35,.8,length(fwidth(p*88.))))); }
  float super=fbm(p*3.+t*.3);                       // supergranulación y regiones activas
  float intensidad=.6+(.16+.18*uDetalle)*gran+.08*fino+.14*super;
  // Manchas: umbra y penumbra.
  float sombra=0.;
  for(int i=0;i<4;i++){
    float d=distance(p,normalize(uManchas[i]));
    float umbra=1.-smoothstep(.035,.06,d);
    float pen=1.-smoothstep(.06,.13,d+.02*snoise(p*40.));
    sombra=max(sombra,umbra*.85+pen*.45);
  }
  intensidad*=1.-sombra*.75;
  // Fáculas: el cursor excita el campo magnético local.
  float dt=distance(p,normalize(uToque));
  float facula=uExcita*(1.-smoothstep(0.,.32,dt))*(.6+.4*snoise(p*30.+uTime));
  intensidad+=facula*.55;
  // Oscurecimiento del limbo: I(μ)=1−u(1−μ), u≈0,6.
  float mu=max(dot(vNormalW,vViewDir),0.);
  float limbo=1.-.62*(1.-mu);
  vec3 col=plasma(intensidad*limbo*(.92-.12*uDetalle))*(.55+.35*intensidad)*limbo;
  col+=vec3(1.,.55,.2)*facula*.8;
  gl_FragColor=vec4(col*uBrillo,1.);
}`;

// ---------- Sección del corte (las capas por dentro) ----------
export const CORTE_VERT = /* glsl */ `
varying vec2 vXY;
void main(){ vXY=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

export const CORTE_FRAG = /* glsl */ `
uniform float uTime, uBrillo, uOpacidad;
uniform vec4 uFoco; // x,y: radio interior/exterior de la capa en foco; z: intensidad del foco
varying vec2 vXY;
${NOISE}
void main(){
  float r=length(vXY);
  if(r>1.) discard;
  float a=atan(vXY.y,vXY.x);
  float t=uTime;
  vec3 col;
  if(r<.25){ // núcleo: fusión, chispas
    float chispas=pow(max(snoise(vec3(vXY*38.,t*2.)),0.),6.)*2.5;
    float pulso=.9+.1*sin(t*3.);
    col=mix(vec3(1.,.93,.75),vec3(1.,.7,.3),r/.25)*1.05*pulso+vec3(1.,.9,.6)*chispas*.6;
  } else if(r<.7){ // zona radiativa: difusión lenta, fina y ordenada
    float k=(r-.25)/.45;
    float hilos=snoise(vec3(vXY*55.,t*.15))*.5+.5;
    col=mix(vec3(.95,.6,.24),vec3(.8,.32,.07),k)*(.7+.3*hilos)*.8;
  } else { // zona convectiva: rollos que suben y bajan
    float k=(r-.7)/.3;
    float rollo=sin(a*26.+snoise(vec3(vXY*6.,t*.2))*2.)*.5+.5;
    float sube=snoise(vec3(a*8.,r*10.-t*.6,t*.1))*.5+.5;
    col=mix(vec3(.8,.28,.06),vec3(.55,.1,.02),k)*(.55+.45*rollo*sube);
  }
  // Tacoclina: la frontera violeta donde nace el campo magnético.
  float taco=1.-smoothstep(0.,.012,abs(r-.7));
  col=mix(col,vec3(.62,.45,1.)*1.6,taco*.85);
  // Filetes finos en cada frontera (lectura técnica).
  float filete=(1.-smoothstep(0.,.003,abs(r-.25)))+(1.-smoothstep(0.,.003,abs(r-.985)));
  col+=vec3(1.,.9,.7)*filete*.6;
  // Fotosfera: el borde brillante.
  col=mix(col,vec3(1.,.75,.4)*1.1,smoothstep(.975,.995,r));
  // Foco: la capa del acto actual brilla y el resto se apaga.
  float dentro=step(uFoco.x,r)*step(r,uFoco.y);
  col*=mix(1.,mix(.3,1.08,dentro),uFoco.z);
  gl_FragColor=vec4(col*uBrillo,uOpacidad);
}`;

// ---------- Corona (billboard) ----------
export const CORONA_FRAG = /* glsl */ `
uniform float uTime, uCorona; varying vec2 vUv;
${NOISE}
void main(){
  vec2 p=(vUv-.5)*2.; float r=length(p)*4.; // r=1 es el limbo (el plano mide 8 radios)
  float a=atan(p.y,p.x);
  float base=exp(-(r-1.)*4.)*step(.98,r)*.8;
  float halo=exp(-(r-1.)*1.9)*.22;
  float ray=pow(snoise(vec3(cos(a)*2.2,sin(a)*2.2,uTime*.05))*.5+.5,3.)*exp(-(r-1.)*1.1)*.6;
  float streamer=pow(max(cos(a*2.+.4),0.),6.)*exp(-(r-1.)*.8)*.45;
  // El plano mide 8 radios: todo se apaga antes del borde para que nunca se vea su cuadrado.
  float i=(base+halo*.6+ray*.9+streamer)*uCorona*smoothstep(.97,1.05,r)*(1.-smoothstep(2.4,3.9,r));
  vec3 col=mix(vec3(1.,.62,.25),vec3(.85,.93,1.),clamp((r-1.)*.45,0.,1.));
  gl_FragColor=vec4(col*i,1.);
}`;

export const UV_VERT = /* glsl */ `
varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

// ---------- Bucles coronales (tubos) ----------
export const BUCLE_FRAG = /* glsl */ `
uniform float uTime, uVida, uFase; uniform vec3 uColor; varying vec2 vUv;
void main(){
  float flujo=.55+.45*sin(vUv.x*38.-uTime*3.+uFase);
  float bordes=sin(vUv.x*3.14159);
  float i=(.35+.65*flujo)*uVida*(.4+.6*bordes);
  gl_FragColor=vec4(uColor*i*2.2,1.);
}`;

// ---------- Partículas (viento solar, eyecciones, estrellas) ----------
export const VIENTO_VERT = /* glsl */ `
attribute vec3 aDir; attribute vec3 aDatos; // velocidad, fase, tamaño
uniform float uTime, uViento, uPx; varying float vA; varying float vR;
void main(){
  float largo=14.;
  float d=mod(uTime*aDatos.x+aDatos.y*largo,largo);
  float r=1.05+d;
  // Espiral de Parker: el Sol gira, así que la corriente se curva con la distancia.
  float giro=-d*.12;
  vec3 dir=aDir; float c=cos(giro), s=sin(giro);
  dir=vec3(c*dir.x-s*dir.z,dir.y,s*dir.x+c*dir.z);
  vec3 pos=dir*r;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=aDatos.z*uPx*(13./-mv.z);
  vA=uViento*smoothstep(0.,1.2,d)*(1.-d/largo)*.55; vR=d/largo;
}`;

export const VIENTO_FRAG = /* glsl */ `
varying float vA; varying float vR;
void main(){
  float d=length(gl_PointCoord-.5); if(d>.5) discard;
  vec3 col=mix(vec3(1.,.75,.4),vec3(.55,.85,1.),vR);
  gl_FragColor=vec4(col*vA*(1.-d*2.),1.);
}`;

export const ESTRELLAS_VERT = /* glsl */ `
attribute float aTam; attribute float aFase; uniform float uTime, uPx; varying float vB;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=aTam*uPx;
  vB=.55+.45*sin(uTime*.8+aFase);
}`;
export const ESTRELLAS_FRAG = /* glsl */ `
uniform float uOpacidad; varying float vB;
void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(.85,.88,1.)*vB*uOpacidad*(1.-d*2.),1.); }`;

// Eyección (CME / fulguración): partículas que salen del punto pulsado.
export const EYECCION_VERT = /* glsl */ `
attribute vec3 aVel; attribute float aSemilla;
uniform float uEdad, uPx; uniform vec3 uOrigen; varying float vA;
void main(){
  float t=uEdad*(.6+aSemilla*.8);
  vec3 pos=uOrigen*1.01+aVel*t+uOrigen*t*t*.06;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=(2.+aSemilla*4.)*uPx*(2.2/-mv.z);
  vA=clamp(1.-uEdad/3.2,0.,1.)*smoothstep(0.,.08,uEdad);
}`;
export const EYECCION_FRAG = /* glsl */ `
varying float vA;
void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(1.,.7,.35)*vA*(1.-d*2.)*1.5,1.); }`;

// ---------- Tierra ----------
export const TIERRA_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uSolDir; varying vec3 vPos; varying vec3 vNormalW; varying vec3 vViewDir;
${NOISE}
void main(){
  vec3 p=normalize(vPos);
  float cont=fbm(p*2.2+vec3(3.1,1.7,.4));
  float tierra=smoothstep(.04,.09,cont);
  vec3 mar=mix(vec3(.02,.09,.25),vec3(.03,.2,.42),smoothstep(-.3,.05,cont));
  vec3 suelo=mix(vec3(.16,.3,.12),vec3(.45,.38,.22),smoothstep(.1,.4,cont));
  suelo=mix(suelo,vec3(.92),smoothstep(.72,.82,abs(p.y)));
  vec3 col=mix(mar,suelo,tierra);
  float nubes=smoothstep(.15,.6,fbm(p*4.+vec3(uTime*.01,0.,0.)));
  col=mix(col,vec3(.95),nubes*.55);
  float luz=max(dot(vNormalW,uSolDir),0.);
  col*=.06+luz*1.1;
  float rim=pow(1.-max(dot(vNormalW,vViewDir),0.),3.);
  col+=vec3(.3,.6,1.)*rim*(.25+luz*.9);
  // Contraluz: con el Sol detrás, la atmósfera dispersa hacia delante y el limbo se enciende.
  float detras=pow(max(dot(-vViewDir,uSolDir),0.),6.);
  col+=vec3(.55,.75,1.)*pow(rim,1.6)*detras*2.2;
  gl_FragColor=vec4(col,1.);
}`;

export const AURORA_FRAG = /* glsl */ `
uniform float uTime, uAurora; varying vec2 vUv;
${NOISE}
void main(){
  float cortina=snoise(vec3(vUv.x*24.,uTime*.6,0.))*.5+.5;
  float i=pow(cortina,2.)*uAurora*sin(vUv.y*3.14159);
  vec3 col=mix(vec3(.2,1.,.45),vec3(.9,.25,.35),smoothstep(.55,1.,vUv.y)); // 557,7 nm abajo, 630 nm arriba
  gl_FragColor=vec4(col*i*1.6,1.);
}`;

// Choque de proa y magnetopausa: un paraboloide casi invisible.
export const ESCUDO_FRAG = /* glsl */ `
uniform float uTime, uEscudo; varying vec3 vNormalW; varying vec3 vViewDir; varying vec3 vPos;
void main(){
  float rim=pow(1.-abs(dot(vNormalW,vViewDir)),4.);
  float bandas=.75+.25*sin(vPos.y*10.-uTime*1.5);
  gl_FragColor=vec4(vec3(.45,.8,1.)*rim*bandas*uEscudo*.35,1.);
}`;

// Viento que rodea la magnetosfera (líneas de corriente analíticas).
export const FLUJO_VERT = /* glsl */ `
attribute vec3 aSemilla; // radio inicial, ángulo, fase
uniform float uTime, uFlujo, uPx, uNariz; varying float vA;
void main(){
  float largo=16.;
  float x=-9.+mod(uTime*1.6+aSemilla.z*largo,largo);
  // Paraboloide de la magnetopausa con la nariz hacia el Sol (−x): ρ(x)=√(2a(x−nariz)) si x>nariz.
  float a=1.4; float rho=x>uNariz?min(sqrt(2.*a*(x-uNariz)),3.6):0.;
  // Cada línea de corriente se aparta lo que mide el obstáculo en esa x: r = √(r0² + ρ²).
  float r=sqrt(aSemilla.x*aSemilla.x+rho*rho);
  vec3 pos=vec3(x,cos(aSemilla.y)*r,sin(aSemilla.y)*r);
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=2.4*uPx*(9./-mv.z);
  vA=uFlujo*smoothstep(-9.,-7.,x)*(1.-smoothstep(5.,7.,x));
}`;
export const FLUJO_FRAG = /* glsl */ `
varying float vA;
void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(1.,.82,.55)*vA*(1.-d*2.)*1.4,1.); }`;

// Partícula del mundo atómico: esfera con halo.
export const ATOMO_VERT = SOL_VERT;
export const ATOMO_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacidad;
varying vec3 vPos; varying vec3 vNormalW; varying vec3 vViewDir;
void main(){
  float mu=max(dot(vNormalW,vViewDir),0.);
  vec3 l=normalize(vec3(-.5,.7,.6));
  float dif=max(dot(vNormalW,l),0.);
  float esp=pow(max(dot(reflect(-l,vNormalW),vViewDir),0.),24.);
  vec3 col=uColor*(.18+.62*dif)+vec3(1.)*esp*.5+uColor*pow(1.-mu,2.5)*.7;
  gl_FragColor=vec4(col*uOpacidad,1.);
}`;
