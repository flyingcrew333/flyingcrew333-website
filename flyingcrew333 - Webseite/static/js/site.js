(function(){
  var canvas = document.getElementById('bg-canvas');
  if(!canvas || !window.THREE) return;
  var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0,0,9);

  var core = new THREE.Group();
  scene.add(core);

  var geo = new THREE.IcosahedronGeometry(2.1, 1);
  var mat = new THREE.MeshBasicMaterial({color:0x9a7bff, wireframe:true, transparent:true, opacity:0.55});
  var mesh = new THREE.Mesh(geo, mat);
  core.add(mesh);

  var geo2 = new THREE.IcosahedronGeometry(1.35, 0);
  var mat2 = new THREE.MeshBasicMaterial({color:0x48e6cd, wireframe:true, transparent:true, opacity:0.4});
  var mesh2 = new THREE.Mesh(geo2, mat2);
  core.add(mesh2);

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
  var pMat = new THREE.PointsMaterial({color:0xff7e52, size:0.045, transparent:true, opacity:0.75});
  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

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

  var colorA = new THREE.Color(0x9a7bff);
  var colorB = new THREE.Color(0x48e6cd);
  var colorC = new THREE.Color(0xff7e52);

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
