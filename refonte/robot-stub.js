export const PHASES={intro:[0,.1],explode:[.1,.24],axe1:[.24,.41],axe2:[.41,.58],axe3:[.58,.75],axe4:[.75,.92],assemble:[.92,1]};
export function createRobot(canvas){
  const ctx=canvas.getContext('2d');let p=0,h=0,vis=true;
  const W=()=>canvas.width=innerWidth,H=()=>canvas.height=innerHeight;W();H();
  const pos=n=>{const e=Math.min(1,p/.24)*(p>.92?(1-p)/.08:1);const a=(n-2.5)*e*90;return{x:innerWidth*.62+a,y:innerHeight*.5+(n-2.5)*e*70};};
  function draw(){requestAnimationFrame(draw);if(!vis)return;ctx.clearRect(0,0,canvas.width,canvas.height);for(let n=1;n<=4;n++){const q=pos(n);ctx.fillStyle='#E3A857';ctx.fillRect(q.x-20,q.y-20,40,40);}}
  draw();
  return{setHero(v){h=v},setProgress(v){p=v},getAnchor(n){const q=pos(n);return{x:q.x,y:q.y,visible:true}},setVisible(b){vis=b},resize(){W();H()},ready:Promise.resolve()};
}
