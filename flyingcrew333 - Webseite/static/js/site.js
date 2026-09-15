(function(){
  var canvas = document.getElementById('bg-canvas');
  if(!canvas || !window.THREE) return;

  var THEMES = {
    default: {core1:0x9a7bff, core2:0x48e6cd, particle:0xff7e52, sun:false},
    sun:     {core1:0xffb238, core2:0xff7e52, particle:0xffe066, sun:true},
    t1:      {core1:0x9a7bff, core2:0x6a4fc9, particle:0xc9a9ff, sun:false},
    t2:      {core1:0x48e6cd, core2:0x0f4a44, particle:0x7ffbe0, sun:false},
    t3:      {core1:0xff7e52, core2:0x7a3a20, particle:0xffb08a, sun:false},
    t4:      {core1:0x5b6bb8, core2:0x2a3868, particle:0x8fa0e6, sun:false}
  };
  var themeName = document.body.getAttribute('data-bg-theme') || 'default';
  var theme = THEMES[themeName] || THEMES.default;

  var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0,0,9);

  var core = new THREE.Group();
  scene.add(core);

  var hexToRgb = function(hex){
    return [(hex>>16)&255, (hex>>8)&255, hex&255].join(',');
  };
  var createGlowTexture = function(rgb, size, peakAlpha){
    var cx = size/2, cy = size/2;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(cx,cy,0,cx,cy,size/2);
    var peak = peakAlpha===undefined ? 0.14 : peakAlpha;
    g.addColorStop(0,'rgba('+rgb+','+peak+')');
    g.addColorStop(0.4,'rgba('+rgb+','+(peak*0.6)+')');
    g.addColorStop(1,'rgba('+rgb+',0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,size,size);
    return new THREE.CanvasTexture(c);
  };

  var coreOpacity = theme.sun ? 0.7 : 0.55;
  var geo = new THREE.IcosahedronGeometry(theme.sun ? 2.3 : 2.1, 1);
  var mat = new THREE.MeshBasicMaterial({color:theme.core1, wireframe:true, transparent:true, opacity:coreOpacity});
  var mesh = new THREE.Mesh(geo, mat);
  core.add(mesh);

  var geo2 = new THREE.IcosahedronGeometry(theme.sun ? 1.55 : 1.35, 0);
  var mat2 = new THREE.MeshBasicMaterial({color:theme.core2, wireframe:true, transparent:true, opacity:theme.sun ? 0.5 : 0.4});
  var mesh2 = new THREE.Mesh(geo2, mat2);
  core.add(mesh2);

  var sunSprite = null;
  if(theme.sun){
    var createSunburstTexture = function(rgb){
      var size = 512, cx = size/2, cy = size/2;
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var ctx = c.getContext('2d');

      var coreGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,size*0.24);
      coreGrad.addColorStop(0,'rgba('+rgb+',0.4)');
      coreGrad.addColorStop(0.5,'rgba('+rgb+',0.15)');
      coreGrad.addColorStop(1,'rgba('+rgb+',0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0,0,size,size);

      var spikes = 16;
      for(var i=0;i<spikes;i++){
        var angle = (i/spikes)*Math.PI*2;
        var long = (i%2===0);
        var len = size*0.5*(long ? 0.92 : 0.6);
        var halfWidth = (long ? 0.05 : 0.03)*size;
        ctx.save();
        ctx.translate(cx,cy);
        ctx.rotate(angle);
        var grad = ctx.createLinearGradient(0,0,0,-len);
        grad.addColorStop(0,'rgba('+rgb+',0.28)');
        grad.addColorStop(1,'rgba('+rgb+',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-halfWidth,0);
        ctx.lineTo(halfWidth,0);
        ctx.lineTo(0,-len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      return new THREE.CanvasTexture(c);
    };

    var glowMat = new THREE.SpriteMaterial({map:createGlowTexture(hexToRgb(theme.particle),256), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
    var glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(7,7,1);
    scene.add(glowSprite);

    var burstMat = new THREE.SpriteMaterial({map:createSunburstTexture(hexToRgb(theme.core1)), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
    sunSprite = new THREE.Sprite(burstMat);
    sunSprite.scale.set(6,6,1);
    scene.add(sunSprite);
  }

  var pCount = 800;
  var positions = new Float32Array(pCount*3);
  for(var i=0;i<pCount;i++){
    var r = 4 + Math.random()*8;
    var theta = Math.random()*Math.PI*2;
    var phi = Math.acos((Math.random()*2)-1);
    positions[i*3] = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = r*Math.sin(phi)*Math.sin(theta);
    positions[i*3+2] = r*Math.cos(phi);
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions,3));
  var pMat = new THREE.PointsMaterial({color:theme.particle, size:theme.sun ? 0.065 : 0.045, transparent:true, opacity:0.75});
  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // a handful of softly twinkling glow-dots scattered among the star field — subtle, not flashy
  var twinkles = [];
  var twinkleTex = createGlowTexture(hexToRgb(theme.particle), 128);
  for(var ti=0; ti<6; ti++){
    var tMat = new THREE.SpriteMaterial({map:twinkleTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
    var tSpr = new THREE.Sprite(tMat);
    var tr = 4 + Math.random()*7;
    var tTheta = Math.random()*Math.PI*2, tPhi = Math.acos((Math.random()*2)-1);
    tSpr.position.set(tr*Math.sin(tPhi)*Math.cos(tTheta), tr*Math.sin(tPhi)*Math.sin(tTheta), tr*Math.cos(tPhi));
    tSpr.scale.set(0.5,0.5,1);
    tSpr.userData.phase = Math.random()*Math.PI*2;
    tSpr.userData.speed = 0.12 + Math.random()*0.18;
    scene.add(tSpr);
    twinkles.push(tSpr);
  }

  // an occasional shooting star crossing the scene — infrequent and quick, then gone
  var streakTex = (function(rgb){
    var w=256, h=32;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0,0,w,0);
    grad.addColorStop(0,'rgba('+rgb+',0)');
    grad.addColorStop(0.82,'rgba('+rgb+',0.85)');
    grad.addColorStop(1,'rgba(255,255,255,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,h*0.4,w,h*0.2);
    return new THREE.CanvasTexture(c);
  })(hexToRgb(theme.particle));

  function spawnShootingStar(){
    var mat = new THREE.SpriteMaterial({map:streakTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0});
    var star = new THREE.Sprite(mat);
    var startX = -7 - Math.random()*2, startY = 2.5 + Math.random()*3;
    var dx = 11 + Math.random()*4, dy = -(4 + Math.random()*3);
    star.position.set(startX, startY, -3 + Math.random()*3);
    star.scale.set(1.8, 0.22, 1);
    star.material.rotation = Math.atan2(dy, dx);
    scene.add(star);
    var startTime = performance.now();
    var duration = 850 + Math.random()*350;
    (function step(){
      var t = (performance.now()-startTime)/duration;
      if(t >= 1){
        scene.remove(star);
        mat.dispose();
        scheduleShootingStar();
        return;
      }
      star.position.x = startX + dx*t;
      star.position.y = startY + dy*t;
      star.material.opacity = Math.sin(Math.PI*t)*0.85;
      requestAnimationFrame(step);
    })();
  }
  function scheduleShootingStar(){
    setTimeout(spawnShootingStar, 12000 + Math.random()*18000);
  }
  scheduleShootingStar();

  // every so often, one of the actual background dots flares up and burns out
  var emberTex = createGlowTexture(hexToRgb(theme.particle), 128, 0.9);
  function spawnEmberFlare(){
    // bias toward the nearer half of the field so flares reliably read as visible, not lost in the distance
    var candidates = [];
    for(var ci=0; ci<pCount; ci++){ if(positions[ci*3+2] > 0){ candidates.push(ci); } }
    var idx = candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : Math.floor(Math.random()*pCount);
    var mat = new THREE.SpriteMaterial({map:emberTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0});
    var ember = new THREE.Sprite(mat);
    ember.position.set(positions[idx*3], positions[idx*3+1], positions[idx*3+2]);
    points.add(ember); // same parent as the particle field, so it rotates in sync and stays on its dot
    var startTime = performance.now();
    var duration = 1300 + Math.random()*900;
    (function step(){
      var t = (performance.now()-startTime)/duration;
      if(t >= 1){
        points.remove(ember);
        mat.dispose();
        scheduleEmberFlare();
        return;
      }
      var flare = t < 0.15 ? (t/0.15) : Math.max(0, 1 - (t-0.15)/0.85);
      ember.material.opacity = flare;
      var scale = 0.2 + 0.9*flare;
      ember.scale.set(scale, scale, 1);
      requestAnimationFrame(step);
    })();
  }
  function scheduleEmberFlare(){
    setTimeout(spawnEmberFlare, 7000 + Math.random()*8000);
  }
  scheduleEmberFlare();

  requestAnimationFrame(function(){
    requestAnimationFrame(function(){ canvas.classList.add('ready'); });
  });

  var mouseX=0, mouseY=0;
  window.addEventListener('mousemove', function(e){
    mouseX = (e.clientX/window.innerWidth - 0.5);
    mouseY = (e.clientY/window.innerHeight - 0.5);
  });

  var scrollProgress = 0;
  function updateScroll(){
    var h = document.body.scrollHeight - window.innerHeight;
    scrollProgress = h>0 ? window.scrollY/h : 0;
  }
  window.addEventListener('scroll', updateScroll, {passive:true});
  updateScroll();

  var colorA = new THREE.Color(theme.core1);
  var colorB = new THREE.Color(theme.core2);
  var colorC = new THREE.Color(theme.particle);

  function animate(){
    requestAnimationFrame(animate);
    var angle = scrollProgress * Math.PI * 2.4;
    var radius = 9 - scrollProgress*2.5;
    camera.position.x = Math.sin(angle) * radius * 0.5 + mouseX*1.2;
    camera.position.z = Math.cos(angle) * radius * 0.5 + 6;
    camera.position.y = mouseY*1.0 - scrollProgress*1.5;
    camera.lookAt(0,0,0);

    core.rotation.y += 0.0025;
    core.rotation.x += 0.0009;
    points.rotation.y -= 0.0006;

    var nowS = performance.now()/1000;
    twinkles.forEach(function(s){
      s.material.opacity = 0.18 + 0.35*(0.5+0.5*Math.sin(nowS*s.userData.speed + s.userData.phase));
    });

    var t = (Math.sin(scrollProgress*Math.PI*2)+1)/2;
    var mixed = colorA.clone().lerp(colorB, scrollProgress%1).lerp(colorC, t*0.4);
    mesh.material.color.copy(mixed);

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', function(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var revealEls = document.querySelectorAll('.reveal, .tl-row');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ en.target.classList.add('in'); }
    });
  }, {threshold:0.18});
  revealEls.forEach(function(el){ io.observe(el); });

  document.querySelectorAll('.offer-card.tilt').forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left)/r.width - 0.5;
      var y = (e.clientY - r.top)/r.height - 0.5;
      card.style.transform = 'perspective(900px) rotateY('+(x*10)+'deg) rotateX('+(-y*10)+'deg) translateZ(10px)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)';
    });
  });

  var anfrageForm = document.getElementById('anfrageForm');
  if(anfrageForm){
    anfrageForm.addEventListener('submit', function(e){
      e.preventDefault();
      var f = new FormData(e.target);
      var subject = encodeURIComponent('Anfrage energetische Begleitung — ' + f.get('vorname') + ' ' + f.get('nachname'));
      var body = encodeURIComponent('Name: ' + f.get('vorname') + ' ' + f.get('nachname') + '\n' + 'E-Mail: ' + f.get('email') + '\n\n' + f.get('nachricht'));
      window.location.href = 'mailto:flyingcrew333@gmx.de?subject=' + subject + '&body=' + body;
    });
  }

  document.querySelectorAll('.navlinks a').forEach(function(a){
    a.addEventListener('click', function(){
      var toggle = document.getElementById('menuToggle');
      if(toggle) toggle.checked = false;
    });
  });
})();
