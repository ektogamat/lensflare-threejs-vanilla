/**
 * Lens Flare by Anderson Mancini
 * Based on: https://github.com/ektogamat/R3F-Ultimate-Lens-Flare
 */
import * as THREE from 'three'
import { easing } from 'maath'
/**
 * @param {THREE.Vector3 | undefined} lensPosition The date
 * @param {Boolean} debug The string
 * @param {Number | undefined} opacity The string
 */

export let LensFlareParams = {}

export function LensFlareEffect(lensPosition, opacity) {
  LensFlareParams = {
    lensPosition: lensPosition ? lensPosition : new THREE.Vector3(25, 2, -40),
    opacity: opacity ? opacity : 0.8,
  }

  const clock = new THREE.Clock()
  const screenPosition = LensFlareParams.lensPosition
  const viewport = new THREE.Vector4()
  const oldOpacity = LensFlareParams.opacity

  let internalOpacity = oldOpacity
  let flarePosition = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()

  const lensFlareMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      lensPosition: { value: new THREE.Vector2(0, 0) },
      enabled: { value: true },
      colorGain: { value: new THREE.Color(95, 12, 10) },
      starPoints: { value: 5.0 },
      glareSize: { value: 0.55 },
      flareSize: { value: 0.004 },
      flareSpeed: { value: 0.4 },
      flareShape: { value: 1.2 },
      haloScale: { value: 0.5 },
      opacity: { value: internalOpacity },
      animated: { value: true },
      anamorphic: { value: false },
      enabled: { value: true },
      secondaryGhosts: { value: true },
      starBurst: { value: true },
      ghostScale: { value: 0.3 },
      aditionalStreaks: { value: true },
      followMouse: { value: false },
    },
    /*GLSL */
    fragmentShader: `

    // Based on https://www.shadertoy.com/view/4sX3Rs
    uniform float iTime;
    uniform vec2 lensPosition;
    uniform vec2 iResolution;
    uniform vec3 colorGain;
    uniform float starPoints;
    uniform float glareSize;
    uniform float flareSize;
    uniform float flareSpeed;
    uniform float flareShape;
    uniform float haloScale;
    uniform float opacity;
    uniform bool animated;
    uniform bool anamorphic;
    uniform bool enabled;
    uniform bool secondaryGhosts;
    uniform bool starBurst;
    uniform float ghostScale;
    uniform bool aditionalStreaks;
    uniform sampler2D lensDirtTexture;
    varying vec2 vUv;

    float uDispersal = 0.3;
    float uHaloWidth = 0.6;
    float uDistortion = 1.5;
    float uBrightDark = 0.5;
    vec2 vTexCoord;
    

    float rand(float n){return fract(sin(n) * 43758.5453123);}

    float noise(float p){
        float fl = floor(p);
        float fc = fract(p);
        return mix(rand(fl),rand(fl + 1.0), fc);
    }

    vec3 hsv2rgb(vec3 c)
    {
        vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
        return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
    }

    float saturate2(float x)
    {
        return clamp(x, 0.,1.);
    }


    vec2 rotateUV(vec2 uv, float rotation)
    {
        return vec2(
            cos(rotation) * uv.x + sin(rotation) * uv.y,
            cos(rotation) * uv.y - sin(rotation) * uv.x
        );
    }

    // Based on https://www.shadertoy.com/view/XtKfRV
    vec3 drawflare(vec2 p, float intensity, float rnd, float speed, int id)
    {
        float flarehueoffset = (1. / 32.) * float(id) * 0.1;
        float lingrad = distance(vec2(0.), p);
        float expgrad = 1. / exp(lingrad * (fract(rnd) * 0.66 + 0.33));
        vec3 colgrad = hsv2rgb(vec3( fract( (expgrad * 8.) + speed * flareSpeed + flarehueoffset), pow(1.-abs(expgrad*2.-1.), 0.45), 20.0 * expgrad * intensity)); //rainbow spectrum effect

        float internalStarPoints;

        if(anamorphic){
            internalStarPoints = 1.0;
        } else{
            internalStarPoints = starPoints;
        }
        
        float blades = length(p * flareShape * sin(internalStarPoints * atan(p.x, p.y))); //draw 6 blades
        
        float comp = pow(1.-saturate2(blades), ( anamorphic ? 100. : 12.));
        comp += saturate2(expgrad-0.9) * 3.;
        comp = pow(comp * expgrad, 8. + (1.-intensity) * 5.);
        
        if(flareSpeed > 0.0){
            return vec3(comp) * colgrad;
        } else{
            return vec3(comp) * flareSize * 15.;
        }
    }

    float dist(vec3 a, vec3 b) { return abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z); }

    float glare(vec2 uv, vec2 pos, float size)
    {
        vec2 main;

        if(animated){
        main = rotateUV(uv-pos, iTime * 0.1);      
        } else{
        main = uv-pos;     
        }
        
        float ang = atan(main.y, main.x) * (anamorphic ? 1.0 : starPoints);
        float dist = length(main); 
        dist = pow(dist, .9);
        
        float f0 = 1.0/(length(uv-pos)*(1.0/size*16.0)+.2);

        return f0+f0*(sin((ang))*.2 +.3);
    }

    //https://www.shadertoy.com/view/Xd2GR3
    float sdHex(vec2 p){
        p = abs(p);
        vec2 q = vec2(p.x*2.0*0.5773503, p.y + p.x*0.5773503);
        return dot(step(q.xy,q.yx), 1.0-q.yx);
    }

    //fakes x^n for specular effects (k is 0-1)
    float fpow(float x, float k){
        return x > k ? pow((x-k)/(1.0-k),2.0) : 0.0;
    }

    vec3 renderhex(vec2 uv, vec2 p, float s, vec3 col){
        uv -= p;
        if (abs(uv.x) < 0.2*s && abs(uv.y) < 0.2*s){
            return mix(vec3(0),mix(vec3(0),col,0.1 + fpow(length(uv/s),0.1)*10.0),smoothstep(0.0,0.1,sdHex(uv*20.0/s)));
        }
        return vec3(0);
    }

    vec3 LensFlare(vec2 uv, vec2 pos)
    {
        vec2 main = uv-pos;
        vec2 uvd = uv*(length(uv));
        
        float ang = atan(main.x,main.y);
        
        float f0 = .3/(length(uv-pos)*16.0+1.0);
        
        f0 = f0*(sin(noise(sin(ang*3.9-(animated ? iTime : 0.0) * 0.3) * starPoints))*.2 );
        
        float f1 = max(0.01-pow(length(uv+1.2*pos),1.9),.0)*7.0;

        float f2 = max(.9/(10.0+32.0*pow(length(uvd+0.99*pos),2.0)),.0)*0.35;
        float f22 = max(.9/(11.0+32.0*pow(length(uvd+0.85*pos),2.0)),.0)*0.23;
        float f23 = max(.9/(12.0+32.0*pow(length(uvd+0.95*pos),2.0)),.0)*0.6;
        
        vec2 uvx = mix(uv,uvd, 0.1);
        
        float f4 = max(0.01-pow(length(uvx+0.4*pos),2.9),.0)*4.02;
        float f42 = max(0.0-pow(length(uvx+0.45*pos),2.9),.0)*4.1;
        float f43 = max(0.01-pow(length(uvx+0.5*pos),2.9),.0)*4.6;
        
        uvx = mix(uv,uvd,-.4);
        
        float f5 = max(0.01-pow(length(uvx+0.1*pos),5.5),.0)*2.0;
        float f52 = max(0.01-pow(length(uvx+0.2*pos),5.5),.0)*2.0;
        float f53 = max(0.01-pow(length(uvx+0.1*pos),5.5),.0)*2.0;
        
        uvx = mix(uv,uvd, 2.1);
        
        float f6 = max(0.01-pow(length(uvx-0.3*pos),1.61),.0)*3.159;
        float f62 = max(0.01-pow(length(uvx-0.325*pos),1.614),.0)*3.14;
        float f63 = max(0.01-pow(length(uvx-0.389*pos),1.623),.0)*3.12;
        
        vec3 c = vec3(glare(uv,pos, glareSize));

        vec2 prot;

        if(animated){
            prot = rotateUV(uv - pos, (iTime * 0.1));  
        } else if(anamorphic){
            prot = rotateUV(uv - pos, 1.570796);     
        } else {
            prot = uv - pos;
        }

        c += drawflare(prot, (anamorphic ? flareSize * 10. : flareSize), 0.1, iTime, 1);
        
        c.r+=f1+f2+f4+f5+f6; c.g+=f1+f22+f42+f52+f62; c.b+=f1+f23+f43+f53+f63;
        c = c*1.3 * vec3(length(uvd)+.09); // Vignette
        c+=vec3(f0);
        
        return c;
    }

    vec3 cc(vec3 color, float factor,float factor2)
    {
        float w = color.x+color.y+color.z;
        return mix(color,vec3(w)*factor,w*factor2);
    }    

    float rnd(vec2 p)
    {
        float f = fract(sin(dot(p, vec2(12.1234, 72.8392) )*45123.2));
        return f;   
    }

    float rnd(float w)
    {
        float f = fract(sin(w)*1000.);
        return f;   
    }

    float regShape(vec2 p, int N)
    {
        float f;
        
        float a=atan(p.x,p.y)+.2;
        float b=6.28319/float(N);
        f=smoothstep(.5,.51, cos(floor(.5+a/b)*b-a)*length(p.xy)* 2.0  -ghostScale);
            
        return f;
    }

    // Based on https://www.shadertoy.com/view/Xlc3D2
    vec3 circle(vec2 p, float size, float decay, vec3 color, vec3 color2, float dist, vec2 mouse)
    {
        float l = length(p + mouse*(dist*2.))+size/2.;
        float l2 = length(p + mouse*(dist*4.))+size/3.;
        
        float c = max(0.04-pow(length(p + mouse*dist), size*ghostScale), 0.0)*10.;
        float c1 = max(0.001-pow(l-0.3, 1./40.)+sin(l*20.), 0.0)*3.;
        float c2 =  max(0.09/pow(length(p-mouse*dist/.5)*1., .95), 0.0)/20.;
        float s = max(0.02-pow(regShape(p*5. + mouse*dist*5. + decay, 6) , 1.), 0.0)*1.5;
        
        color = cos(vec3(colorGain)*16. + dist/8.)*0.5+.5;
        vec3 f = c*color;
        f += c1*color;
        f += c2*color;  
        f +=  s*color;
        return f;
    }

    vec4 getLensColor(float x){
        return vec4(vec3(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(mix(vec3(0., 0., 0.),
        vec3(0., 0., 0.), smoothstep(0.0, 0.063, x)),
        vec3(0., 0., 0.), smoothstep(0.063, 0.125, x)),
        vec3(0.0, 0., 0.), smoothstep(0.125, 0.188, x)),
        vec3(0.188, 0.131, 0.116), smoothstep(0.188, 0.227, x)),
        vec3(0.31, 0.204, 0.537), smoothstep(0.227, 0.251, x)),
        vec3(0.192, 0.106, 0.286), smoothstep(0.251, 0.314, x)),
        vec3(0.102, 0.008, 0.341), smoothstep(0.314, 0.392, x)),
        vec3(0.086, 0.0, 0.141), smoothstep(0.392, 0.502, x)),
        vec3(1.0, 0.31, 0.0), smoothstep(0.502, 0.604, x)),
        vec3(.1, 0.1, 0.1), smoothstep(0.604, 0.643, x)),
        vec3(1.0, 0.929, 0.0), smoothstep(0.643, 0.761, x)),
        vec3(1.0, 0.086, 0.424), smoothstep(0.761, 0.847, x)),
        vec3(1.0, 0.49, 0.0), smoothstep(0.847, 0.89, x)),
        vec3(0.945, 0.275, 0.475), smoothstep(0.89, 0.941, x)),
        vec3(0.251, 0.275, 0.796), smoothstep(0.941, 1.0, x))),
        1.0);
    }

    float dirtNoise(vec2 p){
        vec2 f = fract(p);
        f = (f * f) * (3.0 - (2.0 * f));    
        float n = dot(floor(p), vec2(1.0, 157.0));
        vec4 a = fract(sin(vec4(n + 0.0, n + 1.0, n + 157.0, n + 158.0)) * 43758.5453123);
        return mix(mix(a.x, a.y, f.x), mix(a.z, a.w, f.x), f.y);
    } 

    float fbm(vec2 p){
        const mat2 m = mat2(0.80, -0.60, 0.60, 0.80);
        float f = 0.0;
        f += 0.5000*dirtNoise(p); p = m*p*2.02;
        f += 0.2500*dirtNoise(p); p = m*p*2.03;
        f += 0.1250*dirtNoise(p); p = m*p*2.01;
        f += 0.0625*dirtNoise(p);
        return f/0.9375;
    } 
    vec4 getLensStar(vec2 p){
        vec2 pp = (p - vec2(0.5)) * 2.0;
        float a = atan(pp.y, pp.x);
        vec4 cp = vec4(sin(a * 1.0), length(pp), sin(a * 13.0), sin(a * 53.0));
        float d = sin(clamp(pow(length(vec2(0.5) - p) * 0.5 + haloScale /2., 5.0), 0.0, 1.0) * 3.14159);
        vec3 c = vec3(d) * vec3(fbm(cp.xy * 16.0) * fbm(cp.zw * 9.0) * max(max(max(max(0.5, sin(a * 1.0)), sin(a * 3.0) * 0.8), sin(a * 7.0) * 0.8), sin(a * 9.0) * 10.6));
        c *= vec3(mix(2.0, (sin(length(pp.xy) * 256.0) * 0.5) + 0.5, sin((clamp((length(pp.xy) - 0.875) / 0.1, 0.0, 1.0) + 0.0) * 2.0 * 3.14159) * 1.5) + 0.5) * 0.3275;
        return vec4(vec3(c * 1.0), d);	
    }

    vec4 getLensDirt(vec2 p){
        p.xy += vec2(fbm(p.yx * 3.0), fbm(p.yx * 2.0)) * 0.0825;
        vec3 o = vec3(mix(0.125, 0.25, max(max(smoothstep(0.1, 0.0, length(p - vec2(0.25))),
                                            smoothstep(0.4, 0.0, length(p - vec2(0.75)))),
                                            smoothstep(0.8, 0.0, length(p - vec2(0.875, 0.125))))));
        o += vec3(max(fbm(p * 1.0) - 0.5, 0.0)) * 0.5;
        o += vec3(max(fbm(p * 2.0) - 0.5, 0.0)) * 0.5;
        o += vec3(max(fbm(p * 4.0) - 0.5, 0.0)) * 0.25;
        o += vec3(max(fbm(p * 8.0) - 0.75, 0.0)) * 1.0;
        o += vec3(max(fbm(p * 16.0) - 0.75, 0.0)) * 0.75;
        o += vec3(max(fbm(p * 64.0) - 0.75, 0.0)) * 0.5;
        return vec4(clamp(o, vec3(0.15), vec3(1.0)), 1.0);	
    }

    vec4 textureLimited(sampler2D tex, vec2 texCoord){
        if(((texCoord.x < 0.) || (texCoord.y < 0.)) || ((texCoord.x > 1.) || (texCoord.y > 1.))){
        return vec4(0.0);
        }else{
        return texture(tex, texCoord); 
        }
    }

    vec4 textureDistorted(sampler2D tex, vec2 texCoord, vec2 direction, vec3 distortion) {
        return vec4(textureLimited(tex, (texCoord + (direction * distortion.r))).r,
                    textureLimited(tex, (texCoord + (direction * distortion.g))).g,
                    textureLimited(tex, (texCoord + (direction * distortion.b))).b,
                    1.0);
    }

    vec4 getStartBurst(){
        vec2 aspectTexCoord = vec2(1.0) - (((vTexCoord - vec2(0.5)) * vec2(1.0)) + vec2(0.5)); 
        vec2 texCoord = vec2(1.0) - vTexCoord; 
        vec2 ghostVec = (vec2(0.5) - texCoord) * uDispersal - lensPosition;
        vec2 ghostVecAspectNormalized = normalize(ghostVec * vec2(1.0)) * vec2(1.0);
        vec2 haloVec = normalize(ghostVec) * uHaloWidth;
        vec2 haloVecAspectNormalized = ghostVecAspectNormalized * uHaloWidth;
        vec2 texelSize = vec2(1.0) / vec2(iResolution.xy);
        vec3 distortion = vec3(-(texelSize.x * uDistortion), 0.2, texelSize.x * uDistortion);
        vec4 c = vec4(0.0);
        for (int i = 0; i < 8; i++) {
        vec2 offset = texCoord + (ghostVec * float(i));
        c += textureDistorted(lensDirtTexture, offset, ghostVecAspectNormalized, distortion) * pow(max(0.0, 1.0 - (length(vec2(0.5) - offset) / length(vec2(0.5)))), 10.0);
        }                       
        vec2 haloOffset = texCoord + haloVecAspectNormalized; 
        return (c * getLensColor((length(vec2(0.5) - aspectTexCoord) / length(vec2(haloScale))))) + 
            (textureDistorted(lensDirtTexture, haloOffset, ghostVecAspectNormalized, distortion) * pow(max(0.0, 1.0 - (length(vec2(0.5) - haloOffset) / length(vec2(0.5)))), 10.0));
    } 

    void main()
    {
        vec2 uv = vUv;
        vec2 myUV = uv -0.5;
        myUV.y *= iResolution.y/iResolution.x;
        vec2 mouse = lensPosition * 0.5;
        mouse.y *= iResolution.y/iResolution.x;
        
        //First LensFlarePass
        vec3 finalColor = LensFlare(myUV, mouse) * 20.0 * colorGain / 256.;

        //Aditional Streaks
        if(aditionalStreaks){
            vec3 circColor = vec3(0.9, 0.2, 0.1);
            vec3 circColor2 = vec3(0.3, 0.1, 0.9);

            for(float i=0.;i<10.;i++){
            finalColor += circle(myUV, pow(rnd(i*2000.)*2.8, .1)+1.41, 0.0, circColor+i , circColor2+i, rnd(i*20.)*3.+0.2-.5, lensPosition);
            }
        }

        //Alternative Ghosts
        if(secondaryGhosts){
            vec3 altGhosts = vec3(0.1);
            altGhosts += renderhex(myUV, -lensPosition*0.25, ghostScale * 1.4, vec3(0.03)* colorGain);
            altGhosts += renderhex(myUV, lensPosition*0.25, ghostScale * 0.5, vec3(0.03)* colorGain);
            altGhosts += renderhex(myUV, lensPosition*0.1, ghostScale * 1.6,vec3(0.03)* colorGain);
            altGhosts += renderhex(myUV, lensPosition*1.8, ghostScale * 2.0, vec3(0.03)* colorGain);
            altGhosts += renderhex(myUV, lensPosition*1.25, ghostScale * 0.8, vec3(0.03)* colorGain);
            altGhosts += renderhex(myUV, -lensPosition*1.25, ghostScale * 5.0, vec3(0.03)* colorGain);
            
            //Circular ghost
            altGhosts += fpow(1.0 - abs(distance(lensPosition*0.8,myUV) - 0.5),0.985)*vec3(.1);
            altGhosts += fpow(1.0 - abs(distance(lensPosition*0.4,myUV) - 0.2),0.994)*vec3(.05);
            finalColor += altGhosts;
        }
        

        //Starburst                     
        if(starBurst){
            vTexCoord = myUV + 0.5;
            vec4 lensMod = getLensDirt(myUV);
            float tooBright = 1.0 - (clamp(uBrightDark, 0.0, 0.5) * 2.0); 
            float tooDark = clamp(uBrightDark - 0.5, 0.0, 0.5) * 2.0;
            lensMod += mix(lensMod, pow(lensMod * 2.0, vec4(2.0)) * 0.5, tooBright);
            float lensStarRotationAngle = ((myUV.x + myUV.y)) * (1.0 / 6.0);
            vec2 lensStarTexCoord = (mat2(cos(lensStarRotationAngle), -sin(lensStarRotationAngle), sin(lensStarRotationAngle), cos(lensStarRotationAngle)) * vTexCoord);
            lensMod += getLensStar(lensStarTexCoord) * 2.;
            
            finalColor += clamp((lensMod.rgb * getStartBurst().rgb ), 0.01, 1.0);
        }

        //Final composed output
        if(enabled){

            gl_FragColor = vec4(finalColor, mix(finalColor, -vec3(.15), 0.5) * opacity);

            #include <tonemapping_fragment>
            #include <encodings_fragment>
        }
    }
    `,

    /* GLSL */
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;

      gl_Position = vec4(position, 1.0);
      
    }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    name: 'LensFlareShader',
  })

  lensFlareMaterial.onBeforeRender = function (renderer, scene, camera) {
    const elapsedTime = clock.getElapsedTime()

    renderer.getCurrentViewport(viewport)
    lensFlareContainer.lookAt(camera)

    lensFlareMaterial.uniforms.iResolution.value.set(viewport.z, viewport.w)

    if (lensFlareMaterial.uniforms.followMouse.value === true) {
      lensFlareMaterial.uniforms.lensPosition.value.set(mouse.x, mouse.y)
    } else {
      const projectedPosition = screenPosition.clone()
      projectedPosition.project(camera)

      flarePosition.x = projectedPosition.x
      flarePosition.y = projectedPosition.y
      flarePosition.z = projectedPosition.z

      if (flarePosition.z < 1) {
        lensFlareMaterial.uniforms.lensPosition.value.set(flarePosition.x, flarePosition.y)
      }

      raycaster.setFromCamera(projectedPosition, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      checkTransparency(intersects)
      
    }

    lensFlareMaterial.uniforms.iTime.value = elapsedTime
    easing.damp(lensFlareMaterial.uniforms.opacity, 'value', internalOpacity, 0.007, clock.getDelta())
  }

  /**
   * Transparency check
   */
  function checkTransparency(intersects){
    if (intersects[0]) {
        if (intersects[0].object) {
          if (intersects[0].object.material.transmission) {
            if (intersects[0].object.material.transmission > 0.2) {
              internalOpacity = oldOpacity * (intersects[0].object.material.transmission * 0.5)
            } else {
              internalOpacity = 0
            }
          } else if (intersects[0].object.material.transmission === 0) {
            internalOpacity = 0
          } else if (intersects[0].object.material.transmission === undefined) {
            if (intersects[0].object.material.transparent) {
              if (intersects[0].object.material.opacity < 0.98) {
                internalOpacity = oldOpacity / (intersects[0].object.material.opacity * 10)
              }
            } else {
              if (intersects[0].object.userData === 'no-occlusion') {
                internalOpacity = oldOpacity
              } else {
                internalOpacity = 0
              }
            }
          }
        }
      } else {
        internalOpacity = oldOpacity
      }
  }

  /**
   * Mouse
   */
  const mouse = new THREE.Vector2()

  window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  })

  const lensFlareContainer = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), lensFlareMaterial)

  return lensFlareContainer
}
