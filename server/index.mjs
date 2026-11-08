import {createGameServer} from './app.mjs';
if(process.env.NODE_ENV==='production'&&!process.env.ALLOWED_ORIGINS)throw new Error('Configure ALLOWED_ORIGINS com a origem HTTPS do frontend.');
const game=createGameServer({dataDir:process.env.DATA_DIR||'server-data',...(process.env.ALLOWED_ORIGINS?{origins:process.env.ALLOWED_ORIGINS.split(',').map(s=>s.trim())}:{})});
const address=await game.listen(Number(process.env.PORT)||8787,process.env.HOST||'127.0.0.1');console.log(`Servidor de passeios: porta ${address.port} /ws`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>game.close().then(()=>process.exit(0)));
